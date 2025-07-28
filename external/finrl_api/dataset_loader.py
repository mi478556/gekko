import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime

class GekkoDatasetLoader:
    def __init__(self, db_path_or_none, dataset, indicators=None):
        """
        db_path_or_none: ignored, kept for compatibility
        dataset: dict with keys 'exchange', 'asset', 'currency', 'from', 'to'
        indicators: list of indicator names to calculate
        """
        # Always construct db path relative to this file
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        history_dir = os.path.abspath(os.path.join(base_dir, '..', '..', 'history'))
        exchange = dataset.get('exchange', 'kraken')
        db_filename = f"{exchange}_0.1.db"
        self.db_path = os.path.join(history_dir, db_filename)
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
        # Print available tables for debugging
        try:
            tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
            print(f"Available tables in {self.db_path}: {[t[0] for t in tables]}")
        except Exception as e:
            print(f"Error listing tables: {e}")
        # Construct table name for asset/currency pair
        table_name = f"candles_{self.currency}_{self.asset}"
        query = f"""
            SELECT start, open, high, low, close, volume
            FROM {table_name}
            WHERE start >= ? AND start <= ?
            ORDER BY start ASC
        """
        try:
            df = pd.read_sql(query, conn, params=(self.start, self.end))
        except Exception as e:
            print(f"Error querying table {table_name}: {e}")
            conn.close()
            raise
        conn.close()
        df['date'] = pd.to_datetime(df['start'], unit='s')
        df['tic'] = f"{self.asset}/{self.currency}"
        print("Columns after SQL load:", df.columns.tolist())
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
            print("Columns after indicator calculation:", df.columns.tolist())
        except Exception as e:
            print(f"Error calculating indicators: {e}")
        self.df = df

    def calculate_turbulence(self):
        df = self.df
        # Simple turbulence: rolling std of returns
        returns = df['close'].pct_change()
        # Avoid duplicate turbulence column
        if 'turbulence' not in df.columns:
            df['turbulence'] = returns.rolling(window=10).std().fillna(0)
        else:
            df['turbulence'] = returns.rolling(window=10).std().fillna(0)
        print("Columns after turbulence calculation:", df.columns.tolist())
        self.df = df

    def get_formatted_dataframe(self):
        df = self.df.copy()
        # Remove duplicate turbulence columns if present
        cols = pd.Series(df.columns)
        for col in cols[cols.duplicated()].unique():
            df = df.loc[:,~df.columns.duplicated()]
        print("Columns before formatting:", df.columns.tolist())
        # Standardize date column to timezone-aware UTC
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'], utc=True)
        # Remove 'turbulence' from indicators to avoid duplicate columns
        indicators = [ind for ind in self.indicators if ind != "turbulence"]
        # Ensure all required columns exist
        required_cols = [
            "date", "tic", "open", "high", "low", "close", "volume", "turbulence"
        ] + indicators
        for col in required_cols:
            if col not in df.columns:
                df[col] = 0
        # Reorder columns
        df = df[required_cols]
        print("Columns after formatting:", df.columns.tolist())
        return df

    def process(self):
        self.load_ohlcv()
        self.calculate_indicators()
        self.calculate_turbulence()