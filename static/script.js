// Global state
let currentSubject = null;
let currentTopic = null;
let userAcademicLevel = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let quizType = 'mcq';
let quizDifficulty = 'medium';
let numQuestions = 10;

// Progress tracking
let quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
let topicPerformance = JSON.parse(localStorage.getItem('topicPerformance') || '{}');

// Mobile sidebar state
let sidebarOpen = false;

// ===== DATA MODELS =====

/**
 * User Profile Data Model
 */
class UserProfile {
    constructor(academicLevel = null, preferences = {}) {
        this.academicLevel = academicLevel; // 'Primary', 'Secondary', 'College', 'Competitive'
        this.preferences = preferences;
        this.createdAt = new Date().toISOString();
        this.lastUpdated = new Date().toISOString();
    }

    static isValidAcademicLevel(level) {
        const validLevels = ['Primary', 'Secondary', 'College', 'Competitive'];
        return validLevels.includes(level);
    }

    setAcademicLevel(level) {
        if (!UserProfile.isValidAcademicLevel(level)) {
            throw new Error(`Invalid academic level: ${level}`);
        }
        this.academicLevel = level;
        this.lastUpdated = new Date().toISOString();
    }

    toJSON() {
        return {
            academicLevel: this.academicLevel,
            preferences: this.preferences,
            createdAt: this.createdAt,
            lastUpdated: this.lastUpdated
        };
    }

    static fromJSON(data) {
        const profile = new UserProfile();
        Object.assign(profile, data);
        return profile;
    }
}

/**
 * Subject Data Model
 */
class Subject {
    constructor(name, description, icon, topics = []) {
        this.name = name;
        this.description = description;
        this.icon = icon;
        this.topics = topics.map(topic => new Topic(topic.name, topic.description, this.name));
        this.createdAt = new Date().toISOString();
    }

    addTopic(topic) {
        if (!(topic instanceof Topic)) {
            throw new Error('Topic must be an instance of Topic class');
        }
        this.topics.push(topic);
    }

    getTopic(name) {
        return this.topics.find(topic => topic.name === name);
    }

    getTopicNames() {
        return this.topics.map(topic => topic.name);
    }
}

/**
 * Topic Data Model
 */
class Topic {
    constructor(name, description, subjectName) {
        this.name = name;
        this.description = description;
        this.subjectName = subjectName;
        this.quizHistory = [];
        this.studyMaterials = [];
        this.createdAt = new Date().toISOString();
    }

    addQuizResult(result) {
        this.quizHistory.unshift(result);
        // Keep only last 50 results
        if (this.quizHistory.length > 50) {
            this.quizHistory = this.quizHistory.slice(0, 50);
        }
    }

    getAverageScore() {
        if (this.quizHistory.length === 0) return 0;
        const totalScore = this.quizHistory.reduce((sum, result) => sum + result.percentage, 0);
        return Math.round(totalScore / this.quizHistory.length);
    }

    getBestScore() {
        if (this.quizHistory.length === 0) return 0;
        return Math.max(...this.quizHistory.map(result => result.percentage));
    }

    getTotalQuizzes() {
        return this.quizHistory.length;
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Sanitize HTML to prevent XSS attacks
 */
function sanitizeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show loading spinner
 */
function showLoading(container, message = 'Loading...') {
    if (!container) return;
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mb-4"></div>
            <p class="text-medium-contrast">${sanitizeHtml(message)}</p>
        </div>
    `;
}

/**
 * Show notification
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = 'notification fixed top-4 right-4 z-50 max-w-sm';
    
    let bgColor, icon;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-600';
            icon = '✅';
            break;
        case 'error':
            bgColor = 'bg-red-600';
            icon = '❌';
            break;
        case 'warning':
            bgColor = 'bg-yellow-600';
            icon = '⚠️';
            break;
        default:
            bgColor = 'bg-blue-600';
            icon = 'ℹ️';
    }

    notification.innerHTML = `
        <div class="${bgColor} text-white px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-0">
            <div class="flex items-center">
                <span class="mr-2">${icon}</span>
                <span class="flex-1">${sanitizeHtml(message)}</span>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                    ×
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, duration);
}

/**
 * Format time in MM:SS format
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate grade from percentage
 */
function calculateGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    if (percentage >= 50) return 'C-';
    return 'F';
}

/**
 * Get grade color class
 */
function getGradeColorClass(grade) {
    const gradeColors = {
        'A+': 'text-green-400',
        'A': 'text-green-400',
        'A-': 'text-green-400',
        'B+': 'text-blue-400',
        'B': 'text-blue-400',
        'B-': 'text-blue-400',
        'C+': 'text-yellow-400',
        'C': 'text-yellow-400',
        'C-': 'text-yellow-400',
        'F': 'text-red-400'
    };
    return gradeColors[grade] || 'text-gray-400';
}

/**
 * Get score color class
 */
function getScoreColorClass(score) {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-blue-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 60) return 'text-orange-400';
    return 'text-red-400';
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString();
}

/**
 * Debounce function to limit API calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Save data to localStorage
 */
function saveData() {
    try {
        localStorage.setItem('quizHistory', JSON.stringify(quizHistory));
        localStorage.setItem('topicPerformance', JSON.stringify(topicPerformance));
        if (userAcademicLevel) {
            localStorage.setItem('userAcademicLevel', userAcademicLevel);
        }
    } catch (error) {
        console.error('Error saving data to localStorage:', error);
    }
}

/**
 * Load data from localStorage
 */
function loadData() {
    try {
        const savedHistory = localStorage.getItem('quizHistory');
        if (savedHistory) {
            quizHistory = JSON.parse(savedHistory);
        }

        const savedPerformance = localStorage.getItem('topicPerformance');
        if (savedPerformance) {
            topicPerformance = JSON.parse(savedPerformance);
        }

        const savedLevel = localStorage.getItem('userAcademicLevel');
        if (savedLevel) {
            userAcademicLevel = savedLevel;
        }
    } catch (error) {
        console.error('Error loading data from localStorage:', error);
        // Reset to defaults if data is corrupted
        quizHistory = [];
        topicPerformance = {};
        userAcademicLevel = null;
    }
}

// ===== API FUNCTIONS =====

/**
 * Test API connection
 */
async function testApiConnection() {
    try {
        console.log('🔍 Testing API connection...');
        const response = await fetch('/api/test-connection');
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            console.log('✅ API connection successful');
            showNotification('✅ API connection successful', 'success');
            return true;
        } else {
            console.warn('⚠️ API connection failed:', data.message);
            showNotification('⚠️ API connection issues detected', 'warning');
            return false;
        }
    } catch (error) {
        console.error('❌ API connection failed:', error);
        showNotification('❌ API connection failed', 'error');
        return false;
    }
}
/**
 * Generate quiz using API
 */
async function generateQuiz(subject, topic, academicLevel, quizType, numQuestions, difficulty = 'medium') {
    try {
        console.log('🎯 Generating quiz with params:', { subject, topic, academicLevel, quizType, numQuestions, difficulty });
        
        const response = await fetch('/api/generate-quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subject: subject,
                topic: topic,
                academicLevel: academicLevel,
                quizType: quizType,
                numQuestions: parseInt(numQuestions), // Ensure it's a number
                context: '',
                difficulty: difficulty
            })
        });

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.error('❌ Failed to parse response as JSON:', parseError);
            throw new Error('Server returned invalid response format');
        }

        console.log('📥 API Response:', data);

        if (response.ok && data.success && data.quiz && data.quiz.questions) {
            const receivedQuestions = data.quiz.questions.length;
            console.log(`✅ Received ${receivedQuestions} questions, requested ${numQuestions}`);
            
            // Validate we have the correct number of questions
            if (receivedQuestions !== parseInt(numQuestions)) {
                console.warn(`⚠️ Question count mismatch: got ${receivedQuestions}, expected ${numQuestions}`);
                
                // If we have fewer questions, supplement with additional ones
                if (receivedQuestions < numQuestions) {
                    const additionalNeeded = numQuestions - receivedQuestions;
                    console.log(`🔄 Generating ${additionalNeeded} additional questions...`);
                    
                    const additionalQuestions = generateAdditionalQuestions(
                        subject, topic, quizType, additionalNeeded, difficulty, receivedQuestions
                    );
                    
                    data.quiz.questions = [...data.quiz.questions, ...additionalQuestions];
                    console.log(`✅ Final quiz has ${data.quiz.questions.length} questions`);
                }
                
                // If we have too many questions, trim to exact count
                if (data.quiz.questions.length > numQuestions) {
                    data.quiz.questions = data.quiz.questions.slice(0, numQuestions);
                }
            }
            
            // Ensure all questions have proper structure
            data.quiz.questions = data.quiz.questions.map((q, index) => ({
                id: q.id || (index + 1),
                question: q.question || `Question ${index + 1}`,
                options: q.options || { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
                correct_answer: q.correct_answer || q.correct || 'A',
                explanation: q.explanation || 'Explanation not available',
                difficulty: q.difficulty || difficulty
            }));
            
            // Update quiz metadata
            data.quiz.total_questions = data.quiz.questions.length;
            data.quiz.source = data.source || 'api';
            
            console.log(`🎉 Successfully generated ${data.quiz.questions.length} questions from ${data.source}`);
            return data.quiz;
        } else {
            console.warn('⚠️ API response invalid, generating fallback quiz');
            return generateComprehensiveFallbackQuiz(subject, topic, quizType, numQuestions, difficulty);
        }
    } catch (error) {
        console.error('❌ Quiz generation error:', error);
        console.log('🔄 Generating emergency fallback quiz...');
        return generateComprehensiveFallbackQuiz(subject, topic, quizType, numQuestions, difficulty);
    }
}

