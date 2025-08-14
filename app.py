from flask import Flask, send_from_directory, send_file, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
import requests
import urllib3
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from fallback_quiz import generate_fallback_quiz, generate_fallback_assessment
from fallback_quiz_enhanced import generate_enhanced_fallback_quiz, generate_enhanced_fallback_assessment

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

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat requests for topic explanations"""
    try:
        if not GROQ_API_KEY:
            return jsonify({
                'status': 'error',
                'error': 'Groq API key not configured'
            }), 500

        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({
                'status': 'error',
                'error': 'Message is required'
            }), 400

        message = data['message']
        context = data.get('context', '')
        
        # Prepare the request to Groq API
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'llama3-8b-8192',
            'messages': [
                {
                    'role': 'system',
                    'content': f'You are an expert AI tutor. Context: {context}'
                },
                {
                    'role': 'user',
                    'content': message
                }
            ],
            'max_tokens': 4000,
            'temperature': 0.7
        }
        
        # Create session and make request
        session = create_http_session()
        response = session.post(GROQ_API_URL, headers=headers, json=payload, timeout=(10, 30))
        
        if response.status_code == 200:
            groq_response = response.json()
            
            if 'choices' in groq_response and len(groq_response['choices']) > 0:
                ai_response = groq_response['choices'][0]['message']['content']
                
                return jsonify({
                    'status': 'success',
                    'response': ai_response,
                    'model': groq_response.get('model', 'llama3-8b-8192'),
                    'usage': groq_response.get('usage', {})
                })
            else:
                return jsonify({
                    'status': 'error',
                    'error': 'No response from AI model'
                }), 500
        else:
            error_detail = response.text
            return jsonify({
                'status': 'error',
                'error': f'Groq API error: {response.status_code}',
                'detail': error_detail
            }), response.status_code
            
    except requests.exceptions.Timeout:
        return jsonify({
            'status': 'error',
            'error': 'Request timeout - please try again'
        }), 408
    except requests.exceptions.RequestException as e:
        return jsonify({
            'status': 'error',
            'error': f'Network error: {str(e)}'
        }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': f'Server error: {str(e)}'
        }), 500

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
        
        print(f"🎯 Generating {quiz_type} quiz: {num_questions} questions for {subject} - {topic} (Level: {academic_level}, Difficulty: {difficulty})")
        
        # Create comprehensive AI prompts for real-time generation
        if quiz_type == 'mcq':
            system_prompt = f"""You are a world-class educator and subject matter expert in {subject}, specializing in {topic} at the {academic_level} academic level.

MISSION: Generate EXACTLY {num_questions} unique, high-quality multiple-choice questions about {topic} that are perfectly suited for {academic_level} students at {difficulty} difficulty level.

ACADEMIC LEVEL SPECIFICATIONS:
- Primary (Ages 6-11): Simple language, concrete concepts, basic vocabulary, visual/practical examples
- Secondary (Ages 12-18): Intermediate concepts, analytical thinking, real-world applications, some abstract reasoning
- College (Ages 18-22): Advanced concepts, critical thinking, theoretical understanding, complex applications
- Competitive (Professional): Expert-level, advanced problem-solving, cutting-edge concepts, industry applications

DIFFICULTY LEVEL SPECIFICATIONS:
- Easy: Fundamental concepts, basic recall, simple understanding, straightforward applications
- Medium: Concept application, analysis, connecting ideas, moderate problem-solving
- Hard: Synthesis, evaluation, complex problem-solving, advanced applications, critical analysis

TOPIC EXPERTISE REQUIREMENTS:
Generate questions that cover the most IMPORTANT and FUNDAMENTAL aspects of {topic} in {subject}:
- Core principles and concepts
- Key terminology and definitions  
- Practical applications and examples
- Common misconceptions to test understanding
- Real-world relevance and implications

