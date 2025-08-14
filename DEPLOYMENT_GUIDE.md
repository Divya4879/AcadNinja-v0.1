# 🚀 AcadTutor Deployment Guide for Render

## Step-by-Step Deployment Instructions

### 1. **Prepare Your Repository**

✅ **Already Done:**
- `requirements.txt` - Python dependencies
- `render.yaml` - Render service configuration
- `runtime.txt` - Python version specification
- `.gitignore` - Ignore sensitive files
- `README.md` - Project documentation
- Updated `app.py` with Render compatibility

### 2. **Push to GitHub**

```bash
# If you haven't already, create a GitHub repository
# Then push your code:

git remote add origin https://github.com/YOUR_USERNAME/acadtutor.git
git branch -M main
git push -u origin main
```

### 3. **Deploy on Render**

#### **Option A: Using render.yaml (Recommended)**

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Blueprint"**
3. **Connect your GitHub repository**
4. **Render will automatically detect `render.yaml`**
5. **Set Environment Variables:**
   - `GROQ_API_KEY` = `your_groq_api_key_here`
6. **Click "Apply"**

#### **Option B: Manual Web Service**

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure:**
   - **Name**: `acadtutor`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT app:app`
   - **Health Check Path**: `/api/health`
5. **Environment Variables:**
   - `GROQ_API_KEY` = `your_groq_api_key_here`
   - `PYTHON_VERSION` = `3.9.18`
6. **Click "Create Web Service"**

### 4. **Verify Deployment**

After deployment, test these endpoints:

- **Main App**: `https://your-app-name.onrender.com`
- **Health Check**: `https://your-app-name.onrender.com/api/health`
- **API Test**: `https://your-app-name.onrender.com/api/test`

### 5. **Environment Variables Setup**

In Render Dashboard → Your Service → Environment:

```
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
PYTHON_VERSION=3.9.18
```

### 6. **Custom Domain (Optional)**

1. **Go to your service settings**
2. **Click "Custom Domains"**
3. **Add your domain**
4. **Update DNS records as instructed**

## 🔧 Configuration Files Explained

### `render.yaml`
```yaml
services:
  - type: web
    name: acadtutor
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn --bind 0.0.0.0:$PORT app:app
    envVars:
      - key: PYTHON_VERSION
        value: 3.9.18
      - key: GROQ_API_KEY
        sync: false
    healthCheckPath: /api/health
```

### `requirements.txt`
```
Flask==2.3.3
Flask-CORS==4.0.0
python-dotenv==1.0.0
requests==2.31.0
gunicorn==21.2.0
Werkzeug==2.3.7
urllib3==2.0.7
```

### `runtime.txt`
```
python-3.9.18
```

## 🚨 Troubleshooting

### **Common Issues:**

1. **Build Fails**
   - Check `requirements.txt` for correct versions
   - Ensure Python version compatibility

2. **App Won't Start**
   - Verify `GROQ_API_KEY` is set correctly
   - Check logs in Render dashboard

3. **API Errors**
   - Test `/api/health` endpoint
   - Verify Groq API key is valid

4. **Static Files Not Loading**
   - Ensure `static/` folder is in repository
   - Check Flask static file configuration

### **Debugging Commands:**

```bash
# Test locally first
python app.py

# Check requirements
pip install -r requirements.txt

# Test API endpoints
curl https://your-app.onrender.com/api/health
```

## 📊 Monitoring

### **Health Checks:**
- Render automatically monitors `/api/health`
- Check service logs in Render dashboard
- Set up alerts for downtime

### **Performance:**
- Monitor response times
- Check memory usage
- Scale up if needed

## 🔒 Security

### **Environment Variables:**
- Never commit `.env` files
- Use Render's environment variable system
- Rotate API keys regularly

### **HTTPS:**
- Render provides free SSL certificates
- All traffic is automatically encrypted

## 🎉 Success!

Your AcadTutor application should now be live at:
`https://your-app-name.onrender.com`

### **Features Available:**
- ✅ AI-powered quiz generation
- ✅ Comprehensive topic explanations
- ✅ Progress tracking
- ✅ Responsive design
- ✅ Real-time AI interactions

## 📞 Support

If you encounter issues:
1. Check Render service logs
2. Verify environment variables
3. Test API endpoints
4. Review this guide

**Happy Learning! 🎓**
