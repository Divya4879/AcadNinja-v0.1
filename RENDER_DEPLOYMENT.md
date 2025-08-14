# 🚀 Render Deployment Instructions

## Quick Deploy Checklist

### 1. GitHub Repository
- ✅ Repository: `https://github.com/Divya4879/AcadNinja-v0.1`
- ✅ Branch: `main`
- ✅ All files committed and ready

### 2. Render Configuration

**Service Settings:**
```
Name: acadtutor
Environment: Python 3
Build Command: pip install -r requirements.txt
Start Command: gunicorn --bind 0.0.0.0:$PORT app:app
Health Check Path: /api/health
```

**Environment Variables:**
```
GROQ_API_KEY = your_actual_groq_api_key_here
```

### 3. Deployment Steps

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect GitHub repository: `Divya4879/AcadNinja-v0.1`**
4. **Configure settings as above**
5. **Add environment variable with your API key**
6. **Click "Create Web Service"**
7. **Wait for deployment (5-10 minutes)**

### 4. Verify Deployment

After deployment, test these URLs:
- **Main App**: `https://your-app-name.onrender.com`
- **Health Check**: `https://your-app-name.onrender.com/api/health`
- **API Test**: `https://your-app-name.onrender.com/api/test`

### 5. Expected Result

✅ **Working Features:**
- AI-powered quiz generation
- Comprehensive topic explanations (2000+ words)
- Progress tracking
- Responsive design
- All interactive features

### 6. Troubleshooting

**If build fails:**
- Check build logs in Render dashboard
- Verify `requirements.txt` is correct
- Ensure Python version compatibility

**If app doesn't start:**
- Verify `GROQ_API_KEY` environment variable is set
- Check application logs
- Test `/api/health` endpoint

**If API features don't work:**
- Verify Groq API key is valid
- Test `/api/test-connection` endpoint
- Check browser console for errors

## 🎉 Success!

Your AcadTutor app will be live at:
`https://acadtutor-[random].onrender.com`

**All features will be fully functional in production!**