QUESTION QUALITY STANDARDS:
- Each question must test genuine understanding, not just memorization
- Questions should be unique and not repetitive
- Cover different aspects/subtopics within {topic}
- Include scenario-based questions where appropriate
- Test both theoretical knowledge and practical application
- Ensure questions are educationally valuable

TECHNICAL REQUIREMENTS:
- Generate EXACTLY {num_questions} questions (no more, no less)
- Each question must have exactly 4 options (A, B, C, D)
- Only ONE correct answer per question
- Provide detailed explanations for correct answers
- Include brief explanations of why other options are incorrect
- Questions must be clear, unambiguous, and grammatically correct

RESPONSE FORMAT - VALID JSON ONLY:
{{
  "questions": [
    {{
      "id": 1,
      "question": "[Detailed, specific question about {topic} appropriate for {academic_level} level]",
      "options": {{
        "A": "[First detailed, plausible option]",
        "B": "[Second detailed, plausible option]", 
        "C": "[Third detailed, plausible option]",
        "D": "[Fourth detailed, plausible option]"
      }},
      "correct_answer": "B",
      "explanation": "[Comprehensive explanation of why B is correct and why A, C, D are incorrect]",
      "difficulty": "{difficulty}",
      "academic_level": "{academic_level}",
      "subtopic": "[Specific aspect of {topic} this question covers]"
    }}
  ]
}}

CRITICAL: Respond with ONLY the JSON object. No additional text, markdown, or explanations."""

        else:  # subjective questions
            system_prompt = f"""You are a distinguished educator and assessment expert in {subject}, with deep expertise in {topic} at the {academic_level} academic level.

MISSION: Generate EXACTLY {num_questions} unique, thought-provoking subjective questions about {topic} that are perfectly suited for {academic_level} students at {difficulty} difficulty level.

ACADEMIC LEVEL SPECIFICATIONS:
- Primary (Ages 6-11): Simple explanations, basic concepts, concrete examples, 2-3 sentences expected
- Secondary (Ages 12-18): Structured explanations, analytical thinking, 1-2 paragraphs expected
- College (Ages 18-22): In-depth analysis, critical thinking, theoretical understanding, 2-3 paragraphs expected
- Competitive (Professional): Expert-level analysis, comprehensive explanations, 3-4 paragraphs expected

DIFFICULTY LEVEL SPECIFICATIONS:
- Easy: Basic explanations, simple concepts, straightforward descriptions
- Medium: Analysis and application, connecting concepts, moderate complexity
- Hard: Critical evaluation, synthesis, complex problem-solving, advanced reasoning

SUBJECTIVE QUESTION TYPES:
- Explain concepts and principles
- Analyze scenarios and case studies
- Compare and contrast different approaches
- Evaluate advantages and disadvantages
- Describe processes and procedures
- Justify opinions with reasoning
- Apply knowledge to new situations

QUESTION QUALITY STANDARDS:
- Questions should encourage deep thinking and understanding
- Test ability to explain, analyze, and synthesize information
- Cover important aspects of {topic} comprehensively
- Require students to demonstrate genuine understanding
- Include real-world applications where relevant
- Encourage critical thinking and reasoning

TECHNICAL REQUIREMENTS:
- Generate EXACTLY {num_questions} questions (no more, no less)
- Each question should be open-ended and thought-provoking
- Provide expected answer length guidelines
- Include key points that should be covered in answers
- Provide comprehensive model answers for reference

RESPONSE FORMAT - VALID JSON ONLY:
{{
  "questions": [
    {{
      "id": 1,
      "question": "[Detailed, thought-provoking question about {topic} appropriate for {academic_level} level]",
      "expected_length": "[Expected response length: e.g., '2-3 sentences', '1-2 paragraphs', '3-4 paragraphs']",
      "key_points": ["Key point 1 that should be covered", "Key point 2 that should be covered", "Key point 3 that should be covered"],
      "model_answer": "[Comprehensive model answer demonstrating expected depth and quality]",
      "difficulty": "{difficulty}",
      "academic_level": "{academic_level}",
      "subtopic": "[Specific aspect of {topic} this question covers]"
    }}
  ]
}}

