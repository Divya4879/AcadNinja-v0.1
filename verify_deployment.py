#!/usr/bin/env python3
"""
Quick verification script to test if the app can start properly
"""

import os
import sys

def verify_deployment():
    print("🔍 Verifying AcadTutor Deployment")
    print("=" * 40)
    
    # Check if we can import the app
    try:
        from app import app
        print("✅ App import successful")
    except Exception as e:
        print(f"❌ App import failed: {e}")
        return False
    
    # Check environment variables
    groq_key = os.getenv('GROQ_API_KEY')
    if groq_key and groq_key not in ['your_groq_api_key_here', 'your_actual_groq_api_key_here']:
        print("✅ GROQ_API_KEY is configured")
    else:
        print("⚠️  GROQ_API_KEY not configured or using placeholder")
    
    # Check if app can be created
    try:
        with app.app_context():
            print("✅ Flask app context works")
    except Exception as e:
        print(f"❌ Flask app context failed: {e}")
        return False
    
    print("=" * 40)
    print("🎉 Deployment verification complete!")
    return True

if __name__ == "__main__":
    success = verify_deployment()
    sys.exit(0 if success else 1)
