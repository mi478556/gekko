@echo off
setlocal

set CONDA_DIR=external\miniconda3
set ENV_NAME=finrl_env

REM Install Miniconda if not present
if not exist %CONDA_DIR%\Scripts\activate.bat (
  echo Downloading and installing Miniconda...
  powershell -Command "Invoke-WebRequest https://repo.anaconda.com/miniconda/Miniconda3-latest-Windows-x86_64.exe -OutFile external\miniconda_installer.exe"
  start /wait external\miniconda_installer.exe /InstallationType=JustMe /AddToPath=0 /RegisterPython=0 /S /D=%CD%\%CONDA_DIR%
)

REM Update PATH to include Miniconda
set PATH=%CD%\%CONDA_DIR%\Scripts;%CD%\%CONDA_DIR%;%PATH%

REM Create or update the environment
conda env list | findstr /C:"%ENV_NAME%" >nul
if errorlevel 1 (
  echo Creating environment %ENV_NAME%...
  conda env create -f external\finrl_api\environment.yaml
) else (
  echo Updating environment %ENV_NAME%...
  conda env update -f external\finrl_api\environment.yaml
)

REM Activate the environment without requiring conda init
call %CONDA_DIR%\Scripts\activate.bat %ENV_NAME%

REM Now safely run pip installs
pip install -r external\finrl_api\requirements.txt
pip install -e external\finrl_api\finrl_mod

echo ✅ FinRL environment is ready.
