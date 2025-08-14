/**
 * AcadTutor - Complete JavaScript Application
 * Production-ready, error-free implementation
 */

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let currentSubject = null;
let currentTopic = null;
let currentQuiz = null;
let userAnswers = {};
let currentQuestionIndex = 0;
let quizStartTime = null;
let quizTimer = null;
let quizHistory = [];
let topicPerformance = {};
let userProfile = {
    name: 'Student',
    academicLevel: 'College',
    preferredSubjects: []
};

// Quiz configuration
let quizType = 'mcq';
let quizDifficulty = 'medium';
let numQuestions = 5;

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
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600';
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-transform duration-300`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
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
 * Format time duration
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Load data from localStorage
 */
function loadData() {
    try {
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            userProfile = Object.assign(userProfile, JSON.parse(savedProfile));
        }
        
        const savedHistory = localStorage.getItem('quizHistory');
        if (savedHistory) {
            quizHistory = JSON.parse(savedHistory);
        }
        
        const savedPerformance = localStorage.getItem('topicPerformance');
        if (savedPerformance) {
            topicPerformance = JSON.parse(savedPerformance);
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

/**
 * Save data to localStorage
 */
function saveData() {
    try {
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        localStorage.setItem('quizHistory', JSON.stringify(quizHistory));
        localStorage.setItem('topicPerformance', JSON.stringify(topicPerformance));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// ===== API FUNCTIONS =====

/**
 * Test API connection
 */
async function testApiConnection() {
    try {
        const response = await fetch('/api/test-connection');
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            console.log('✅ API connection successful');
            return true;
        } else {
            console.warn('⚠️ API connection failed:', data.message);
            return false;
        }
    } catch (error) {
        console.error('❌ API connection error:', error);
        return false;
    }
}

/**
 * Generate quiz using API
 */
async function generateQuiz(subject, topic, academicLevel, quizType, numQuestions, difficulty = 'medium') {
    try {
        console.log('🎯 Generating quiz:', { subject, topic, academicLevel, quizType, numQuestions, difficulty });
        
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
                numQuestions: parseInt(numQuestions),
                difficulty: difficulty
            })
        });

        const data = await response.json();
        console.log('📥 Quiz API response:', data);

        if (response.ok && data.success && data.quiz && data.quiz.questions) {
            // Ensure we have the correct number of questions
            if (data.quiz.questions.length < numQuestions) {
                console.log('🔄 Supplementing with additional questions...');
                const additionalQuestions = generateFallbackQuestions(
                    subject, topic, numQuestions - data.quiz.questions.length, difficulty
                );
                data.quiz.questions = data.quiz.questions.concat(additionalQuestions);
            }
            
            // Trim to exact count if we have too many
            data.quiz.questions = data.quiz.questions.slice(0, numQuestions);
            
            // Validate and format questions
            data.quiz.questions = data.quiz.questions.map((q, index) => ({
                id: index + 1,
                question: q.question || `Question ${index + 1}`,
                options: q.options || { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
                correct_answer: q.correct_answer || 'A',
                explanation: q.explanation || 'Explanation not available',
                difficulty: difficulty
            }));
            
            console.log(`✅ Generated ${data.quiz.questions.length} questions`);
            return data.quiz;
        } else {
            console.log('🔄 Using fallback quiz generation');
            return generateFallbackQuiz(subject, topic, quizType, numQuestions, difficulty);
        }
    } catch (error) {
        console.error('❌ Quiz generation error:', error);
        console.log('🔄 Using fallback quiz generation');
        return generateFallbackQuiz(subject, topic, quizType, numQuestions, difficulty);
    }
}

/**
 * Generate fallback quiz when API fails
 */
function generateFallbackQuiz(subject, topic, quizType, numQuestions, difficulty) {
    console.log('🔧 Generating fallback quiz');
    
    const questionBank = {
        'Blockchain': {
            'Basics': [
                {
                    question: 'What is the first and most famous cryptocurrency?',
                    options: { A: 'Ethereum', B: 'Bitcoin', C: 'Litecoin', D: 'Ripple' },
                    correct_answer: 'B',
                    explanation: 'Bitcoin was the first cryptocurrency, created by Satoshi Nakamoto in 2009.'
                },
                {
                    question: 'What is a smart contract?',
                    options: { A: 'A self-executing contract with terms written in code', B: 'A legal document', C: 'A cryptocurrency wallet', D: 'A mining algorithm' },
                    correct_answer: 'A',
                    explanation: 'Smart contracts are self-executing contracts with terms directly written into code.'
                },
                {
                    question: 'What is a block in blockchain?',
                    options: { A: 'A cryptocurrency unit', B: 'A mining reward', C: 'A collection of transaction data', D: 'A digital wallet' },
                    correct_answer: 'C',
                    explanation: 'A block is a collection of transaction data that is cryptographically linked to previous blocks.'
                },
                {
                    question: 'What makes blockchain secure?',
                    options: { A: 'Cryptographic hashing and decentralization', B: 'Government regulation', C: 'Password protection', D: 'Bank verification' },
                    correct_answer: 'A',
                    explanation: 'Blockchain security comes from cryptographic hashing, decentralization, and consensus mechanisms.'
                },
                {
                    question: 'What is a consensus mechanism?',
                    options: { A: 'A mining process', B: 'A protocol for network agreement', C: 'A wallet feature', D: 'A trading mechanism' },
                    correct_answer: 'B',
                    explanation: 'A consensus mechanism ensures all nodes in a blockchain network agree on transaction validity.'
                }
            ]
        }
    };
    
    // Get questions for the topic
    let availableQuestions = [];
    if (questionBank[subject] && questionBank[subject][topic]) {
        availableQuestions = questionBank[subject][topic];
    } else {
        availableQuestions = questionBank['Blockchain']['Basics'];
    }
    
    // Generate additional questions if needed
    while (availableQuestions.length < numQuestions) {
        const questionNum = availableQuestions.length + 1;
        availableQuestions.push({
            question: `What is an important concept in ${topic}? (Question ${questionNum})`,
            options: {
                A: `First concept of ${topic}`,
                B: `Second concept of ${topic}`,
                C: `Third concept of ${topic}`,
                D: `Fourth concept of ${topic}`
            },
            correct_answer: 'B',
            explanation: `This question tests understanding of ${topic} concepts.`
        });
    }
    
    // Select and format questions
    const selectedQuestions = availableQuestions.slice(0, numQuestions).map((q, index) => ({
        id: index + 1,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: difficulty
    }));
    
    return {
        questions: selectedQuestions,
        title: `${subject} - ${topic} Quiz`,
        subject: subject,
        topic: topic,
        difficulty: difficulty,
        quiz_type: quizType,
        total_questions: selectedQuestions.length,
        source: 'fallback'
    };
}

/**
 * Generate additional fallback questions
 */
function generateFallbackQuestions(subject, topic, count, difficulty) {
    const questions = [];
    for (let i = 0; i < count; i++) {
        questions.push({
            question: `Additional question ${i + 1} about ${topic}`,
            options: {
                A: `Option A for ${topic}`,
                B: `Option B for ${topic}`,
                C: `Option C for ${topic}`,
                D: `Option D for ${topic}`
            },
            correct_answer: 'B',
            explanation: `This is an additional question about ${topic} concepts.`,
            difficulty: difficulty
        });
    }
    return questions;
}
/**
 * Assess quiz using API
 */
async function assessQuiz(quiz, answers, quizType, subject, topic, academicLevel) {
    try {
        console.log('📊 Assessing quiz:', { quiz, answers, quizType, subject, topic });
        
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
        console.log('📥 Assessment response:', data);

        if (response.ok && data) {
            return data;
        } else {
            console.log('🔄 Using fallback assessment');
            return generateFallbackAssessment(quiz, answers, quizType, subject, topic);
        }
    } catch (error) {
        console.error('❌ Assessment error:', error);
        console.log('🔄 Using fallback assessment');
        return generateFallbackAssessment(quiz, answers, quizType, subject, topic);
    }
}

/**
 * Generate fallback assessment
 */
function generateFallbackAssessment(quiz, answers, quizType, subject, topic) {
    console.log('🔧 Generating fallback assessment');
    
    const questions = quiz.questions || [];
    let correctAnswers = 0;
    const questionFeedback = [];
    
    questions.forEach((question, index) => {
        const questionId = index + 1;
        const userAnswer = answers[questionId] || null;
        const correctAnswer = question.correct_answer;
        const isCorrect = userAnswer === correctAnswer;
        
        if (isCorrect) correctAnswers++;
        
        questionFeedback.push({
            question_id: questionId,
            question_text: question.question,
            options: question.options,
            user_answer: userAnswer,
            correct_answer: correctAnswer,
            is_correct: isCorrect,
            explanation: question.explanation || 'Explanation not available',
            why_wrong: !isCorrect && userAnswer ? `Answer ${userAnswer} is incorrect. The correct answer is ${correctAnswer}.` : null
        });
    });
    
    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const grade = calculateGrade(percentage);
    
    return {
        score: correctAnswers * 10,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        percentage: percentage,
        grade: grade,
        assessment: {
            strengths: percentage >= 70 ? ['Good understanding of concepts'] : ['Shows interest in learning'],
            areas_for_improvement: percentage < 70 ? ['Review fundamental concepts', 'Practice more questions'] : ['Continue building knowledge'],
            overall_feedback: `You scored ${percentage}% on this ${topic} quiz. ${percentage >= 70 ? 'Great job!' : 'Keep practicing to improve!'}`
        },
        question_feedback: questionFeedback,
        study_recommendations: [
            `Review ${topic} concepts`,
            'Practice additional questions',
            'Study the explanations provided'
        ],
        resources: [
            {
                title: `${topic} Study Guide`,
                description: `Comprehensive guide for ${topic}`,
                type: 'guide'
            }
        ]
    };
}

// ===== UI FUNCTIONS =====

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
    
    // Update view-specific content
    switch (viewName) {
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
 * Initialize the application
 */
function initializeApp() {
    console.log('🚀 Initializing AcadTutor...');
    
    // Load saved data
    loadData();
    
    // Test API connection
    testApiConnection();
    
    // Set up event listeners
    setupEventListeners();
    
    // Show welcome screen
    showView('welcome');
    
    console.log('✅ AcadTutor initialized successfully');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Welcome screen
    const getStartedBtn = document.getElementById('get-started-btn');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            showView('dashboard');
        });
    }
    
    // Navigation buttons
    const dashboardBtn = document.getElementById('dashboard-btn');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => showView('dashboard'));
    }
    
    // Quiz setup form
    const quizForm = document.getElementById('quiz-form');
    if (quizForm) {
        quizForm.addEventListener('submit', handleQuizSetup);
    }
}

/**
 * Update dashboard
 */
function updateDashboard() {
    console.log('📊 Updating dashboard');
    
    // Update recent activity
    updateRecentActivity();
    
    // Update performance metrics
    updatePerformanceMetrics();
    
    // Update quick stats
    updateQuickStats();
}

/**
 * Update recent activity
 */
function updateRecentActivity() {
    const container = document.getElementById('recent-activity');
    if (!container) return;
    
    if (quizHistory.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-medium-contrast">No recent activity</p>
                <button onclick="showView('subjects')" class="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg">
                    Take Your First Quiz
                </button>
            </div>
        `;
        return;
    }
    
    const recentQuizzes = quizHistory.slice(0, 5);
    const activityHTML = recentQuizzes.map(quiz => `
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-medium text-high-contrast">${sanitizeHtml(quiz.subject)} - ${sanitizeHtml(quiz.topic)}</h4>
                <span class="text-sm px-2 py-1 rounded ${getGradeColor(quiz.grade)} text-white">${sanitizeHtml(quiz.grade)}</span>
            </div>
            <p class="text-sm text-medium-contrast mb-2">Score: ${quiz.score}% • ${quiz.totalQuestions} questions</p>
            <p class="text-xs text-low-contrast">${formatDate(quiz.timestamp)}</p>
        </div>
    `).join('');
    
    container.innerHTML = activityHTML;
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
                <p class="text-medium-contrast">No performance data yet</p>
            </div>
        `;
        return;
    }
    
    const totalQuizzes = quizHistory.length;
    const averageScore = Math.round(quizHistory.reduce((sum, quiz) => sum + quiz.score, 0) / totalQuizzes);
    const bestScore = Math.max(...quizHistory.map(quiz => quiz.score));
    const recentImprovement = calculateRecentImprovement();
    
    container.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-gray-800 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-teal-400">${totalQuizzes}</div>
                <div class="text-sm text-medium-contrast">Total Quizzes</div>
            </div>
            <div class="bg-gray-800 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-blue-400">${averageScore}%</div>
                <div class="text-sm text-medium-contrast">Average Score</div>
            </div>
            <div class="bg-gray-800 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold text-green-400">${bestScore}%</div>
                <div class="text-sm text-medium-contrast">Best Score</div>
            </div>
            <div class="bg-gray-800 p-4 rounded-lg text-center">
                <div class="text-2xl font-bold ${recentImprovement >= 0 ? 'text-green-400' : 'text-red-400'}">
                    ${recentImprovement >= 0 ? '+' : ''}${recentImprovement}%
                </div>
                <div class="text-sm text-medium-contrast">Recent Trend</div>
            </div>
        </div>
    `;
}

