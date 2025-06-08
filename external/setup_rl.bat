@echo off
setlocal

set CONDA_DIR=external\miniconda3

if not exist %CONDA_DIR%\Scripts\activate.bat (
  echo Downloading and installing Miniconda...
  powershell -Command "Invoke-WebRequest https://repo.anaconda.com/miniconda/Miniconda3-latest-Windows-x86_64.exe -OutFile external\miniconda_installer.exe"
  start /wait external\miniconda_installer.exe /InstallationType=JustMe /AddToPath=0 /RegisterPython=0 /S /D=%CD%\%CONDA_DIR%
)

call %CONDA_DIR%\Scripts\activate.bat
conda env create -f external\finrl_api\environment.yaml || conda env update -f external\finrl_api\environment.yaml
echo FinRL environment ready.
