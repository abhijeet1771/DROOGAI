# Simple Java Project Test Script
$projectPath = "D:\test-java-project"
$droogPath = "D:\DROOG AI"

Write-Host "🚀 Test Java Project" -ForegroundColor Cyan
Write-Host ""

# Find all Java files
$javaFiles = Get-ChildItem -Path $projectPath -Filter "*.java" -Recurse

Write-Host "📋 Found $($javaFiles.Count) Java file(s):" -ForegroundColor Green
foreach ($file in $javaFiles) {
    Write-Host "   ✓ $($file.FullName.Replace($projectPath, '.'))"
}

Write-Host ""
Write-Host "Analyzing first file as test..." -ForegroundColor Yellow
Write-Host ""

if ($javaFiles.Count -gt 0) {
    $firstFile = $javaFiles[0].FullName
    Write-Host "File: $firstFile" -ForegroundColor Cyan
    Write-Host ""
    
    Set-Location $droogPath
    npx tsx src/index.ts analyze --file $firstFile
}






