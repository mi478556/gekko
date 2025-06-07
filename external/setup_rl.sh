#!/bin/bash

cd "$(dirname "$0")/finrl_api"

# Confirm Python 3
if ! command -v python3 &> /dev/null; then
  echo "Python 3 not found. Install Python >= 3.7."
  exit 1
fi

# Set up virtual environment
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate

# Install FinRL fork from local path
echo "Installing finrl_mod with pip..."
cd finrl_mod
pip install .
cd ..

# Install API requirements (Flask, etc.)
echo "Installing app.py dependencies..."
pip install -r requirements.txt

echo "✅ FinRL API environment is ready."
