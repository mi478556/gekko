import os
import pandas as pd
import numpy as np
import random
import torch
from dataset_loader import GekkoDatasetLoader
from stable_baselines3.common.callbacks import BaseCallback
from finrl_mod.finrl.meta.env_stock_trading.env_stocktrading import StockTradingEnv
from finrl_mod.finrl.agents.stablebaselines3.models import DRLAgent
from finrl_mod.finrl.config import (
    INDICATORS,
    TRAINED_MODEL_DIR,
    TENSORBOARD_LOG_DIR,
    RESULTS_DIR,
)

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


# Named constants for defaults
DEFAULT_CAPITAL = 1e6
DEFAULT_N_POINTS = 10
DEFAULT_BUY_COST_PCT = 0.001
DEFAULT_SELL_COST_PCT = 0.001
DEFAULT_HMAX = 100
DEFAULT_REWARD_SCALING = 1e-4
DEFAULT_TOTAL_TIMESTEPS = 2048
DEFAULT_ENT_COEF = 0.01
DEFAULT_LEARNING_RATE = 0.00025
DEFAULT_BATCH_SIZE = 64

# Create necessary directories
for d in [TRAINED_MODEL_DIR, TENSORBOARD_LOG_DIR, RESULTS_DIR]:
    os.makedirs(d, exist_ok=True)


def run_RL_training(status_callback=None, strategy='ppo', start_date='2020-01-01', end_date='2020-12-31', capital=1e6, **kwargs):
    
    # Set random seeds for reproducibility
    seed = kwargs.get("seed", 42)
    np.random.seed(seed)
    random.seed(seed)
    try:
        torch.manual_seed(seed)
    except Exception:
        pass
    
    indicators = kwargs.get("indicators", INDICATORS)
    db_path = kwargs.get("db_path", "history/kraken_0.1.db")
    dataset = kwargs.get("dataset", {
        "asset": kwargs.get("asset", "BTC"),
        "currency": kwargs.get("currency", "USD"),
        "from": start_date + "T00:00:00Z",
        "to": end_date + "T23:59:59Z"
    })
    loader = GekkoDatasetLoader(db_path, dataset, indicators)
    loader.process()
    training_df = loader.get_formatted_dataframe()    

    stock_dimension = 1
    
    state_space = (3 + len(indicators)) * stock_dimension
    capital = kwargs.get("capital", capital if capital is not None else DEFAULT_CAPITAL)
    env_kwargs = {
        "hmax": kwargs.get("hmax", DEFAULT_HMAX),
        "initial_amount": capital,
        "buy_cost_pct": [kwargs.get("buy_cost_pct", DEFAULT_BUY_COST_PCT)],
        "sell_cost_pct": [kwargs.get("sell_cost_pct", DEFAULT_SELL_COST_PCT)],
        "state_space": state_space,
        "stock_dim": stock_dimension,
        "tech_indicator_list": indicators,
        "action_space": stock_dimension,
        "reward_scaling": kwargs.get("reward_scaling", DEFAULT_REWARD_SCALING),
        "num_stock_shares": [0],
        "turbulence_threshold": kwargs.get("turbulence_threshold", 0.0),
        "risk_indicator_col": kwargs.get("risk_indicator_col", "turbulence"),
        "make_plots": kwargs.get("make_plots", False)
    }
    
    e_train = StockTradingEnv(df=training_df, **env_kwargs)
    env_train, _ = e_train.get_sb_env()

    try:
        device = kwargs.get("device", "cpu")
        print(f"Using device: {device}")
        agent = DRLAgent(env=env_train)
        model = agent.get_model(
            strategy,
            policy=kwargs.get("policy", "MlpPolicy"),
            model_kwargs={"device": device}
        )
        total_steps = kwargs.get("total_timesteps", DEFAULT_TOTAL_TIMESTEPS)
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
            asset_memory = getattr(env, 'asset_memory', [])
            total_trades = getattr(env, 'trades', 0)
            final_portfolio_value = asset_memory[-1] if asset_memory else 0
            returns = ((asset_memory[-1] - asset_memory[0]) / asset_memory[0]) if asset_memory and asset_memory[0] != 0 else 0
            sharpe = 0
            if asset_memory and len(asset_memory) > 1:
                daily_returns = np.diff(asset_memory) / asset_memory[:-1]
                if np.std(daily_returns) > 0:
                    sharpe = np.sqrt(252) * np.mean(daily_returns) / np.std(daily_returns)
            stats = {
                'total_trades': total_trades,
                'portfolio_value': final_portfolio_value,
                'returns': returns,
                'sharpe': sharpe
            }
            
        # Final status update
        if status_callback:
            status_callback({
                "is_training": False,
                "current_step": total_steps,
                "total_steps": total_steps,
                "metrics": stats
            })
        # Save model and config in a subfolder named after the model_identifier
        if kwargs.get("save_model", False):
            model_identifier = kwargs.get("model_identifier", "trained_model")
            model_dir = os.path.join(TRAINED_MODEL_DIR, model_identifier)
            os.makedirs(model_dir, exist_ok=True)
            model_path = os.path.join(model_dir, f"{model_identifier}.zip")
            config_path = os.path.join(model_dir, f"{model_identifier}.json")
            model.save(model_path)
            # Save config
            import json
            config_to_save = {
                "model_identifier": model_identifier,
                "strategy": strategy,
                "policy": kwargs.get("policy", "MlpPolicy"),
                "device": kwargs.get("device", "cpu"),
                "learning_rate": kwargs.get("learning_rate", 0.00025),
                "batch_size": kwargs.get("batch_size", 64),
                "ent_coef": kwargs.get("ent_coef", 0.01),
                "total_timesteps": kwargs.get("total_timesteps", 2048),
                "seed": kwargs.get("seed", 42),
                "indicators": kwargs.get("indicators", []),
                "tickers": kwargs.get("tickers", ""),
                "start_date": kwargs.get("start_date", ""),
                "end_date": kwargs.get("end_date", ""),
                "db_path": kwargs.get("db_path", ""),
                "candle_size": kwargs.get("candle_size", None),
                "dataset": kwargs.get("dataset", {}),
                "capital": kwargs.get("capital", 100000),
                "hmax": kwargs.get("hmax", 100),
                "buy_cost_pct": kwargs.get("buy_cost_pct", 0.001),
                "sell_cost_pct": kwargs.get("sell_cost_pct", 0.001),
                "reward_scaling": kwargs.get("reward_scaling", 1),
                "turbulence_threshold": kwargs.get("turbulence_threshold", 1000),
                "risk_indicator_col": kwargs.get("risk_indicator_col", "turbulence"),
                "make_plots": kwargs.get("make_plots", False)
            }
            with open(config_path, 'w') as f:
                json.dump(config_to_save, f, indent=2)
        return {
            "status": "training complete",
            "device": device,
            "final_portfolio_value": final_portfolio_value,
            "total_trades": total_trades,
            "returns": returns,
            "sharpe": sharpe,
            "current_step": total_steps,  # Add actual steps completed
            "total_steps": total_steps    # Add total steps from training
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}
