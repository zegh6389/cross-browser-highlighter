@echo off
echo ===================================================
echo Comet & Chrome Policy Diagnostic and Cleaning Tool
echo ===================================================

echo.
echo [1] Dumping Registry Keys...
echo ---------------------------------------------------
echo Checking Chrome Policies...
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome" /s 2>nul
echo.
echo Checking Comet Policies...
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Comet" /s 2>nul
reg query "HKEY_CURRENT_USER\SOFTWARE\Policies\Comet" /s 2>nul
echo.

echo.
echo [2] Attempting to Delete Known Blocking Policies...
echo ---------------------------------------------------

:: --- Google Chrome Policies ---
call :DeleteKey "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings"
call :DeleteKey "HKEY_CURRENT_USER\SOFTWARE\Policies\Google\Chrome\ExtensionSettings"
call :DeleteKey "HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Policies\Google\Chrome\ExtensionSettings"
call :DeleteKey "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\RuntimeBlockedHosts"

:: --- Comet Browser Policies (The Fix) ---
:: Based on standard Chromium-based browser policy paths
call :DeleteKey "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Comet\ExtensionSettings"
call :DeleteKey "HKEY_CURRENT_USER\SOFTWARE\Policies\Comet\ExtensionSettings"
call :DeleteKey "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Comet\Comet\ExtensionSettings"
call :DeleteKey "HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Policies\Comet\ExtensionSettings"

:: --- Generic Chromium Policies ---
call :DeleteKey "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium\ExtensionSettings"
call :DeleteKey "HKEY_CURRENT_USER\SOFTWARE\Policies\Chromium\ExtensionSettings"

echo.
echo [3] Instructions for "Comet" Browser
echo ---------------------------------------------------
echo If the registry fix above did not work, you may need to launch Comet with a flag.
echo.
echo Try running Comet from a terminal with:
echo   start comet --disable-extensions-except="path/to/extension"
echo.
echo OR, if Comet has a specific "Enable Extensions" flag in its settings or flags page:
echo   1. Go to comet://flags (or chrome://flags)
echo   2. Search for "Extensions" or "Developer Mode"
echo.

echo Done. Please restart your browser completely.
echo.
pause
goto :eof

:DeleteKey
reg query "%~1" >nul 2>&1
if %errorlevel% equ 0 (
    echo [FOUND] %~1
    reg delete "%~1" /f
    echo [DELETED]
) else (
    echo [NOT FOUND] %~1
)
goto :eof
