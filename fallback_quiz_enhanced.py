"""
Enhanced fallback quiz generation with real, meaningful questions
"""

import random

# Comprehensive question database organized by subject, topic, and difficulty
QUESTION_DATABASE = {
    "Mathematics": {
        "Algebra": {
            "easy": [
                {
                    "question": "What is the value of x in the equation x + 5 = 12?",
                    "options": {"A": "7", "B": "17", "C": "5", "D": "12"},
                    "correct_answer": "A",
                    "explanation": "Subtract 5 from both sides: x = 12 - 5 = 7"
                },
                {
                    "question": "Simplify: 3x + 2x",
                    "options": {"A": "6x", "B": "5x", "C": "3x²", "D": "5x²"},
                    "correct_answer": "B",
                    "explanation": "Combine like terms: 3x + 2x = (3+2)x = 5x"
                },
                {
                    "question": "What is the coefficient of x in the expression 7x + 3?",
                    "options": {"A": "3", "B": "7", "C": "10", "D": "x"},
                    "correct_answer": "B",
                    "explanation": "The coefficient is the number multiplying the variable, which is 7"
                }
            ],
            "medium": [
                {
                    "question": "Solve for x: 2x - 7 = 3x + 1",
                    "options": {"A": "x = -8", "B": "x = 8", "C": "x = -4", "D": "x = 4"},
                    "correct_answer": "A",
                    "explanation": "2x - 7 = 3x + 1 → -7 - 1 = 3x - 2x → -8 = x"
                },
                {
                    "question": "Factor: x² - 9",
                    "options": {"A": "(x-3)(x-3)", "B": "(x+3)(x+3)", "C": "(x-3)(x+3)", "D": "Cannot be factored"},
                    "correct_answer": "C",
                    "explanation": "This is a difference of squares: x² - 9 = x² - 3² = (x-3)(x+3)"
                }
            ],
            "hard": [
                {
                    "question": "Find the discriminant of 2x² - 5x + 3 = 0",
                    "options": {"A": "1", "B": "-7", "C": "25", "D": "49"},
                    "correct_answer": "A",
                    "explanation": "Discriminant = b² - 4ac = (-5)² - 4(2)(3) = 25 - 24 = 1"
                }
            ]
        },
        "Calculus": {
            "easy": [
                {
                    "question": "What is the derivative of x²?",
                    "options": {"A": "x", "B": "2x", "C": "x³", "D": "2"},
                    "correct_answer": "B",
                    "explanation": "Using the power rule: d/dx(x²) = 2x¹ = 2x"
                }
            ],
            "medium": [
                {
                    "question": "Find the derivative of 3x³ - 2x + 5",
                    "options": {"A": "9x² - 2", "B": "9x² + 2", "C": "3x² - 2", "D": "9x² - 2x"},
                    "correct_answer": "A",
                    "explanation": "d/dx(3x³ - 2x + 5) = 9x² - 2 + 0 = 9x² - 2"
                }
            ]
        }
    },
    "Computer Science": {
        "Programming": {
            "easy": [
                {
                    "question": "Which of the following is a programming language?",
                    "options": {"A": "HTML", "B": "CSS", "C": "Python", "D": "JSON"},
                    "correct_answer": "C",
                    "explanation": "Python is a programming language, while HTML and CSS are markup languages, and JSON is a data format"
                },
                {
                    "question": "What does 'IDE' stand for in programming?",
                    "options": {"A": "Internet Development Environment", "B": "Integrated Development Environment", "C": "Internal Data Exchange", "D": "Interactive Design Editor"},
                    "correct_answer": "B",
                    "explanation": "IDE stands for Integrated Development Environment, a software application for writing code"
                }
            ],
            "medium": [
                {
                    "question": "What is the time complexity of binary search?",
                    "options": {"A": "O(n)", "B": "O(log n)", "C": "O(n²)", "D": "O(1)"},
                    "correct_answer": "B",
                    "explanation": "Binary search divides the search space in half each time, resulting in O(log n) complexity"
                }
            ]
        },
        "Data Structures": {
            "easy": [
                {
                    "question": "Which data structure follows LIFO (Last In, First Out) principle?",
                    "options": {"A": "Queue", "B": "Stack", "C": "Array", "D": "Linked List"},
                    "correct_answer": "B",
                    "explanation": "Stack follows LIFO principle where the last element added is the first one to be removed"
                }
            ]
        }
    },
    "Blockchain": {
        "Blockchain Basics": {
            "easy": [
                {
                    "question": "What is a blockchain?",
                    "options": {
                        "A": "A type of cryptocurrency",
                        "B": "A distributed ledger technology",
                        "C": "A programming language",
                        "D": "A web browser"
                    },
                    "correct_answer": "B",
                    "explanation": "A blockchain is a distributed ledger technology that maintains a continuously growing list of records (blocks) linked using cryptography"
                },
                {
                    "question": "What makes blockchain secure?",
                    "options": {
                        "A": "Password protection",
                        "B": "Cryptographic hashing",
                        "C": "Firewall systems",
                        "D": "Antivirus software"
                    },
                    "correct_answer": "B",
                    "explanation": "Blockchain security comes from cryptographic hashing, which creates unique fingerprints for each block"
                },
                {
                    "question": "What is a 'block' in blockchain?",
                    "options": {
                        "A": "A physical storage device",
                        "B": "A group of transactions",
                        "C": "A type of cryptocurrency",
                        "D": "A security protocol"
                    },
                    "correct_answer": "B",
                    "explanation": "A block is a collection of transaction data that is cryptographically linked to other blocks"
                },
                {
                    "question": "What does 'decentralized' mean in blockchain context?",
                    "options": {
                        "A": "Controlled by one authority",
                        "B": "Distributed across multiple nodes",
                        "C": "Located in one data center",
                        "D": "Managed by banks only"
                    },
                    "correct_answer": "B",
                    "explanation": "Decentralized means the blockchain is distributed across multiple nodes/computers rather than controlled by a single authority"
                },
                {
                    "question": "What is the first and most famous cryptocurrency?",
                    "options": {
                        "A": "Ethereum",
                        "B": "Litecoin",
                        "C": "Bitcoin",
                        "D": "Ripple"
                    },
                    "correct_answer": "C",
                    "explanation": "Bitcoin, created by Satoshi Nakamoto in 2009, was the first and remains the most famous cryptocurrency"
                }
            ],
            "medium": [
                {
                    "question": "What is a hash function's primary purpose in blockchain?",
                    "options": {
                        "A": "To encrypt user passwords",
                        "B": "To create unique block identifiers",
                        "C": "To compress file sizes",
                        "D": "To speed up transactions"
                    },
                    "correct_answer": "B",
                    "explanation": "Hash functions create unique, fixed-size identifiers for blocks, ensuring data integrity and linking blocks together"
                },
                {
                    "question": "What is a consensus mechanism?",
                    "options": {
                        "A": "A voting system for users",
                        "B": "A method to agree on valid transactions",
                        "C": "A way to encrypt data",
                        "D": "A backup system"
                    },
                    "correct_answer": "B",
                    "explanation": "Consensus mechanisms are protocols that ensure all nodes in the network agree on which transactions are valid"
                },
                {
                    "question": "What is 'mining' in blockchain?",
                    "options": {
                        "A": "Extracting cryptocurrency from the ground",
                        "B": "Validating transactions and creating new blocks",
                        "C": "Stealing cryptocurrency",
                        "D": "Buying cryptocurrency"
                    },
                    "correct_answer": "B",
                    "explanation": "Mining is the process of validating transactions, solving cryptographic puzzles, and adding new blocks to the blockchain"
                }
            ],
            "hard": [
                {
                    "question": "What is the Byzantine Generals Problem in blockchain context?",
                    "options": {
                        "A": "A historical military strategy",
                        "B": "A consensus problem in distributed systems",
                        "C": "A type of cryptocurrency attack",
                        "D": "A blockchain scaling issue"
                    },
                    "correct_answer": "B",
                    "explanation": "The Byzantine Generals Problem addresses how to achieve consensus in a distributed network where some nodes may be unreliable or malicious"
                }
            ]
        },
        "Smart Contracts": {
            "easy": [
                {
                    "question": "What is a smart contract?",
                    "options": {
                        "A": "A legal document",
                        "B": "Self-executing code on blockchain",
                        "C": "A type of cryptocurrency",
                        "D": "A mining algorithm"
                    },
                    "correct_answer": "B",
                    "explanation": "A smart contract is self-executing code that automatically enforces and executes agreements when conditions are met"
                }
            ]
        }
    },
    "Physics": {
        "Mechanics": {
            "easy": [
                {
                    "question": "What is the SI unit of force?",
                    "options": {"A": "Joule", "B": "Newton", "C": "Watt", "D": "Pascal"},
                    "correct_answer": "B",
                    "explanation": "The Newton (N) is the SI unit of force, named after Sir Isaac Newton"
                }
            ]
        }
    }
}

