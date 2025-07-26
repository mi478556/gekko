from fastapi import FastAPI, Request
from pydantic import BaseModel
import uvicorn
import subprocess


# Import your RL training code (adjust path as needed)
# from finrl_mod.main_rl_loop import run_training

app = FastAPI()

# Define expected input schema for training
class TrainRequest(BaseModel):
    strategy: str
    start_date: str
    end_date: str
    capital: float

@app.get("/")
async def read_root():
    return {"status": "FinRL API running"}

@app.post("/api/train")
async def train_rl(req: TrainRequest):
    # Dummy logic for now
    print(f"Received training request: {req}")
    
    # Example: Run training function
    # result = run_training(req.strategy, req.start_date, req.end_date, req.capital)
    result = {"message": "Training started", "strategy": req.strategy}
    
    return result

@app.get("/api/status")
async def get_status():
    # Placeholder status check
    return {"status": "idle"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