CRITICAL: Respond with ONLY the JSON object. No additional text, markdown, or explanations."""
        "A": "First detailed option",
        "B": "Second detailed option", 
        "C": "Third detailed option",
        "D": "Fourth detailed option"
      }},
      "correct_answer": "B",
      "explanation": "Detailed explanation of why option B is correct and why others are wrong",
      "difficulty": "{difficulty}",
      "academic_level": "{academic_level}"
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
        
        # Enhanced API call for real-time AI generation
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'llama3-70b-8192',  # Use more powerful model for better quality
            'messages': [
                {
                    'role': 'system',
                    'content': f'You are a world-class educator and subject matter expert. Generate EXACTLY {num_questions} unique, high-quality {quiz_type} questions about {topic} in {subject} for {academic_level} level at {difficulty} difficulty. Respond with ONLY valid JSON.'
                },
                {
                    'role': 'user',
                    'content': system_prompt
                }
            ],
            'max_tokens': 6000,  # Increased for comprehensive questions
            'temperature': 0.8,  # Higher creativity for unique questions
            'top_p': 0.95,      # Better diversity
            'frequency_penalty': 0.3,  # Reduce repetition
            'presence_penalty': 0.2    # Encourage new topics
        }
        
        print(f"🤖 Making enhanced Groq API call for {num_questions} unique {quiz_type} questions...")
                },
                {
                    'role': 'user',
                    'content': system_prompt
                }
            ],
            'max_tokens': 4000,  # Increased for more questions
            'temperature': 0.7,  # Balanced for creativity and consistency
            'top_p': 0.9
        }
        
        print(f"Making request to Groq API for {num_questions} questions...")
        
        session = create_http_session()
        
        response = session.post(
            GROQ_API_URL, 
            headers=headers, 
            json=payload, 
            timeout=(15, 90)  # Increased timeout for complex generation
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content'].strip()
            
            print(f"✅ Received AI response: {len(content)} characters")
            print(f"📝 Response preview: {content[:200]}...")
            
            # Enhanced content cleaning for better JSON parsing
            if content.startswith('```json'):
                content = content.replace('```json', '').replace('```', '').strip()
            elif content.startswith('```'):
                content = content.replace('```', '').strip()
            
            # Remove any leading/trailing text that might not be JSON
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end != -1:
                content = content[json_start:json_end]
            
            # Try to extract and validate JSON
            try:
                quiz_data = json.loads(content)
                
                # Comprehensive validation
                if 'questions' not in quiz_data or not isinstance(quiz_data['questions'], list):
                    raise ValueError("Invalid quiz structure - missing questions array")
                
                questions = quiz_data['questions']
                if len(questions) == 0:
                    raise ValueError("No questions generated by AI")
                
                print(f"🎯 AI generated {len(questions)} questions (requested: {num_questions})")
                
                # Enhanced question validation and processing
                validated_questions = []
                for i, question in enumerate(questions):
                    if 'question' not in question or not question['question'].strip():
                        print(f"⚠️ Skipping question {i+1}: missing or empty question text")
                        continue
                    
                    # Standardize question structure
                    validated_question = {
                        'id': question.get('id', i + 1),
                        'question': question['question'].strip(),
                        'difficulty': question.get('difficulty', difficulty),
                        'academic_level': question.get('academic_level', academic_level),
                        'subtopic': question.get('subtopic', topic)
                    }
                    
                    # Type-specific validation and processing
                    if quiz_type == 'mcq':
                        if 'options' not in question or not isinstance(question['options'], dict):
                            print(f"⚠️ Skipping MCQ question {i+1}: missing or invalid options")
                            continue
                        
                        if 'correct_answer' not in question:
                            print(f"⚠️ Skipping MCQ question {i+1}: missing correct answer")
                            continue
                        
                        # Ensure we have exactly 4 options
                        options = question['options']
                        if len(options) < 4:
                            # Fill missing options
                            option_keys = ['A', 'B', 'C', 'D']
                            for key in option_keys:
                                if key not in options:
                                    options[key] = f"Option {key}"
                        
                        validated_question.update({
                            'options': options,
                            'correct_answer': question['correct_answer'],
                            'explanation': question.get('explanation', f"The correct answer is {question['correct_answer']}.")
                        })
                    
                    else:  # subjective questions
                        validated_question.update({
                            'expected_length': question.get('expected_length', '2-3 paragraphs'),
                            'key_points': question.get('key_points', [f"Key concepts about {topic}"]),
                            'model_answer': question.get('model_answer', f"A comprehensive answer should cover the main aspects of {topic}.")
                        })
                    
                    validated_questions.append(validated_question)
                
                # Ensure we have the requested number of questions
                if len(validated_questions) < num_questions:
                    print(f"⚠️ Only {len(validated_questions)} valid questions generated, need {num_questions}")
                    # We'll handle this in the frontend fallback
                
                # Trim to exact count if we have too many
                validated_questions = validated_questions[:num_questions]
                
                quiz_result = {
                    'questions': validated_questions,
                    'total_questions': len(validated_questions),
                    'subject': subject,
                    'topic': topic,
                    'difficulty': difficulty,
                    'academic_level': academic_level,
                    'quiz_type': quiz_type,
                    'generated_by': 'groq_ai',
                    'generation_timestamp': datetime.now().isoformat()
                }
                
                print(f"✅ Successfully processed {len(validated_questions)} AI-generated questions")
                
                return jsonify({
                    'success': True,
                    'quiz': quiz_result,
                    'source': 'groq_ai_realtime',
                    'message': f'Generated {len(validated_questions)} unique {quiz_type} questions using AI'
                })
                
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

@app.route('/api/explain-topic', methods=['POST'])
def explain_topic():
    """Generate real-time AI explanation for any topic"""
    try:
        data = request.json
        
        topic = data.get('topic', '')
        subject = data.get('subject', '')
        academic_level = data.get('academicLevel', 'Secondary')
        context = data.get('context', '')
        explanation_type = data.get('type', 'comprehensive')  # comprehensive, quick, detailed
        
        if not GROQ_API_KEY:
            return jsonify({'error': 'Groq API key not configured'}), 500
        
        if not topic:
            return jsonify({'error': 'Topic is required'}), 400
        
        print(f"Generating AI explanation for {topic} in {subject}")
        
        # Create explanation prompt based on type
        if explanation_type == 'comprehensive':
            system_prompt = f"""You are an expert educator specializing in {subject} at the {academic_level} level.

