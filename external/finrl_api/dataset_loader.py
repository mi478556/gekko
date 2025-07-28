import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime

class GekkoDatasetLoader:
    def __init__(self, db_path, dataset, indicators=None):
        """
        db_path: path to Gekko SQLite database
        dataset: dict with keys 'asset', 'currency', 'from', 'to'
        indicators: list of indicator names to calculate
        """
        self.db_path = db_path
        self.asset = dataset['asset']
        self.currency = dataset['currency']
        self.start = self.iso_to_unix(dataset['from'])
        self.end = self.iso_to_unix(dataset['to'])
        self.indicators = indicators or []
        self.df = None

    @staticmethod
    def iso_to_unix(iso_str):
        iso_str = iso_str.replace('Z', '')
        dt = datetime.fromisoformat(iso_str)
        return int(dt.timestamp())

    def load_ohlcv(self):
        conn = sqlite3.connect(self.db_path)
        query = """
            SELECT start, open, high, low, close, volume
            FROM candles
            WHERE start >= ? AND start <= ?
            ORDER BY start ASC
        """
        df = pd.read_sql(query, conn, params=(self.start, self.end))
        conn.close()
        df['date'] = pd.to_datetime(df['start'], unit='s')
        df['tic'] = f"{self.asset}/{self.currency}"
        self.df = df
        return df

    def calculate_indicators(self):
        df = self.df
        if df is None or df.empty:
            print("Warning: No data to calculate indicators.")
            return
        try:
            if 'macd' in self.indicators:
                df['macd'] = (df['close'].ewm(span=12, adjust=False).mean() - df['close'].ewm(span=26, adjust=False).mean()).fillna(0)
            if 'boll_ub' in self.indicators or 'boll_lb' in self.indicators:
                sma = df['close'].rolling(window=20).mean()
                std = df['close'].rolling(window=20).std()
                if 'boll_ub' in self.indicators:
                    df['boll_ub'] = (sma + 2 * std).fillna(0)
                if 'boll_lb' in self.indicators:
                    df['boll_lb'] = (sma - 2 * std).fillna(0)
            if 'rsi_30' in self.indicators:
                delta = df['close'].diff()
                gain = (delta.where(delta > 0, 0)).rolling(window=30).mean()
                loss = (-delta.where(delta < 0, 0)).rolling(window=30).mean()
                rs = gain / (loss.replace(0, np.nan))
                df['rsi_30'] = (100 - (100 / (1 + rs))).fillna(0)
            if 'cci_30' in self.indicators:
                tp = (df['high'] + df['low'] + df['close']) / 3
                sma = tp.rolling(window=30).mean()
                mad = tp.rolling(window=30).apply(lambda x: np.fabs(x - x.mean()).mean())
                df['cci_30'] = ((tp - sma) / (0.015 * mad.replace(0, np.nan))).fillna(0)
            if 'dx_30' in self.indicators:
                high = df['high']
                low = df['low']
                close = df['close']
                plus_dm = high.diff()
                minus_dm = low.diff().abs()
                plus_dm[plus_dm < 0] = 0
                minus_dm[minus_dm < 0] = 0
                tr1 = (high - low).abs()
                tr2 = (high - close.shift()).abs()
                tr3 = (low - close.shift()).abs()
                tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
                atr = tr.rolling(window=30).mean()
                plus_di = 100 * (plus_dm.rolling(window=30).mean() / atr.replace(0, np.nan))
                minus_di = 100 * (minus_dm.rolling(window=30).mean() / atr.replace(0, np.nan))
                dx = 100 * (abs(plus_di - minus_di) / (plus_di + minus_di).replace(0, np.nan))
                df['dx_30'] = dx.fillna(0)
            if 'close_30_sma' in self.indicators:
                df['close_30_sma'] = df['close'].rolling(window=30).mean().fillna(0)
            if 'close_60_sma' in self.indicators:
                df['close_60_sma'] = df['close'].rolling(window=60).mean().fillna(0)
        except Exception as e:
            print(f"Error calculating indicators: {e}")
        self.df = df

    def calculate_turbulence(self):
        df = self.df
        # Simple turbulence: rolling std of returns
        returns = df['close'].pct_change()
        df['turbulence'] = returns.rolling(window=10).std().fillna(0)
        self.df = df

    def get_formatted_dataframe(self):
        df = self.df.copy()
        # Ensure all required columns exist
        required_cols = [
            "date", "tic", "open", "high", "low", "close", "volume", "turbulence"
        ] + self.indicators
        for col in required_cols:
            if col not in df.columns:
                df[col] = 0
        # Reorder columns
        df = df[required_cols]
        return df

    def process(self):
        self.load_ohlcv()
        self.calculate_indicators()
        self.calculate_turbulence()