from pydantic import BaseModel
from typing import Dict, List, Any

class TrainRequest(BaseModel):
    strategy: str
    start_date: str
    end_date: str
    capital: float
    tickers: str
    indicators: List[str]
    buy_cost_pct: float
    sell_cost_pct: float
    hmax: int
    reward_scaling: float
    turbulence_threshold: float
    risk_indicator_col: str
    make_plots: bool
    policy: str
    learning_rate: float
    batch_size: int
    total_timesteps: int
    ent_coef: float
    device: str
    save_model: bool
    verbose: bool
    seed: int
    dataset: Dict[str, Any]
    
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