Provide a comprehensive, in-depth explanation of "{topic}" that includes:

1. **Clear Definition**: What is {topic}? Provide a clear, concise definition.

2. **Core Concepts**: Break down the fundamental concepts and principles.

3. **How It Works**: Explain the mechanisms, processes, or functionality in detail.

4. **Real-World Applications**: Provide concrete examples and use cases.

5. **Benefits and Advantages**: Why is this important? What problems does it solve?

6. **Challenges and Limitations**: What are the current challenges or limitations?

7. **Future Implications**: Where is this technology/concept heading?

8. **Key Takeaways**: Summarize the most important points students should remember.

Context: {context}

Requirements:
- Write for {academic_level} level students
- Use clear, engaging language
- Include specific examples
- Make it educational and informative
- Aim for 2000-3000 words
- Use proper formatting with headers and bullet points
- Be accurate and up-to-date

Provide a comprehensive explanation that will help students truly understand {topic}."""

        elif explanation_type == 'quick':
            system_prompt = f"""You are an expert educator. Provide a quick, clear explanation of "{topic}" in {subject} for {academic_level} level students.

Include:
- Clear definition (2-3 sentences)
- Key points (3-5 bullet points)
- Simple example
- Why it matters

Keep it concise but informative (300-500 words).

Context: {context}"""

        else:  # detailed
            system_prompt = f"""You are an expert educator. Provide a detailed technical explanation of "{topic}" in {subject} for {academic_level} level students.

