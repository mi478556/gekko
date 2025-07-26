from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union

class TrainRequest(BaseModel):
    strategy: str
    start_date: str
    end_date: str
    capital: float

class TrainingStatus(BaseModel):
    is_training: bool
    current_step: int = 0
    total_steps: int = 0
    metrics: Dict[str, float] = {}
    last_update: str = ""
    device: str = "cpu"
    episode: int = 0
    total_trades: int = 0
    portfolio_value: float = 0
    returns: float = 0
    sharpe: float = 0

# Global state (in-memory for now, could be moved to Redis/DB later)
current_status = TrainingStatus(is_training=False)
