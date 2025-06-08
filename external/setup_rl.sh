#!/bin/bash

CONDA_DIR="external/miniconda3"

if [ ! -d "$CONDA_DIR" ]; then
  echo "Installing Miniconda..."
  curl -L -o external/miniconda.sh https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
  bash external/miniconda.sh -b -p "$CONDA_DIR"
fi

source "$CONDA_DIR/bin/activate"
conda env create -f external/finrl_api/environment.yaml || conda env update -f external/finrl_api/environment.yaml
echo "✅ FinRL environment is ready."
