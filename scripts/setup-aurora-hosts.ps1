# Run from an elevated PowerShell session. This only adds the local development hostname.
$hosts = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
if (-not (Select-String -LiteralPath $hosts -Pattern '^\s*127\.0\.0\.1\s+aurora\.test\s*$' -Quiet)) {
  Add-Content -LiteralPath $hosts -Value "`n127.0.0.1 aurora.test"
  Write-Host 'Added aurora.test. Open http://aurora.test:8080'
} else { Write-Host 'aurora.test is already configured.' }
