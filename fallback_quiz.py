"""
Fallback quiz generation for when API fails
"""

def generate_fallback_quiz(subject, topic, quiz_type, num_questions, academic_level):
    """Generate a simple fallback quiz when API fails"""
    
    if quiz_type == 'mcq':
        questions = []
        for i in range(min(num_questions, 5)):  # Limit to 5 fallback questions
            questions.append({
                "id": i + 1,
                "question": f"What is an important concept in {topic}?",
                "options": {
                    "A": f"Basic concept related to {topic}",
                    "B": f"Advanced concept in {subject}",
                    "C": f"Fundamental principle of {topic}",
                    "D": f"Key application of {topic}"
                },
                "correct_answer": "A",
                "explanation": f"This is a fundamental concept in {topic} that {academic_level} students should understand.",
                "difficulty": "medium"
            })
    else:  # subjective
        questions = []
        for i in range(min(num_questions, 3)):  # Limit to 3 fallback questions
            questions.append({
                "id": i + 1,
                "question": f"Explain the key concepts and applications of {topic} in {subject}.",
                "key_points": [
                    f"Definition of {topic}",
                    f"Main principles of {topic}",
                    f"Real-world applications of {topic}"
                ],
                "difficulty": "medium",
                "expected_length": "2-3 paragraphs"
            })
    
    return {
        "questions": questions
    }

def generate_fallback_assessment(quiz_type, num_questions):
    """Generate a simple fallback assessment"""
    
    if quiz_type == 'mcq':
        return {
            "score": 70,
            "total_questions": num_questions,
            "correct_answers": int(num_questions * 0.7),
            "percentage": 70,
            "grade": "B-",
            "assessment": {
                "strengths": ["Completed the quiz", "Showed effort in learning"],
                "areas_for_improvement": ["Review the topic materials", "Practice more questions"],
                "overall_feedback": "Good attempt! Keep studying to improve your understanding."
            },
            "question_feedback": [
                {
                    "question_id": 1,
                    "user_answer": "A",
                    "correct_answer": "A",
                    "is_correct": True,
                    "feedback": "Correct! Good understanding of the concept."
                }
            ],
            "resources": [
                {
                    "title": "Khan Academy",
                    "url": "https://khanacademy.org",
                    "description": "Excellent free educational resource"
                },
                {
                    "title": "Coursera",
                    "url": "https://coursera.org",
                    "description": "Online courses from top universities"
                }
            ]
        }
    else:  # subjective
        return {
            "score": 75,
            "total_questions": num_questions,
            "percentage": 75,
            "grade": "B",
            "assessment": {
                "strengths": ["Clear writing", "Good effort"],
                "areas_for_improvement": ["More detailed explanations", "Better examples"],
                "overall_feedback": "Solid understanding shown. Work on providing more detailed explanations."
            },
            "question_feedback": [
                {
                    "question_id": 1,
                    "score": 7,
                    "max_score": 10,
                    "feedback": "Good answer with room for improvement",
                    "key_points_covered": ["Basic concepts"],
                    "missing_points": ["Advanced applications", "Real-world examples"]
                }
            ],
            "resources": [
                {
                    "title": "Khan Academy",
                    "url": "https://khanacademy.org",
                    "description": "Excellent free educational resource"
                },
                {
                    "title": "MIT OpenCourseWare",
                    "url": "https://ocw.mit.edu",
                    "description": "Free course materials from MIT"
                }
            ]
        }
