from fastapi import FastAPI, Request, WebSocket, Body
from starlette.websockets import WebSocketDisconnect
import uvicorn
from datetime import datetime
import asyncio
import queue
from functools import partial
from concurrent.futures import ThreadPoolExecutor
from run_RL_training import run_RL_training
from run_RL_inference import run_RL_inference
from models import TrainRequest, TrainingStatus, current_status
import json
from fastapi.responses import JSONResponse
from fastapi import HTTPException
import os
import glob
# Centralized PPO steps value
PPO_TOTAL_STEPS = 2048

app = FastAPI()
active_connections: list[WebSocket] = []
status_queue = queue.Queue()

# Centralized PPO steps value
PPO_TOTAL_STEPS = 2048

app = FastAPI()
active_connections: list[WebSocket] = []
status_queue = queue.Queue()

# Helper function to build status dictionary
def build_status(result, is_training=False, current_step=None, total_steps=None):
    # Get actual values from result first, then use parameters, then fallback to default
    actual_current_step = result.get("current_step") or current_step or PPO_TOTAL_STEPS
    actual_total_steps = result.get("total_steps") or total_steps or PPO_TOTAL_STEPS
    
    return {
        "is_training": is_training,
        "current_step": actual_current_step,
        "total_steps": actual_total_steps,
        "portfolio_value": result.get("final_portfolio_value", 0),
        "total_trades": result.get("total_trades", 0),
        "returns": result.get("returns", 0),
        "sharpe": result.get("sharpe", 0),
        "device": result.get("device", "cpu"),
        "evaluation_success": result.get("evaluation_success", False),
        "metrics": {
            "portfolio_value": result.get("final_portfolio_value", 0),
            "total_trades": result.get("total_trades", 0),
            "returns": result.get("returns", 0),
            "sharpe": result.get("sharpe", 0)
        }
    }

# Synchronous RL inference HTTP endpoint
@app.post("/api/inference")
async def api_inference(payload: dict = Body(...)):
    candle = payload.get("candle")
    strategy = payload.get("strategy", "ppo")
    policy = payload.get("policy", "MlpPolicy")
    device = payload.get("device", "cpu")
    indicators = payload.get("indicators")
    tickers = payload.get("tickers")
    result = run_RL_inference(
        candle=candle,
        strategy=strategy,
        policy=policy,
        device=device,
        indicators=indicators,
        tickers=tickers
    )
    return result

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()  # Keep connection alive
            if data == "close":  # Client requested close
                break
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
        try:
            await websocket.close()
        except:
            pass  # Already closed

async def broadcast_status(status_update: dict):
    """Broadcast status update to all connected clients"""
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_json(status_update)
        except Exception as e:
            print(f"Error broadcasting to client: {e}")
            disconnected.append(connection)
    
    # Clean up disconnected clients
    for connection in disconnected:
        if connection in active_connections:
            active_connections.remove(connection)

@app.get("/")
async def read_root():
    return {"status": "FinRL API running"}

@app.post("/api/train")
async def train_rl(req: TrainRequest):
    if current_status.is_training:
        return {"status": "error", "message": "Training already in progress"}

    # Log received dataset info
    dataset = getattr(req, 'dataset', None)
    print("Received dataset for training:", dataset)
    if dataset:
        print(f"Dataset start date: {dataset.get('from')}, end date: {dataset.get('to')}")

    # Update status to training
    current_status.is_training = True
    current_status.current_step = 0
    current_status.total_steps = PPO_TOTAL_STEPS  # From PPO params
    current_status.last_update = datetime.now().isoformat()
    
    # Run training in a way that doesn't block WebSocket updates
    try:
        from functools import partial
        from concurrent.futures import ThreadPoolExecutor
        
        # Create background task to process status updates
        keep_running = True
        empty_queue_count = 0
        
        async def process_status_updates():
            nonlocal keep_running, empty_queue_count
            while keep_running or not status_queue.empty() or empty_queue_count < 3:
                try:
                    # Try to get an update from the queue, timeout after 0.1 seconds
                    status = status_queue.get_nowait()
                    empty_queue_count = 0  # Reset counter when we get a message
                    await broadcast_status(status)
                except queue.Empty:
                    empty_queue_count += 1
                    await asyncio.sleep(0.1)  # Give other tasks a chance to run
                except Exception as e:
                    print(f"Error processing status update: {e}")
        
        # Start the background task
        status_processor = asyncio.create_task(process_status_updates())
        
        # Create a wrapper that puts status updates in the queue
        def status_callback_wrapper(status):
            try:
                status_queue.put(status)
            except Exception as e:
                print(f"Error queueing status update: {e}")
        
        # Create a ThreadPoolExecutor to run the training
        with ThreadPoolExecutor() as executor:
            # Pass all fields from req as kwargs to run_RL_training (Pydantic v2+)
            result = await asyncio.get_event_loop().run_in_executor(
                executor,
                partial(run_RL_training, status_callback=status_callback_wrapper, **req.model_dump())
            )
        
        # Update final status in current_status
        current_status.is_training = False
        current_status.last_update = datetime.now().isoformat()
        
        # Send ONE final comprehensive status update with all metrics
        if result.get("status") == "training complete":
            # Now the result should contain the actual step counts
            final_status = build_status(result, is_training=False)
            # print("Sending final comprehensive status update:", final_status)
            status_queue.put(final_status)
        
        # Signal the processor to start shutdown
        keep_running = False
        
        # Wait for processor to finish (it will process remaining queue items)
        try:
            await asyncio.wait_for(status_processor, timeout=2.0)
        except asyncio.TimeoutError:
            print("Status processor took too long to finish, forcing shutdown")
            status_processor.cancel()
    except Exception as e:
        print(f"Training error: {str(e)}")
        current_status.is_training = False
        error_status = {
            "is_training": False,
            "error": str(e)
        }
        await broadcast_status(error_status)
        return {"status": "error", "error": str(e)}
    # All status updates have been processed
    return result

@app.get("/api/status")
async def get_status():
    return current_status

TRAINED_MODEL_DIR = os.path.join(os.path.dirname(__file__), 'trained_models')

@app.get("/api/models")
async def list_models():
    models = []
    # Scan for zip files in TRAINED_MODEL_DIR
    pattern = os.path.join(TRAINED_MODEL_DIR, '*.zip')
    for file_path in glob.glob(pattern):
        name = os.path.splitext(os.path.basename(file_path))[0]
        # Try to extract timestamp from name (after last underscore)
        parts = name.split('_')
        timestamp = None
        if len(parts) > 2:
            ts_part = parts[-1]
            # Try to parse YYYYMMDD-HHMMSS
            try:
                dt = datetime.strptime(ts_part, '%Y%m%d-%H%M%S')
                timestamp = dt.isoformat() + 'Z'
            except Exception:
                timestamp = None
        models.append({
            'name': name,
            'timestamp': timestamp,
            'path': file_path
        })
    return JSONResponse(content=models)

@app.delete("/api/models/{name}")
async def delete_model(name: str):
    # Find matching zip file
    pattern = os.path.join(TRAINED_MODEL_DIR, f"{name}.zip")
    files = glob.glob(pattern)
    if not files:
        raise HTTPException(status_code=404, detail="Model not found")
    for file_path in files:
        try:
            os.remove(file_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error deleting model: {str(e)}")
    return {"status": "deleted", "name": name}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
