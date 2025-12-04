# Test Java Project Analyzer
# D:\test-java-project vich saare Java files analyze karega

$projectPath = "D:\test-java-project"
$droogPath = "D:\DROOG AI"

Write-Host "🚀 Test Java Project Analyzer" -ForegroundColor Cyan
Write-Host "📁 Project: $projectPath" -ForegroundColor Yellow
Write-Host ""

# Check if project exists
if (-not (Test-Path $projectPath)) {
    Write-Host "❌ Project path nahi mila: $projectPath" -ForegroundColor Red
    exit 1
}

# Change to Droog AI directory
Set-Location $droogPath

# Find all Java files
$javaFiles = Get-ChildItem -Path $projectPath -Filter "*.java" -Recurse

if ($javaFiles.Count -eq 0) {
    Write-Host "❌ Koi Java file nahi mili!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Found $($javaFiles.Count) Java file(s):" -ForegroundColor Green
$javaFiles | ForEach-Object { Write-Host "   - $($_.FullName)" }

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Analyze each file
$fileNumber = 1
foreach ($file in $javaFiles) {
    Write-Host "[$fileNumber/$($javaFiles.Count)] Analyzing: $($file.Name)" -ForegroundColor Yellow
    Write-Host "-" * 60 -ForegroundColor Gray
    
    # Run analyze command
    npx tsx src/index.ts analyze --file $file.FullName
    
    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""
    
    $fileNumber++
}

Write-Host "✅ Analysis complete! $($javaFiles.Count) file(s) analyzed." -ForegroundColor Green


