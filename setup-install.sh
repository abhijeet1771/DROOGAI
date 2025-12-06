#!/bin/bash
# Setup script for Droog AI installation

echo "🚀 Droog AI Setup Script"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo "✅ npm found: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build
echo "🔨 Building Droog AI..."
npm run build

# Create npm link
echo "🔗 Creating npm link..."
npm link

echo ""
echo "✅ Droog AI is now installed and linked!"
echo ""
echo "📝 Next steps:"
echo "   1. Go to your project directory"
echo "   2. Run: npm link droog-ai"
echo "   3. Use: droog review --repo owner/repo --pr 123"
echo ""
echo "💡 Or use directly: npx tsx src/index.ts review --repo owner/repo --pr 123"







