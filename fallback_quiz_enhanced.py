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
