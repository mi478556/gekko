#!/bin/bash

CONDA_DIR="external/miniconda3"

if [ ! -d "$CONDA_DIR" ]; then
  echo "Installing Miniconda..."
  curl -L -o external/miniconda.sh https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
  bash external/miniconda.sh -b -p "$CONDA_DIR"
fi

source "$CONDA_DIR/etc/profile.d/conda.sh"
conda activate finrl_env

conda env create -f external/finrl_api/environment.yaml || conda env update -f external/finrl_api/environment.yaml

source "$CONDA_DIR/bin/activate" finrl_env
pip install -r external/finrl_api/requirements.txt
pip install -e external/finrl_api/finrl_mod
echo "✅ FinRL environment is ready."