/**
 * Update quick stats
 */
function updateQuickStats() {
    const container = document.getElementById('quick-stats');
    if (!container) return;
    
    const subjectsStudied = new Set(quizHistory.map(quiz => quiz.subject)).size;
    const topicsStudied = new Set(quizHistory.map(quiz => `${quiz.subject}-${quiz.topic}`)).size;
    const timeSpent = Math.round(quizHistory.length * 15); // Estimate 15 minutes per quiz
    
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-gray-800 p-4 rounded-lg text-center">
                <div class="text-xl font-bold text-purple-400">${subjectsStudied}</div>
                <div class="text-sm text-medium-contrast">Subjects Studied</div>
            </div>
            <div class="bg-gray-800 p-4 rounded-lg text-center">
                <div class="text-xl font-bold text-yellow-400">${topicsStudied}</div>
                <div class="text-sm text-medium-contrast">Topics Explored</div>
            </div>
            <div class="bg-gray-800 p-4 rounded-lg text-center">
                <div class="text-xl font-bold text-indigo-400">${timeSpent}min</div>
                <div class="text-sm text-medium-contrast">Time Spent</div>
            </div>
        </div>
    `;
}

/**
 * Load subjects
 */
function loadSubjects() {
    console.log('📚 Loading subjects');
    
    const subjects = [
        {
            name: 'Blockchain',
            description: 'Learn about blockchain technology, cryptocurrencies, and decentralized systems',
            icon: '🔗',
            topics: ['Basics', 'Cryptocurrency', 'Smart Contracts', 'DeFi']
        },
        {
            name: 'Computer Science',
            description: 'Explore programming, algorithms, data structures, and software development',
            icon: '💻',
            topics: ['Programming', 'Algorithms', 'Data Structures', 'Web Development']
        },
        {
            name: 'Mathematics',
            description: 'Master mathematical concepts from basic arithmetic to advanced calculus',
            icon: '📐',
            topics: ['Algebra', 'Geometry', 'Calculus', 'Statistics']
        }
    ];
    
    const container = document.getElementById('subjects-grid');
    if (!container) return;
    
    const subjectsHTML = subjects.map(subject => `
        <div class="subject-card bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-teal-500 transition-colors cursor-pointer"
             onclick="selectSubject('${subject.name}')">
            <div class="text-4xl mb-4">${subject.icon}</div>
            <h3 class="text-xl font-semibold text-high-contrast mb-2">${sanitizeHtml(subject.name)}</h3>
            <p class="text-medium-contrast mb-4">${sanitizeHtml(subject.description)}</p>
            <div class="flex flex-wrap gap-2">
                ${subject.topics.map(topic => `
                    <span class="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">${sanitizeHtml(topic)}</span>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = subjectsHTML;
}

/**
 * Select subject
 */
function selectSubject(subjectName) {
    console.log('📚 Selected subject:', subjectName);
    
    const subjects = {
        'Blockchain': {
            name: 'Blockchain',
            description: 'Learn about blockchain technology, cryptocurrencies, and decentralized systems',
            topics: [
                { name: 'Basics', description: 'Fundamental blockchain concepts' },
                { name: 'Cryptocurrency', description: 'Digital currencies and trading' },
                { name: 'Smart Contracts', description: 'Self-executing contracts' },
                { name: 'DeFi', description: 'Decentralized Finance' }
            ]
        },
        'Computer Science': {
            name: 'Computer Science',
            description: 'Explore programming, algorithms, data structures, and software development',
            topics: [
                { name: 'Programming', description: 'Programming languages and concepts' },
                { name: 'Algorithms', description: 'Problem-solving algorithms' },
                { name: 'Data Structures', description: 'Data organization methods' },
                { name: 'Web Development', description: 'Building web applications' }
            ]
        },
        'Mathematics': {
            name: 'Mathematics',
            description: 'Master mathematical concepts from basic arithmetic to advanced calculus',
            topics: [
                { name: 'Algebra', description: 'Algebraic equations and functions' },
                { name: 'Geometry', description: 'Shapes, angles, and spatial relationships' },
                { name: 'Calculus', description: 'Derivatives and integrals' },
                { name: 'Statistics', description: 'Data analysis and probability' }
            ]
        }
    };
    
    currentSubject = subjects[subjectName];
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
    
    const topicsHTML = subject.topics.map(topic => `
        <div class="topic-card bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-teal-500 transition-colors cursor-pointer"
             onclick="selectTopic('${topic.name}')">
            <h3 class="text-lg font-semibold text-high-contrast mb-2">${sanitizeHtml(topic.name)}</h3>
            <p class="text-medium-contrast mb-4">${sanitizeHtml(topic.description)}</p>
            <div class="flex justify-between items-center">
                <span class="text-sm text-low-contrast">Click to explore</span>
                <span class="text-teal-400">→</span>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = topicsHTML;
    
    // Update breadcrumb
    const breadcrumb = document.getElementById('topics-breadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = `
            <button onclick="showView('subjects')" class="text-teal-400 hover:text-teal-300">Subjects</button>
            <span class="text-gray-500">></span>
            <span class="text-high-contrast">${sanitizeHtml(subject.name)}</span>
        `;
    }
}
/**
 * Select topic
 */
function selectTopic(topicName) {
    console.log('📖 Selected topic:', topicName);
    
    currentTopic = {
        name: topicName,
        subject: currentSubject.name
    };
    
    showTopicDetail(currentTopic);
    showView('detail');
}

/**
 * Show topic detail
 */
function showTopicDetail(topic) {
    console.log('📋 Showing topic detail:', topic.name);
    
    const container = document.getElementById('topic-detail-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-high-contrast mb-2">${sanitizeHtml(topic.name)}</h2>
            <p class="text-medium-contrast">Subject: ${sanitizeHtml(topic.subject)}</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-gray-800 p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-high-contrast mb-4">📚 Study Options</h3>
                <div class="space-y-3">
                    <button onclick="generateTopicExplanation()" 
                            class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-left transition-colors">
                        <div class="font-medium">📖 Get AI Explanation</div>
                        <div class="text-sm opacity-90">Comprehensive topic overview</div>
                    </button>
                    <button onclick="showQuizSetup()" 
                            class="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-lg text-left transition-colors">
                        <div class="font-medium">🎯 Take Quiz</div>
                        <div class="text-sm opacity-90">Test your knowledge</div>
                    </button>
                </div>
            </div>
            
            <div class="bg-gray-800 p-6 rounded-lg">
                <h3 class="text-lg font-semibold text-high-contrast mb-4">📊 Your Progress</h3>
                <div id="topic-progress">
                    ${getTopicProgress(topic)}
                </div>
            </div>
        </div>
        
        <div class="bg-gray-800 p-6 rounded-lg">
            <h3 class="text-lg font-semibold text-high-contrast mb-4">📈 Recent Activity</h3>
            <div id="topic-recent-activity">
                ${getTopicRecentActivity(topic)}
            </div>
        </div>
    `;
    
    // Update breadcrumb
    const breadcrumb = document.getElementById('detail-breadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = `
            <button onclick="showView('subjects')" class="text-teal-400 hover:text-teal-300">Subjects</button>
            <span class="text-gray-500">></span>
            <button onclick="showView('topics')" class="text-teal-400 hover:text-teal-300">${sanitizeHtml(currentSubject.name)}</button>
            <span class="text-gray-500">></span>
            <span class="text-high-contrast">${sanitizeHtml(topic.name)}</span>
        `;
    }
}

/**
 * Get topic progress
 */
function getTopicProgress(topic) {
    const topicKey = `${topic.subject}-${topic.name}`;
    const performance = topicPerformance[topicKey];
    
    if (!performance || performance.totalQuizzes === 0) {
        return `
            <div class="text-center py-4">
                <p class="text-medium-contrast">No progress data yet</p>
                <p class="text-sm text-low-contrast">Take a quiz to see your progress</p>
            </div>
        `;
    }
    
    return `
        <div class="space-y-4">
            <div>
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-medium-contrast">Average Score</span>
                    <span class="text-high-contrast">${performance.averageScore}%</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                    <div class="bg-teal-500 h-2 rounded-full" style="width: ${performance.averageScore}%"></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 text-center">
                <div>
                    <div class="text-lg font-bold text-teal-400">${performance.totalQuizzes}</div>
                    <div class="text-xs text-medium-contrast">Quizzes Taken</div>
                </div>
                <div>
                    <div class="text-lg font-bold text-blue-400">${Math.max(...performance.scores)}%</div>
                    <div class="text-xs text-medium-contrast">Best Score</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Get topic recent activity
 */
function getTopicRecentActivity(topic) {
    const topicQuizzes = quizHistory.filter(quiz => 
        quiz.subject === topic.subject && quiz.topic === topic.name
    ).slice(0, 3);
    
    if (topicQuizzes.length === 0) {
        return `
            <div class="text-center py-4">
                <p class="text-medium-contrast">No recent activity</p>
            </div>
        `;
    }
    
    return topicQuizzes.map(quiz => `
        <div class="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
            <div>
                <div class="text-sm text-high-contrast">Quiz • ${quiz.totalQuestions} questions</div>
                <div class="text-xs text-low-contrast">${formatDate(quiz.timestamp)}</div>
            </div>
            <div class="text-right">
                <div class="text-sm font-medium ${getScoreColor(quiz.score)}">${quiz.score}%</div>
                <div class="text-xs text-medium-contrast">${quiz.grade}</div>
            </div>
        </div>
    `).join('');
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
                subject: currentTopic.subject,
                academicLevel: userProfile.academicLevel,
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
                        class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                    ← Back to Topic
                </button>
            </div>
        </div>
        
        <div class="bg-gray-800 p-6 rounded-lg mb-6">
            <div class="prose prose-invert max-w-none">
                <div class="whitespace-pre-wrap text-medium-contrast leading-relaxed">
                    ${sanitizeHtml(explanation)}
                </div>
            </div>
        </div>
        
        <div class="flex gap-4">
            <button onclick="showQuizSetup()" 
                    class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg">
                🎯 Take Quiz Now
            </button>
            <button onclick="generateTopicExplanation()" 
                    class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
                🔄 Generate New Explanation
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
            <p class="text-medium-contrast">${sanitizeHtml(currentTopic.subject)} - ${sanitizeHtml(currentTopic.name)}</p>
        </div>
        
        <form id="quiz-form" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-medium text-high-contrast mb-2">Quiz Type</label>
                    <select id="quiz-type" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-high-contrast">
                        <option value="mcq">Multiple Choice</option>
                        <option value="subjective">Subjective</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-high-contrast mb-2">Difficulty</label>
                    <select id="quiz-difficulty" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-high-contrast">
                        <option value="easy">Easy</option>
                        <option value="medium" selected>Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-high-contrast mb-2">Number of Questions</label>
                    <select id="num-questions" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-high-contrast">
                        <option value="5" selected>5 Questions</option>
                        <option value="10">10 Questions</option>
                        <option value="15">15 Questions</option>
                        <option value="20">20 Questions</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-high-contrast mb-2">Academic Level</label>
                    <select id="academic-level" class="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-high-contrast">
                        <option value="High School">High School</option>
                        <option value="College" selected>College</option>
                        <option value="Graduate">Graduate</option>
                    </select>
                </div>
            </div>
            
            <div class="flex gap-4">
                <button type="submit" class="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium">
                    🚀 Generate Quiz
                </button>
                <button type="button" onclick="showView('detail')" 
                        class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium">
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
    
    // Update user profile
    userProfile.academicLevel = academicLevel;
    saveData();
    
    console.log('Quiz configuration:', { quizType, quizDifficulty, numQuestions, academicLevel });
    
    // Show loading
    const container = document.getElementById('quiz-setup-content');
    showLoading(container, 'Generating your quiz...');
    
    try {
        // Generate quiz
        currentQuiz = await generateQuiz(
            currentTopic.subject,
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
    quizStartTime = Date.now();
    
    // Show first question
    showQuestion(0);
    showView('quiz-questions');
    
    // Start timer if needed
    startQuizTimer();
}

/**
 * Start quiz timer
 */
function startQuizTimer() {
    const timerElement = document.getElementById('quiz-timer');
    if (!timerElement) return;
    
    let timeElapsed = 0;
    
    quizTimer = setInterval(() => {
        timeElapsed++;
        timerElement.textContent = formatTime(timeElapsed);
    }, 1000);
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
        <div class="question-card bg-gray-800 p-6 rounded-lg">
            <h3 class="text-lg font-semibold text-high-contrast mb-4">
                ${sanitizeHtml(question.question)}
            </h3>
            
            <div class="space-y-3 mb-6">
                ${Object.entries(question.options).map(([key, value]) => `
                    <label class="flex items-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors ${selectedAnswer === key ? 'ring-2 ring-teal-500' : ''}">
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
                        class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg ${questionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${questionIndex === 0 ? 'disabled' : ''}>
                    ← Previous
                </button>
                
                <button onclick="nextQuestion()" 
                        class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg">
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
        <div class="question-card bg-gray-800 p-6 rounded-lg">
            <h3 class="text-lg font-semibold text-high-contrast mb-4">
                ${sanitizeHtml(question.question)}
            </h3>
            
            <div class="mb-6">
                <textarea id="subjective-answer-${question.id}"
                          class="w-full h-40 bg-gray-700 border border-gray-600 rounded-lg p-3 text-high-contrast resize-none"
                          placeholder="Write your answer here..."
                          onchange="selectAnswer(${question.id}, this.value)">${sanitizeHtml(savedAnswer)}</textarea>
                <div class="text-sm text-medium-contrast mt-2">
                    Recommended length: 2-3 paragraphs
                </div>
            </div>
            
            <div class="flex justify-between">
                <button onclick="previousQuestion()" 
                        class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg ${questionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${questionIndex === 0 ? 'disabled' : ''}>
                    ← Previous
                </button>
                
                <button onclick="nextQuestion()" 
                        class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg">
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
    if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
    }
    
    // Calculate time taken
    const timeElapsed = Math.round((Date.now() - quizStartTime) / 1000);
    
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
            currentTopic.subject,
            currentTopic.name,
            userProfile.academicLevel
        );
        
        // Add time taken to assessment
        assessment.timeElapsed = timeElapsed;
        
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
        subject: currentTopic.subject,
        topic: currentTopic.name,
        difficulty: quizDifficulty,
        quizType: quizType,
        score: assessment.percentage || 0,
        grade: assessment.grade || 'F',
        totalQuestions: assessment.total_questions || 0,
        correctAnswers: assessment.correct_answers || 0,
        timeElapsed: assessment.timeElapsed || 0
    };
    
    // Add to history
    quizHistory.unshift(quizResult);
    if (quizHistory.length > 100) {
        quizHistory = quizHistory.slice(0, 100);
    }
    
    // Update topic performance
    const topicKey = `${currentTopic.subject}-${currentTopic.name}`;
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
 * Show quiz results
 */
function showQuizResults(assessment) {
    console.log('📊 Showing quiz results:', assessment);
    
    const container = document.getElementById('quiz-results-content');
    if (!container) return;
    
    const percentage = assessment.percentage || 0;
    const grade = assessment.grade || calculateGrade(percentage);
    const timeElapsed = assessment.timeElapsed || 0;
    
    container.innerHTML = `
        <div class="text-center mb-8">
            <div class="text-6xl mb-4">${getGradeEmoji(grade)}</div>
            <h2 class="text-3xl font-bold text-high-contrast mb-2">Quiz Complete!</h2>
            <p class="text-medium-contrast">
                ${sanitizeHtml(currentTopic.subject)} - ${sanitizeHtml(currentTopic.name)}
            </p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-gray-800 p-6 rounded-lg text-center">
                <div class="text-3xl font-bold ${getScoreColorClass(percentage)} mb-2">${percentage}%</div>
                <div class="text-medium-contrast">Your Score</div>
            </div>
            <div class="bg-gray-800 p-6 rounded-lg text-center">
                <div class="text-3xl font-bold text-blue-400 mb-2">${grade}</div>
                <div class="text-medium-contrast">Grade</div>
            </div>
            <div class="bg-gray-800 p-6 rounded-lg text-center">
                <div class="text-3xl font-bold text-purple-400 mb-2">${formatTime(timeElapsed)}</div>
                <div class="text-medium-contrast">Time Taken</div>
            </div>
        </div>
        
        <div class="bg-gray-800 p-6 rounded-lg mb-6">
            <h3 class="text-lg font-semibold text-high-contrast mb-4">📈 Performance Summary</h3>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div class="text-sm text-medium-contrast">Correct Answers</div>
                    <div class="text-lg font-bold text-green-400">
                        ${assessment.correct_answers || 0} / ${assessment.total_questions || 0}
                    </div>
                </div>
                <div>
                    <div class="text-sm text-medium-contrast">Accuracy</div>
                    <div class="text-lg font-bold text-teal-400">${percentage}%</div>
                </div>
            </div>
            
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
            <div class="bg-gray-800 p-6 rounded-lg mb-6">
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
 * Retake current quiz
 */
function retakeQuiz() {
    console.log('🔄 Retaking quiz');
    showQuizSetup();
}

// ===== UTILITY HELPER FUNCTIONS =====

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
 * Get score color class
 */
function getScoreColorClass(percentage) {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 80) return 'text-blue-400';
    if (percentage >= 70) return 'text-yellow-400';
    if (percentage >= 60) return 'text-orange-400';
    return 'text-red-400';
}

/**
 * Get grade color
 */
function getGradeColor(grade) {
    if (['A+', 'A', 'A-'].includes(grade)) return 'bg-green-600';
    if (['B+', 'B', 'B-'].includes(grade)) return 'bg-blue-600';
    if (['C+', 'C', 'C-'].includes(grade)) return 'bg-yellow-600';
    return 'bg-red-600';
}

/**
 * Get score color
 */
function getScoreColor(score) {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-blue-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 60) return 'text-orange-400';
    return 'text-red-400';
}

/**
 * Format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
}

/**
 * Calculate recent improvement
 */
function calculateRecentImprovement() {
    if (quizHistory.length < 2) return 0;
    
    const recent = quizHistory.slice(0, 3);
    const older = quizHistory.slice(3, 6);
    
    if (older.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, quiz) => sum + quiz.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, quiz) => sum + quiz.score, 0) / older.length;
    
    return Math.round(recentAvg - olderAvg);
}

// ===== INITIALIZATION =====

/**
 * Initialize app when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing AcadTutor...');
    initializeApp();
});

/**
 * Handle page visibility changes
 */
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, save data
        saveData();
    }
});

/**
 * Handle before page unload
 */
window.addEventListener('beforeunload', function() {
    saveData();
});

// ===== GLOBAL ERROR HANDLING =====

/**
 * Global error handler
 */
window.addEventListener('error', function(event) {
    console.error('❌ Global error:', event.error);
    showNotification('An unexpected error occurred. Please refresh the page.', 'error');
});

/**
 * Global unhandled promise rejection handler
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Unhandled promise rejection:', event.reason);
    showNotification('An unexpected error occurred. Please try again.', 'error');
    event.preventDefault();
});

console.log('✅ AcadTutor script loaded successfully');
