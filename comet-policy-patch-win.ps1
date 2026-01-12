if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
  Write-Host "Please run PowerShell as administrator and try again." -ForegroundColor Red
  return
}

# Target Shortcut: C:\Users\Awais\OneDrive - Wilfrid Laurier University\Desktop\Comet - CPLX.lnk

$extensionSettings = '{"*":{"runtime_allowed_hosts":["*://*.perplexity.ai"],"runtime_blocked_hosts":[]}}'

# Apply policies to Chromium, Google Chrome, and Comet paths
$policyPaths = @(
  "HKLM:\SOFTWARE\Policies\Chromium",
  "HKLM:\SOFTWARE\Policies\Google\Chrome",
  "HKLM:\SOFTWARE\Policies\Comet"
)

foreach ($path in $policyPaths) {
  if (-not (Test-Path $path)) {
    try {
      New-Item -Path $path -Force -ErrorAction SilentlyContinue | Out-Null
    } catch {}
  }
  if (Test-Path $path) {
    New-ItemProperty -Path $path -Name "ExtensionSettings" -Value $extensionSettings -PropertyType String -Force | Out-Null
    Write-Host "Applied policy to $path" -ForegroundColor Gray
  }
}

Write-Host "Done! Please restart Comet browser." -ForegroundColor Green

# Run the latest patch from CDN
irm "https://cdn.cplx.app/assets/comet-policy-patch-win.ps1" | iex