Include:
- Technical definition and background
- Detailed mechanisms and processes
- Multiple examples and case studies
- Technical specifications where relevant
- Current research and developments
- Practical applications

Aim for 1500-2000 words with technical depth appropriate for {academic_level} level.

Context: {context}"""
        
        # Make request to Groq API
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'llama3-8b-8192',
            'messages': [
                {
                    'role': 'system',
                    'content': 'You are an expert educator. Provide clear, accurate, and engaging explanations.'
                },
                {
                    'role': 'user',
                    'content': system_prompt
                }
            ],
            'max_tokens': 4000,
            'temperature': 0.7
        }
        
        session = create_http_session()
        response = session.post(GROQ_API_URL, headers=headers, json=payload, timeout=(10, 30))
        
        if response.status_code == 200:
            groq_response = response.json()
            
            if 'choices' in groq_response and len(groq_response['choices']) > 0:
                explanation = groq_response['choices'][0]['message']['content'].strip()
                
                return jsonify({
                    'success': True,
                    'explanation': explanation,
                    'topic': topic,
                    'subject': subject,
                    'type': explanation_type,
                    'academic_level': academic_level,
                    'word_count': len(explanation.split()),
                    'generated_at': datetime.now().isoformat(),
                    'source': 'groq_ai'
                })
            else:
                return jsonify({'error': 'No response from AI model'}), 500
        else:
            return jsonify({'error': f'AI API error: {response.status_code}'}), response.status_code
            
    except Exception as e:
        print(f"Explanation generation error: {str(e)}")
        return jsonify({'error': f'Failed to generate explanation: {str(e)}'}), 500

@app.route('/api/assess-quiz', methods=['POST'])
def assess_quiz():
    """Assess quiz answers using Groq API with detailed feedback"""
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
        
        # Create comprehensive assessment prompt
        if quiz_type == 'mcq':
            assessment_prompt = f"""You are an expert educator assessing a multiple-choice quiz on {topic} for a {academic_level} level student.

QUIZ QUESTIONS AND USER ANSWERS:
{json.dumps({'questions': quiz_data.get('questions', []), 'user_answers': user_answers}, indent=2)}

Provide a comprehensive assessment with detailed question-by-question feedback. For each question, include:
1. The full question text
2. All answer options (A, B, C, D)
3. User's selected answer
4. Correct answer
5. Detailed explanation of why the correct answer is right
6. Why other options are wrong

You MUST respond with ONLY valid JSON in this exact format:

{{
  "score": 85,
  "total_questions": 5,
  "correct_answers": 4,
  "percentage": 80,
  "grade": "B+",
  "assessment": {{
    "strengths": ["Good understanding of basic concepts", "Strong analytical skills"],
    "areas_for_improvement": ["Need to review advanced concepts", "Practice more complex problems"],
    "overall_feedback": "You demonstrate solid foundational knowledge but should focus on strengthening areas where you struggled."
  }},
  "question_feedback": [
    {{
      "question_id": 1,
      "question_text": "What is the first and most famous cryptocurrency?",
      "options": {{
        "A": "Ethereum",
        "B": "Bitcoin", 
        "C": "Litecoin",
        "D": "Ripple"
      }},
      "user_answer": "A",
      "correct_answer": "B",
      "is_correct": false,
      "explanation": "Bitcoin was the first cryptocurrency, created by Satoshi Nakamoto in 2009. It remains the most famous and valuable cryptocurrency.",
      "why_wrong": "Ethereum came later in 2015, though it introduced smart contracts."
    }}
  ],
  "study_recommendations": [
    "Review cryptocurrency history and major milestones",
    "Study blockchain fundamentals and consensus mechanisms",
    "Practice identifying key features of different cryptocurrencies"
  ],
  "resources": [
    {{
      "title": "Cryptocurrency Basics",
      "description": "Comprehensive guide to understanding cryptocurrencies",
      "type": "article"
    }}
  ]
}}

