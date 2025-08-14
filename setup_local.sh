#!/bin/bash
# Local development setup script for AcadTutor

echo "🚀 Setting up AcadTutor for local development..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check .env file
if [ ! -f ".env" ] || grep -q "your_groq_api_key_here" .env; then
    echo "⚠️  Please edit .env file and add your Groq API key"
    echo "Get your key from: https://console.groq.com/keys"
    echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "To run locally:"
echo "  source venv/bin/activate"
echo "  python run_local.py"
echo ""
echo "Or simply:"
echo "  ./run_local.py"
