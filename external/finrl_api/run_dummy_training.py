from stable_baselines3.common.callbacks import BaseCallback
# ...existing code...

# ProgressCallback for real-time training progress
class ProgressCallback(BaseCallback):
    def __init__(self, status_callback, total_timesteps, verbose=0):
        super().__init__(verbose)
        self.status_callback = status_callback
        self.total_timesteps = total_timesteps
        self._current_progress = 0

    def _on_step(self) -> bool:
        progress = int(self.num_timesteps)
        if progress != self._current_progress:
            self._current_progress = progress
            status = {
                "is_training": True,
                "current_step": progress,
                "total_steps": self.total_timesteps,
                "metrics": None
            }
            if self.status_callback:
                self.status_callback(status)
        return True
# run_dummy_training.py
import os
import pandas as pd
import numpy as np
from finrl_mod.finrl.meta.env_stock_trading.env_stocktrading import StockTradingEnv
from finrl_mod.finrl.agents.stablebaselines3.models import DRLAgent
from finrl_mod.finrl.config import (
    INDICATORS,
    TRAINED_MODEL_DIR,
    TENSORBOARD_LOG_DIR,
    RESULTS_DIR,
)

# Create necessary directories
os.makedirs(TRAINED_MODEL_DIR, exist_ok=True)
os.makedirs(TENSORBOARD_LOG_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)


def run_dummy_training(status_callback=None, strategy='ppo', start_date='2020-01-01', end_date='2020-12-31', capital=1e6, **kwargs):
    print("Training config received:", kwargs)
    # Set random seeds for reproducibility
    seed = kwargs.get("seed", 42)
    import random
    np.random.seed(seed)
    random.seed(seed)
    import torch
    try:
        torch.manual_seed(seed)
    except Exception:
        pass
    # Step 1: Create synthetic dataset with all required indicators
    n_points = 10
    data = {
        "date": pd.date_range(start_date, periods=n_points),
        "tic": ["AAPL"] * n_points,
        "open": np.linspace(100, 110, n_points),
        "high": np.linspace(101, 111, n_points),
        "low": np.linspace(99, 109, n_points),
        "close": np.linspace(100, 110, n_points),
        "volume": np.random.randint(1000000, 2000000, size=n_points),
        "macd": [0.5] * n_points,
        "boll_ub": [105] * n_points,
        "boll_lb": [95] * n_points,
        "rsi_30": [50] * n_points,
        "cci_30": [100] * n_points,
        "dx_30": [30] * n_points,
        "close_30_sma": [100] * n_points,
        "close_60_sma": [100] * n_points,
        "turbulence": [0] * n_points
    }
    df = pd.DataFrame(data)

    # Step 2: Create training environment
    stock_dimension = 1
    state_space = (3 + len(INDICATORS)) * stock_dimension
    env_kwargs = {
        "hmax": kwargs.get("hmax", 100),
        "initial_amount": capital,
        "buy_cost_pct": [kwargs.get("buy_cost_pct", 0.001)],
        "sell_cost_pct": [kwargs.get("sell_cost_pct", 0.001)],
        "state_space": state_space,
        "stock_dim": stock_dimension,
        "tech_indicator_list": kwargs.get("indicators", INDICATORS),
        "action_space": stock_dimension,
        "reward_scaling": kwargs.get("reward_scaling", 1e-4),
        "num_stock_shares": [0],
        "turbulence_threshold": kwargs.get("turbulence_threshold", None),
        "risk_indicator_col": kwargs.get("risk_indicator_col", "turbulence"),
        "make_plots": kwargs.get("make_plots", False)
    }
    e_train = StockTradingEnv(df=df, **env_kwargs)
    env_train, _ = e_train.get_sb_env()

    try:
        requested_device = kwargs.get("device", "cpu")
        device = requested_device if requested_device == "cpu" or (requested_device == "cuda" and torch.cuda.is_available()) else "cpu"
        print(f"Using device: {device}")
        PPO_PARAMS = {
            "n_steps": kwargs.get("total_timesteps", 2048),
            "ent_coef": kwargs.get("ent_coef", 0.01),
            "learning_rate": kwargs.get("learning_rate", 0.00025),
            "batch_size": kwargs.get("batch_size", 64),
            "device": device
        }
        agent = DRLAgent(env=env_train)
        model = agent.get_model(strategy, policy=kwargs.get("policy", "MlpPolicy"))
        if device == "cuda":
            model.policy.to(device)
        total_steps = kwargs.get("total_timesteps", 2048)
        # Use ProgressCallback for real-time progress updates
        verbose = int(kwargs.get("verbose", 0))
        progress_callback = ProgressCallback(status_callback, total_steps, verbose=verbose)
        model.learn(
            total_timesteps=total_steps,
            callback=progress_callback,
            progress_bar=False
        )
        # Extract metrics
        final_portfolio_value = None
        total_trades = None
        returns = None
        sharpe = None
        stats = {}
        if hasattr(model, 'env') and hasattr(model.env, 'envs'):
            env = model.env.envs[0]
            if hasattr(env, 'asset_memory') and env.asset_memory:
                final_portfolio_value = env.asset_memory[-1]
                returns = (env.asset_memory[-1] - env.asset_memory[0]) / env.asset_memory[0] if env.asset_memory[0] != 0 else 0
                if len(env.asset_memory) > 1:
                    daily_returns = np.diff(env.asset_memory) / env.asset_memory[:-1]
                    if np.std(daily_returns) > 0:
                        sharpe = np.sqrt(252) * np.mean(daily_returns) / np.std(daily_returns)
            if hasattr(env, 'trades'):
                total_trades = env.trades
            stats = {
                'total_trades': total_trades if total_trades is not None else 0,
                'portfolio_value': final_portfolio_value if final_portfolio_value is not None else 0,
                'returns': returns if returns is not None else 0,
                'sharpe': sharpe if sharpe is not None else 0
            }
            print("\nTraining Statistics:")
            for key, value in stats.items():
                print(f"{key}: {value}")
        # Final status update
        if status_callback:
            status_callback({
                "is_training": False,
                "current_step": total_steps,
                "total_steps": total_steps,
                "metrics": stats
            })
        # Save model if requested
        if kwargs.get("save_model", False):
            model.save(os.path.join(TRAINED_MODEL_DIR, "trained_model.zip"))
        return {
            "status": "training complete",
            "device": device,
            "final_portfolio_value": final_portfolio_value if final_portfolio_value is not None else 0,
            "total_trades": total_trades if total_trades is not None else 0,
            "returns": returns if returns is not None else 0,
            "sharpe": sharpe if sharpe is not None else 0
        }
    except Exception as e:
        import traceback
        print(f"Training error: {str(e)}")
        traceback.print_exc()
        return {"status": "error", "message": str(e)}