Ensure all question feedback includes the complete question text, all options, and detailed explanations."""

        else:  # subjective
            assessment_prompt = f"""You are an expert educator assessing subjective answers on {topic} for a {academic_level} level student.

QUESTIONS AND USER ANSWERS:
{json.dumps({'questions': quiz_data.get('questions', []), 'user_answers': user_answers}, indent=2)}

Provide detailed feedback for each answer including what was good, what could be improved, and model answers.

You MUST respond with ONLY valid JSON in this exact format:

{{
  "score": 85,
  "total_questions": 3,
  "percentage": 85,
  "grade": "A-",
  "assessment": {{
    "strengths": ["Clear explanations", "Good use of examples", "Logical structure"],
    "areas_for_improvement": ["More technical detail needed", "Better conclusion", "Include more recent developments"],
    "overall_feedback": "Your answers show good understanding but could benefit from more depth and current examples."
  }},
  "question_feedback": [
    {{
      "question_id": 1,
      "question_text": "Explain how blockchain technology works",
      "user_answer": "User's actual answer text here",
      "score": 7,
      "max_score": 10,
      "feedback": "Your explanation covers the basic concepts well. You correctly identified the key components like blocks, hashing, and decentralization. However, you could improve by explaining the consensus mechanism in more detail and providing a specific example of how transactions are validated.",
      "model_answer": "A comprehensive model answer explaining blockchain technology...",
      "suggestions": ["Add more detail about consensus mechanisms", "Include specific examples", "Explain cryptographic hashing"]
    }}
  ],
  "study_recommendations": [
    "Study consensus mechanisms in detail",
    "Practice explaining technical concepts clearly",
    "Review recent blockchain applications"
  ]
}}"""

        # Make request to Groq API
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'llama3-8b-8192',
            'messages': [
                {
                    'role': 'system',
                    'content': 'You are an expert educator providing detailed quiz assessments. Always respond with valid JSON only.'
                },
                {
                    'role': 'user',
                    'content': assessment_prompt
                }
            ],
            'max_tokens': 4000,
            'temperature': 0.3
        }
        
        session = create_http_session()
        response = session.post(GROQ_API_URL, headers=headers, json=payload, timeout=(10, 30))
        
        if response.status_code == 200:
            groq_response = response.json()
            
            if 'choices' in groq_response and len(groq_response['choices']) > 0:
                ai_response = groq_response['choices'][0]['message']['content'].strip()
                
                try:
                    # Parse the JSON response
                    assessment_result = json.loads(ai_response)
                    
                    # Ensure we have the required structure
                    if 'question_feedback' not in assessment_result:
                        assessment_result['question_feedback'] = []
                    
                    return jsonify(assessment_result)
                    
                except json.JSONDecodeError as e:
                    print(f"JSON decode error: {e}")
                    print(f"AI Response: {ai_response[:500]}...")
                    
                    # Fallback to enhanced fallback assessment
                    return jsonify(generate_enhanced_fallback_assessment(quiz_data, user_answers, quiz_type, subject, topic))
            else:
                return jsonify({'error': 'No response from AI model'}), 500
        else:
            print(f"Groq API error: {response.status_code} - {response.text}")
            # Fallback to enhanced fallback assessment
            return jsonify(generate_enhanced_fallback_assessment(quiz_data, user_answers, quiz_type, subject, topic))
            
    except Exception as e:
        print(f"Assessment error: {str(e)}")
        # Fallback to enhanced fallback assessment
        try:
            return jsonify(generate_enhanced_fallback_assessment(quiz_data, user_answers, quiz_type, subject, topic))
        except:
            return jsonify({'error': f'Failed to assess quiz: {str(e)}'}), 500

if __name__ == '__main__':
    # For local development
    app.run(host='0.0.0.0', port=PORT, debug=True)
else:
    # For production (Gunicorn)
    application = app
