from fastapi import FastAPI, Request, WebSocket
import uvicorn
import json
from datetime import datetime
import asyncio
import queue
from run_dummy_training import run_dummy_training
from models import TrainRequest, TrainingStatus, current_status

app = FastAPI()

# WebSocket connections store
active_connections: list[WebSocket] = []

# Status update queue
status_queue = queue.Queue()

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
    
    print(f"Received training request: {req}")
    
    # Update status to training
    current_status.is_training = True
    current_status.current_step = 0
    current_status.total_steps = 2048  # From PPO params
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
            result = await asyncio.get_event_loop().run_in_executor(
                executor,
                partial(run_dummy_training, status_callback=status_callback_wrapper)
            )
        
        # Update final status in current_status
        current_status.is_training = False
        current_status.last_update = datetime.now().isoformat()
        if result.get("status") == "training complete":
            print("Training complete, updating current_status with results:", result)
            current_status.portfolio_value = result.get("final_portfolio_value", 0)
            current_status.total_trades = result.get("total_trades", 0)
            current_status.device = result.get("device", "cpu")
        
        # Send ONE final comprehensive status update with all metrics
        if result.get("status") == "training complete":
            final_status = {
                "is_training": False,
                "current_step": 2048,
                "total_steps": 2048,
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
            
            print("Sending final comprehensive status update:", final_status)
            status_queue.put(final_status)
            
            # Give time for the message to be processed
            await asyncio.sleep(0.5)
        
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
