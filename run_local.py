#!/usr/bin/env python3
"""
Local development server for AcadTutor
Run this for local development and testing
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check if GROQ_API_KEY is set
groq_key = os.getenv('GROQ_API_KEY')
if not groq_key or groq_key in ['your_groq_api_key_here', 'your_actual_groq_api_key_here']:
    print("🚨 GROQ_API_KEY NOT CONFIGURED!")
    print("=" * 50)
    print("❌ You need to set up your Groq API key first.")
    print("")
    print("📋 Quick Setup:")
    print("1. Go to: https://console.groq.com/keys")
    print("2. Create a new API key")
    print("3. Edit the .env file in this directory")
    print("4. Replace 'your_actual_groq_api_key_here' with your real key")
    print("")
    print("📖 For detailed instructions, see: SETUP_API_KEY.md")
    print("=" * 50)
    print("")
    print("⚠️  Starting server anyway (some features won't work)...")
    print("")

# Import and run the app
try:
    from app import app
    print("🚀 Starting AcadTutor local development server...")
    print("📱 Open: http://localhost:5000")
    print("🔧 Press Ctrl+C to stop")
    
    if groq_key and groq_key not in ['your_groq_api_key_here', 'your_actual_groq_api_key_here']:
        print("✅ Groq API key configured - all features available!")
    else:
        print("⚠️  Groq API key not configured - AI features disabled")
    
    print()
    
    app.run(host='0.0.0.0', port=5000, debug=True)
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you've activated the virtual environment:")
    print("source venv/bin/activate")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error starting server: {e}")
    sys.exit(1)
