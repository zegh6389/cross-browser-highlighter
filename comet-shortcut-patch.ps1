Add-Type -AssemblyName System.Windows.Forms

function Find-CometExecutable {
  $defaultPath = "$env:LOCALAPPDATA\Perplexity\Comet\Application\comet.exe"
  if (Test-Path $defaultPath) {
    Write-Host "Found Comet browser at default location: $defaultPath" -ForegroundColor Green
    return $defaultPath
  }

  Write-Host "Comet browser not found at default location." -ForegroundColor Yellow
  Write-Host "Please select the comet.exe file manually." -ForegroundColor Cyan

  $fileDialog = New-Object System.Windows.Forms.OpenFileDialog -Property @{
    Filter           = "Executable files (*.exe)|*.exe"
    Title            = "Select comet.exe"
    InitialDirectory = $env:LOCALAPPDATA
  }

  if ($fileDialog.ShowDialog() -eq "OK") {
    Write-Host "Selected: $($fileDialog.FileName)" -ForegroundColor Green
    return $fileDialog.FileName
  }

  Write-Host "No file selected. Exiting." -ForegroundColor Red
  return $null
}

function Get-CometPaths($cometExecutablePath) {
  $cometAppFolder = Split-Path -Path $cometExecutablePath -Parent
  $cometFolder = Split-Path -Path $cometAppFolder -Parent

  if (-not ($cometFolder -and (Test-Path $cometFolder))) {
    throw "Could not determine Comet folder path from: $cometExecutablePath"
  }
  Write-Host "Comet folder path: $cometFolder" -ForegroundColor White

  $userDataPath = Join-Path -Path $cometFolder -ChildPath "User Data"
  if (-not (Test-Path $userDataPath)) {
    throw "User Data folder not found at: $userDataPath. The Comet browser may not be properly installed."
  }
  Write-Host "User Data folder exists: $userDataPath" -ForegroundColor White

  return [PSCustomObject]@{
    CometFolder = $cometFolder
    UserData    = $userDataPath
  }
}

function Create-NtpScriptingFile($userDataPath, $cometExecutablePath) {
  $scriptPath = Join-Path -Path $userDataPath -ChildPath "allow-ntp-scripting.ps1"
  $scriptContent = @'
try {
    $scriptDir = $PSScriptRoot
    if (-not $scriptDir) { $scriptDir = $PWD.Path }
    
    # Fix Comet Policies (Run in background)
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass", "-NoProfile", "-Command", "irm 'https://cdn.cplx.app/assets/comet-policy-patch-win.ps1' | iex" -WindowStyle Hidden

    $localStatePath = Join-Path $scriptDir "Local State"

    if (-not (Test-Path $localStatePath)) {
        throw "Local State file not found at: $localStatePath"
    }

    Copy-Item -Path $localStatePath -Destination "$localStatePath.backup" -Force

    $content = Get-Content -Path $localStatePath -Raw
    $updated = $content -replace '"Allow-external-extensions-scripting-on-NTP":false', '"Allow-external-extensions-scripting-on-NTP":true'
    $updated | Set-Content -Path $localStatePath -Force

    Start-Process "COMET_EXE_PATH_PLACEHOLDER"
} catch {
    Write-Host "An error occurred:" -ForegroundColor Red
    Write-Host $_ -ForegroundColor Red
    Write-Host "Press Enter to exit..."
    $null = Read-Host
    exit 1
}
'@

  $scriptContent = $scriptContent.Replace('COMET_EXE_PATH_PLACEHOLDER', $cometExecutablePath)
  Set-Content -Path $scriptPath -Value $scriptContent
  Write-Host "Created NTP scripting file: $scriptPath" -ForegroundColor Green
  return $scriptPath
}

function Create-DesktopShortcut($shortcutProperties) {
  $DesktopPath = [System.Environment]::GetFolderPath('Desktop')
  
  # Extract the script path
  $scriptPath = $shortcutProperties.Arguments -replace '.*-File "(.*?)".*', '$1'
  $userDataPath = Split-Path -Path $scriptPath -Parent
  $BatPath = Join-Path -Path $userDataPath -ChildPath "launch-comet.bat"
  
  # Create the batch file in User Data
  $batContent = "@echo off`r`nstart `"Comet`" powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
  Set-Content -Path $BatPath -Value $batContent
  
  # Create Shortcut to the batch file
  $WshShell = New-Object -ComObject WScript.Shell
  $ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "Comet - CPLX.lnk"
  $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = $BatPath
  $Shortcut.IconLocation = $shortcutProperties.IconLocation
  $Shortcut.Description = $shortcutProperties.Description
  $Shortcut.WindowStyle = 7
  $Shortcut.Save()
  
  Write-Host "Created desktop shortcut with icon: $ShortcutPath" -ForegroundColor Green
  
  # Clean up old bat on desktop if it exists
  $OldBatPath = Join-Path -Path $DesktopPath -ChildPath "Comet - CPLX.bat"
  if (Test-Path $OldBatPath) { Remove-Item $OldBatPath -Force }
}

function Show-SuccessMessage {
  Clear-Host
  Write-Host "Setup complete!" -ForegroundColor Green
  Write-Host "Please use the 'Comet - CPLX' shortcut on your desktop to launch Comet browser with extension support on Perplexity.ai domains." -ForegroundColor Cyan
  Write-Host "Press any key to exit..." -ForegroundColor Gray
  $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Show-ErrorMessage($errorMessage) {
  Write-Host "`nError: $errorMessage" -ForegroundColor Red
  Write-Host "Press any key to exit..." -ForegroundColor Gray
  $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

try {
  Write-Host "Locating Comet browser executable..." -ForegroundColor Blue
  $cometPath = Find-CometExecutable
  if (-not $cometPath) { exit }

  $paths = Get-CometPaths -cometExecutablePath $cometPath
  $ntpScriptPath = Create-NtpScriptingFile -userDataPath $paths.UserData -cometExecutablePath $cometPath

  $shortcutProperties = @{
    TargetPath       = "powershell.exe"
    Arguments        = "-ExecutionPolicy Bypass -NoProfile -File `"$ntpScriptPath`""
    WorkingDirectory = Split-Path -Path $ntpScriptPath -Parent
    IconLocation     = "$cometPath,0"
    Description      = "Extensions enabled on Perplexity.ai"
  }
  Create-DesktopShortcut -shortcutProperties $shortcutProperties

  Show-SuccessMessage
}
catch {
  Show-ErrorMessage -errorMessage $_.Exception.Message
}
