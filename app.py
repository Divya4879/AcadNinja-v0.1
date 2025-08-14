from flask import Flask, send_from_directory, send_file, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
import requests
import urllib3
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from fallback_quiz import generate_fallback_quiz, generate_fallback_assessment
from fallback_quiz_enhanced import generate_enhanced_fallback_quiz

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Get port from environment variable (Render sets this)
PORT = int(os.environ.get('PORT', 5000))

# Groq API configuration
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

print(f"Groq API Key loaded: {'✅ Yes' if GROQ_API_KEY else '❌ No'}")
if GROQ_API_KEY:
    print(f"API Key length: {len(GROQ_API_KEY)} characters")
else:
    print("⚠️  Please set GROQ_API_KEY in your .env file")

# Create a robust HTTP session with retry logic
def create_http_session():
    session = requests.Session()
    
    # Retry strategy
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "OPTIONS", "POST"]
    )
    
    # Mount adapter with retry strategy
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    return session

# Serve static files
@app.route('/')
def index():
    return send_file('static/index.html')

@app.route('/test')
def test_frontend():
    return send_file('test_frontend.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

@app.route('/api/test', methods=['GET'])
def test_api():
    """Test endpoint to verify API key is loaded"""
    return jsonify({
        'status': 'ok',
        'groq_api_key_loaded': bool(GROQ_API_KEY),
        'api_key_length': len(GROQ_API_KEY) if GROQ_API_KEY else 0,
        'api_url': GROQ_API_URL,
        'env_file_loaded': os.path.exists('.env')
    })

@app.route('/api/test-connection', methods=['GET'])
def test_connection():
    """Test connection to Groq API"""
    if not GROQ_API_KEY:
        return jsonify({'error': 'API key not configured'}), 400
    
    headers = {
        'Authorization': f'Bearer {GROQ_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Simple test payload for Groq
    payload = {
        'model': 'llama3-8b-8192',
        'messages': [
            {
                'role': 'user',
                'content': 'Say "Hello" in JSON format: {"message": "Hello"}'
            }
        ],
        'max_tokens': 50,
        'temperature': 0.1
    }
    
    session = create_http_session()
    
    try:
        response = session.post(GROQ_API_URL, headers=headers, json=payload, timeout=(5, 15))
        
        if response.status_code == 200:
            return jsonify({
                'status': 'success',
                'message': 'Connection to Groq API successful',
                'response_preview': response.json()
            })
        else:
            return jsonify({
                'status': 'error',
                'message': f'API returned status {response.status_code}',
                'error': response.text[:200]
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Connection failed: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'service': 'AcadTutor',
        'version': '1.0.0',
        'groq_api': 'configured' if GROQ_API_KEY else 'not_configured',
        'environment': os.environ.get('RENDER_SERVICE_NAME', 'local')
    })

@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    """Generate quiz questions using Groq API"""
    try:
        data = request.json
        
        # Extract parameters
        academic_level = data.get('academicLevel', 'Secondary')
        subject = data.get('subject', '')
        topic = data.get('topic', '')
        quiz_type = data.get('quizType', 'mcq')  # 'mcq' or 'subjective'
        num_questions = data.get('numQuestions', 10)
        context = data.get('context', '')
        difficulty = data.get('difficulty', 'medium')  # 'easy', 'medium', 'hard'
        
        if not GROQ_API_KEY:
            return jsonify({'error': 'Groq API key not configured. Please set GROQ_API_KEY in your .env file'}), 500
        
        print(f"Generating {quiz_type} quiz: {num_questions} questions for {subject} - {topic} (Difficulty: {difficulty})")
        
        # Create prompt based on quiz type
        if quiz_type == 'mcq':
            system_prompt = f"""You are an internationally renowned educator and master of {subject} at the {academic_level} level. You have deep expertise in {topic}.

Create {num_questions} multiple-choice questions about {topic} for {academic_level} level students with {difficulty} difficulty.

Context: {context}

Difficulty Guidelines:
- Easy: Basic recall and understanding questions
- Medium: Application and analysis questions  
- Hard: Synthesis, evaluation, and complex problem-solving questions

Requirements:
- Questions should be appropriate for {academic_level} level students
- All questions should be at {difficulty} difficulty level
- Include 4 options (A, B, C, D) for each question
- Provide the correct answer
- Questions should test understanding, application, and critical thinking
- Include brief explanations for correct answers
- Ensure questions are clear and unambiguous

You MUST respond with ONLY valid JSON. No other text, no markdown, no explanations. Just the JSON object.

Format:
{{
  "questions": [
    {{
      "id": 1,
      "question": "What is the main concept being tested?",
      "options": {{
        "A": "First option",
        "B": "Second option", 
        "C": "Third option",
        "D": "Fourth option"
      }},
      "correct_answer": "A",
      "explanation": "Brief explanation of why this is correct",
      "difficulty": "{difficulty}"
    }}
  ]
}}"""
        else:  # subjective
            system_prompt = f"""You are an internationally renowned educator and master of {subject} at the {academic_level} level. You have deep expertise in {topic}.

Create {num_questions} subjective (long answer) questions about {topic} for {academic_level} level students with {difficulty} difficulty.

Context: {context}

Difficulty Guidelines:
- Easy: Basic explanation and description questions
- Medium: Analysis, comparison, and application questions
- Hard: Critical evaluation, synthesis, and complex problem-solving questions

Requirements:
- Questions should be appropriate for {academic_level} level students
- All questions should be at {difficulty} difficulty level
- Questions should encourage critical thinking and detailed explanations
- Include key points that should be covered in answers
- Questions should test deep understanding and application

You MUST respond with ONLY valid JSON. No other text, no markdown, no explanations. Just the JSON object.

Format:
{{
  "questions": [
    {{
      "id": 1,
      "question": "Explain the main concept and its applications?",
      "key_points": ["Key point 1", "Key point 2", "Key point 3"],
      "difficulty": "{difficulty}",
      "expected_length": "2-3 paragraphs"
    }}
  ]
}}"""
        
        # Make request to Groq API
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'llama3-8b-8192',  # Use faster model for better JSON compliance
            'messages': [
                {
                    'role': 'system',
                    'content': 'You are a helpful assistant that always responds with valid JSON only. Never include any text outside of the JSON object.'
                },
                {
                    'role': 'user',
                    'content': system_prompt
                }
            ],
            'max_tokens': 2000,
            'temperature': 0.3,  # Lower temperature for more consistent JSON
            'top_p': 0.9
        }
        
        print("Making request to Groq API...")
        
        session = create_http_session()
        
        response = session.post(
            GROQ_API_URL, 
            headers=headers, 
            json=payload, 
            timeout=(10, 60)  # Increased timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content'].strip()
            
            print(f"Raw API response length: {len(content)}")
            print(f"Raw API response preview: {content[:200]}...")
            
            # Clean up the content - remove any markdown formatting
            if content.startswith('```json'):
                content = content.replace('```json', '').replace('```', '').strip()
            elif content.startswith('```'):
                content = content.replace('```', '').strip()
            
            # Try to extract JSON from the content
            try:
                # First, try direct parsing
                quiz_data = json.loads(content)
                
                # Validate the structure
                if 'questions' not in quiz_data or not isinstance(quiz_data['questions'], list):
                    raise ValueError("Invalid quiz structure - missing questions array")
                
                if len(quiz_data['questions']) == 0:
                    raise ValueError("No questions generated")
                
                # Validate each question
                for i, question in enumerate(quiz_data['questions']):
                    if 'question' not in question:
                        raise ValueError(f"Question {i+1} missing 'question' field")
                    
                    # Add ID if missing
                    if 'id' not in question:
                        question['id'] = i + 1
                    
                    # Add difficulty if missing
                    if 'difficulty' not in question:
                        question['difficulty'] = difficulty
                    
                    # Validate MCQ structure
                    if quiz_type == 'mcq':
                        if 'options' not in question:
                            raise ValueError(f"MCQ question {i+1} missing 'options' field")
                        if 'correct_answer' not in question:
                            raise ValueError(f"MCQ question {i+1} missing 'correct_answer' field")
                
                print(f"✅ Successfully generated {len(quiz_data['questions'])} questions via AI")
                return jsonify({
                    'success': True,
                    'quiz': quiz_data,
                    'quiz_type': quiz_type,
                    'subject': subject,
                    'topic': topic,
                    'academic_level': academic_level,
                    'source': 'ai'
                })
                
            except json.JSONDecodeError as e:
                print(f"JSON parsing error: {e}")
                print(f"Problematic content: {content}")
                
                # Try to find JSON within the content using regex
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    try:
                        quiz_data = json.loads(json_match.group())
                        if 'questions' in quiz_data and len(quiz_data['questions']) > 0:
                            print("✅ Successfully extracted JSON from response")
                            return jsonify({
                                'success': True,
                                'quiz': quiz_data,
                                'quiz_type': quiz_type,
                                'subject': subject,
                                'topic': topic,
                                'academic_level': academic_level,
                                'source': 'ai_extracted'
                            })
                    except Exception as extract_error:
                        print(f"Failed to extract JSON: {extract_error}")
                
                # If all parsing fails, use enhanced fallback
                print("🔄 Using enhanced fallback quiz due to parsing failure")
                fallback_quiz = generate_enhanced_fallback_quiz(subject, topic, quiz_type, num_questions, difficulty, academic_level)
                return jsonify({
                    'success': True,
                    'quiz': fallback_quiz,
                    'quiz_type': quiz_type,
                    'subject': subject,
                    'topic': topic,
                    'academic_level': academic_level,
                    'source': 'enhanced_fallback'
                })
                
            except ValueError as e:
                print(f"Quiz validation error: {e}")
                # Use enhanced fallback instead of returning error
                print("🔄 Using enhanced fallback quiz due to validation error")
                fallback_quiz = generate_enhanced_fallback_quiz(subject, topic, quiz_type, num_questions, difficulty, academic_level)
                return jsonify({
                    'success': True,
                    'quiz': fallback_quiz,
                    'quiz_type': quiz_type,
                    'subject': subject,
                    'topic': topic,
                    'academic_level': academic_level,
                    'source': 'enhanced_fallback'
                })
                
        else:
            print(f"Groq API error: {response.status_code}")
            print(f"Response: {response.text}")
            # Use enhanced fallback instead of returning error
            print("🔄 Using enhanced fallback quiz due to API error")
            fallback_quiz = generate_enhanced_fallback_quiz(subject, topic, quiz_type, num_questions, difficulty, academic_level)
            return jsonify({
                'success': True,
                'quiz': fallback_quiz,
                'quiz_type': quiz_type,
                'subject': subject,
                'topic': topic,
                'academic_level': academic_level,
                'source': 'enhanced_fallback'
            })
            
    except Exception as e:
        print(f"Error generating quiz: {e}")
        
        # Use enhanced fallback quiz generation
        print("🔄 Using enhanced fallback quiz generation due to exception...")
        try:
            fallback_quiz = generate_enhanced_fallback_quiz(subject, topic, quiz_type, num_questions, difficulty, academic_level)
            return jsonify({
                'success': True,
                'quiz': fallback_quiz,
                'quiz_type': quiz_type,
                'subject': subject,
                'topic': topic,
                'academic_level': academic_level,
                'source': 'enhanced_fallback'
            })
        except Exception as fallback_error:
            print(f"Enhanced fallback quiz generation failed: {fallback_error}")
            # Last resort - use basic fallback
            try:
                basic_fallback = generate_fallback_quiz(subject, topic, quiz_type, num_questions, difficulty, academic_level)
                return jsonify({
                    'success': True,
                    'quiz': basic_fallback,
                    'quiz_type': quiz_type,
                    'subject': subject,
                    'topic': topic,
                    'academic_level': academic_level,
                    'source': 'basic_fallback'
                })
            except:
                return jsonify({'error': f'Failed to generate quiz: {str(e)}'}), 500

@app.route('/api/assess-quiz', methods=['POST'])
def assess_quiz():
    """Assess quiz answers using Groq API"""
    try:
        data = request.json
        
        quiz_data = data.get('quiz', {})
        user_answers = data.get('answers', {})
        quiz_type = data.get('quizType', 'mcq')
        subject = data.get('subject', '')
        topic = data.get('topic', '')
        academic_level = data.get('academicLevel', 'Secondary')
        
        if not GROQ_API_KEY:
            return jsonify({'error': 'Groq API key not configured'}), 500
        
        print(f"Assessing {quiz_type} quiz for {subject} - {topic}")
        
        # Create assessment prompt
        if quiz_type == 'mcq':
            assessment_prompt = f"""Assess this multiple-choice quiz on {topic} for a {academic_level} level student.

Quiz Data: {json.dumps({'questions': quiz_data.get('questions', []), 'user_answers': user_answers}, indent=2)}

You MUST respond with ONLY valid JSON. No other text, no markdown, no explanations.

{{
  "score": 85,
  "total_questions": 10,
  "correct_answers": 8,
  "percentage": 80,
  "grade": "B+",
  "assessment": {{
    "strengths": ["Good understanding of basic concepts"],
    "areas_for_improvement": ["Need to work on advanced topics"],
    "overall_feedback": "Overall performance feedback"
  }},
  "question_feedback": [
    {{
      "question_id": 1,
      "user_answer": "A",
      "correct_answer": "B",
      "is_correct": false,
      "feedback": "Explanation of correct answer"
    }}
  ],
  "resources": [
    {{
      "title": "Khan Academy - Topic Name",
      "url": "https://khanacademy.org",
      "description": "Great resource for this topic"
    }}
  ]
}}"""
        else:  # subjective
            assessment_prompt = f"""Assess these subjective answers on {topic} for a {academic_level} level student.

Quiz Data: {json.dumps({'questions': quiz_data.get('questions', []), 'user_answers': user_answers}, indent=2)}

You MUST respond with ONLY valid JSON. No other text, no markdown, no explanations.

{{
  "score": 85,
  "total_questions": 5,
  "percentage": 85,
  "grade": "A-",
  "assessment": {{
    "strengths": ["Clear explanations", "Good examples"],
    "areas_for_improvement": ["More detail needed", "Better structure"],
    "overall_feedback": "Overall performance feedback"
  }},
  "question_feedback": [
    {{
      "question_id": 1,
      "score": 8,
      "max_score": 10,
      "feedback": "Good answer but could be more detailed",
      "key_points_covered": ["Point 1", "Point 2"],
      "missing_points": ["Missing point 1"]
    }}
  ],
  "resources": [
    {{
      "title": "Educational Resource",
      "url": "https://example.com",
      "description": "Helpful for improving understanding"
    }}
  ]
}}"""
        
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'llama3-8b-8192',  # Use faster model for better JSON compliance
            'messages': [
                {
                    'role': 'system',
                    'content': 'You are a helpful assistant that always responds with valid JSON only. Never include any text outside of the JSON object.'
                },
                {
                    'role': 'user',
                    'content': assessment_prompt
                }
            ],
            'max_tokens': 2500,
            'temperature': 0.3,
            'top_p': 0.9
        }
        
        session = create_http_session()
        
        response = session.post(
            GROQ_API_URL,
            headers=headers,
            json=payload,
            timeout=(10, 30)
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content'].strip()
            
            print(f"Raw assessment response: {content}")
            
            # Clean up the content
            if content.startswith('```json'):
                content = content.replace('```json', '').replace('```', '').strip()
            elif content.startswith('```'):
                content = content.replace('```', '').strip()
            
            try:
                assessment_data = json.loads(content)
                
                # Validate assessment structure
                required_fields = ['score', 'percentage', 'grade']
                for field in required_fields:
                    if field not in assessment_data:
                        assessment_data[field] = 0 if field in ['score', 'percentage'] else 'N/A'
                
                return jsonify({
                    'success': True,
                    'assessment': assessment_data
                })
                
            except json.JSONDecodeError as e:
                print(f"JSON parsing error in assessment: {e}")
                print(f"Cleaned content: {content}")
                
                # Create fallback assessment
                fallback_assessment = {
                    'score': 0,
                    'percentage': 0,
                    'grade': 'N/A',
                    'assessment': {
                        'strengths': ['Quiz completed'],
                        'areas_for_improvement': ['Assessment system needs improvement'],
                        'overall_feedback': 'Unable to properly assess due to technical issues'
                    },
                    'question_feedback': [],
                    'resources': [
                        {
                            'title': 'Khan Academy',
                            'url': 'https://khanacademy.org',
                            'description': 'Great resource for learning'
                        }
                    ]
                }
                
                return jsonify({
                    'success': True,
                    'assessment': fallback_assessment,
                    'note': 'Fallback assessment used due to parsing issues'
                })
                
        else:
            return jsonify({
                'error': f'API request failed with status {response.status_code}',
                'details': response.text[:200]
            }), response.status_code
            
    except Exception as e:
        print(f"Error assessing quiz: {e}")
        
        # Use fallback assessment
        print("Using fallback assessment...")
        try:
            fallback_assessment = generate_fallback_assessment(quiz_type, len(quiz_data.get('questions', [])))
            return jsonify({
                'success': True,
                'assessment': fallback_assessment,
                'note': 'Using fallback assessment due to API issues'
            })
        except Exception as fallback_error:
            print(f"Fallback assessment failed: {fallback_error}")
            return jsonify({'error': f'Failed to assess quiz: {str(e)}'}), 500

if __name__ == '__main__':
    # For local development
    app.run(host='0.0.0.0', port=PORT, debug=True)
else:
    # For production (Gunicorn)
    application = app