/**
 * Generate additional questions when API doesn't return enough
 */
function generateAdditionalQuestions(subject, topic, quizType, numNeeded, difficulty, startingId) {
    console.log(`🔧 Generating ${numNeeded} additional questions starting from ID ${startingId + 1}`);
    
    const additionalQuestions = [];
    const questionTemplates = getQuestionTemplates(subject, topic);
    
    for (let i = 0; i < numNeeded; i++) {
        const questionId = startingId + i + 1;
        const template = questionTemplates[i % questionTemplates.length];
        
        additionalQuestions.push({
            id: questionId,
            question: template.question.replace('{topic}', topic).replace('{subject}', subject),
            options: template.options,
            correct_answer: template.correct_answer,
            explanation: template.explanation.replace('{topic}', topic),
            difficulty: difficulty,
            source: 'supplemental'
        });
    }
    
    return additionalQuestions;
}

/**
 * Get question templates for different subjects and topics
 */
function getQuestionTemplates(subject, topic) {
    const templates = {
        'Blockchain': {
            'Basics': [
                {
                    question: 'What is the primary purpose of blockchain technology?',
                    options: { A: 'Data storage only', B: 'Decentralized and secure transactions', C: 'Gaming applications', D: 'Social media' },
                    correct_answer: 'B',
                    explanation: 'Blockchain technology is primarily designed for decentralized and secure transactions without intermediaries.'
                },
                {
                    question: 'Which consensus mechanism does Bitcoin use?',
                    options: { A: 'Proof of Stake', B: 'Proof of Work', C: 'Delegated Proof of Stake', D: 'Proof of Authority' },
                    correct_answer: 'B',
                    explanation: 'Bitcoin uses Proof of Work (PoW) consensus mechanism where miners compete to solve cryptographic puzzles.'
                },
                {
                    question: 'What is a blockchain node?',
                    options: { A: 'A cryptocurrency wallet', B: 'A computer that maintains the blockchain', C: 'A mining device', D: 'A trading platform' },
                    correct_answer: 'B',
                    explanation: 'A blockchain node is a computer that maintains a copy of the blockchain and participates in the network.'
                }
            ],
            'Cryptocurrency': [
                {
                    question: 'What determines the value of a cryptocurrency?',
                    options: { A: 'Government regulation only', B: 'Supply and demand in the market', C: 'Mining difficulty', D: 'Number of transactions' },
                    correct_answer: 'B',
                    explanation: 'Cryptocurrency value is primarily determined by supply and demand dynamics in the market.'
                }
            ]
        }
    };
    
    // Get templates for the specific subject and topic, or use defaults
    if (templates[subject] && templates[subject][topic]) {
        return templates[subject][topic];
    } else if (templates[subject]) {
        // Use any templates from the same subject
        return Object.values(templates[subject]).flat();
    } else {
        // Use blockchain basics as default
        return templates['Blockchain']['Basics'];
    }
}

/**
 * Generate comprehensive fallback quiz with real questions
 */
function generateComprehensiveFallbackQuiz(subject, topic, quizType, numQuestions, difficulty) {
    console.log(`🔧 Generating comprehensive fallback quiz: ${numQuestions} questions for ${subject} - ${topic}`);
    
    // Comprehensive question database with real, educational content
    const questionDatabase = {
        'Blockchain': {
            'Basics': [
                {
                    question: 'What is the first and most famous cryptocurrency?',
                    options: { A: 'Ethereum', B: 'Bitcoin', C: 'Litecoin', D: 'Ripple' },
                    correct_answer: 'B',
                    explanation: 'Bitcoin was the first cryptocurrency, created by Satoshi Nakamoto in 2009. It introduced the concept of decentralized digital currency and remains the most valuable and widely recognized cryptocurrency.'
                },
                {
                    question: 'What is a smart contract?',
                    options: { A: 'A self-executing contract with terms written in code', B: 'A legal document', C: 'A cryptocurrency wallet', D: 'A mining algorithm' },
                    correct_answer: 'A',
                    explanation: 'Smart contracts are self-executing contracts with terms directly written into code. They automatically execute when predetermined conditions are met, without requiring intermediaries.'
                },
                {
                    question: 'What is a \'block\' in blockchain?',
                    options: { A: 'A cryptocurrency unit', B: 'A mining reward', C: 'A collection of transaction data', D: 'A digital wallet' },
                    correct_answer: 'C',
                    explanation: 'A block is a collection of transaction data that is cryptographically linked to previous blocks, forming a chain. Each block contains a hash of the previous block, transaction data, and a timestamp.'
                },
                {
                    question: 'What makes blockchain secure?',
                    options: { A: 'Cryptographic hashing and decentralization', B: 'Government regulation', C: 'Password protection', D: 'Bank verification' },
                    correct_answer: 'A',
                    explanation: 'Blockchain security comes from cryptographic hashing, decentralization, and consensus mechanisms. Each block is cryptographically linked to the previous one, making tampering extremely difficult.'
                },
                {
                    question: 'What is a consensus mechanism?',
                    options: { A: 'A mining process', B: 'A protocol for network agreement', C: 'A wallet feature', D: 'A trading mechanism' },
                    correct_answer: 'B',
                    explanation: 'A consensus mechanism is a protocol that ensures all nodes in a blockchain network agree on the validity of transactions and the current state of the ledger. Examples include Proof of Work and Proof of Stake.'
                },
                {
                    question: 'What is decentralization in blockchain?',
                    options: { A: 'Central authority control', B: 'Distributed network control', C: 'Government oversight', D: 'Bank management' },
                    correct_answer: 'B',
                    explanation: 'Decentralization means the network is controlled by distributed nodes rather than a central authority, eliminating single points of failure and reducing censorship risks.'
                },
                {
                    question: 'What is a cryptocurrency wallet?',
                    options: { A: 'A physical wallet', B: 'A bank account', C: 'A digital tool to store crypto keys', D: 'A mining device' },
                    correct_answer: 'C',
                    explanation: 'A cryptocurrency wallet is a digital tool that stores private and public keys for cryptocurrency transactions. It doesn\'t actually store the cryptocurrency itself, but the keys needed to access it.'
                },
                {
                    question: 'What is mining in blockchain?',
                    options: { A: 'Digging for gold', B: 'Validating transactions and creating blocks', C: 'Buying cryptocurrency', D: 'Trading tokens' },
                    correct_answer: 'B',
                    explanation: 'Mining is the process of validating transactions and creating new blocks in the blockchain. Miners use computational power to solve cryptographic puzzles and are rewarded with cryptocurrency.'
                },
                {
                    question: 'What is a hash function in blockchain?',
                    options: { A: 'A trading algorithm', B: 'A mathematical function that converts input to fixed output', C: 'A wallet address', D: 'A consensus method' },
                    correct_answer: 'B',
                    explanation: 'A hash function is a mathematical function that converts input data of any size into a fixed-size string of characters. In blockchain, it ensures data integrity and creates unique identifiers for blocks.'
                },
                {
                    question: 'What is immutability in blockchain?',
                    options: { A: 'Ability to change data easily', B: 'Data cannot be altered once recorded', C: 'Fast transaction processing', D: 'Low transaction fees' },
                    correct_answer: 'B',
                    explanation: 'Immutability means that once data is recorded in the blockchain, it cannot be altered or deleted. This is achieved through cryptographic hashing and the distributed nature of the network.'
                }
            ],
            'Cryptocurrency': [
                {
                    question: 'What does HODL mean in cryptocurrency?',
                    options: { A: 'Hold On for Dear Life', B: 'High Order Digital Ledger', C: 'Hash Output Data Link', D: 'Hybrid Online Digital Logic' },
                    correct_answer: 'A',
                    explanation: 'HODL is a term meaning to hold cryptocurrency long-term rather than selling, originally from a misspelled "hold" in a Bitcoin forum post.'
                },
                {
                    question: 'What is market capitalization in crypto?',
                    options: { A: 'Total supply of coins', B: 'Price per coin × circulating supply', C: 'Trading volume', D: 'Number of transactions' },
                    correct_answer: 'B',
                    explanation: 'Market cap is calculated by multiplying the current price per coin by the circulating supply of coins, representing the total market value.'
                }
            ]
        },
        'Computer Science': {
            'Programming': [
                {
                    question: 'What does HTML stand for?',
                    options: { A: 'Hypertext Markup Language', B: 'High Tech Modern Language', C: 'Home Tool Markup Language', D: 'Hyperlink Text Markup Language' },
                    correct_answer: 'A',
                    explanation: 'HTML stands for Hypertext Markup Language, the standard markup language used for creating web pages and web applications.'
                },
                {
                    question: 'Which of the following is a programming language?',
                    options: { A: 'HTTP', B: 'Python', C: 'CSS', D: 'HTML' },
                    correct_answer: 'B',
                    explanation: 'Python is a high-level, interpreted programming language known for its simplicity and versatility in various applications including web development, data science, and AI.'
                }
            ]
        }
    };
    
    // Get questions for the specific subject and topic
    let availableQuestions = [];
    
    if (questionDatabase[subject] && questionDatabase[subject][topic]) {
        availableQuestions = [...questionDatabase[subject][topic]];
    } else if (questionDatabase[subject]) {
        // Use questions from the same subject but different topics
        Object.values(questionDatabase[subject]).forEach(topicQuestions => {
            availableQuestions.push(...topicQuestions);
        });
    } else {
        // Default to blockchain basics questions
        availableQuestions = [...questionDatabase['Blockchain']['Basics']];
    }
    
    // If we still don't have enough questions, generate additional ones
    while (availableQuestions.length < numQuestions) {
        const questionNum = availableQuestions.length + 1;
        availableQuestions.push({
            question: `What is a fundamental concept in ${topic}? (Question ${questionNum})`,
            options: {
                A: `Basic principle of ${topic}`,
                B: `Core concept of ${topic}`,
                C: `Advanced feature of ${topic}`,
                D: `Related technology to ${topic}`
            },
            correct_answer: 'B',
            explanation: `This question tests understanding of core ${topic} concepts in ${subject}. The correct answer represents the fundamental principles that students should master.`
        });
    }
    
    // Shuffle and select the required number of questions
    const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, numQuestions);
    
    // Format questions with proper IDs and validation
    const formattedQuestions = selectedQuestions.map((q, index) => ({
        id: index + 1,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: difficulty,
        source: 'comprehensive_fallback'
    }));
    
    console.log(`✅ Generated ${formattedQuestions.length} comprehensive fallback questions`);
    
    return {
        questions: formattedQuestions,
        title: `${subject} - ${topic} Quiz`,
        subject: subject,
        topic: topic,
        difficulty: difficulty,
        quiz_type: quizType,
        total_questions: formattedQuestions.length,
        time_limit: 30,
        instructions: `This quiz covers ${topic} concepts in ${subject} at ${difficulty} difficulty level. Read each question carefully and select the best answer.`,
        created_at: new Date().toISOString(),
        source: 'comprehensive_fallback'
    };
}
/**
 * Assess quiz using API with comprehensive fallback
 */