def generate_enhanced_fallback_quiz(subject, topic, quiz_type, num_questions, difficulty, academic_level):
    """Generate high-quality fallback quiz with real questions"""
    
    # Get questions from database
    questions_pool = []
    
    # Try to get questions for the specific subject and topic
    if subject in QUESTION_DATABASE and topic in QUESTION_DATABASE[subject]:
        topic_questions = QUESTION_DATABASE[subject][topic]
        
        # Get questions for the specified difficulty
        if difficulty in topic_questions:
            questions_pool.extend(topic_questions[difficulty])
        
        # If not enough questions, add from other difficulties
        if len(questions_pool) < num_questions:
            for diff in ['easy', 'medium', 'hard']:
                if diff != difficulty and diff in topic_questions:
                    questions_pool.extend(topic_questions[diff])
    
    # If still not enough questions, get from the same subject but different topics
    if len(questions_pool) < num_questions and subject in QUESTION_DATABASE:
        for other_topic in QUESTION_DATABASE[subject]:
            if other_topic != topic:
                for diff in ['easy', 'medium', 'hard']:
                    if diff in QUESTION_DATABASE[subject][other_topic]:
                        questions_pool.extend(QUESTION_DATABASE[subject][other_topic][diff])
    
    # If still not enough, create generic but meaningful questions
    if len(questions_pool) < num_questions:
        questions_pool.extend(generate_generic_questions(subject, topic, difficulty, academic_level, num_questions))
    
    # Shuffle and select required number of questions
    random.shuffle(questions_pool)
    selected_questions = questions_pool[:num_questions]
    
    # Format questions with proper IDs
    formatted_questions = []
    for i, q in enumerate(selected_questions, 1):
        formatted_q = q.copy()
        formatted_q['id'] = i
        formatted_q['difficulty'] = difficulty
        formatted_questions.append(formatted_q)
    
    return {
        'questions': formatted_questions
    }

