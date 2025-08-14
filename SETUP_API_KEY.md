# 🔑 Groq API Key Setup Guide

## ❌ Current Issue: Invalid API Key

You're seeing a **401 Unauthorized** error because the Groq API key is not properly configured.

## ✅ Quick Fix (2 minutes)

### Step 1: Get Your Groq API Key
1. Go to [Groq Console](https://console.groq.com/keys)
2. Sign up or log in to your account
3. Click "Create API Key"
4. Copy the generated key (starts with `gsk_...`)

### Step 2: Update Your .env File
1. Open the `.env` file in your project root
2. Replace this line:
   ```
   GROQ_API_KEY=your_actual_groq_api_key_here
   ```
   
   With your actual key:
   ```
   GROQ_API_KEY=gsk_your_actual_key_here_very_long_string
   ```

### Step 3: Restart the Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
./run_local.py
```

## 🔍 Verify It's Working

1. Open your browser to `http://localhost:5000`
2. Check the browser console (F12)
3. You should see: `✅ API connection successful`

## 🚨 Common Issues

### Issue: "API key not configured"
- **Solution**: Make sure you saved the `.env` file after editing

### Issue: "Invalid API Key" 
- **Solution**: Double-check you copied the full API key correctly
- **Note**: Keys start with `gsk_` and are very long

### Issue: Still not working
- **Solution**: Restart the server completely
- **Check**: Make sure there are no extra spaces in the `.env` file

## 📝 Example .env File

```bash
# Groq API Configuration
GROQ_API_KEY=gsk_1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop

# Local Development  
FLASK_ENV=development
FLASK_DEBUG=True
```

## ✅ Success!

Once configured correctly, you'll see:
- ✅ Green "API connection successful" message
- ✅ Quiz generation will work
- ✅ Topic explanations will work
- ✅ All AI features enabled

## 🆓 Free Tier

Groq offers a generous free tier that's perfect for development and testing!

---

**Need help?** Check the browser console (F12) for detailed error messages.