async function assessQuiz(quiz, answers, quizType, subject, topic, academicLevel) {
    try {
        console.log('📊 Assessing quiz with:', { quiz, answers, quizType, subject, topic, academicLevel });
        
        const response = await fetch('/api/assess-quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quiz: quiz,
                answers: answers,
                quizType: quizType,
                subject: subject,
                topic: topic,
                academicLevel: academicLevel
            })
        });

        const data = await response.json();
        console.log('📥 Assessment API response:', data);

        if (response.ok) {
            // Handle both direct assessment data and wrapped response
            if (data.assessment) {
                return data.assessment;
            } else if (data.score !== undefined) {
                return data;
            } else {
                throw new Error('Invalid assessment response format');
            }
        } else {
            throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Quiz assessment error:', error);
        
        // Generate fallback assessment
        console.log('🔄 Generating fallback assessment...');
        return generateFallbackAssessment(quiz, answers, quizType, subject, topic);
    }
}

/**
 * Generate comprehensive fallback assessment with detailed question-by-question feedback
 */
function generateFallbackAssessment(quiz, answers, quizType, subject, topic) {
    console.log('🔧 Generating fallback assessment');
    
    const questions = quiz.questions || [];
    let correctAnswers = 0;
    const questionFeedback = [];
    
    // Sample correct answers for common topics
    const correctAnswerMap = {
        'blockchain': {
            'What is the first and most famous cryptocurrency?': 'B',
            'What is a smart contract?': 'A',
            'What is a \'block\' in blockchain?': 'C',
            'What makes blockchain secure?': 'A',
            'What is a consensus mechanism?': 'B'
        },
        'cryptocurrency': {
            'What is the first and most famous cryptocurrency?': 'B',
            'What is a smart contract?': 'A',
            'What is a \'block\' in blockchain?': 'C',
            'What makes blockchain secure?': 'A',
            'What is a consensus mechanism?': 'B'
        }
    };
    
    const topicAnswers = correctAnswerMap[topic.toLowerCase()] || {};
    
    questions.forEach((question, index) => {
        const questionId = index + 1;
        const userAnswer = answers[questionId] || 'No answer provided';
        const questionText = question.question || `Question ${questionId}`;
        
        // Try to determine correct answer
        let correctAnswer = topicAnswers[questionText] || 'B'; // Default fallback
        
        // If question has a correct_answer field, use it
        if (question.correct_answer) {
            correctAnswer = question.correct_answer;
        } else if (question.correct) {
            correctAnswer = question.correct;
        }
        
        const isCorrect = userAnswer === correctAnswer;
        if (isCorrect) correctAnswers++;
        
        // Generate explanations
        const explanations = {
            'What is the first and most famous cryptocurrency?': {
                explanation: 'Bitcoin was the first cryptocurrency, created by Satoshi Nakamoto in 2009. It introduced the concept of decentralized digital currency and remains the most valuable and widely recognized cryptocurrency.',
                wrongReasons: {
                    'A': 'Ethereum was created in 2015, several years after Bitcoin.',
                    'C': 'Litecoin was created in 2011 as a "lighter" version of Bitcoin.',
                    'D': 'Ripple (XRP) was developed later and focuses on banking solutions.'
                }
            },
            'What is a smart contract?': {
                explanation: 'A smart contract is a self-executing contract with terms directly written into code. It automatically executes when predetermined conditions are met, without requiring intermediaries.',
                wrongReasons: {
                    'B': 'This describes a traditional legal contract, not a smart contract.',
                    'C': 'This describes a cryptocurrency wallet, not a smart contract.',
                    'D': 'This describes a mining process, not a smart contract.'
                }
            },
            'What is a \'block\' in blockchain?': {
                explanation: 'A block is a collection of transaction data that is cryptographically linked to previous blocks, forming a chain. Each block contains a hash of the previous block, transaction data, and a timestamp.',
                wrongReasons: {
                    'A': 'This describes a cryptocurrency unit, not a block.',
                    'B': 'This describes a mining reward, not a block structure.',
                    'D': 'This describes a wallet, not a block.'
                }
            },
            'What makes blockchain secure?': {
                explanation: 'Blockchain security comes from cryptographic hashing, decentralization, and consensus mechanisms. Each block is cryptographically linked to the previous one, making tampering extremely difficult.',
                wrongReasons: {
                    'B': 'Government regulation is external to blockchain technology itself.',
                    'C': 'Password protection is for individual accounts, not blockchain security.',
                    'D': 'Bank verification contradicts the decentralized nature of blockchain.'
                }
            },
            'What is a consensus mechanism?': {
                explanation: 'A consensus mechanism is a protocol that ensures all nodes in a blockchain network agree on the validity of transactions and the current state of the ledger. Examples include Proof of Work and Proof of Stake.',
                wrongReasons: {
                    'A': 'This describes a mining process, not consensus.',
                    'C': 'This describes a wallet feature, not consensus.',
                    'D': 'This describes a trading mechanism, not consensus.'
                }
            }
        };
        
        const questionInfo = explanations[questionText] || {
            explanation: question.explanation || `The correct answer is ${correctAnswer}. This is a fundamental concept that requires understanding of the underlying principles.`,
            wrongReasons: {}
        };
        
        const explanation = questionInfo.explanation;
        const whyWrong = questionInfo.wrongReasons[userAnswer] || `Answer ${userAnswer} is incorrect. Please review the concept and try again.`;
        
        questionFeedback.push({
            question_id: questionId,
            question_text: questionText,
            options: question.options || {},
            user_answer: userAnswer !== 'No answer provided' ? userAnswer : null,
            correct_answer: correctAnswer,
            is_correct: isCorrect,
            explanation: explanation,
            why_wrong: !isCorrect ? whyWrong : null
        });
    });
    
    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions * 100) : 0;
    
    // Calculate grade
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 85) grade = 'A';
    else if (percentage >= 80) grade = 'A-';
    else if (percentage >= 75) grade = 'B+';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 65) grade = 'B-';
    else if (percentage >= 60) grade = 'C+';
    else if (percentage >= 55) grade = 'C';
    else if (percentage >= 50) grade = 'C-';
    
    // Generate feedback
    let strengths = [];
    let areasForImprovement = [];
    let overallFeedback = '';
    
    if (percentage >= 80) {
        strengths = ['Excellent understanding of core concepts', 'Strong analytical thinking', 'Good grasp of technical details'];
        areasForImprovement = ['Continue building on this solid foundation', 'Explore advanced applications'];
        overallFeedback = `Outstanding performance! You demonstrate excellent understanding of ${topic}. Keep up the great work!`;
    } else if (percentage >= 60) {
        strengths = ['Good understanding of basic concepts', 'Shows promise in analytical thinking'];
        areasForImprovement = ['Review concepts where you struggled', 'Practice more complex problems'];
        overallFeedback = `Good work! You have a solid foundation in ${topic}, but there's room for improvement.`;
    } else {
        strengths = ['Shows interest in the subject', 'Attempting to engage with the material'];
        areasForImprovement = ['Review fundamental concepts thoroughly', 'Seek additional learning resources', 'Practice basic problems'];
        overallFeedback = `You're on the learning journey! ${topic} can be challenging, but with focused study, you can improve significantly.`;
    }
    
    return {
        score: correctAnswers * 10,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        percentage: Math.round(percentage * 10) / 10,
        grade: grade,
        assessment: {
            strengths: strengths,
            areas_for_improvement: areasForImprovement,
            overall_feedback: overallFeedback
        },
        question_feedback: questionFeedback,
        study_recommendations: [
            `Review fundamental concepts of ${topic}`,
            'Practice with additional quiz questions',
            'Read authoritative sources on the subject'
        ],
        resources: [
            {
                title: `${topic} Fundamentals`,
                description: `Comprehensive guide to understanding ${topic}`,
                type: 'article'
            }
        ]
    };
}

// ===== MAIN APPLICATION LOGIC =====

/**
 * Application state
 */