def generate_generic_questions(subject, topic, difficulty, academic_level, num_needed):
    """Generate meaningful generic questions when database doesn't have enough"""
    
    generic_templates = {
        'easy': [
            {
                'question': f"What is the fundamental concept behind {topic}?",
                'options': {
                    'A': f"A method used in {subject}",
                    'B': f"A theory in {academic_level} level {subject}",
                    'C': f"An application of {topic}",
                    'D': f"A tool for {subject} analysis"
                },
                'correct_answer': 'A',
                'explanation': f"This question tests basic understanding of {topic} concepts in {subject}"
            },
            {
                'question': f"Which field primarily uses {topic}?",
                'options': {
                    'A': f"{subject}",
                    'B': "Literature",
                    'C': "Art History", 
                    'D': "Music Theory"
                },
                'correct_answer': 'A',
                'explanation': f"{topic} is primarily used in the field of {subject}"
            }
        ],
        'medium': [
            {
                'question': f"How does {topic} apply to real-world {subject} problems?",
                'options': {
                    'A': f"By providing theoretical frameworks for {subject}",
                    'B': f"By solving practical problems in {subject}",
                    'C': f"By creating new methods in {subject}",
                    'D': "All of the above"
                },
                'correct_answer': 'D',
                'explanation': f"{topic} has multiple applications in {subject}, including theoretical and practical aspects"
            }
        ],
        'hard': [
            {
                'question': f"What are the advanced implications of {topic} in {academic_level} level {subject}?",
                'options': {
                    'A': f"Complex theoretical applications in {subject}",
                    'B': f"Advanced problem-solving techniques",
                    'C': f"Integration with other {subject} concepts",
                    'D': "All of the above"
                },
                'correct_answer': 'D',
                'explanation': f"Advanced {topic} involves multiple complex aspects in {subject}"
            }
        ]
    }
    
    questions = []
    templates = generic_templates.get(difficulty, generic_templates['medium'])
    
    for i in range(num_needed):
        template = templates[i % len(templates)]
        questions.append(template)
    
    return questions

