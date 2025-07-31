import os
import pandas as pd
import numpy as np
import random
import torch
from stable_baselines3.common.callbacks import BaseCallback
from finrl_mod.finrl.meta.env_stock_trading.env_stocktrading import StockTradingEnv
from finrl_mod.finrl.agents.stablebaselines3.models import DRLAgent
from finrl_mod.finrl.config import (
    INDICATORS,
    TRAINED_MODEL_DIR,
)




# Global model cache for inference
MODEL_CACHE = {}

def load_model(strategy, policy, device):
    cache_key = f"{strategy}_{policy}_{device}"
    if cache_key in MODEL_CACHE:
        return MODEL_CACHE[cache_key]
    agent = DRLAgent(env="inference")
    model = agent.get_model(strategy, policy=policy)
    if device == "cuda":
        model.policy.to(device)
    MODEL_CACHE[cache_key] = model
    return model

def preprocess_candles(candles, indicators=None, tickers=None):
    # Accepts either a single dict or a list of dicts
    if isinstance(candles, dict):
        candles = [candles]
    df = pd.DataFrame(candles)
    for ind in (indicators or INDICATORS):
        if ind not in df.columns:
            df[ind] = 0.5
    if tickers:
        df['tic'] = tickers if isinstance(tickers, list) else [tickers] * len(df)
    for col in ["date", "open", "high", "low", "close", "volume", "turbulence"]:
        if col not in df.columns:
            df[col] = 0
    return df

def run_RL_inference(candle=None, candles=None, indicators=None, tickers=None, strategy="ppo", policy="MlpPolicy", device="cpu", **kwargs):
    try:
        device = device if device == "cpu" or (device == "cuda" and torch.cuda.is_available()) else "cpu"
        input_candles = candles if candles is not None else candle
        df = preprocess_candles(input_candles, indicators, tickers)
        model = load_model(strategy, policy, device)
        actions = [model.predict(row.values.astype(float))[0] for _, row in df.iterrows()]
        if len(actions) == 1:
            return {"action": actions[0]}
        return {"actions": actions}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}