let subjects = [];
let userProfile = null;

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('🚀 Initializing AcadTutor...');
    
    // Load saved data
    loadData();
    
    // Initialize subjects
    initializeSubjects();
    
    // Set up event listeners
    setupEventListeners();
    
    // Test API connection
    testApiConnection();
    
    // Show appropriate initial view
    if (!userAcademicLevel) {
        showView('welcome');
    } else {
        showView('dashboard');
    }
    
    console.log('✅ AcadTutor initialized successfully');
}

/**
 * Initialize subjects data
 */
function initializeSubjects() {
    subjects = [
        new Subject('Blockchain', 'Learn about blockchain technology, cryptocurrencies, and decentralized systems', '🔗', [
            { name: 'Basics', description: 'Fundamental blockchain concepts and principles' },
            { name: 'Cryptocurrency', description: 'Digital currencies, trading, and market dynamics' },
            { name: 'Smart Contracts', description: 'Self-executing contracts and DApps' },
            { name: 'DeFi', description: 'Decentralized Finance protocols and applications' }
        ]),
        new Subject('Computer Science', 'Explore programming, algorithms, data structures, and software development', '💻', [
            { name: 'Programming', description: 'Programming languages, syntax, and best practices' },
            { name: 'Algorithms', description: 'Problem-solving algorithms and complexity analysis' },
            { name: 'Data Structures', description: 'Arrays, lists, trees, graphs, and hash tables' },
            { name: 'Web Development', description: 'Frontend and backend web technologies' }
        ]),
        new Subject('Mathematics', 'Master mathematical concepts from basic arithmetic to advanced calculus', '📐', [
            { name: 'Algebra', description: 'Linear equations, polynomials, and algebraic structures' },
            { name: 'Geometry', description: 'Shapes, angles, areas, and spatial relationships' },
            { name: 'Calculus', description: 'Derivatives, integrals, and mathematical analysis' },
            { name: 'Statistics', description: 'Data analysis, probability, and statistical inference' }
        ]),
        new Subject('Science', 'Discover the natural world through physics, chemistry, and biology', '🔬', [
            { name: 'Physics', description: 'Motion, energy, forces, and fundamental laws' },
            { name: 'Chemistry', description: 'Elements, compounds, reactions, and molecular structure' },
            { name: 'Biology', description: 'Living organisms, cells, genetics, and ecosystems' },
            { name: 'Environmental Science', description: 'Ecology, sustainability, and environmental issues' }
        ])
    ];
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (event) => {
        if (sidebarOpen && sidebar && !sidebar.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
            closeSidebar();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            closeSidebar();
        }
    });
    
    // Save data before page unload
    window.addEventListener('beforeunload', saveData);
    
    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            saveData();
        }
    });
}

/**
 * Toggle mobile sidebar
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    sidebarOpen = !sidebarOpen;
    
    if (sidebarOpen) {
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
    } else {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
    }
}

/**
 * Close mobile sidebar
 */
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    sidebarOpen = false;
    sidebar.classList.remove('translate-x-0');
    sidebar.classList.add('-translate-x-full');
}

/**
 * Show specific view
 */
function showView(viewName) {
    console.log('🔄 Switching to view:', viewName);
    
    // Hide all views
    const views = ['welcome', 'dashboard', 'subjects', 'topics', 'detail', 'quiz-setup', 'quiz-questions', 'quiz-results'];
    views.forEach(view => {
        const element = document.getElementById(view);
        if (element) {
            element.classList.add('hidden');
        }
    });
    
    // Show requested view
    const targetView = document.getElementById(viewName);
    if (targetView) {
        targetView.classList.remove('hidden');
    }
    
    // Close mobile sidebar
    closeSidebar();
    
    // Update view-specific content
    switch (viewName) {
        case 'welcome':
            setupWelcomeView();
            break;
        case 'dashboard':
            updateDashboard();
            break;
        case 'subjects':
            loadSubjects();
            break;
        case 'topics':
            if (currentSubject) {
                loadTopics(currentSubject);
            }
            break;
        case 'detail':
            if (currentTopic) {
                showTopicDetail(currentTopic);
            }
            break;
    }
}

/**
 * Setup welcome view
 */
function setupWelcomeView() {
    const getStartedBtn = document.getElementById('get-started-btn');
    if (getStartedBtn) {
        getStartedBtn.onclick = () => {
            showAcademicLevelModal();
        };
    }
}

/**
 * Show academic level selection modal
 */
function showAcademicLevelModal() {
    const modal = document.getElementById('academic-level-modal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // Set up level selection buttons
        const levelButtons = modal.querySelectorAll('[data-level]');
        levelButtons.forEach(button => {
            button.onclick = () => {
                const level = button.getAttribute('data-level');
                selectAcademicLevel(level);
            };
        });
    }
}

/**
 * Select academic level
 */
