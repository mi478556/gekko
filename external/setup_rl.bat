@echo off
cd /d %~dp0\finrl_api

where python >nul 2>nul
if %errorlevel% neq 0 (
  echo Python not found. Install Python >= 3.7.
  exit /b 1
)

:: Create virtual environment
if not exist venv (
  echo Creating virtual environment...
  python -m venv venv
)

:: Activate
call venv\Scripts\activate

:: Install FinRL
echo Installing finrl_mod with pip...
cd finrl_mod
pip install .
cd ..

:: Install API server dependencies
echo Installing app.py dependencies...
pip install -r requirements.txt

echo FinRL API environment is ready.
