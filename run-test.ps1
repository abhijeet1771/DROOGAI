# Test script for enterprise upgrade
Write-Host "🧪 Running Enterprise Upgrade Tests..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Basic component test
Write-Host "Test 1: Basic Components..." -ForegroundColor Yellow
npx tsx test-basic.js > test-output.txt 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Basic test completed" -ForegroundColor Green
    Get-Content test-output.txt
} else {
    Write-Host "✗ Basic test failed" -ForegroundColor Red
    Get-Content test-output.txt
}

Write-Host ""
Write-Host "Test 2: CLI Help..." -ForegroundColor Yellow
npx tsx src/index.ts --help > cli-help.txt 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ CLI help works" -ForegroundColor Green
    Get-Content cli-help.txt | Select-Object -First 10
} else {
    Write-Host "✗ CLI help failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Test script completed!" -ForegroundColor Green
Write-Host "Check test-output.txt and cli-help.txt for details"








