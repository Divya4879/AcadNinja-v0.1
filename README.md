# AcadTutor - AI-Powered Learning Platform

AcadTutor is a comprehensive AI-powered educational platform that helps students learn through personalized quizzes, in-depth topic explanations, and intelligent progress tracking.

## Features

- 🎓 **AI-Generated Quizzes**: Create personalized quizzes using Groq's LLaMA models
- 📚 **Expert Topic Explanations**: Get comprehensive 2000+ word explanations for any topic
- 📊 **Progress Tracking**: Monitor learning progress across subjects and topics
- 🎯 **Adaptive Learning**: Difficulty adjusts based on performance
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🔒 **Local Storage**: All data stored locally in browser

## Quick Start (Local Development)

### Option 1: Automated Setup
```bash
./setup_local.sh
./run_local.py
```

### Option 2: Manual Setup
```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment variables
# Edit .env file and add your GROQ_API_KEY

# 4. Run the application
python run_local.py
```

### Get Your Groq API Key
1. Go to [Groq Console](https://console.groq.com/keys)
2. Create a new API key
3. Add it to your `.env` file:
   ```
   GROQ_API_KEY=your_actual_groq_api_key_here
   ```

## Technology Stack

- **Backend**: Python Flask
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **AI**: Groq API (LLaMA 3 8B)
- **Styling**: Tailwind CSS
- **Deployment**: Render

## Deployment

This app is configured for deployment on Render. See:
- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist

## API Endpoints

- `GET /` - Main application
- `GET /api/test` - API status check
- `GET /api/health` - Health check for monitoring
- `POST /generate-quiz` - Generate AI quiz
- `POST /assess-quiz` - Assess quiz responses

## Project Structure

```
acad-ninja/
├── app.py                      # Main Flask application
├── fallback_quiz.py           # Quiz fallback system  
├── fallback_quiz_enhanced.py  # Enhanced quiz generation
├── static/                    # Frontend assets
├── requirements.txt           # Python dependencies
├── render.yaml               # Render deployment config
├── .env                      # Environment variables (local)
├── run_local.py              # Local development server
└── setup_local.sh            # Local setup script
```

## License

MIT License - See LICENSE file for details
# AcadNinja
# AcadNinja-v0.1
# AcadNinja-v0.1
# AcadNinja-v0.1
# AcadNinja-v0.1
# AcadNinja-v0.1
# AcadNinja-v0.1
# AcadNinja-v0.1