function selectAcademicLevel(level) {
    console.log('🎓 Selected academic level:', level);
    
    userAcademicLevel = level;
    userProfile = new UserProfile(level);
    
    // Save to localStorage
    saveData();
    
    // Hide modal
    const modal = document.getElementById('academic-level-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Show success message
    showNotification(`Welcome! Academic level set to ${level}`, 'success');
    
    // Navigate to dashboard
    showView('dashboard');
}

/**
 * Update dashboard with user data
 */
function updateDashboard() {
    console.log('📊 Updating dashboard');
    
    // Update welcome message
    updateWelcomeMessage();
    
    // Update recent activity
    updateRecentActivity();
    
    // Update performance metrics
    updatePerformanceMetrics();
    
    // Update quick actions
    updateQuickActions();
    
    // Update progress charts
    updateProgressCharts();
}

/**
 * Update welcome message
 */
function updateWelcomeMessage() {
    const welcomeContainer = document.getElementById('dashboard-welcome');
    if (!welcomeContainer) return;
    
    const currentHour = new Date().getHours();
    let greeting = 'Good evening';
    if (currentHour < 12) greeting = 'Good morning';
    else if (currentHour < 18) greeting = 'Good afternoon';
    
    const levelEmoji = {
        'Primary': '🎒',
        'Secondary': '📚',
        'College': '🎓',
        'Competitive': '🏆'
    };
    
    welcomeContainer.innerHTML = `
        <div class="bg-gradient-to-r from-teal-600 to-blue-600 p-6 rounded-lg text-white">
            <h2 class="text-2xl font-bold mb-2">
                ${greeting}! ${levelEmoji[userAcademicLevel] || '📖'}
            </h2>
            <p class="opacity-90">
                Ready to continue your ${userAcademicLevel} level learning journey?
            </p>
        </div>
    `;
}

/**
 * Update recent activity section
 */
function updateRecentActivity() {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    
    if (quizHistory.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-6xl mb-4">📚</div>
                <h3 class="text-lg font-semibold text-high-contrast mb-2">No quizzes taken yet</h3>
                <p class="text-medium-contrast mb-4">Start your learning journey by taking your first quiz!</p>
                <button onclick="showView('subjects')" class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    Explore Subjects
                </button>
            </div>
        `;
        return;
    }
    
    const recentQuizzes = quizHistory.slice(0, 5);
    const activityHTML = recentQuizzes.map(quiz => `
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h4 class="font-medium text-high-contrast">${sanitizeHtml(quiz.subject)} - ${sanitizeHtml(quiz.topic)}</h4>
                    <p class="text-sm text-medium-contrast">${quiz.totalQuestions} questions • ${quiz.difficulty || 'Medium'}</p>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold ${getScoreColorClass(quiz.score)}">${quiz.score}%</div>
                    <div class="text-sm px-2 py-1 rounded ${getGradeColorClass(quiz.grade)} bg-opacity-20">${quiz.grade}</div>
                </div>
            </div>
            <div class="flex justify-between items-center text-sm text-low-contrast">
                <span>${formatDate(quiz.timestamp)}</span>
                <span>${quiz.correctAnswers}/${quiz.totalQuestions} correct</span>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="space-y-4">
            ${activityHTML}
            <div class="text-center">
                <button onclick="showQuizHistory()" class="text-teal-400 hover:text-teal-300 text-sm">
                    View All History →
                </button>
            </div>
        </div>
    `;
}

/**
 * Update performance metrics
 */
function updatePerformanceMetrics() {
    const container = document.getElementById('performance-metrics');
    if (!container) return;
    
    if (quizHistory.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-4xl mb-2">📊</div>
                <p class="text-medium-contrast">No performance data yet</p>
                <p class="text-sm text-low-contrast">Take some quizzes to see your progress</p>
            </div>
        `;
        return;
    }
    
    const totalQuizzes = quizHistory.length;
    const averageScore = Math.round(quizHistory.reduce((sum, quiz) => sum + quiz.score, 0) / totalQuizzes);
    const bestScore = Math.max(...quizHistory.map(quiz => quiz.score));
    const recentImprovement = calculateRecentImprovement();
    const totalCorrect = quizHistory.reduce((sum, quiz) => sum + quiz.correctAnswers, 0);
    const totalQuestions = quizHistory.reduce((sum, quiz) => sum + quiz.totalQuestions, 0);
    
    container.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-gray-800 p-4 rounded-lg text-center border border-gray-700">
                <div class="text-2xl font-bold text-teal-400 mb-1">${totalQuizzes}</div>
                <div class="text-xs text-medium-contrast">Total Quizzes</div>
            </div>
            <div class="bg-gray-800 p-4 rounded-lg text-center border border-gray-700">
                <div class="text-2xl font-bold text-blue-400 mb-1">${averageScore}%</div>
                <div class="text-xs text-medium-contrast">Average Score</div>
            </div>
            <div class="bg-gray-800 p-4 rounded-lg text-center border border-gray-700">
                <div class="text-2xl font-bold text-green-400 mb-1">${bestScore}%</div>
                <div class="text-xs text-medium-contrast">Best Score</div>
            </div>
            <div class="bg-gray-800 p-4 rounded-lg text-center border border-gray-700">
                <div class="text-2xl font-bold ${recentImprovement >= 0 ? 'text-green-400' : 'text-red-400'} mb-1">
                    ${recentImprovement >= 0 ? '+' : ''}${recentImprovement}%
                </div>
                <div class="text-xs text-medium-contrast">Recent Trend</div>
            </div>
        </div>
        
        <div class="mt-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-medium-contrast">Overall Accuracy</span>
                <span class="text-sm font-medium text-high-contrast">${Math.round((totalCorrect / totalQuestions) * 100)}%</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2">
                <div class="bg-gradient-to-r from-teal-500 to-blue-500 h-2 rounded-full transition-all duration-500" 
                     style="width: ${(totalCorrect / totalQuestions) * 100}%"></div>
            </div>
            <div class="text-xs text-low-contrast mt-1">${totalCorrect} correct out of ${totalQuestions} questions</div>
        </div>
    `;
}

/**
 * Calculate recent improvement trend
 */
function calculateRecentImprovement() {
    if (quizHistory.length < 4) return 0;
    
    const recent = quizHistory.slice(0, 3);
    const older = quizHistory.slice(3, 6);
    
    if (older.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, quiz) => sum + quiz.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, quiz) => sum + quiz.score, 0) / older.length;
    
    return Math.round(recentAvg - olderAvg);
}

/**
 * Update quick actions section
 */
function updateQuickActions() {
    const container = document.getElementById('quick-actions');
    if (!container) return;
    
    // Get most studied subjects
    const subjectCounts = {};
    quizHistory.forEach(quiz => {
        subjectCounts[quiz.subject] = (subjectCounts[quiz.subject] || 0) + 1;
    });
    
    const topSubjects = Object.entries(subjectCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([subject]) => subject);
    
    const quickActionsHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button onclick="showView('subjects')" 
                    class="bg-gradient-to-r from-teal-600 to-blue-600 p-4 rounded-lg text-white text-left hover:from-teal-700 hover:to-blue-700 transition-all">
                <div class="text-2xl mb-2">🚀</div>
                <div class="font-medium">Start New Quiz</div>
                <div class="text-sm opacity-90">Choose a subject to begin</div>
            </button>
            
            <button onclick="showQuizHistory()" 
                    class="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-lg text-white text-left hover:from-purple-700 hover:to-pink-700 transition-all">
                <div class="text-2xl mb-2">📈</div>
                <div class="font-medium">View Progress</div>
                <div class="text-sm opacity-90">Track your improvement</div>
            </button>
            
            <button onclick="generateRandomQuiz()" 
                    class="bg-gradient-to-r from-orange-600 to-red-600 p-4 rounded-lg text-white text-left hover:from-orange-700 hover:to-red-700 transition-all">
                <div class="text-2xl mb-2">🎲</div>
                <div class="font-medium">Random Quiz</div>
                <div class="text-sm opacity-90">Challenge yourself</div>
            </button>
        </div>
        
        ${topSubjects.length > 0 ? `
            <div class="mt-6">
                <h4 class="text-sm font-medium text-medium-contrast mb-3">Continue studying:</h4>
                <div class="flex flex-wrap gap-2">
                    ${topSubjects.map(subject => `
                        <button onclick="selectSubjectByName('${subject}')" 
                                class="bg-gray-800 hover:bg-gray-700 text-high-contrast px-3 py-2 rounded-lg text-sm border border-gray-700 hover:border-gray-600 transition-colors">
                            ${sanitizeHtml(subject)}
                        </button>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    container.innerHTML = quickActionsHTML;
}

/**
 * Update progress charts
 */
function updateProgressCharts() {
    const container = document.getElementById('progress-charts');
    if (!container) return;
    
    if (quizHistory.length < 3) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-4xl mb-2">📊</div>
                <p class="text-medium-contrast">Take more quizzes to see progress charts</p>
            </div>
        `;
        return;
    }
    
    // Generate simple progress visualization
    const last10Quizzes = quizHistory.slice(0, 10).reverse();
    const maxScore = Math.max(...last10Quizzes.map(q => q.score));
    
    container.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h4 class="text-lg font-semibold text-high-contrast mb-4">Recent Performance Trend</h4>
            <div class="flex items-end justify-between h-32 mb-4">
                ${last10Quizzes.map((quiz, index) => `
                    <div class="flex flex-col items-center">
                        <div class="bg-gradient-to-t from-teal-600 to-blue-500 rounded-t" 
                             style="height: ${(quiz.score / maxScore) * 100}px; width: 20px;"
                             title="${quiz.subject} - ${quiz.topic}: ${quiz.score}%"></div>
                        <div class="text-xs text-low-contrast mt-1">${index + 1}</div>
                    </div>
                `).join('')}
            </div>
            <div class="text-xs text-medium-contrast">Last 10 quizzes (hover for details)</div>
        </div>
    `;
}
/**
 * Load subjects view
 */
function loadSubjects() {
    console.log('📚 Loading subjects');
    
    const container = document.getElementById('subjects-grid');
    if (!container) return;
    
    const subjectsHTML = subjects.map(subject => {
        const subjectStats = getSubjectStats(subject.name);
        
        return `
            <div class="subject-card bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-teal-500 transition-all cursor-pointer transform hover:scale-105"
                 onclick="selectSubject('${subject.name}')">
                <div class="text-4xl mb-4">${subject.icon}</div>
                <h3 class="text-xl font-semibold text-high-contrast mb-2">${sanitizeHtml(subject.name)}</h3>
                <p class="text-medium-contrast mb-4 text-sm">${sanitizeHtml(subject.description)}</p>
                
                <div class="flex flex-wrap gap-2 mb-4">
                    ${subject.topics.slice(0, 3).map(topic => `
                        <span class="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">${sanitizeHtml(topic.name)}</span>
                    `).join('')}
                    ${subject.topics.length > 3 ? `<span class="text-xs text-gray-400">+${subject.topics.length - 3} more</span>` : ''}
                </div>
                
                <div class="flex justify-between items-center text-sm">
                    <span class="text-low-contrast">${subject.topics.length} topics</span>
                    <div class="flex items-center space-x-2">
                        ${subjectStats.totalQuizzes > 0 ? `
                            <span class="text-teal-400">${subjectStats.averageScore}% avg</span>
                            <span class="text-gray-500">•</span>
                            <span class="text-medium-contrast">${subjectStats.totalQuizzes} quizzes</span>
                        ` : `
                            <span class="text-gray-500">Not started</span>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = subjectsHTML;
}

/**
 * Get statistics for a subject
 */
function getSubjectStats(subjectName) {
    const subjectQuizzes = quizHistory.filter(quiz => quiz.subject === subjectName);
    
    if (subjectQuizzes.length === 0) {
        return { totalQuizzes: 0, averageScore: 0, bestScore: 0 };
    }
    
    const totalQuizzes = subjectQuizzes.length;
    const averageScore = Math.round(subjectQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / totalQuizzes);
    const bestScore = Math.max(...subjectQuizzes.map(quiz => quiz.score));
    
    return { totalQuizzes, averageScore, bestScore };
}

/**
 * Select subject by name (helper function)
 */
function selectSubjectByName(subjectName) {
    selectSubject(subjectName);
    showView('subjects');
}

/**
 * Select a subject
 */
function selectSubject(subjectName) {
    console.log('📚 Selected subject:', subjectName);
    
    currentSubject = subjects.find(subject => subject.name === subjectName);
    if (currentSubject) {
        loadTopics(currentSubject);
        showView('topics');
    }
}

/**
 * Load topics for selected subject
 */
function loadTopics(subject) {
    console.log('📖 Loading topics for:', subject.name);
    
    const container = document.getElementById('topics-grid');
    if (!container) return;
    
    const topicsHTML = subject.topics.map(topic => {
        const topicStats = getTopicStats(subject.name, topic.name);
        
        return `
            <div class="topic-card bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-teal-500 transition-all cursor-pointer transform hover:scale-105"
                 onclick="selectTopic('${topic.name}')">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-lg font-semibold text-high-contrast">${sanitizeHtml(topic.name)}</h3>
                    ${topicStats.totalQuizzes > 0 ? `
                        <div class="text-right">
                            <div class="text-sm font-medium ${getScoreColorClass(topicStats.averageScore)}">${topicStats.averageScore}%</div>
                            <div class="text-xs text-low-contrast">${topicStats.totalQuizzes} quizzes</div>
                        </div>
                    ` : `
                        <div class="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">New</div>
                    `}
                </div>
                
                <p class="text-medium-contrast mb-4 text-sm">${sanitizeHtml(topic.description)}</p>
                
                ${topicStats.totalQuizzes > 0 ? `
                    <div class="mb-4">
                        <div class="flex justify-between text-xs text-medium-contrast mb-1">
                            <span>Progress</span>
                            <span>${topicStats.averageScore}%</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-2">
                            <div class="bg-gradient-to-r from-teal-500 to-blue-500 h-2 rounded-full transition-all duration-500" 
                                 style="width: ${topicStats.averageScore}%"></div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="flex justify-between items-center">
                    <span class="text-sm text-low-contrast">Click to explore</span>
                    <span class="text-teal-400 text-lg">→</span>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = topicsHTML;
    
    // Update breadcrumb
    const breadcrumb = document.getElementById('topics-breadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = `
            <button onclick="showView('subjects')" class="text-teal-400 hover:text-teal-300 transition-colors">
                Subjects
            </button>
            <span class="text-gray-500 mx-2">></span>
            <span class="text-high-contrast">${sanitizeHtml(subject.name)}</span>
        `;
    }
}

/**
 * Get statistics for a topic
 */
function getTopicStats(subjectName, topicName) {
    const topicQuizzes = quizHistory.filter(quiz => 
        quiz.subject === subjectName && quiz.topic === topicName
    );
    
    if (topicQuizzes.length === 0) {
        return { totalQuizzes: 0, averageScore: 0, bestScore: 0 };
    }
    
    const totalQuizzes = topicQuizzes.length;
    const averageScore = Math.round(topicQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / totalQuizzes);
    const bestScore = Math.max(...topicQuizzes.map(quiz => quiz.score));
    
    return { totalQuizzes, averageScore, bestScore };
}

/**
 * Select a topic
 */
function selectTopic(topicName) {
    console.log('📖 Selected topic:', topicName);
    
    currentTopic = currentSubject.getTopic(topicName);
    if (currentTopic) {
        showTopicDetail(currentTopic);
        showView('detail');
    }
}

/**
 * Show topic detail view
 */
function showTopicDetail(topic) {
    console.log('📋 Showing topic detail:', topic.name);
    
    const container = document.getElementById('topic-detail-content');
    if (!container) return;
    
    const topicStats = getTopicStats(currentSubject.name, topic.name);
    const recentQuizzes = quizHistory
        .filter(quiz => quiz.subject === currentSubject.name && quiz.topic === topic.name)
        .slice(0, 3);
    
    container.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-high-contrast mb-2">${sanitizeHtml(topic.name)}</h2>
            <p class="text-medium-contrast">${sanitizeHtml(topic.description)}</p>
            <p class="text-sm text-low-contrast">Subject: ${sanitizeHtml(currentSubject.name)}</p>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <!-- Study Options -->
            <div class="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 class="text-lg font-semibold text-high-contrast mb-4 flex items-center">
                    📚 Study Options
                </h3>
                <div class="space-y-3">
                    <button onclick="generateTopicExplanation()" 
                            class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-left transition-colors group">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="font-medium">📖 Get AI Explanation</div>
                                <div class="text-sm opacity-90">Comprehensive topic overview</div>
                            </div>
                            <span class="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </button>
                    <button onclick="showQuizSetup()" 
                            class="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-lg text-left transition-colors group">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="font-medium">🎯 Take Quiz</div>
                                <div class="text-sm opacity-90">Test your knowledge</div>
                            </div>
                            <span class="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </button>
                    <button onclick="generatePracticeQuestions()" 
                            class="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg text-left transition-colors group">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="font-medium">💪 Practice Questions</div>
                                <div class="text-sm opacity-90">Quick practice session</div>
                            </div>
                            <span class="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </button>
                </div>
            </div>
            
            <!-- Progress Overview -->
            <div class="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 class="text-lg font-semibold text-high-contrast mb-4 flex items-center">
                    📊 Your Progress
                </h3>
                ${topicStats.totalQuizzes > 0 ? `
                    <div class="space-y-4">
                        <div>
                            <div class="flex justify-between text-sm mb-2">
                                <span class="text-medium-contrast">Average Score</span>
                                <span class="font-medium ${getScoreColorClass(topicStats.averageScore)}">${topicStats.averageScore}%</span>
                            </div>
                            <div class="w-full bg-gray-700 rounded-full h-3">
                                <div class="bg-gradient-to-r from-teal-500 to-blue-500 h-3 rounded-full transition-all duration-500" 
                                     style="width: ${topicStats.averageScore}%"></div>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div class="text-lg font-bold text-teal-400">${topicStats.totalQuizzes}</div>
                                <div class="text-xs text-medium-contrast">Quizzes</div>
                            </div>
                            <div>
                                <div class="text-lg font-bold text-blue-400">${topicStats.bestScore}%</div>
                                <div class="text-xs text-medium-contrast">Best Score</div>
                            </div>
                            <div>
                                <div class="text-lg font-bold text-purple-400">${calculateGrade(topicStats.averageScore)}</div>
                                <div class="text-xs text-medium-contrast">Grade</div>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="text-center py-4">
                        <div class="text-4xl mb-2">🎯</div>
                        <p class="text-medium-contrast mb-2">No progress data yet</p>
                        <p class="text-sm text-low-contrast">Take a quiz to see your progress</p>
                    </div>
                `}
            </div>
        </div>
        
        <!-- Recent Activity -->
        <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
            <h3 class="text-lg font-semibold text-high-contrast mb-4 flex items-center">
                📈 Recent Activity
            </h3>
            ${recentQuizzes.length > 0 ? `
                <div class="space-y-3">
                    ${recentQuizzes.map(quiz => `
                        <div class="flex justify-between items-center py-3 border-b border-gray-700 last:border-b-0">
                            <div>
                                <div class="text-sm font-medium text-high-contrast">
                                    ${quiz.quizType === 'mcq' ? 'Multiple Choice' : 'Subjective'} Quiz
                                </div>
                                <div class="text-xs text-medium-contrast">
                                    ${quiz.totalQuestions} questions • ${quiz.difficulty || 'Medium'} • ${formatDate(quiz.timestamp)}
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-bold ${getScoreColorClass(quiz.score)}">${quiz.score}%</div>
                                <div class="text-xs text-medium-contrast">${quiz.grade}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="text-center py-4">
                    <div class="text-4xl mb-2">📝</div>
                    <p class="text-medium-contrast">No recent activity</p>
                    <p class="text-sm text-low-contrast">Take your first quiz to get started</p>
                </div>
            `}
        </div>
        
        <!-- Study Recommendations -->
        ${topicStats.totalQuizzes > 0 && topicStats.averageScore < 80 ? `
            <div class="bg-yellow-900 bg-opacity-20 border border-yellow-600 border-opacity-30 p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-yellow-400 mb-3 flex items-center">
                    💡 Study Recommendations
                </h3>
                <div class="space-y-2 text-sm text-yellow-100">
                    <p>• Review the fundamental concepts of ${topic.name}</p>
                    <p>• Practice with more questions to improve your score</p>
                    <p>• Try the AI explanation feature for better understanding</p>
                    ${topicStats.averageScore < 60 ? '<p>• Consider starting with easier difficulty levels</p>' : ''}
                </div>
            </div>
        ` : ''}
    `;
    
    // Update breadcrumb
    const breadcrumb = document.getElementById('detail-breadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = `
            <button onclick="showView('subjects')" class="text-teal-400 hover:text-teal-300 transition-colors">
                Subjects
            </button>
            <span class="text-gray-500 mx-2">></span>
            <button onclick="showView('topics')" class="text-teal-400 hover:text-teal-300 transition-colors">
                ${sanitizeHtml(currentSubject.name)}
            </button>
            <span class="text-gray-500 mx-2">></span>
            <span class="text-high-contrast">${sanitizeHtml(topic.name)}</span>
        `;
    }
}

/**
 * Generate topic explanation using AI
 */
async function generateTopicExplanation() {
    if (!currentTopic) return;
    
    console.log('🤖 Generating AI explanation for:', currentTopic.name);
    
    const container = document.getElementById('topic-detail-content');
    showLoading(container, 'Generating comprehensive explanation...');
    
    try {
        const response = await fetch('/api/explain-topic', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: currentTopic.name,
                subject: currentSubject.name,
                academicLevel: userAcademicLevel,
                type: 'comprehensive'
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showTopicExplanation(data.explanation);
        } else {
            showNotification('Failed to generate explanation. Please try again.', 'error');
            showTopicDetail(currentTopic);
        }
    } catch (error) {
        console.error('❌ Explanation generation error:', error);
        showNotification('Failed to generate explanation. Please try again.', 'error');
        showTopicDetail(currentTopic);
    }
}

/**
 * Show topic explanation
 */
function showTopicExplanation(explanation) {
    const container = document.getElementById('topic-detail-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="mb-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-high-contrast">${sanitizeHtml(currentTopic.name)} - AI Explanation</h2>
                <button onclick="showTopicDetail(currentTopic)" 
                        class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                    ← Back to Topic
                </button>
            </div>
        </div>
        
        <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
            <div class="prose prose-invert max-w-none">
                <div class="whitespace-pre-wrap text-medium-contrast leading-relaxed">
                    ${sanitizeHtml(explanation)}
                </div>
            </div>
        </div>
        
        <div class="flex flex-wrap gap-4">
            <button onclick="showQuizSetup()" 
                    class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                🎯 Take Quiz Now
            </button>
            <button onclick="generateTopicExplanation()" 
                    class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                🔄 Generate New Explanation
            </button>
            <button onclick="showTopicDetail(currentTopic)" 
                    class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                📚 Back to Topic
            </button>
        </div>
    `;
}

/**
 * Show quiz setup
 */
function showQuizSetup() {
    if (!currentTopic) return;
    
    console.log('🎯 Setting up quiz for:', currentTopic.name);
    
    const container = document.getElementById('quiz-setup-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-high-contrast mb-2">Quiz Setup</h2>
            <p class="text-medium-contrast">${sanitizeHtml(currentSubject.name)} - ${sanitizeHtml(currentTopic.name)}</p>
        </div>
        
        <form id="quiz-form" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-medium text-high-contrast mb-2">Quiz Type</label>
                    <select id="quiz-type" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-high-contrast focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        <option value="mcq">Multiple Choice Questions</option>
                        <option value="subjective">Subjective Questions</option>
                    </select>
                    <p class="text-xs text-low-contrast mt-1">Choose the type of questions you prefer</p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-high-contrast mb-2">Difficulty Level</label>
                    <select id="quiz-difficulty" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-high-contrast focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        <option value="easy">Easy - Basic concepts</option>
                        <option value="medium" selected>Medium - Standard level</option>
                        <option value="hard">Hard - Advanced concepts</option>
                    </select>
                    <p class="text-xs text-low-contrast mt-1">Select difficulty based on your comfort level</p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-high-contrast mb-2">Number of Questions</label>
                    <select id="num-questions" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-high-contrast focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        <option value="5" selected>5 Questions (~5 minutes)</option>
                        <option value="10">10 Questions (~10 minutes)</option>
                        <option value="15">15 Questions (~15 minutes)</option>
                        <option value="20">20 Questions (~20 minutes)</option>
                    </select>
                    <p class="text-xs text-low-contrast mt-1">More questions provide better assessment</p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-high-contrast mb-2">Academic Level</label>
                    <select id="academic-level" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-high-contrast focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        <option value="Primary" ${userAcademicLevel === 'Primary' ? 'selected' : ''}>Primary School</option>
                        <option value="Secondary" ${userAcademicLevel === 'Secondary' ? 'selected' : ''}>Secondary School</option>
                        <option value="College" ${userAcademicLevel === 'College' ? 'selected' : ''}>College Level</option>
                        <option value="Competitive" ${userAcademicLevel === 'Competitive' ? 'selected' : ''}>Competitive Exams</option>
                    </select>
                    <p class="text-xs text-low-contrast mt-1">Questions will be tailored to this level</p>
                </div>
            </div>
            
            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 class="font-medium text-high-contrast mb-2">Quiz Preview</h4>
                <div class="text-sm text-medium-contrast space-y-1">
                    <p>• Subject: <span class="text-high-contrast">${sanitizeHtml(currentSubject.name)}</span></p>
                    <p>• Topic: <span class="text-high-contrast">${sanitizeHtml(currentTopic.name)}</span></p>
                    <p>• Questions will be generated using AI for the best learning experience</p>
                </div>
            </div>
            
            <div class="flex gap-4">
                <button type="submit" class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center">
                    <span class="mr-2">🚀</span>
                    Generate Quiz
                </button>
                <button type="button" onclick="showView('detail')" 
                        class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    ← Back to Topic
                </button>
            </div>
        </form>
    `;
    
    showView('quiz-setup');
    
    // Set up form handler
    const form = document.getElementById('quiz-form');
    if (form) {
        form.addEventListener('submit', handleQuizSetup);
    }
}

/**
 * Handle quiz setup form submission
 */
async function handleQuizSetup(event) {
    event.preventDefault();
    
    console.log('🎯 Handling quiz setup');
    
    // Get form values
    quizType = document.getElementById('quiz-type').value;
    quizDifficulty = document.getElementById('quiz-difficulty').value;
    numQuestions = parseInt(document.getElementById('num-questions').value);
    const academicLevel = document.getElementById('academic-level').value;
    
    // Update user profile if academic level changed
    if (academicLevel !== userAcademicLevel) {
        userAcademicLevel = academicLevel;
        if (userProfile) {
            userProfile.setAcademicLevel(academicLevel);
        }
        saveData();
    }
    
    console.log('Quiz configuration:', { quizType, quizDifficulty, numQuestions, academicLevel });
    
    // Show loading
    const container = document.getElementById('quiz-setup-content');
    showLoading(container, 'Generating your personalized quiz...');
    
    try {
        // Generate quiz
        currentQuiz = await generateQuiz(
            currentSubject.name,
            currentTopic.name,
            academicLevel,
            quizType,
            numQuestions,
            quizDifficulty
        );
        
        if (currentQuiz && currentQuiz.questions && currentQuiz.questions.length > 0) {
            console.log(`✅ Quiz generated with ${currentQuiz.questions.length} questions`);
            startQuiz();
        } else {
            throw new Error('Failed to generate quiz questions');
        }
    } catch (error) {
        console.error('❌ Quiz setup error:', error);
        showNotification('Failed to generate quiz. Please try again.', 'error');
        showQuizSetup();
    }
}

/**
 * Start the quiz
 */
function startQuiz() {
    console.log('🎯 Starting quiz');
    
    // Reset quiz state
    userAnswers = {};
    currentQuestionIndex = 0;
    
    // Show first question
    showQuestion(0);
    showView('quiz-questions');
    
    // Start timer
    startQuizTimer();
}

/**
 * Start quiz timer
 */
function startQuizTimer() {
    const timerElement = document.getElementById('quiz-timer');
    if (!timerElement) return;
    
    let timeElapsed = 0;
    const startTime = Date.now();
    
    const timer = setInterval(() => {
        timeElapsed = Math.floor((Date.now() - startTime) / 1000);
        timerElement.textContent = formatTime(timeElapsed);
    }, 1000);
    
    // Store timer reference for cleanup
    window.quizTimer = timer;
}

/**
 * Show question
 */
function showQuestion(questionIndex) {
    if (!currentQuiz || !currentQuiz.questions) return;
    
    const question = currentQuiz.questions[questionIndex];
    if (!question) return;
    
    console.log(`📝 Showing question ${questionIndex + 1}/${currentQuiz.questions.length}`);
    
    const container = document.getElementById('quiz-questions-content');
    if (!container) return;
    
    // Update progress
    const progress = ((questionIndex + 1) / currentQuiz.questions.length) * 100;
    const progressBar = document.getElementById('quiz-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    
    const progressText = document.getElementById('quiz-progress-text');
    if (progressText) {
        progressText.textContent = `Question ${questionIndex + 1} of ${currentQuiz.questions.length}`;
    }
    
    // Show question content
    if (quizType === 'mcq') {
        showMCQQuestion(question, questionIndex);
    } else {
        showSubjectiveQuestion(question, questionIndex);
    }
}

/**
 * Show MCQ question
 */
function showMCQQuestion(question, questionIndex) {
    const container = document.getElementById('quiz-questions-content');
    if (!container) return;
    
    const selectedAnswer = userAnswers[question.id];
    
    container.innerHTML = `
        <div class="question-card bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 class="text-lg font-semibold text-high-contrast mb-4">
                ${sanitizeHtml(question.question)}
            </h3>
            
            <div class="space-y-3 mb-6">
                ${Object.entries(question.options).map(([key, value]) => `
                    <label class="flex items-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors ${selectedAnswer === key ? 'ring-2 ring-teal-500 bg-gray-600' : ''}">
                        <input type="radio" 
                               name="question-${question.id}" 
                               value="${key}" 
                               class="mr-3 text-teal-500"
                               ${selectedAnswer === key ? 'checked' : ''}
                               onchange="selectAnswer(${question.id}, '${key}')">
                        <span class="text-high-contrast">
                            <strong>${key}.</strong> ${sanitizeHtml(value)}
                        </span>
                    </label>
                `).join('')}
            </div>
            
            <div class="flex justify-between">
                <button onclick="previousQuestion()" 
                        class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors ${questionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${questionIndex === 0 ? 'disabled' : ''}>
                    ← Previous
                </button>
                
                <button onclick="nextQuestion()" 
                        class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors">
                    ${questionIndex === currentQuiz.questions.length - 1 ? 'Finish Quiz' : 'Next →'}
                </button>
            </div>
        </div>
    `;
}

/**
 * Show subjective question
 */
function showSubjectiveQuestion(question, questionIndex) {
    const container = document.getElementById('quiz-questions-content');
    if (!container) return;
    
    const savedAnswer = userAnswers[question.id] || '';
    
    container.innerHTML = `
        <div class="question-card bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 class="text-lg font-semibold text-high-contrast mb-4">
                ${sanitizeHtml(question.question)}
            </h3>
            
            <div class="mb-6">
                <textarea id="subjective-answer-${question.id}"
                          class="w-full h-40 bg-gray-700 border border-gray-600 rounded-lg p-3 text-high-contrast resize-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                          placeholder="Write your answer here..."
                          onchange="selectAnswer(${question.id}, this.value)">${sanitizeHtml(savedAnswer)}</textarea>
                <div class="text-sm text-medium-contrast mt-2">
                    Recommended length: 2-3 paragraphs
                </div>
            </div>
            
            <div class="flex justify-between">
                <button onclick="previousQuestion()" 
                        class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors ${questionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${questionIndex === 0 ? 'disabled' : ''}>
                    ← Previous
                </button>
                
                <button onclick="nextQuestion()" 
                        class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors">
                    ${questionIndex === currentQuiz.questions.length - 1 ? 'Finish Quiz' : 'Next →'}
                </button>
            </div>
        </div>
    `;
}

/**
 * Select answer for current question
 */
function selectAnswer(questionId, answer) {
    console.log(`📝 Answer selected for question ${questionId}:`, answer);
    userAnswers[questionId] = answer;
    saveData();
}

/**
 * Go to previous question
 */
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion(currentQuestionIndex);
    }
}

/**
 * Go to next question or finish quiz
 */
function nextQuestion() {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        showQuestion(currentQuestionIndex);
    } else {
        finishQuiz();
    }
}

/**
 * Finish quiz and show results
 */
async function finishQuiz() {
    console.log('🏁 Finishing quiz');
    
    // Stop timer
    if (window.quizTimer) {
        clearInterval(window.quizTimer);
        window.quizTimer = null;
    }
    
    // Show loading
    const container = document.getElementById('quiz-results-content');
    showLoading(container, 'Assessing your answers...');
    showView('quiz-results');
    
    try {
        // Assess quiz
        const assessment = await assessQuiz(
            currentQuiz,
            userAnswers,
            quizType,
            currentSubject.name,
            currentTopic.name,
            userAcademicLevel
        );
        
        // Save quiz result
        saveQuizResult(assessment);
        
        // Show results
        showQuizResults(assessment);
        
    } catch (error) {
        console.error('❌ Quiz assessment error:', error);
        showNotification('Failed to assess quiz. Please try again.', 'error');
        showView('detail');
    }
}

/**
 * Save quiz result
 */
function saveQuizResult(assessment) {
    const quizResult = {
        timestamp: new Date().toISOString(),
        subject: currentSubject.name,
        topic: currentTopic.name,
        difficulty: quizDifficulty,
        quizType: quizType,
        score: assessment.percentage || 0,
        grade: assessment.grade || 'F',
        totalQuestions: assessment.total_questions || 0,
        correctAnswers: assessment.correct_answers || 0
    };
    
    // Add to history
    quizHistory.unshift(quizResult);
    if (quizHistory.length > 100) {
        quizHistory = quizHistory.slice(0, 100);
    }
    
    // Update topic performance
    const topicKey = `${currentSubject.name}-${currentTopic.name}`;
    if (!topicPerformance[topicKey]) {
        topicPerformance[topicKey] = {
            scores: [],
            averageScore: 0,
            totalQuizzes: 0
        };
    }
    
    topicPerformance[topicKey].scores.push(assessment.percentage || 0);
    topicPerformance[topicKey].totalQuizzes++;
    topicPerformance[topicKey].averageScore = Math.round(
        topicPerformance[topicKey].scores.reduce((sum, score) => sum + score, 0) / 
        topicPerformance[topicKey].scores.length
    );
    
    // Save to localStorage
    saveData();
    
    console.log('💾 Quiz result saved:', quizResult);
}

/**
 * Show quiz results with comprehensive feedback
 */
function showQuizResults(assessment) {
    console.log('📊 Showing quiz results:', assessment);
    
    const container = document.getElementById('quiz-results-content');
    if (!container) return;
    
    const percentage = assessment.percentage || 0;
    const grade = assessment.grade || calculateGrade(percentage);
    
    container.innerHTML = `
        <div class="text-center mb-8">
            <div class="text-6xl mb-4">${getGradeEmoji(grade)}</div>
            <h2 class="text-3xl font-bold text-high-contrast mb-2">Quiz Complete!</h2>
            <p class="text-medium-contrast">
                ${sanitizeHtml(currentSubject.name)} - ${sanitizeHtml(currentTopic.name)}
            </p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-gray-800 p-6 rounded-lg text-center border border-gray-700">
                <div class="text-3xl font-bold ${getScoreColorClass(percentage)} mb-2">${percentage}%</div>
                <div class="text-medium-contrast">Your Score</div>
            </div>
            <div class="bg-gray-800 p-6 rounded-lg text-center border border-gray-700">
                <div class="text-3xl font-bold text-blue-400 mb-2">${grade}</div>
                <div class="text-medium-contrast">Grade</div>
            </div>
            <div class="bg-gray-800 p-6 rounded-lg text-center border border-gray-700">
                <div class="text-3xl font-bold text-purple-400 mb-2">${assessment.correct_answers || 0}/${assessment.total_questions || 0}</div>
                <div class="text-medium-contrast">Correct</div>
            </div>
        </div>
        
        <div class="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700">
            <h3 class="text-lg font-semibold text-high-contrast mb-4">📈 Performance Summary</h3>
            
            ${assessment.assessment ? `
                <div class="space-y-4">
                    <div>
                        <h4 class="font-medium text-green-400 mb-2">✅ Strengths</h4>
                        <ul class="list-disc list-inside text-sm text-medium-contrast space-y-1">
                            ${assessment.assessment.strengths.map(strength => 
                                `<li>${sanitizeHtml(strength)}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    
                    <div>
                        <h4 class="font-medium text-yellow-400 mb-2">📚 Areas for Improvement</h4>
                        <ul class="list-disc list-inside text-sm text-medium-contrast space-y-1">
                            ${assessment.assessment.areas_for_improvement.map(area => 
                                `<li>${sanitizeHtml(area)}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    
                    <div>
                        <h4 class="font-medium text-blue-400 mb-2">💬 Overall Feedback</h4>
                        <p class="text-sm text-medium-contrast">${sanitizeHtml(assessment.assessment.overall_feedback)}</p>
                    </div>
                </div>
            ` : ''}
        </div>
        
        ${assessment.question_feedback && assessment.question_feedback.length > 0 ? `
            <div class="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700">
                <h3 class="text-lg font-semibold text-high-contrast mb-4">📝 Question-by-Question Analysis</h3>
                <div class="space-y-4">
                    ${assessment.question_feedback.map(feedback => `
                        <div class="border border-gray-700 rounded-lg p-4 ${feedback.is_correct ? 'border-green-500 border-opacity-30' : 'border-red-500 border-opacity-30'}">
                            <div class="flex justify-between items-center mb-3">
                                <span class="font-medium text-high-contrast">Question ${feedback.question_id}</span>
                                <span class="text-sm px-3 py-1 rounded-full ${feedback.is_correct ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}">
                                    ${feedback.is_correct ? '✅ Correct' : '❌ Incorrect'}
                                </span>
                            </div>
                            
                            <div class="mb-3">
                                <p class="text-high-contrast font-medium mb-2">${sanitizeHtml(feedback.question_text)}</p>
                            </div>
                            
                            ${feedback.options ? `
                                <div class="space-y-2 mb-3">
                                    ${Object.entries(feedback.options).map(([optionLetter, optionText]) => {
                                        const isUserAnswer = feedback.user_answer === optionLetter;
                                        const isCorrectAnswer = feedback.correct_answer === optionLetter;
                                        
                                        let optionClass = 'bg-gray-700 text-gray-300 border-gray-600';
                                        let statusIcon = '';
                                        
                                        if (isCorrectAnswer) {
                                            optionClass = 'bg-green-600 text-white border-green-400';
                                            statusIcon = ' <span class="text-green-200 font-bold">✓ Correct Answer</span>';
                                        } else if (isUserAnswer && !feedback.is_correct) {
                                            optionClass = 'bg-red-600 text-white border-red-400';
                                            statusIcon = ' <span class="text-red-200 font-bold">✗ Your Answer</span>';
                                        }
                                        
                                        return `
                                            <div class="p-3 rounded border-2 ${optionClass}">
                                                <span class="font-bold">${optionLetter}.</span> ${sanitizeHtml(optionText)}${statusIcon}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : ''}
                            
                            <div class="mb-4 p-3 rounded ${feedback.is_correct ? 'bg-green-900 bg-opacity-30' : 'bg-red-900 bg-opacity-30'}">
                                <div class="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span class="text-gray-400">Your Answer:</span>
                                        <span class="ml-2 font-medium ${feedback.is_correct ? 'text-green-300' : 'text-red-300'}">
                                            ${feedback.user_answer || 'No answer'}
                                        </span>
                                    </div>
                                    <div>
                                        <span class="text-gray-400">Correct Answer:</span>
                                        <span class="ml-2 font-medium text-green-300">${feedback.correct_answer}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <h5 class="text-sm font-semibold text-blue-300 mb-2">💡 Explanation:</h5>
                                <p class="text-gray-300 text-sm leading-relaxed">${sanitizeHtml(feedback.explanation)}</p>
                            </div>
                            
                            ${!feedback.is_correct && feedback.why_wrong ? `
                                <div class="mb-3">
                                    <h5 class="text-sm font-semibold text-red-300 mb-2">❌ Why This Answer is Wrong:</h5>
                                    <p class="text-gray-300 text-sm leading-relaxed">${sanitizeHtml(feedback.why_wrong)}</p>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button onclick="retakeQuiz()" 
                    class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                🔄 Retake Quiz
            </button>
            <button onclick="showView('detail')" 
                    class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                📚 Back to Topic
            </button>
            <button onclick="showView('dashboard')" 
                    class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                🏠 Dashboard
            </button>
        </div>
    `;
}

/**
 * Get grade emoji
 */
function getGradeEmoji(grade) {
    const gradeEmojis = {
        'A+': '🏆', 'A': '🥇', 'A-': '🎖️',
        'B+': '🥈', 'B': '👍', 'B-': '👌',
        'C+': '📈', 'C': '📊', 'C-': '📉',
        'F': '📚'
    };
    return gradeEmojis[grade] || '📝';
}

/**
 * Retake current quiz
 */
function retakeQuiz() {
    console.log('🔄 Retaking quiz');
    showQuizSetup();
}

/**
 * Generate random quiz
 */
function generateRandomQuiz() {
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const randomTopic = randomSubject.topics[Math.floor(Math.random() * randomSubject.topics.length)];
    
    currentSubject = randomSubject;
    currentTopic = randomTopic;
    
    showNotification(`Random quiz: ${randomSubject.name} - ${randomTopic.name}`, 'info');
    showQuizSetup();
}

/**
 * Show quiz history
 */
function showQuizHistory() {
    // This would show a detailed history view
    showNotification('Quiz history feature coming soon!', 'info');
}

/**
 * Generate practice questions
 */
function generatePracticeQuestions() {
    showNotification('Practice questions feature coming soon!', 'info');
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing AcadTutor...');
    initializeApp();
});

// Save data before page unload
window.addEventListener('beforeunload', function() {
    saveData();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        saveData();
    }
});

// Global error handling
window.addEventListener('error', function(event) {
    console.error('❌ Global error:', event.error);
    showNotification('An unexpected error occurred. Please refresh the page.', 'error');
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Unhandled promise rejection:', event.reason);
    showNotification('An unexpected error occurred. Please try again.', 'error');
    event.preventDefault();
});

console.log('✅ AcadTutor script loaded successfully - All functionalities restored!');