def generate_enhanced_fallback_assessment(quiz_data, user_answers, quiz_type, subject, topic):
    """
    Generate comprehensive fallback assessment with detailed question-by-question feedback
    """
    questions = quiz_data.get('questions', [])
    total_questions = len(questions)
    correct_answers = 0
    question_feedback = []
    
    # Sample correct answers for common topics (this would ideally be dynamic)
    sample_correct_answers = {
        'cryptocurrency': {
            'What is the first and most famous cryptocurrency?': 'B',
            'What is a smart contract?': 'A', 
            'What is a \'block\' in blockchain?': 'C',
            'What makes blockchain secure?': 'A',
            'What is a consensus mechanism?': 'B'
        },
        'blockchain': {
            'What is the first and most famous cryptocurrency?': 'B',
            'What is a smart contract?': 'A',
            'What is a \'block\' in blockchain?': 'C', 
            'What makes blockchain secure?': 'A',
            'What is a consensus mechanism?': 'B'
        }
    }
    
    # Get correct answers for this topic
    topic_lower = topic.lower()
    correct_answer_map = sample_correct_answers.get(topic_lower, {})
    
    for i, question in enumerate(questions):
        question_id = i + 1
        question_text = question.get('question', f'Question {question_id}')
        options = question.get('options', {})
        user_answer = user_answers.get(str(question_id), 'No answer provided')
        
        # Try to find correct answer
        correct_answer = correct_answer_map.get(question_text, 'B')  # Default fallback
        
        # Determine if answer is correct
        is_correct = user_answer == correct_answer
        if is_correct:
            correct_answers += 1
        
        # Generate detailed explanations based on question content
        explanation, why_wrong = generate_question_explanation(question_text, correct_answer, user_answer, options)
        
        question_feedback.append({
            "question_id": question_id,
            "question_text": question_text,
            "options": options,
            "user_answer": user_answer if user_answer != 'No answer provided' else None,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "explanation": explanation,
            "why_wrong": why_wrong if not is_correct else None
        })
    
    # Calculate scores
    percentage = (correct_answers / total_questions * 100) if total_questions > 0 else 0
    grade = calculate_grade(percentage)
    
    # Generate assessment feedback
    assessment = generate_assessment_feedback(percentage, correct_answers, total_questions, topic)
    
    return {
        "score": correct_answers * 10,  # Assuming 10 points per question
        "total_questions": total_questions,
        "correct_answers": correct_answers,
        "percentage": round(percentage, 1),
        "grade": grade,
        "assessment": assessment,
        "question_feedback": question_feedback,
        "study_recommendations": generate_study_recommendations(topic, percentage),
        "resources": generate_study_resources(topic)
    }

def generate_question_explanation(question_text, correct_answer, user_answer, options):
    """Generate detailed explanations for specific questions"""
    
    explanations = {
        'What is the first and most famous cryptocurrency?': {
            'explanation': 'Bitcoin was the first cryptocurrency, created by Satoshi Nakamoto in 2009. It introduced the concept of decentralized digital currency and remains the most valuable and widely recognized cryptocurrency.',
            'wrong_reasons': {
                'A': 'Ethereum was created in 2015, several years after Bitcoin. While innovative with smart contracts, it was not the first cryptocurrency.',
                'C': 'Litecoin was created in 2011 as a "lighter" version of Bitcoin, but came after Bitcoin.',
                'D': 'Ripple (XRP) was developed later and focuses on banking solutions rather than being a general cryptocurrency.'
            }
        },
        'What is a smart contract?': {
            'explanation': 'A smart contract is a self-executing contract with terms directly written into code. It automatically executes when predetermined conditions are met, without requiring intermediaries.',
            'wrong_reasons': {
                'B': 'This describes a traditional legal contract, not a smart contract.',
                'C': 'This describes a cryptocurrency wallet, not a smart contract.',
                'D': 'This describes a mining process, not a smart contract.'
            }
        },
        'What is a \'block\' in blockchain?': {
            'explanation': 'A block is a collection of transaction data that is cryptographically linked to previous blocks, forming a chain. Each block contains a hash of the previous block, transaction data, and a timestamp.',
            'wrong_reasons': {
                'A': 'This describes a cryptocurrency unit, not a block.',
                'B': 'This describes a mining reward, not a block structure.',
                'D': 'This describes a wallet, not a block.'
            }
        },
        'What makes blockchain secure?': {
            'explanation': 'Blockchain security comes from cryptographic hashing, decentralization, and consensus mechanisms. Each block is cryptographically linked to the previous one, making tampering extremely difficult.',
            'wrong_reasons': {
                'B': 'Government regulation is external to blockchain technology itself.',
                'C': 'Password protection is for individual accounts, not blockchain security.',
                'D': 'Bank verification contradicts the decentralized nature of blockchain.'
            }
        },
        'What is a consensus mechanism?': {
            'explanation': 'A consensus mechanism is a protocol that ensures all nodes in a blockchain network agree on the validity of transactions and the current state of the ledger. Examples include Proof of Work and Proof of Stake.',
            'wrong_reasons': {
                'A': 'This describes a mining process, not consensus.',
                'C': 'This describes a wallet feature, not consensus.',
                'D': 'This describes a trading mechanism, not consensus.'
            }
        }
    }
    
    # Get explanation for this question
    question_info = explanations.get(question_text, {
        'explanation': f'The correct answer is {correct_answer}. This is a fundamental concept in {question_text.lower()} that requires understanding of the underlying principles.',
        'wrong_reasons': {}
    })
    
    explanation = question_info['explanation']
    wrong_reasons = question_info.get('wrong_reasons', {})
    why_wrong = wrong_reasons.get(user_answer, f'Answer {user_answer} is incorrect. Please review the concept and try again.')
    
    return explanation, why_wrong

