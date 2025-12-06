# Setup script for Droog AI installation (PowerShell)

Write-Host "🚀 Droog AI Setup Script" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Build
Write-Host "🔨 Building Droog AI..." -ForegroundColor Yellow
npm run build

# Create npm link
Write-Host "🔗 Creating npm link..." -ForegroundColor Yellow
npm link

Write-Host ""
Write-Host "✅ Droog AI is now installed and linked!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Go to your project directory"
Write-Host "   2. Run: npm link droog-ai"
Write-Host "   3. Use: droog review --repo owner/repo --pr 123"
Write-Host ""
Write-Host "💡 Or use directly: npx tsx src/index.ts review --repo owner/repo --pr 123" -ForegroundColor Yellow