def calculate_grade(percentage):
    """Calculate letter grade based on percentage"""
    if percentage >= 90:
        return 'A+'
    elif percentage >= 85:
        return 'A'
    elif percentage >= 80:
        return 'A-'
    elif percentage >= 75:
        return 'B+'
    elif percentage >= 70:
        return 'B'
    elif percentage >= 65:
        return 'B-'
    elif percentage >= 60:
        return 'C+'
    elif percentage >= 55:
        return 'C'
    elif percentage >= 50:
        return 'C-'
    else:
        return 'F'

def generate_assessment_feedback(percentage, correct_answers, total_questions, topic):
    """Generate personalized assessment feedback"""
    
    if percentage >= 80:
        strengths = [
            "Excellent understanding of core concepts",
            "Strong analytical thinking",
            "Good grasp of technical details"
        ]
        areas_for_improvement = [
            "Continue building on this solid foundation",
            "Explore advanced applications",
            "Stay updated with latest developments"
        ]
        overall_feedback = f"Outstanding performance! You demonstrate excellent understanding of {topic}. Keep up the great work and continue exploring advanced concepts."
    
    elif percentage >= 60:
        strengths = [
            "Good understanding of basic concepts",
            "Shows promise in analytical thinking",
            "Grasps fundamental principles"
        ]
        areas_for_improvement = [
            "Review concepts where you struggled",
            "Practice more complex problems",
            "Strengthen understanding of technical details"
        ]
        overall_feedback = f"Good work! You have a solid foundation in {topic}, but there's room for improvement. Focus on the areas where you struggled and practice more."
    
    else:
        strengths = [
            "Shows interest in the subject",
            "Attempting to engage with the material"
        ]
        areas_for_improvement = [
            "Review fundamental concepts thoroughly",
            "Seek additional learning resources",
            "Practice basic problems before advancing",
            "Consider getting help from a tutor or study group"
        ]
        overall_feedback = f"You're on the learning journey! {topic} can be challenging, but with focused study and practice, you can improve significantly. Don't get discouraged - everyone starts somewhere."
    
    return {
        "strengths": strengths,
        "areas_for_improvement": areas_for_improvement,
        "overall_feedback": overall_feedback
    }

def generate_study_recommendations(topic, percentage):
    """Generate personalized study recommendations"""
    
    base_recommendations = [
        f"Review fundamental concepts of {topic}",
        "Practice with additional quiz questions",
        "Read authoritative sources on the subject"
    ]
    
    if percentage < 60:
        base_recommendations.extend([
            "Start with basic introductory materials",
            "Watch educational videos for visual learning",
            "Join study groups or online communities",
            "Consider seeking help from a tutor"
        ])
    elif percentage < 80:
        base_recommendations.extend([
            "Focus on areas where you lost points",
            "Explore real-world applications",
            "Practice explaining concepts to others"
        ])
    else:
        base_recommendations.extend([
            "Explore advanced topics and applications",
            "Stay updated with latest developments",
            "Consider teaching others to reinforce learning"
        ])
    
    return base_recommendations

def generate_study_resources(topic):
    """Generate relevant study resources"""
    
    resources = [
        {
            "title": f"{topic.title()} Fundamentals",
            "description": f"Comprehensive guide to understanding {topic}",
            "type": "article"
        },
        {
            "title": f"Interactive {topic.title()} Tutorial",
            "description": f"Hands-on learning experience with {topic}",
            "type": "tutorial"
        },
        {
            "title": f"{topic.title()} Video Course",
            "description": f"Visual learning approach to {topic} concepts",
            "type": "video"
        }
    ]
    
    return resources
