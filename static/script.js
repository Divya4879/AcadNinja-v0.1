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
        if (!data) return new UserProfile();
        const profile = new UserProfile(data.academicLevel, data.preferences);
        profile.createdAt = data.createdAt || new Date().toISOString();
        profile.lastUpdated = data.lastUpdated || new Date().toISOString();
        return profile;
    }
}

/**
 * Subject Data Model
 */
class Subject {
    constructor(name, description = '') {
        this.id = this.generateId();
        this.name = name;
        this.description = description;
        this.topics = [];
        this.createdAt = new Date().toISOString();
        this.lastUpdated = new Date().toISOString();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    addTopic(topic) {
        if (this.topics.length >= 30) {
            throw new Error('Maximum 30 topics allowed per subject');
        }

        const existingTopic = this.topics.find(t =>
            t.name.toLowerCase() === topic.name.toLowerCase()
        );
        if (existingTopic) {
            throw new Error('A topic with this name already exists in this subject');
        }

        this.topics.push(topic);
        this.lastUpdated = new Date().toISOString();
    }

    removeTopic(topicId) {
        const index = this.topics.findIndex(t => t.id === topicId);
        if (index !== -1) {
            this.topics.splice(index, 1);
            this.lastUpdated = new Date().toISOString();
            return true;
        }
        return false;
    }

    getTopic(topicId) {
        return this.topics.find(t => t.id === topicId);
    }

    updateTopic(topicId, updates) {
        const topic = this.getTopic(topicId);
        if (topic) {
            Object.assign(topic, updates);
            topic.lastUpdated = new Date().toISOString();
            this.lastUpdated = new Date().toISOString();
            return true;
        }
        return false;
    }

    getOverallProgress() {
        if (this.topics.length === 0) return 0;
        const totalProgress = this.topics.reduce((sum, topic) => sum + (topic.progress || 0), 0);
        return Math.round(totalProgress / this.topics.length);
    }

    getCompletedTopicsCount() {
        return this.topics.filter(topic => (topic.progress || 0) >= 80).length;
    }

    static validate(data) {
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
            throw new Error('Subject name is required');
        }
        if (data.name.length > 50) {
            throw new Error('Subject name must be 50 characters or less');
        }
        if (data.description && data.description.length > 200) {
            throw new Error('Subject description must be 200 characters or less');
        }
        return true;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            topics: this.topics.map(topic => topic.toJSON ? topic.toJSON() : topic),
            createdAt: this.createdAt,
            lastUpdated: this.lastUpdated
        };
    }

    static fromJSON(data) {
        if (!data) return null;
        const subject = new Subject(data.name, data.description);
        subject.id = data.id;
        subject.createdAt = data.createdAt || new Date().toISOString();
        subject.lastUpdated = data.lastUpdated || new Date().toISOString();
        
        if (data.topics && Array.isArray(data.topics)) {
            subject.topics = data.topics.map(topicData => Topic.fromJSON(topicData)).filter(Boolean);
        }
        
        return subject;
    }
}

/**
 * Topic Data Model
 */
class Topic {
    constructor(name, description = '') {
        this.id = this.generateId();
        this.name = name;
        this.description = description;
        this.notes = '';
        this.links = [];
        this.progress = 0;
        this.quizHistory = [];
        this.createdAt = new Date().toISOString();
        this.lastUpdated = new Date().toISOString();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    addLink(url, title = '') {
        if (this.links.length >= 10) {
            throw new Error('Maximum 10 links allowed per topic');
        }

        const link = {
            id: this.generateId(),
            url: url,
            title: title || this.extractTitleFromUrl(url),
            addedAt: new Date().toISOString()
        };

        this.links.push(link);
        this.lastUpdated = new Date().toISOString();
        return link;
    }

    removeLink(linkId) {
        const index = this.links.findIndex(l => l.id === linkId);
        if (index !== -1) {
            this.links.splice(index, 1);
            this.lastUpdated = new Date().toISOString();
            return true;
        }
        return false;
    }

    extractTitleFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return 'Link';
        }
    }

    updateProgress(progress) {
        this.progress = Math.max(0, Math.min(100, progress));
        this.lastUpdated = new Date().toISOString();
    }

    addQuizResult(result) {
        this.quizHistory.push({
            ...result,
            completedAt: new Date().toISOString()
        });
        this.lastUpdated = new Date().toISOString();
    }

    getAverageQuizScore() {
        if (this.quizHistory.length === 0) return 0;
        const totalScore = this.quizHistory.reduce((sum, quiz) => sum + (quiz.percentage || 0), 0);
        return Math.round(totalScore / this.quizHistory.length);
    }

    static validate(data) {
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
            throw new Error('Topic name is required');
        }
        if (data.name.length > 100) {
            throw new Error('Topic name must be 100 characters or less');
        }
        if (data.description && data.description.length > 500) {
            throw new Error('Topic description must be 500 characters or less');
        }
        return true;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            notes: this.notes,
            links: this.links,
            progress: this.progress,
            quizHistory: this.quizHistory,
            createdAt: this.createdAt,
            lastUpdated: this.lastUpdated
        };
    }

    static fromJSON(data) {
        if (!data) return null;
        const topic = new Topic(data.name, data.description);
        topic.id = data.id;
        topic.notes = data.notes || '';
        topic.links = data.links || [];
        topic.progress = data.progress || 0;
        topic.quizHistory = data.quizHistory || [];
        topic.createdAt = data.createdAt || new Date().toISOString();
        topic.lastUpdated = data.lastUpdated || new Date().toISOString();
        return topic;
    }
}

// ===== STORAGE FUNCTIONS =====

/**
 * Storage Manager for handling localStorage operations
 */
class StorageManager {
    static KEYS = {
        USER_PROFILE: 'acadtutor_user_profile',
        SUBJECTS: 'acadtutor_subjects'
    };

    static saveUserProfile(profile) {
        try {
            localStorage.setItem(this.KEYS.USER_PROFILE, JSON.stringify(profile.toJSON()));
            return true;
        } catch (error) {
            console.error('Failed to save user profile:', error);
            return false;
        }
    }

    static loadUserProfile() {
        try {
            const data = localStorage.getItem(this.KEYS.USER_PROFILE);
            return data ? UserProfile.fromJSON(JSON.parse(data)) : new UserProfile();
        } catch (error) {
            console.error('Failed to load user profile:', error);
            return new UserProfile();
        }
    }

    static saveSubjects(subjects) {
        try {
            const data = subjects.map(subject => subject.toJSON());
            localStorage.setItem(this.KEYS.SUBJECTS, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save subjects:', error);
            return false;
        }
    }

    static loadSubjects() {
        try {
            const data = localStorage.getItem(this.KEYS.SUBJECTS);
            if (!data) return [];
            
            const subjectsData = JSON.parse(data);
            return subjectsData.map(subjectData => Subject.fromJSON(subjectData)).filter(Boolean);
        } catch (error) {
            console.error('Failed to load subjects:', error);
            return [];
        }
    }

    static clearAllData() {
        try {
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Show notification to user
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300 transform translate-x-full`;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-600');
            break;
        case 'error':
            notification.classList.add('bg-red-600');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-600');
            break;
        default:
            notification.classList.add('bg-blue-600');
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);

    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

/**
 * Show loading spinner
 */
function showLoading(container, message = 'Loading...') {
    const loadingHTML = `
        <div class="flex flex-col items-center justify-center py-12">
            <div class="spinner mb-4"></div>
            <p class="text-medium-contrast">${message}</p>
        </div>
    `;
    container.innerHTML = loadingHTML;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Validate URL
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// ===== MODAL FUNCTIONS =====

/**
 * Show modal with content
 */
function showModal(content) {
    const overlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    
    modalContent.innerHTML = content;
    overlay.classList.remove('hidden');
    
    // Focus trap for accessibility
    const focusableElements = modalContent.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
        focusableElements[0].focus();
    }
}

/**
 * Hide modal
 */
function hideModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
}

/**
 * Show confirmation dialog
 */
function showConfirmDialog(message, onConfirm, onCancel = null) {
    const content = `
        <div class="text-center">
            <h3 class="text-lg font-semibold text-high-contrast mb-4">Confirm Action</h3>
            <p class="text-medium-contrast mb-6">${sanitizeHtml(message)}</p>
            <div class="flex gap-3 justify-center">
                <button id="confirm-btn" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    Confirm
                </button>
                <button id="cancel-btn" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    showModal(content);
    
    document.getElementById('confirm-btn').addEventListener('click', () => {
        hideModal();
        if (onConfirm) onConfirm();
    });
    
    document.getElementById('cancel-btn').addEventListener('click', () => {
        hideModal();
        if (onCancel) onCancel();
    });
}

// ===== API FUNCTIONS =====

/**
 * Test API connection
 */
async function testApiConnection() {
    try {
        const response = await fetch('/api/test-connection');
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ API connection successful:', data);
            showNotification('API connection successful!', 'success');
            return true;
        } else {
            console.error('❌ API connection failed:', data);
            
            // Check for specific API key errors
            if (response.status === 401 || (data.error && data.error.includes('Invalid API Key'))) {
                showNotification('❌ Invalid Groq API Key! Please check your .env file and add a valid API key from https://console.groq.com/keys', 'error');
            } else if (response.status === 400 && data.error === 'API key not configured') {
                showNotification('❌ Groq API Key not configured! Please add GROQ_API_KEY to your .env file', 'error');
            } else {
                showNotification(`❌ API connection failed: ${data.message || 'Unknown error'}`, 'error');
            }
            return false;
        }
    } catch (error) {
        console.error('❌ API connection error:', error);
        showNotification('❌ Failed to connect to API. Please check your internet connection and server status.', 'error');
        return false;
    }
}

/**
 * Generate 4-item rubric assessment
 */
function generateRubricAssessment(assessment) {
    const score = assessment.percentage || 0;
    
    const rubricItems = [
        {
            title: "Content Mastery",
            icon: "🧠",
            score: score,
            description: score >= 90 ? "Excellent understanding" : 
                        score >= 75 ? "Good grasp of concepts" :
                        score >= 60 ? "Basic understanding" : "Needs improvement"
        },
        {
            title: "Problem Solving",
            icon: "🔧",
            score: Math.max(0, score - 5),
            description: score >= 85 ? "Strong analytical skills" :
                        score >= 70 ? "Adequate problem solving" :
                        score >= 55 ? "Developing skills" : "Requires practice"
        },
        {
            title: "Application",
            icon: "⚡",
            score: Math.max(0, score - 10),
            description: score >= 80 ? "Excellent application" :
                        score >= 65 ? "Good practical use" :
                        score >= 50 ? "Basic application" : "Needs development"
        },
        {
            title: "Critical Thinking",
            icon: "💡",
            score: Math.max(0, score - 15),
            description: score >= 75 ? "Advanced reasoning" :
                        score >= 60 ? "Sound reasoning" :
                        score >= 45 ? "Basic reasoning" : "Needs strengthening"
        }
    ];
    
    return rubricItems.map(item => `
        <div class="bg-gray-700 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-xl">${item.icon}</span>
                    <span class="font-medium text-white">${item.title}</span>
                </div>
                <span class="text-lg font-bold ${item.score >= 75 ? 'text-green-400' : item.score >= 60 ? 'text-yellow-400' : 'text-red-400'}">${Math.round(item.score)}%</span>
            </div>
            <div class="w-full bg-gray-600 rounded-full h-2 mb-2">
                <div class="h-2 rounded-full ${item.score >= 75 ? 'bg-green-500' : item.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}" style="width: ${item.score}%"></div>
            </div>
            <p class="text-sm text-gray-300">${item.description}</p>
        </div>
    `).join('');
}

/**
 * Generate weak topics analysis
 */
function generateWeakTopicsAnalysis(assessment) {
    const score = assessment.percentage || 0;
    const weakAreas = [];
    
    // Analyze based on score ranges
    if (score < 60) {
        weakAreas.push("Fundamental concepts need reinforcement");
        weakAreas.push("Basic problem-solving techniques require practice");
    }
    if (score < 75) {
        weakAreas.push("Application of concepts in complex scenarios");
        weakAreas.push("Time management during problem solving");
    }
    if (score < 90) {
        weakAreas.push("Advanced analytical thinking");
        weakAreas.push("Integration of multiple concepts");
    }
    
    // Add specific feedback based on question performance
    if (assessment.question_feedback) {
        const incorrectCount = assessment.question_feedback.filter(q => !q.correct).length;
        if (incorrectCount > currentQuiz.questions.length / 2) {
            weakAreas.push("Review core concepts before attempting advanced problems");
        }
    }
    
    const recommendations = [
        "📖 Review fundamental concepts and definitions",
        "🔄 Practice similar problems with step-by-step solutions",
        "👥 Consider study groups or peer discussions",
        "⏰ Work on time management strategies",
        "📝 Create summary notes for quick reference"
    ];
    
    return `
        <div class="space-y-4">
            <div class="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-4">
                <h5 class="font-medium text-yellow-400 mb-2">🎯 Focus Areas</h5>
                <ul class="space-y-1">
                    ${weakAreas.map(area => `<li class="text-sm text-gray-300">• ${area}</li>`).join('')}
                </ul>
            </div>
            <div class="bg-blue-900 bg-opacity-30 border border-blue-600 rounded-lg p-4">
                <h5 class="font-medium text-blue-400 mb-2">💡 Study Recommendations</h5>
                <ul class="space-y-1">
                    ${recommendations.slice(0, 3).map(rec => `<li class="text-sm text-gray-300">${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

/**
 * Generate study resources with real links
 */
function generateStudyResources(subject, topic, difficulty, assessment) {
    const resources = getStudyResources(subject, topic, difficulty);
    const score = assessment.percentage || 0;
    
    // Filter resources based on performance
    let recommendedResources = resources.all;
    if (score < 60) {
        recommendedResources = [...resources.beginner, ...resources.practice];
    } else if (score < 80) {
        recommendedResources = [...resources.intermediate, ...resources.practice];
    } else {
        recommendedResources = [...resources.advanced, ...resources.reference];
    }
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${recommendedResources.slice(0, 6).map(resource => `
                <div class="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                    <div class="flex items-start gap-3">
                        <span class="text-2xl">${resource.icon}</span>
                        <div class="flex-1">
                            <h6 class="font-medium text-white mb-1">${resource.title}</h6>
                            <p class="text-sm text-gray-300 mb-2">${resource.description}</p>
                            <a href="${resource.url}" target="_blank" rel="noopener noreferrer" 
                               class="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm">
                                Visit Resource <span>↗</span>
                            </a>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Get study resources database
 */
function getStudyResources(subject, topic, difficulty) {
    const resourceDatabase = {
        "Mathematics": {
            "Algebra": {
                beginner: [
                    {
                        title: "Khan Academy - Algebra Basics",
                        description: "Interactive lessons and practice problems",
                        url: "https://www.khanacademy.org/math/algebra-basics",
                        icon: "🎓"
                    },
                    {
                        title: "Algebra.com",
                        description: "Step-by-step algebra problem solver",
                        url: "https://www.algebra.com/",
                        icon: "🔢"
                    }
                ],
                intermediate: [
                    {
                        title: "Wolfram Alpha",
                        description: "Computational engine for algebra problems",
                        url: "https://www.wolframalpha.com/",
                        icon: "🧮"
                    },
                    {
                        title: "MIT OpenCourseWare - Algebra",
                        description: "University-level algebra courses",
                        url: "https://ocw.mit.edu/courses/mathematics/",
                        icon: "🏛️"
                    }
                ],
                advanced: [
                    {
                        title: "Brilliant - Advanced Algebra",
                        description: "Interactive problem-solving platform",
                        url: "https://brilliant.org/courses/algebra/",
                        icon: "💎"
                    }
                ],
                practice: [
                    {
                        title: "IXL Math - Algebra Practice",
                        description: "Comprehensive practice problems",
                        url: "https://www.ixl.com/math/algebra-1",
                        icon: "📝"
                    }
                ],
                reference: [
                    {
                        title: "Mathworld - Algebra",
                        description: "Comprehensive algebra reference",
                        url: "https://mathworld.wolfram.com/topics/Algebra.html",
                        icon: "📚"
                    }
                ]
            },
            "Calculus": {
                beginner: [
                    {
                        title: "Khan Academy - Calculus",
                        description: "Complete calculus course with videos",
                        url: "https://www.khanacademy.org/math/calculus-1",
                        icon: "🎓"
                    }
                ],
                intermediate: [
                    {
                        title: "Paul's Online Math Notes",
                        description: "Detailed calculus tutorials and examples",
                        url: "https://tutorial.math.lamar.edu/Classes/CalcI/CalcI.aspx",
                        icon: "📖"
                    }
                ]
            }
        },
        "Blockchain": {
            "Blockchain Basics": {
                beginner: [
                    {
                        title: "Blockchain.com Learning Portal",
                        description: "Beginner-friendly blockchain concepts",
                        url: "https://www.blockchain.com/learning-portal/bitcoin-faq",
                        icon: "🔗"
                    },
                    {
                        title: "Coursera - Blockchain Basics",
                        description: "University of Buffalo blockchain course",
                        url: "https://www.coursera.org/learn/blockchain-basics",
                        icon: "🎓"
                    },
                    {
                        title: "Binance Academy",
                        description: "Comprehensive blockchain education",
                        url: "https://academy.binance.com/en/blockchain",
                        icon: "🏫"
                    }
                ],
                intermediate: [
                    {
                        title: "Ethereum.org Documentation",
                        description: "Official Ethereum blockchain guide",
                        url: "https://ethereum.org/en/learn/",
                        icon: "⚡"
                    },
                    {
                        title: "IBM Blockchain Platform",
                        description: "Enterprise blockchain concepts",
                        url: "https://www.ibm.com/blockchain/what-is-blockchain",
                        icon: "🏢"
                    }
                ],
                advanced: [
                    {
                        title: "MIT OpenCourseWare - Blockchain",
                        description: "Advanced blockchain and cryptocurrency",
                        url: "https://ocw.mit.edu/courses/15-s12-blockchain-and-money-fall-2018/",
                        icon: "🏛️"
                    }
                ],
                practice: [
                    {
                        title: "CryptoZombies",
                        description: "Learn blockchain development through games",
                        url: "https://cryptozombies.io/",
                        icon: "🎮"
                    }
                ]
            }
        },
        "Computer Science": {
            "Programming": {
                beginner: [
                    {
                        title: "Codecademy",
                        description: "Interactive programming courses",
                        url: "https://www.codecademy.com/",
                        icon: "💻"
                    },
                    {
                        title: "freeCodeCamp",
                        description: "Free programming bootcamp",
                        url: "https://www.freecodecamp.org/",
                        icon: "🆓"
                    }
                ],
                intermediate: [
                    {
                        title: "LeetCode",
                        description: "Programming practice problems",
                        url: "https://leetcode.com/",
                        icon: "🧩"
                    }
                ]
            }
        }
    };
    
    const subjectResources = resourceDatabase[subject] || {};
    const topicResources = subjectResources[topic] || {};
    
    // Default resources if specific ones not found
    const defaultResources = {
        beginner: [
            {
                title: `${subject} Fundamentals`,
                description: `Basic concepts in ${topic}`,
                url: `https://www.google.com/search?q=${encodeURIComponent(subject + ' ' + topic + ' tutorial')}`,
                icon: "🔍"
            }
        ],
        intermediate: [
            {
                title: `Advanced ${topic}`,
                description: `Intermediate level ${subject} concepts`,
                url: `https://www.google.com/search?q=${encodeURIComponent('advanced ' + subject + ' ' + topic)}`,
                icon: "📈"
            }
        ],
        advanced: [
            {
                title: `Expert ${topic}`,
                description: `Advanced ${subject} mastery`,
                url: `https://scholar.google.com/scholar?q=${encodeURIComponent(subject + ' ' + topic)}`,
                icon: "🎯"
            }
        ],
        practice: [
            {
                title: `${topic} Practice Problems`,
                description: `Practice exercises for ${subject}`,
                url: `https://www.google.com/search?q=${encodeURIComponent(subject + ' ' + topic + ' practice problems')}`,
                icon: "📝"
            }
        ],
        reference: [
            {
                title: `${topic} Reference`,
                description: `Reference materials for ${subject}`,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
                icon: "📚"
            }
        ]
    };
    
    return {
        beginner: topicResources.beginner || defaultResources.beginner,
        intermediate: topicResources.intermediate || defaultResources.intermediate,
        advanced: topicResources.advanced || defaultResources.advanced,
        practice: topicResources.practice || defaultResources.practice,
        reference: topicResources.reference || defaultResources.reference,
        all: [
            ...(topicResources.beginner || defaultResources.beginner),
            ...(topicResources.intermediate || defaultResources.intermediate),
            ...(topicResources.advanced || defaultResources.advanced),
            ...(topicResources.practice || defaultResources.practice),
            ...(topicResources.reference || defaultResources.reference)
        ]
    };
}

/**
 * Update progress displays on dashboard and topic view
 */
function updateProgressDisplays() {
    updateDashboardProgress();
    updateTopicProgress();
}

/**
 * Update dashboard progress overview
 */
function updateDashboardProgress() {
    const container = document.getElementById('progress-overview');
    if (!container) return;
    
    if (quizHistory.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <div class="text-4xl mb-2">📈</div>
                <p>Take quizzes to see your progress analytics</p>
            </div>
        `;
        return;
    }
    
    // Calculate overall statistics
    const totalQuizzes = quizHistory.length;
    const averageScore = quizHistory.reduce((sum, quiz) => sum + quiz.score, 0) / totalQuizzes;
    const recentQuizzes = quizHistory.slice(0, 5);
    const trend = calculateTrend(recentQuizzes.map(q => q.score));
    
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="bg-gray-700 rounded-lg p-4 text-center">
                <div class="text-2xl font-bold text-blue-400">${totalQuizzes}</div>
                <div class="text-sm text-gray-300">Total Quizzes</div>
            </div>
            <div class="bg-gray-700 rounded-lg p-4 text-center">
                <div class="text-2xl font-bold text-green-400">${Math.round(averageScore)}%</div>
                <div class="text-sm text-gray-300">Average Score</div>
            </div>
            <div class="bg-gray-700 rounded-lg p-4 text-center">
                <div class="text-2xl font-bold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}">
                    ${trend >= 0 ? '📈' : '📉'} ${Math.abs(trend).toFixed(1)}%
                </div>
                <div class="text-sm text-gray-300">Recent Trend</div>
            </div>
        </div>
        
        <div class="bg-gray-700 rounded-lg p-4">
            <h4 class="font-medium text-white mb-3">Recent Quiz Performance</h4>
            <div class="space-y-2">
                ${recentQuizzes.map(quiz => `
                    <div class="flex justify-between items-center">
                        <div class="flex-1">
                            <div class="text-sm text-white">${quiz.subject} - ${quiz.topic}</div>
                            <div class="text-xs text-gray-400">${new Date(quiz.timestamp).toLocaleDateString()}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm font-medium ${quiz.score >= 75 ? 'text-green-400' : quiz.score >= 60 ? 'text-yellow-400' : 'text-red-400'}">
                                ${quiz.score}%
                            </div>
                            <div class="text-xs text-gray-400">${quiz.grade}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Update topic-specific progress
 */
function updateTopicProgress() {
    const container = document.getElementById('topic-performance');
    if (!container) return;
    
    const topicKeys = Object.keys(topicPerformance);
    if (topicKeys.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-4">
                <div class="text-2xl mb-2">🎯</div>
                <p class="text-sm">Complete quizzes to track your performance</p>
            </div>
        `;
        return;
    }
    
    // Sort topics by performance
    const sortedTopics = topicKeys
        .map(key => ({
            key,
            ...topicPerformance[key],
            name: key.replace('-', ' - ')
        }))
        .sort((a, b) => b.averageScore - a.averageScore);
    
    container.innerHTML = `
        <div class="space-y-3">
            ${sortedTopics.slice(0, 5).map(topic => `
                <div class="flex justify-between items-center">
                    <div class="flex-1">
                        <div class="text-sm text-white">${topic.name}</div>
                        <div class="text-xs text-gray-400">${topic.totalQuizzes} quiz${topic.totalQuizzes !== 1 ? 'es' : ''}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-medium ${topic.averageScore >= 75 ? 'text-green-400' : topic.averageScore >= 60 ? 'text-yellow-400' : 'text-red-400'}">
                            ${Math.round(topic.averageScore)}%
                        </div>
                        <div class="w-16 bg-gray-600 rounded-full h-1">
                            <div class="h-1 rounded-full ${topic.averageScore >= 75 ? 'bg-green-500' : topic.averageScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}" 
                                 style="width: ${topic.averageScore}%"></div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Save current answer before moving to next question
 */
function saveCurrentAnswer() {
    if (!currentQuiz || currentQuestionIndex < 0) return;
    
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    if (currentQuiz.quiz_type === 'mcq') {
        // Save MCQ answer
        const selectedOption = document.querySelector('input[name="quiz-option"]:checked');
        if (selectedOption) {
            userAnswers[currentQuestion.id] = selectedOption.value;
        }
    } else {
        // Save subjective answer
        const answerTextarea = document.getElementById('subjective-answer');
        if (answerTextarea) {
            userAnswers[currentQuestion.id] = answerTextarea.value.trim();
        }
    }
}

/**
 * Assess quiz and show results
 */
async function assessAndShowResults() {
    try {
        showNotification('Assessing your quiz...', 'info');
        
        const assessment = await assessQuiz(
            currentQuiz,
            userAnswers,
            currentQuiz.quiz_type || quizType,
            currentSubject?.name || 'General',
            currentTopic?.name || 'General',
            userAcademicLevel
        );
        
        showQuizResults(assessment);
        
    } catch (error) {
        console.error('Assessment error:', error);
        showNotification('Failed to assess quiz. Showing basic results.', 'warning');
        
        // Show basic results without AI assessment
        const basicAssessment = calculateBasicAssessment();
        showQuizResults(basicAssessment);
    }
}

/**
 * Calculate basic assessment without AI
 */
function calculateBasicAssessment() {
    let correctAnswers = 0;
    const totalQuestions = currentQuiz.questions.length;
    
    currentQuiz.questions.forEach(question => {
        const userAnswer = userAnswers[question.id];
        if (question.correct_answer && userAnswer === question.correct_answer) {
            correctAnswers++;
        }
    });
    
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    let grade = 'F';
    
    if (percentage >= 90) grade = 'A';
    else if (percentage >= 80) grade = 'B';
    else if (percentage >= 70) grade = 'C';
    else if (percentage >= 60) grade = 'D';
    
    return {
        percentage: percentage,
        grade: grade,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        question_feedback: currentQuiz.questions.map((question, index) => ({
            correct: userAnswers[question.id] === question.correct_answer,
            feedback: question.explanation || 'No explanation available'
        }))
    };
}

/**
 * Submit quiz and show results
 */
function submitQuiz() {
    if (!currentQuiz || !currentQuiz.questions) {
        showNotification('No quiz to submit', 'error');
        return;
    }
    
    // Ensure current answer is saved
    saveCurrentAnswer();
    
    // Assess the quiz
    assessAndShowResults();
}

/**
 * Calculate trend from recent scores
 */
function calculateTrend(scores) {
    if (scores.length < 2) return 0;
    
    const firstHalf = scores.slice(Math.ceil(scores.length / 2));
    const secondHalf = scores.slice(0, Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    return secondAvg - firstAvg;
}

/**
 * Generate quiz using API
 */
async function generateQuiz(subject, topic, academicLevel, quizType, numQuestions, context = '', difficulty = 'medium') {
    try {
        console.log('Generating quiz with params:', { subject, topic, academicLevel, quizType, numQuestions, difficulty });
        
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
                numQuestions: numQuestions,
                context: context,
                difficulty: difficulty
            })
        });

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError);
            throw new Error('Server returned invalid response format');
        }

        console.log('API Response:', data);

        if (response.ok && data.success) {
            if (!data.quiz || !data.quiz.questions || data.quiz.questions.length === 0) {
                throw new Error('No questions received from server');
            }
            return data.quiz;
        } else {
            // If API fails, generate fallback quiz
            console.log('API failed, generating fallback quiz');
            return generateFallbackQuiz(subject, topic, quizType, numQuestions, difficulty);
        }
    } catch (error) {
        console.error('Quiz generation error:', error);
        
        // Generate fallback quiz as last resort
        console.log('Generating fallback quiz due to error');
        return generateFallbackQuiz(subject, topic, quizType, numQuestions, difficulty);
    }
}

/**
 * Assess quiz using API
 */
async function assessQuiz(quiz, answers, quizType, subject, topic, academicLevel) {
    try {
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

        if (response.ok && data.success) {
            return data.assessment;
        } else {
            throw new Error(data.error || 'Failed to assess quiz');
        }
    } catch (error) {
        console.error('Quiz assessment error:', error);
        throw error;
    }
}
// ===== MAIN APPLICATION =====

/**
 * Application state
 */
let subjects = [];
let userProfile = null;

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Initializing AcadTutor...');
    
    // Load data from storage
    userProfile = StorageManager.loadUserProfile();
    subjects = StorageManager.loadSubjects();
    userAcademicLevel = userProfile.academicLevel;
    
    // Load progress data
    quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    topicPerformance = JSON.parse(localStorage.getItem('topicPerformance') || '{}');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize UI
    updateUI();
    
    // Update progress displays
    updateProgressDisplays();
    
    // Test API connection
    testApiConnection();
    
    console.log('AcadTutor initialized successfully');
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Helper function to safely add event listeners
    const safeAddEventListener = (elementId, event, handler) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
            return true;
        }
        return false;
    };
    
    // Navigation tabs (only bind to existing ones)
    safeAddEventListener('dashboard-tab', 'click', () => showView('dashboard'));
    safeAddEventListener('subjects-tab', 'click', () => showView('subjects'));
    safeAddEventListener('topics-tab', 'click', () => showView('topics'));
    safeAddEventListener('detail-tab', 'click', () => showView('detail'));
    safeAddEventListener('quiz-tab', 'click', () => showView('quiz'));
    
    // Mobile sidebar
    safeAddEventListener('open-sidebar', 'click', openSidebar);
    safeAddEventListener('close-sidebar', 'click', closeSidebar);
    safeAddEventListener('mobile-menu-overlay', 'click', closeSidebar);
    
    // Modal
    safeAddEventListener('modal-overlay', 'click', (e) => {
        if (e.target === e.currentTarget) hideModal();
    });
    
    // Quick actions
    safeAddEventListener('quick-add-subject', 'click', showAddSubjectModal);
    safeAddEventListener('quick-add-topic', 'click', showAddTopicModal);
    safeAddEventListener('quick-take-quiz', 'click', startQuickQuiz);
    
    // Subject management
    safeAddEventListener('add-subject-btn', 'click', showAddSubjectModal);
    safeAddEventListener('add-topic-btn', 'click', showAddTopicModal);
    
    // Academic level
    safeAddEventListener('change-level-btn', 'click', showAcademicLevelModal);
    
    // Topic detail navigation
    safeAddEventListener('back-to-subjects', 'click', () => showView('subjects'));
    safeAddEventListener('back-to-topic', 'click', () => showView('detail'));
    
    // Topic detail actions
    safeAddEventListener('take-quiz-btn', 'click', startTopicQuiz);
    safeAddEventListener('add-link-btn', 'click', addResourceLink);
    safeAddEventListener('generate-explanation-btn', 'click', generateAndShowTopicExplanation);
    
    // Quiz setup (these exist in HTML)
    safeAddEventListener('mcq-type', 'click', () => selectQuizType('mcq'));
    safeAddEventListener('subjective-type', 'click', () => selectQuizType('subjective'));
    safeAddEventListener('easy-difficulty', 'click', () => selectDifficulty('easy'));
    safeAddEventListener('medium-difficulty', 'click', () => selectDifficulty('medium'));
    safeAddEventListener('hard-difficulty', 'click', () => selectDifficulty('hard'));
    safeAddEventListener('start-quiz-btn', 'click', generateAndStartQuiz);
    
    // Auto-save notes
    const notesTextarea = document.getElementById('topic-notes');
    if (notesTextarea) {
        notesTextarea.addEventListener('input', debounce(saveTopicNotes, 1000));
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Setup dynamic elements (these are created by JavaScript)
    setupDynamicEventListeners();
}

/**
 * Setup event listeners for dynamically created elements
 */
function setupDynamicEventListeners() {
    // This function will be called when dynamic elements are created
    // For now, we'll use event delegation for dynamic elements
    
    // Question count buttons (created dynamically)
    document.addEventListener('click', (e) => {
        if (e.target.id === 'questions-5') selectQuestionCount(5);
        else if (e.target.id === 'questions-10') selectQuestionCount(10);
        else if (e.target.id === 'questions-15') selectQuestionCount(15);
        else if (e.target.id === 'questions-20') selectQuestionCount(20);
        
        // Quiz navigation buttons (created dynamically)
        else if (e.target.id === 'prev-question-btn') previousQuestion();
        else if (e.target.id === 'next-question-btn') nextQuestion();
        else if (e.target.id === 'submit-quiz-btn') submitQuiz();
        
        // Quiz option selection
        else if (e.target.name === 'quiz-option') {
            // Handle quiz option selection
            saveCurrentAnswer();
        }
    });
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    // Escape key to close modals
    if (e.key === 'Escape') {
        hideModal();
        closeSidebar();
    }
    
    // Ctrl/Cmd + shortcuts
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case '1':
                e.preventDefault();
                showView('dashboard');
                break;
            case '2':
                e.preventDefault();
                showView('subjects');
                break;
        }
    }
}

/**
 * Update the entire UI
 */
function updateUI() {
    updateDashboard();
    updateSubjectsView();
    updateSidebarAcademicLevel();
    updateQuickActions();
}

/**
 * Show specific view
 */
function showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
    });
    
    // Show selected view
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }
    
    // Update navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('bg-white', 'bg-opacity-10', 'text-medium-contrast');
        btn.classList.remove('bg-teal-600', 'text-high-contrast');
    });
    
    const activeTab = document.getElementById(`${viewName}-tab`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.classList.remove('bg-white', 'bg-opacity-10', 'text-medium-contrast');
        activeTab.classList.add('bg-teal-600', 'text-high-contrast');
    }
    
    // Update progress displays when switching to dashboard or topics
    if (viewName === 'dashboard' || viewName === 'topics') {
        updateProgressDisplays();
    }
    
    // Show/hide detail tab based on current view
    const detailTab = document.getElementById('detail-tab');
    if (viewName === 'detail') {
        detailTab.classList.remove('hidden');
    } else if (viewName !== 'quiz') {
        detailTab.classList.add('hidden');
    }
    
    // Close mobile sidebar
    closeSidebar();
}


/**
 * Mobile sidebar functions
 */
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-menu-overlay');
    
    sidebar.classList.add('open');
    overlay.classList.remove('hidden');
    sidebarOpen = true;
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-menu-overlay');
    
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');
    sidebarOpen = false;
}

/**
 * Update dashboard view
 */
function updateDashboard() {
    // Update counts
    document.getElementById('dashboard-subjects-count').textContent = subjects.length;
    
    const totalTopics = subjects.reduce((sum, subject) => sum + subject.topics.length, 0);
    document.getElementById('dashboard-topics-count').textContent = totalTopics;
    
    // Calculate average quiz score
    let totalQuizzes = 0;
    let totalScore = 0;
    
    subjects.forEach(subject => {
        subject.topics.forEach(topic => {
            if (topic.quizHistory && topic.quizHistory.length > 0) {
                topic.quizHistory.forEach(quiz => {
                    totalQuizzes++;
                    totalScore += quiz.percentage || 0;
                });
            }
        });
    });
    
    const avgScore = totalQuizzes > 0 ? Math.round(totalScore / totalQuizzes) : 0;
    document.getElementById('dashboard-avg-score').textContent = `${avgScore}%`;
    
    // Update academic level
    const currentLevelElement = document.getElementById('current-academic-level');
    currentLevelElement.textContent = userProfile.academicLevel || 'Not set';
    
    // Update progress overview
    updateProgressOverview();
}

/**
 * Update progress overview
 */
function updateProgressOverview() {
    const container = document.getElementById('progress-overview');
    
    if (subjects.length === 0) {
        container.innerHTML = '<p class="text-medium-contrast text-sm">No subjects created yet.</p>';
        return;
    }
    
    const progressHTML = subjects.map(subject => {
        const progress = subject.getOverallProgress();
        const completedTopics = subject.getCompletedTopicsCount();
        const totalTopics = subject.topics.length;
        
        return `
            <div class="flex items-center justify-between">
                <div class="flex-1 mr-4">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm font-medium text-high-contrast">${sanitizeHtml(subject.name)}</span>
                        <span class="text-xs text-medium-contrast">${completedTopics}/${totalTopics} topics</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <span class="text-sm font-medium text-medium-contrast ml-2">${progress}%</span>
            </div>
        `;
    }).join('');
    
    container.innerHTML = progressHTML;
}

/**
 * Update subjects view
 */
function updateSubjectsView() {
    const container = document.getElementById('subjects-list');
    const countElement = document.getElementById('subjects-count');
    
    countElement.textContent = `${subjects.length} of 5 subjects`;
    
    if (subjects.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-6xl mb-4">📚</div>
                <h3 class="text-lg font-semibold text-high-contrast mb-2">No subjects yet</h3>
                <p class="text-medium-contrast mb-4">Create your first subject to get started</p>
                <button onclick="showAddSubjectModal()" class="bg-emerald-600 hover:bg-emerald-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                    Add Subject
                </button>
            </div>
        `;
        return;
    }
    
    const subjectsHTML = subjects.map(subject => {
        const progress = subject.getOverallProgress();
        const topicsCount = subject.topics.length;
        const completedTopics = subject.getCompletedTopicsCount();
        
        return `
            <div class="card-dark rounded-lg shadow-sm p-6 hover:shadow-lg transition-shadow cursor-pointer" onclick="showSubjectTopics('${subject.id}')">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-lg font-semibold text-high-contrast">${sanitizeHtml(subject.name)}</h3>
                    <div class="flex gap-2">
                        <button onclick="event.stopPropagation(); editSubject('${subject.id}')" class="text-gray-400 hover:text-white p-1 rounded">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="event.stopPropagation(); deleteSubject('${subject.id}')" class="text-gray-400 hover:text-red-400 p-1 rounded">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                ${subject.description ? `<p class="text-medium-contrast text-sm mb-4">${sanitizeHtml(subject.description)}</p>` : ''}
                
                <div class="space-y-3">
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-medium-contrast">Topics: ${topicsCount}/30</span>
                        <span class="text-medium-contrast">Completed: ${completedTopics}</span>
                    </div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <span class="text-xs text-medium-contrast">Progress: ${progress}%</span>
                        <button onclick="event.stopPropagation(); addTopicToSubject('${subject.id}')" class="bg-teal-600 hover:bg-teal-700 text-high-contrast px-3 py-1 rounded text-xs font-medium transition-colors">
                            Add Topic
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = subjectsHTML;
}

/**
 * Update sidebar academic level display
 */
function updateSidebarAcademicLevel() {
    const element = document.getElementById('sidebar-academic-level');
    element.textContent = userProfile.academicLevel || 'Not set';
}

/**
 * Update quick actions availability
 */
function updateQuickActions() {
    const addTopicBtn = document.getElementById('quick-add-topic');
    const takeQuizBtn = document.getElementById('quick-take-quiz');
    const studySessionBtn = document.getElementById('quick-study-session');
    
    const hasSubjects = subjects.length > 0;
    const hasTopics = subjects.some(subject => subject.topics.length > 0);
    
    // Enable/disable buttons based on available data
    addTopicBtn.disabled = !hasSubjects;
    takeQuizBtn.disabled = !hasTopics;
    studySessionBtn.disabled = !hasTopics;
    
    // Update button styles
    [addTopicBtn, takeQuizBtn, studySessionBtn].forEach(btn => {
        if (btn.disabled) {
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });
}
// ===== QUIZ FUNCTIONALITY =====

/**
 * Start quiz from topic detail view
 */
function startTopicQuiz() {
    if (!currentTopic || !currentSubject) {
        showNotification('Please select a topic first', 'error');
        return;
    }
    
    if (!userProfile.academicLevel) {
        showNotification('Please set your academic level first', 'warning');
        showAcademicLevelModal();
        return;
    }
    
    // Initialize quiz setup
    setupQuizView();
    showView('quiz');
}

/**
 * Start quick quiz from dashboard
 */
function startQuickQuiz() {
    // Find a topic to quiz on
    const availableTopics = [];
    subjects.forEach(subject => {
        subject.topics.forEach(topic => {
            availableTopics.push({ subject, topic });
        });
    });
    
    if (availableTopics.length === 0) {
        showNotification('No topics available for quiz', 'warning');
        return;
    }
    
    // Show topic selection modal
    showTopicSelectionModal(availableTopics);
}

/**
 * Show topic selection modal for quick quiz
 */
function showTopicSelectionModal(availableTopics) {
    const modalContent = `
        <div class="text-center">
            <h3 class="text-xl font-bold text-white mb-4">Select Quiz Topic</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Choose Topic:</label>
                    <select id="topic-select" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
                        <option value="">Select a topic...</option>
                        ${availableTopics.map((item, index) => 
                            `<option value="${index}">${item.subject.name} - ${item.topic.name}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Difficulty Level:</label>
                    <select id="difficulty-select" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
                        <option value="easy">Easy</option>
                        <option value="medium" selected>Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Quiz Type:</label>
                    <select id="quiz-type-select" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
                        <option value="mcq">Multiple Choice</option>
                        <option value="subjective">Subjective</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Number of Questions:</label>
                    <select id="num-questions-select" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
                        <option value="5">5 Questions</option>
                        <option value="10" selected>10 Questions</option>
                        <option value="15">15 Questions</option>
                        <option value="20">20 Questions</option>
                    </select>
                </div>
            </div>
            
            <div class="flex gap-3 mt-6">
                <button onclick="hideModal()" class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                    Cancel
                </button>
                <button onclick="startSelectedQuiz()" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Start Quiz
                </button>
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

/**
 * Start quiz with selected topic and settings
 */
async function startSelectedQuiz() {
    const topicIndex = document.getElementById('topic-select').value;
    const difficulty = document.getElementById('difficulty-select').value;
    const quizTypeSelected = document.getElementById('quiz-type-select').value;
    const numQuestionsSelected = parseInt(document.getElementById('num-questions-select').value);
    
    if (!topicIndex) {
        showNotification('Please select a topic', 'warning');
        return;
    }
    
    const availableTopics = [];
    subjects.forEach(subject => {
        subject.topics.forEach(topic => {
            availableTopics.push({ subject, topic });
        });
    });
    
    const selectedItem = availableTopics[parseInt(topicIndex)];
    
    // Set current context
    currentSubject = selectedItem.subject;
    currentTopic = selectedItem.topic;
    quizType = quizTypeSelected;
    quizDifficulty = difficulty;
    numQuestions = numQuestionsSelected;
    
    // Hide modal
    hideModal();
    
    // Show quiz setup view
    showView('quiz-setup');
    
    // Update quiz setup display
    document.getElementById('quiz-subject-display').textContent = currentSubject.name;
    document.getElementById('quiz-topic-display').textContent = currentTopic.name;
    document.getElementById('quiz-type-display').textContent = quizType === 'mcq' ? 'Multiple Choice' : 'Subjective';
    document.getElementById('quiz-questions-display').textContent = numQuestions;
    document.getElementById('quiz-difficulty-display').textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    document.getElementById('quiz-level-display').textContent = userProfile.academicLevel;
    
    // Show the quiz info display
    document.getElementById('quiz-info-display').classList.remove('hidden');
    
    // Update the quiz setup buttons to match selected values
    selectQuizType(quizType);
    selectDifficulty(difficulty);
    
    // Update question count
    updateQuestionCountOptions(quizType);
    selectQuestionCount(numQuestions);
    
    // Generate and start quiz immediately
    try {
        const startBtn = document.getElementById('start-quiz-btn');
        const originalText = startBtn.textContent;
        
        // Show loading state
        startBtn.disabled = true;
        startBtn.textContent = 'Generating Quiz...';
        
        // Generate quiz using API with difficulty
        const quiz = await generateQuiz(
            currentSubject.name,
            currentTopic.name,
            userProfile.academicLevel,
            quizType,
            numQuestions,
            currentTopic.notes || '',
            difficulty
        );
        
        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            throw new Error('No questions generated');
        }
        
        // Store quiz data
        currentQuiz = quiz;
        currentQuestionIndex = 0;
        userAnswers = {};
        
        // Start the quiz
        startQuizQuestions();
        
    } catch (error) {
        console.error('Quiz generation failed:', error);
        showNotification(`Failed to generate quiz: ${error.message}`, 'error');
        
        // Reset button state
        const startBtn = document.getElementById('start-quiz-btn');
        startBtn.disabled = false;
        startBtn.textContent = 'Generate Quiz';
    }
}

/**
 * Setup quiz view with initial configuration
 */
function setupQuizView() {
    // Reset quiz state
    currentQuiz = null;
    currentQuestionIndex = 0;
    userAnswers = {};
    quizType = 'mcq';
    quizDifficulty = 'medium';
    numQuestions = 10;
    
    // Update quiz title
    document.getElementById('quiz-title').textContent = `${currentTopic.name} Quiz`;
    document.getElementById('quiz-info').textContent = `${currentSubject.name} • ${userProfile.academicLevel} Level`;
    
    // Show quiz setup
    document.getElementById('quiz-setup').classList.remove('hidden');
    document.getElementById('quiz-questions').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    
    // Hide quiz info display initially
    document.getElementById('quiz-info-display').classList.add('hidden');
    
    // Setup quiz type selection
    selectQuizType('mcq');
    
    // Setup difficulty selection
    selectDifficulty('medium');
    
    // Update progress
    updateQuizProgress(0, 0);
}

/**
 * Select quiz type (MCQ or Subjective)
 */
function selectQuizType(type) {
    quizType = type;
    
    // Update button states
    const mcqBtn = document.getElementById('mcq-type');
    const subjectiveBtn = document.getElementById('subjective-type');
    
    mcqBtn.classList.remove('selected');
    subjectiveBtn.classList.remove('selected');
    
    if (type === 'mcq') {
        mcqBtn.classList.add('selected');
    } else {
        subjectiveBtn.classList.add('selected');
    }
    
    // Update question count options
    updateQuestionCountOptions(type);
}

/**
 * Select difficulty level
 */
function selectDifficulty(difficulty) {
    quizDifficulty = difficulty;
    
    // Update button states
    const easyBtn = document.getElementById('easy-difficulty');
    const mediumBtn = document.getElementById('medium-difficulty');
    const hardBtn = document.getElementById('hard-difficulty');
    
    easyBtn.classList.remove('selected');
    mediumBtn.classList.remove('selected');
    hardBtn.classList.remove('selected');
    
    if (difficulty === 'easy') {
        easyBtn.classList.add('selected');
    } else if (difficulty === 'medium') {
        mediumBtn.classList.add('selected');
    } else {
        hardBtn.classList.add('selected');
    }
}

/**
 * Update question count options based on quiz type
 */
function updateQuestionCountOptions(type) {
    const container = document.getElementById('question-count-options');
    
    let options = [];
    if (type === 'mcq') {
        options = [5, 10, 15, 20, 25, 30, 35, 40];
    } else {
        options = [3, 5, 8, 10, 15, 20, 25, 30];
    }
    
    const optionsHTML = options.map(count => `
        <button class="option-button text-center py-2 ${count === 10 ? 'selected' : ''}" onclick="selectQuestionCount(${count})">
            ${count}
        </button>
    `).join('');
    
    container.innerHTML = optionsHTML;
    numQuestions = 10; // Default
}

/**
 * Select number of questions
 */
function selectQuestionCount(count) {
    numQuestions = count;
    
    // Update button states
    document.querySelectorAll('#question-count-options .option-button').forEach(btn => {
        btn.classList.remove('selected');
        if (parseInt(btn.textContent.trim()) === count) {
            btn.classList.add('selected');
        }
    });
}

/**
 * Generate and start quiz
 */
async function generateAndStartQuiz() {
    if (!currentTopic || !currentSubject || !userProfile.academicLevel) {
        showNotification('Missing required information', 'error');
        return;
    }
    
    const startBtn = document.getElementById('start-quiz-btn');
    const originalText = startBtn.textContent;
    
    try {
        // Show loading state
        startBtn.disabled = true;
        startBtn.textContent = 'Generating Quiz...';
        
        // Generate quiz using API with current difficulty
        const quiz = await generateQuiz(
            currentSubject.name,
            currentTopic.name,
            userProfile.academicLevel,
            quizType,
            numQuestions,
            currentTopic.notes || '',
            quizDifficulty
        );
        
        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            throw new Error('No questions generated');
        }
        
        // Store quiz data
        currentQuiz = quiz;
        currentQuestionIndex = 0;
        userAnswers = {};
        
        // Start the quiz
        startQuizQuestions();
        
    } catch (error) {
        console.error('Quiz generation failed:', error);
        showNotification(`Failed to generate quiz: ${error.message}`, 'error');
    } finally {
        // Reset button state
        startBtn.disabled = false;
        startBtn.textContent = originalText;
    }
}

/**
 * Start displaying quiz questions
 */
function startQuizQuestions() {
    // Hide setup, show questions
    document.getElementById('quiz-setup').classList.add('hidden');
    document.getElementById('quiz-questions').classList.remove('hidden');
    
    // Show first question
    showQuestion(0);
}

/**
 * Show specific question
 */
function showQuestion(index) {
    if (!currentQuiz || !currentQuiz.questions || index >= currentQuiz.questions.length) {
        return;
    }
    
    currentQuestionIndex = index;
    const question = currentQuiz.questions[index];
    const container = document.getElementById('quiz-questions');
    
    // Update progress
    updateQuizProgress(index + 1, currentQuiz.questions.length);
    
    let questionHTML = '';
    
    if (quizType === 'mcq') {
        // Multiple choice question
        const options = Object.entries(question.options || {}).map(([key, value]) => `
            <button class="option-button" onclick="selectMCQAnswer(${index}, '${key}')">
                <strong>${key})</strong> ${sanitizeHtml(value)}
            </button>
        `).join('');
        
        questionHTML = `
            <div class="question-card">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-sm text-medium-contrast">Question ${index + 1} of ${currentQuiz.questions.length}</span>
                    <span class="text-xs px-2 py-1 bg-white bg-opacity-10 rounded">${question.difficulty || 'medium'}</span>
                </div>
                
                <h3 class="text-lg font-semibold text-high-contrast mb-6">${sanitizeHtml(question.question)}</h3>
                
                <div class="space-y-2 mb-6">
                    ${options}
                </div>
                
                <div class="flex justify-between">
                    <button onclick="previousQuestion()" class="bg-gray-600 hover:bg-gray-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors" ${index === 0 ? 'disabled' : ''}>
                        Previous
                    </button>
                    <button id="next-question-btn" onclick="nextQuestion()" class="bg-teal-600 hover:bg-teal-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors" disabled>
                        ${index === currentQuiz.questions.length - 1 ? 'Finish Quiz' : 'Next'}
                    </button>
                </div>
            </div>
        `;
    } else {
        // Subjective question
        questionHTML = `
            <div class="question-card">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-sm text-medium-contrast">Question ${index + 1} of ${currentQuiz.questions.length}</span>
                    <span class="text-xs px-2 py-1 bg-white bg-opacity-10 rounded">${question.difficulty || 'medium'}</span>
                </div>
                
                <h3 class="text-lg font-semibold text-high-contrast mb-4">${sanitizeHtml(question.question)}</h3>
                
                ${question.expected_length ? `<p class="text-sm text-medium-contrast mb-4">Expected length: ${sanitizeHtml(question.expected_length)}</p>` : ''}
                
                <textarea id="subjective-answer-${index}" class="w-full h-40 p-3 border border-white border-opacity-20 rounded-lg resize-none text-sm bg-white bg-opacity-10 text-high-contrast placeholder-gray-400" placeholder="Write your answer here..." oninput="updateSubjectiveAnswer(${index})">${userAnswers[index] || ''}</textarea>
                
                <div class="flex justify-between mt-6">
                    <button onclick="previousQuestion()" class="bg-gray-600 hover:bg-gray-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors" ${index === 0 ? 'disabled' : ''}>
                        Previous
                    </button>
                    <button id="next-question-btn" onclick="nextQuestion()" class="bg-teal-600 hover:bg-teal-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                        ${index === currentQuiz.questions.length - 1 ? 'Finish Quiz' : 'Next'}
                    </button>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = questionHTML;
    
    // Restore previous answer if exists
    if (quizType === 'mcq' && userAnswers[index]) {
        const selectedButton = container.querySelector(`button[onclick*="'${userAnswers[index]}'"]`);
        if (selectedButton) {
            selectedButton.classList.add('selected');
            document.getElementById('next-question-btn').disabled = false;
        }
    }
}

/**
 * Select MCQ answer
 */
function selectMCQAnswer(questionIndex, answer) {
    userAnswers[questionIndex] = answer;
    
    // Update button states
    const container = document.getElementById('quiz-questions');
    container.querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    event.target.classList.add('selected');
    
    // Enable next button
    document.getElementById('next-question-btn').disabled = false;
}

/**
 * Update subjective answer
 */
function updateSubjectiveAnswer(questionIndex) {
    const textarea = document.getElementById(`subjective-answer-${questionIndex}`);
    userAnswers[questionIndex] = textarea.value;
    
    // Enable next button if answer is not empty
    const nextBtn = document.getElementById('next-question-btn');
    nextBtn.disabled = textarea.value.trim().length === 0;
}

/**
 * Go to previous question
 */
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        showQuestion(currentQuestionIndex - 1);
    }
}

/**
 * Go to next question or finish quiz
 */
function nextQuestion() {
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        showQuestion(currentQuestionIndex + 1);
    } else {
        finishQuiz();
    }
}

/**
 * Finish quiz and show results
 */
async function finishQuiz() {
    if (!currentQuiz || !currentSubject || !currentTopic) {
        showNotification('Quiz data is missing', 'error');
        return;
    }
    
    // Show loading
    const container = document.getElementById('quiz-results');
    showLoading(container, 'Assessing your answers...');
    
    // Hide questions, show results
    document.getElementById('quiz-questions').classList.add('hidden');
    document.getElementById('quiz-results').classList.remove('hidden');
    
    try {
        // Assess quiz using API
        const assessment = await assessQuiz(
            currentQuiz,
            userAnswers,
            quizType,
            currentSubject.name,
            currentTopic.name,
            userProfile.academicLevel
        );
        
        // Save quiz result to topic history
        const quizResult = {
            id: Date.now().toString(),
            type: quizType,
            questions: currentQuiz.questions.length,
            score: assessment.score || 0,
            percentage: assessment.percentage || 0,
            grade: assessment.grade || 'N/A',
            assessment: assessment,
            completedAt: new Date().toISOString()
        };
        
        currentTopic.addQuizResult(quizResult);
        saveData();
        
        // Show results
        showQuizResults(assessment);
        
    } catch (error) {
        console.error('Quiz assessment failed:', error);
        container.innerHTML = `
            <div class="question-card text-center">
                <div class="text-red-400 text-6xl mb-4">⚠️</div>
                <h3 class="text-lg font-semibold text-high-contrast mb-2">Assessment Failed</h3>
                <p class="text-medium-contrast mb-4">${error.message}</p>
                <button onclick="showView('detail')" class="bg-teal-600 hover:bg-teal-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                    Back to Topic
                </button>
            </div>
        `;
    }
}

/**
 * Show quiz results
 */
function showQuizResults(assessment) {
    const container = document.getElementById('quiz-results');
    
    // Store quiz results for progress tracking
    const quizResult = {
        timestamp: new Date().toISOString(),
        subject: currentSubject.name,
        topic: currentTopic.name,
        difficulty: quizDifficulty,
        score: assessment.percentage || 0,
        grade: assessment.grade || 'N/A',
        totalQuestions: currentQuiz.questions.length,
        correctAnswers: assessment.correct_answers || 0
    };
    
    // Update quiz history
    quizHistory.unshift(quizResult);
    if (quizHistory.length > 50) quizHistory = quizHistory.slice(0, 50); // Keep last 50 quizzes
    localStorage.setItem('quizHistory', JSON.stringify(quizHistory));
    
    // Update topic performance
    const topicKey = `${currentSubject.name}-${currentTopic.name}`;
    if (!topicPerformance[topicKey]) {
        topicPerformance[topicKey] = { scores: [], averageScore: 0, totalQuizzes: 0 };
    }
    topicPerformance[topicKey].scores.push(assessment.percentage || 0);
    topicPerformance[topicKey].totalQuizzes++;
    topicPerformance[topicKey].averageScore = topicPerformance[topicKey].scores.reduce((a, b) => a + b, 0) / topicPerformance[topicKey].scores.length;
    localStorage.setItem('topicPerformance', JSON.stringify(topicPerformance));
    
    // Create comprehensive results HTML
    let resultsHTML = `
        <!-- Score Overview -->
        <div class="question-card text-center mb-6">
            <div class="text-6xl mb-4">${getGradeEmoji(assessment.grade)}</div>
            <h3 class="text-2xl font-bold text-high-contrast mb-2">Quiz Complete!</h3>
            <div class="grid grid-cols-3 gap-4 mb-4">
                <div>
                    <div class="text-3xl font-bold text-teal-400">${assessment.percentage || 0}%</div>
                    <div class="text-sm text-medium-contrast">Score</div>
                </div>
                <div>
                    <div class="text-3xl font-bold text-purple-400">${assessment.grade || 'N/A'}</div>
                    <div class="text-sm text-medium-contrast">Grade</div>
                </div>
                <div>
                    <div class="text-3xl font-bold text-blue-400">${assessment.correct_answers || 0}/${currentQuiz.questions.length}</div>
                    <div class="text-sm text-medium-contrast">Correct</div>
                </div>
            </div>
        </div>

        <!-- 4-Item Rubric Assessment -->
        <div class="question-card mb-6">
            <h4 class="text-lg font-semibold text-high-contrast mb-4">📊 Performance Rubric</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${generateRubricAssessment(assessment)}
            </div>
        </div>

        <!-- Weak Topics & Feedback -->
        <div class="question-card mb-6">
            <h4 class="text-lg font-semibold text-high-contrast mb-4">🎯 Areas for Improvement</h4>
            ${generateWeakTopicsAnalysis(assessment)}
        </div>

        <!-- Study Resources -->
        <div class="question-card mb-6">
            <h4 class="text-lg font-semibold text-high-contrast mb-4">📚 Recommended Study Resources</h4>
            ${generateStudyResources(currentSubject.name, currentTopic.name, quizDifficulty, assessment)}
        </div>

        <!-- Detailed Question Feedback -->
        ${assessment.question_feedback && assessment.question_feedback.length > 0 ? `
            <div class="question-card mb-6">
                <h4 class="text-lg font-semibold text-high-contrast mb-4">📝 Question-by-Question Analysis</h4>
                <div class="space-y-4">
                    ${assessment.question_feedback.map((feedback, index) => {
                        const question = currentQuiz.questions[index];
                        const userAnswer = userAnswers[question.id];
                        const isCorrect = feedback.correct;
                        
                        return `
                        <div class="border border-white border-opacity-20 rounded-lg p-4 ${isCorrect ? 'border-green-500 border-opacity-30' : 'border-red-500 border-opacity-30'}">
                            <div class="flex justify-between items-center mb-3">
                                <span class="font-medium text-high-contrast">Question ${index + 1}</span>
                                <span class="text-sm px-3 py-1 rounded-full ${isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}">
                                    ${isCorrect ? '✅ Correct' : '❌ Incorrect'}
                                </span>
                            </div>
                            
                            <!-- Question Text -->
                            <div class="mb-3">
                                <p class="text-high-contrast font-medium mb-2">${sanitizeHtml(question.question)}</p>
                            </div>
                            
                            ${currentQuiz.quiz_type === 'mcq' ? `
                                <!-- MCQ Options -->
                                <div class="space-y-2 mb-3">
                                    ${question.options.map((option, optIndex) => {
                                        const optionLetter = String.fromCharCode(65 + optIndex);
                                        const isUserAnswer = userAnswer === optionLetter;
                                        const isCorrectAnswer = question.correct_answer === optionLetter;
                                        
                                        let optionClass = 'bg-gray-700 text-gray-300';
                                        if (isCorrectAnswer) {
                                            optionClass = 'bg-green-600 text-white border-green-400';
                                        } else if (isUserAnswer && !isCorrect) {
                                            optionClass = 'bg-red-600 text-white border-red-400';
                                        }
                                        
                                        return `
                                            <div class="p-2 rounded border ${optionClass}">
                                                <span class="font-medium">${optionLetter}.</span> ${sanitizeHtml(option)}
                                                ${isCorrectAnswer ? ' <span class="text-green-200">✓ Correct Answer</span>' : ''}
                                                ${isUserAnswer && !isCorrect ? ' <span class="text-red-200">✗ Your Answer</span>' : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : `
                                <!-- Subjective Answer -->
                                <div class="space-y-3 mb-3">
                                    <div class="bg-gray-700 p-3 rounded">
                                        <p class="text-sm text-gray-300 mb-1">Your Answer:</p>
                                        <p class="text-white">${sanitizeHtml(userAnswer || 'No answer provided')}</p>
                                    </div>
                                    ${question.sample_answer ? `
                                        <div class="bg-green-800 bg-opacity-30 p-3 rounded border border-green-600 border-opacity-30">
                                            <p class="text-sm text-green-300 mb-1">Sample Answer:</p>
                                            <p class="text-green-100">${sanitizeHtml(question.sample_answer)}</p>
                                        </div>
                                    ` : ''}
                                </div>
                            `}
                            
                            <!-- Explanation -->
                            ${feedback.feedback ? `
                                <div class="bg-blue-800 bg-opacity-30 p-3 rounded border border-blue-600 border-opacity-30">
                                    <p class="text-sm text-blue-300 mb-1">💡 Explanation:</p>
                                    <p class="text-blue-100">${sanitizeHtml(feedback.feedback)}</p>
                                </div>
                            ` : ''}
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    // Action buttons
    resultsHTML += `
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button onclick="retakeQuiz()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                🔄 Retake Quiz
            </button>
            <button onclick="showView('topics')" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                📚 Back to Topics
            </button>
            <button onclick="showView('dashboard')" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                🏠 Dashboard
            </button>
        </div>
    `;
    
    container.innerHTML = resultsHTML;
    
    // Show results and hide other sections
    document.getElementById('quiz-setup').classList.add('hidden');
    document.getElementById('quiz-questions').classList.add('hidden');
    document.getElementById('quiz-results').classList.remove('hidden');
    
    // Update progress displays
    updateProgressDisplays();
}

/**
 * Get emoji for grade
 */
function getGradeEmoji(grade) {
    if (!grade) return '📊';
    
    const gradeUpper = grade.toUpperCase();
    if (gradeUpper.includes('A')) return '🎉';
    if (gradeUpper.includes('B')) return '👏';
    if (gradeUpper.includes('C')) return '👍';
    if (gradeUpper.includes('D')) return '📚';
    return '💪';
}

/**
 * Retake quiz
 */
function retakeQuiz() {
    setupQuizView();
}

/**
 * Update quiz progress bar
 */
function updateQuizProgress(current, total) {
    const progressText = document.getElementById('quiz-progress');
    const progressBar = document.getElementById('quiz-progress-bar');
    
    if (total > 0) {
        const percentage = (current / total) * 100;
        progressText.textContent = `${current}/${total}`;
        progressBar.style.width = `${percentage}%`;
    } else {
        progressText.textContent = '0/0';
        progressBar.style.width = '0%';
    }
}
// ===== SUBJECT MANAGEMENT =====

/**
 * Show add subject modal
 */
function showAddSubjectModal() {
    if (subjects.length >= 5) {
        showNotification('Maximum 5 subjects allowed', 'warning');
        return;
    }
    
    const content = `
        <div>
            <h3 class="text-lg font-semibold text-high-contrast mb-4">Add New Subject</h3>
            <form id="add-subject-form" onsubmit="addSubject(event)">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-medium-contrast mb-2">Subject Name *</label>
                    <input type="text" id="subject-name" class="w-full p-3 border border-white border-opacity-20 rounded-lg text-sm bg-white bg-opacity-10 text-high-contrast placeholder-gray-400" placeholder="e.g., Mathematics" required maxlength="50">
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-medium-contrast mb-2">Description (Optional)</label>
                    <textarea id="subject-description" class="w-full h-20 p-3 border border-white border-opacity-20 rounded-lg resize-none text-sm bg-white bg-opacity-10 text-high-contrast placeholder-gray-400" placeholder="Brief description of the subject" maxlength="200"></textarea>
                </div>
                <div class="flex gap-3 justify-end">
                    <button type="button" onclick="hideModal()" class="bg-gray-600 hover:bg-gray-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                        Add Subject
                    </button>
                </div>
            </form>
        </div>
    `;
    
    showModal(content);
    document.getElementById('subject-name').focus();
}

/**
 * Add new subject
 */
function addSubject(event) {
    event.preventDefault();
    
    const name = document.getElementById('subject-name').value.trim();
    const description = document.getElementById('subject-description').value.trim();
    
    try {
        // Validate input
        Subject.validate({ name, description });
        
        // Check for duplicate names
        const existingSubject = subjects.find(s => s.name.toLowerCase() === name.toLowerCase());
        if (existingSubject) {
            throw new Error('A subject with this name already exists');
        }
        
        // Create new subject
        const subject = new Subject(name, description);
        subjects.push(subject);
        
        // Save and update UI
        saveData();
        updateUI();
        hideModal();
        
        showNotification('Subject added successfully', 'success');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

/**
 * Edit subject
 */
function editSubject(subjectId) {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    const content = `
        <div>
            <h3 class="text-lg font-semibold text-high-contrast mb-4">Edit Subject</h3>
            <form id="edit-subject-form" onsubmit="updateSubject(event, '${subjectId}')">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-medium-contrast mb-2">Subject Name *</label>
                    <input type="text" id="edit-subject-name" class="w-full p-3 border border-white border-opacity-20 rounded-lg text-sm bg-white bg-opacity-10 text-high-contrast placeholder-gray-400" value="${sanitizeHtml(subject.name)}" required maxlength="50">
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-medium-contrast mb-2">Description (Optional)</label>
                    <textarea id="edit-subject-description" class="w-full h-20 p-3 border border-white border-opacity-20 rounded-lg resize-none text-sm bg-white bg-opacity-10 text-high-contrast placeholder-gray-400" maxlength="200">${sanitizeHtml(subject.description)}</textarea>
                </div>
                <div class="flex gap-3 justify-end">
                    <button type="button" onclick="hideModal()" class="bg-gray-600 hover:bg-gray-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="bg-teal-600 hover:bg-teal-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                        Update Subject
                    </button>
                </div>
            </form>
        </div>
    `;
    
    showModal(content);
    document.getElementById('edit-subject-name').focus();
}

/**
 * Update subject
 */
function updateSubject(event, subjectId) {
    event.preventDefault();
    
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    const name = document.getElementById('edit-subject-name').value.trim();
    const description = document.getElementById('edit-subject-description').value.trim();
    
    try {
        // Validate input
        Subject.validate({ name, description });
        
        // Check for duplicate names (excluding current subject)
        const existingSubject = subjects.find(s => s.id !== subjectId && s.name.toLowerCase() === name.toLowerCase());
        if (existingSubject) {
            throw new Error('A subject with this name already exists');
        }
        
        // Update subject
        subject.name = name;
        subject.description = description;
        subject.lastUpdated = new Date().toISOString();
        
        // Save and update UI
        saveData();
        updateUI();
        hideModal();
        
        showNotification('Subject updated successfully', 'success');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

/**
 * Delete subject
 */
function deleteSubject(subjectId) {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    const topicsCount = subject.topics.length;
    const message = topicsCount > 0 
        ? `Are you sure you want to delete "${subject.name}"? This will also delete ${topicsCount} topic(s).`
        : `Are you sure you want to delete "${subject.name}"?`;
    
    showConfirmDialog(message, () => {
        // Remove subject
        const index = subjects.findIndex(s => s.id === subjectId);
        if (index !== -1) {
            subjects.splice(index, 1);
            
            // Clear current selection if deleted
            if (currentSubject && currentSubject.id === subjectId) {
                currentSubject = null;
                currentTopic = null;
            }
            
            // Save and update UI
            saveData();
            updateUI();
            
            showNotification('Subject deleted successfully', 'success');
        }
    });
}

/**
 * Show subject topics
 */
function showSubjectTopics(subjectId) {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    currentSubject = subject;
    currentTopic = null;
    
    // Show topics in a modal or navigate to topics view
    showTopicsModal(subject);
}

/**
 * Show topics modal for a subject
 */
function showTopicsModal(subject) {
    const topicsHTML = subject.topics.length > 0 
        ? subject.topics.map(topic => `
            <div class="border border-white border-opacity-20 rounded-lg p-4 hover:bg-white hover:bg-opacity-5 transition-colors cursor-pointer" onclick="selectTopic('${topic.id}')">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-medium text-high-contrast">${sanitizeHtml(topic.name)}</h4>
                    <span class="text-xs px-2 py-1 bg-teal-600 text-white rounded">${topic.progress || 0}%</span>
                </div>
                ${topic.description ? `<p class="text-sm text-medium-contrast mb-2">${sanitizeHtml(topic.description)}</p>` : ''}
                <div class="flex justify-between items-center text-xs text-medium-contrast">
                    <span>Quizzes: ${topic.quizHistory ? topic.quizHistory.length : 0}</span>
                    <span>Avg Score: ${topic.getAverageQuizScore()}%</span>
                </div>
            </div>
        `).join('')
        : '<p class="text-medium-contrast text-center py-8">No topics yet. Add your first topic!</p>';
    
    const content = `
        <div>
            <h3 class="text-lg font-semibold text-high-contrast mb-4">${sanitizeHtml(subject.name)} Topics</h3>
            <div class="space-y-3 mb-6 max-h-60 overflow-y-auto">
                ${topicsHTML}
            </div>
            <div class="flex gap-3 justify-end">
                <button onclick="addTopicToSubject('${subject.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                    Add Topic
                </button>
                <button onclick="hideModal()" class="bg-gray-600 hover:bg-gray-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                    Close
                </button>
            </div>
        </div>
    `;
    
    showModal(content);
}

/**
 * Select topic and show detail view
 */
function selectTopic(topicId) {
    if (!currentSubject) return;
    
    const topic = currentSubject.getTopic(topicId);
    if (!topic) return;
    
    currentTopic = topic;
    hideModal();
    showTopicDetail();
}

/**
 * Generate expert-level topic explanation
 */
async function generateTopicExplanation(subject, topic, academicLevel) {
    try {
        const prompt = `As a distinguished professor and expert educator with decades of experience, provide an exceptionally comprehensive, in-depth explanation for the topic "${topic}" in the subject "${subject}" at ${academicLevel} level.

This should be a complete academic treatise of 2000-2500 words that serves as a definitive guide. Structure your response with rich detail in each section:

## 1. COMPREHENSIVE OVERVIEW & DEFINITION (300-400 words)
- Provide multiple precise definitions from different perspectives
- Explain the etymology and historical development of key terms
- Discuss why this topic is fundamentally important in ${subject}
- Elaborate on real-world relevance with specific examples
- Connect to broader academic and professional contexts
- Explain the topic's position within the larger field of study

## 2. FOUNDATIONAL CONCEPTS & THEORETICAL FRAMEWORK (400-500 words)
- Detail all key principles, theories, and laws that govern this topic
- Explain the fundamental building blocks with scientific/academic rigor
- Provide comprehensive terminology with detailed definitions
- Discuss the theoretical framework that supports understanding
- Include historical development of these concepts
- Explain how different theories complement or conflict with each other
- Provide mathematical formulations, equations, or models where applicable

## 3. DETAILED TECHNICAL EXPLANATION (500-600 words)
- Provide step-by-step breakdown of processes, mechanisms, or methodologies
- Explain how different concepts interconnect and influence each other
- Detail cause-and-effect relationships with specific examples
- Include technical specifications, parameters, or criteria
- Discuss variations, exceptions, and special cases
- Explain the underlying mechanisms or processes in detail
- Provide quantitative analysis where relevant
- Include diagrams, flowcharts, or structural descriptions in text form

## 4. EXTENSIVE PRACTICAL APPLICATIONS (300-400 words)
- Provide multiple detailed real-world examples across different industries
- Explain specific case studies with outcomes and analysis
- Discuss current applications in technology, research, or practice
- Include emerging applications and future possibilities
- Explain how professionals use this knowledge in their work
- Provide specific examples of problem-solving scenarios
- Discuss economic, social, or environmental implications

## 5. COMMON MISCONCEPTIONS & CRITICAL ANALYSIS (200-300 words)
- Identify and thoroughly explain frequent student errors and why they occur
- Provide detailed clarification of confusing or counterintuitive points
- Explain what students commonly think versus what is actually true
- Discuss limitations of simplified explanations or models
- Address controversial aspects or ongoing debates in the field
- Explain how to avoid common pitfalls in understanding or application

## 6. INTERCONNECTIONS & ACADEMIC RELATIONSHIPS (200-300 words)
- Explain detailed connections to other topics within ${subject}
- Discuss relationships to other academic disciplines
- Identify essential prerequisites and explain why they're necessary
- Outline advanced topics that build upon this foundation
- Explain how this topic appears in interdisciplinary contexts
- Discuss the topic's role in current research and development

## 7. ADVANCED STUDY STRATEGIES & MASTERY TECHNIQUES (200-300 words)
- Provide specific, proven approaches to master this complex topic
- Suggest advanced memory techniques and cognitive strategies
- Recommend practice methodologies and assessment preparation
- Explain how to develop deep conceptual understanding
- Suggest ways to apply knowledge creatively and critically
- Provide guidance for independent research and exploration

## 8. FUTURE DIRECTIONS & RESEARCH OPPORTUNITIES (100-200 words)
- Discuss cutting-edge developments and emerging trends
- Identify current research questions and unsolved problems
- Suggest areas for further academic or professional exploration
- Recommend advanced resources for continued learning
- Explain career paths that heavily utilize this knowledge

Use rich academic language appropriate for ${academicLevel} level. Include specific examples, detailed explanations, and comprehensive coverage. Make it scholarly yet accessible, with clear logical flow between sections. Aim for exceptional depth while maintaining clarity and engagement.

Write as if this is a chapter from an authoritative textbook that students will reference throughout their academic journey.`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: prompt,
                context: `Subject: ${subject}, Topic: ${topic}, Level: ${academicLevel}, Required Length: 2000-2500 words, Format: Comprehensive Academic Treatise`
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'success' && data.response) {
            return data.response;
        } else {
            throw new Error(data.error || 'Failed to generate explanation');
        }
        
    } catch (error) {
        console.error('Error generating topic explanation:', error);
        return generateFallbackExplanation(subject, topic, academicLevel);
    }
}

/**
 * Generate comprehensive fallback explanation when API fails
 */
function generateFallbackExplanation(subject, topic, academicLevel) {
    return `
# ${topic}: A Comprehensive Academic Guide

## 1. COMPREHENSIVE OVERVIEW & DEFINITION

The topic "${topic}" represents a fundamental cornerstone within the academic discipline of ${subject}, serving as both a theoretical foundation and practical framework that underpins much of our understanding in this field. At the ${academicLevel} level, this topic demands rigorous examination through multiple analytical lenses, each revealing different facets of its complexity and significance.

From a definitional standpoint, ${topic} encompasses a broad spectrum of concepts, methodologies, and applications that have evolved significantly over time. The term itself derives from foundational principles that have been refined through decades of scholarly research and practical application. Understanding this topic requires not merely memorization of facts, but a deep appreciation for the interconnected systems of knowledge that it represents.

The importance of ${topic} in ${subject} cannot be overstated. It serves as a critical bridge between theoretical understanding and practical application, providing students and professionals with the conceptual tools necessary to navigate complex challenges in their field. This topic appears consistently across various subdisciplines within ${subject}, making it essential for anyone seeking comprehensive mastery of the subject area.

In real-world contexts, ${topic} manifests in numerous ways, from everyday applications that affect millions of people to cutting-edge research that pushes the boundaries of human knowledge. Professional practitioners in ${subject} regularly encounter situations where deep understanding of ${topic} proves crucial for success, innovation, and problem-solving.

The academic significance of this topic extends beyond its immediate applications. It represents a way of thinking, a methodological approach, and a conceptual framework that shapes how we understand and interact with the broader world. Students who master ${topic} develop not only specific knowledge but also critical thinking skills that serve them throughout their academic and professional careers.

## 2. FOUNDATIONAL CONCEPTS & THEORETICAL FRAMEWORK

The theoretical foundation underlying ${topic} rests upon several key principles that have been developed and refined through extensive research and scholarly discourse. These principles form an interconnected web of understanding that provides the conceptual scaffolding for all advanced work in this area.

At its core, ${topic} is governed by fundamental laws and principles that dictate how various elements interact, influence each other, and produce observable outcomes. These governing principles have been established through rigorous scientific methodology, peer review, and practical validation across numerous contexts and applications.

The theoretical framework supporting ${topic} draws from multiple academic traditions and schools of thought. Historical development of these concepts reveals a fascinating evolution of ideas, with each generation of scholars building upon the work of their predecessors while introducing new insights and methodologies. This historical perspective is crucial for understanding not only what we know about ${topic}, but how we came to know it.

Key terminology within this field includes numerous specialized terms that carry precise meanings and implications. Each term represents a carefully defined concept that contributes to our overall understanding. Mastery of this vocabulary is essential for effective communication and deeper comprehension of advanced concepts.

The mathematical and analytical frameworks associated with ${topic} provide powerful tools for quantitative analysis and prediction. These frameworks allow researchers and practitioners to model complex systems, predict outcomes, and optimize performance across various applications. Understanding these mathematical relationships is crucial for anyone seeking to work at an advanced level in this field.

Contemporary theoretical developments continue to expand our understanding of ${topic}, with new models and frameworks emerging regularly from ongoing research. These developments often challenge existing assumptions and open new avenues for exploration and application.

## 3. DETAILED TECHNICAL EXPLANATION

The technical aspects of ${topic} involve complex mechanisms and processes that operate according to well-established principles and methodologies. Understanding these technical details requires careful examination of the underlying systems, their components, and the ways in which they interact to produce desired outcomes.

The step-by-step processes associated with ${topic} follow logical sequences that can be analyzed, understood, and replicated. Each step in these processes serves a specific purpose and contributes to the overall effectiveness of the system or methodology. Mastering these processes requires both theoretical understanding and practical experience.

Interconnections between different aspects of ${topic} create a complex web of relationships that must be carefully considered in any comprehensive analysis. These relationships often involve feedback loops, cascading effects, and emergent properties that arise from the interaction of multiple components. Understanding these interconnections is crucial for predicting system behavior and optimizing performance.

Cause-and-effect relationships within ${topic} operate at multiple levels and time scales. Some effects are immediate and directly observable, while others may take considerable time to manifest or may be subtle and require careful measurement to detect. Understanding these relationships enables practitioners to make informed decisions and predict outcomes with greater accuracy.

Technical specifications and parameters associated with ${topic} provide precise guidelines for implementation and evaluation. These specifications often represent the culmination of extensive research and testing, providing practitioners with reliable benchmarks for success. Adherence to these specifications is typically crucial for achieving desired outcomes.

Variations and exceptions within ${topic} reflect the complexity and nuance inherent in real-world applications. While general principles provide important guidance, successful practitioners must also understand when and how to adapt these principles to specific circumstances and unique challenges.

## 4. EXTENSIVE PRACTICAL APPLICATIONS

The practical applications of ${topic} span numerous industries and professional contexts, demonstrating its broad relevance and utility in addressing real-world challenges. These applications range from everyday uses that affect millions of people to highly specialized implementations in cutting-edge research and development.

In industrial contexts, ${topic} plays a crucial role in optimizing processes, improving efficiency, and ensuring quality outcomes. Companies across various sectors rely on principles and methodologies derived from ${topic} to maintain competitive advantages and meet evolving market demands. Specific case studies demonstrate how proper application of these concepts can lead to significant improvements in performance, cost-effectiveness, and customer satisfaction.

Healthcare applications of ${topic} have revolutionized patient care and medical research, providing new tools and methodologies for diagnosis, treatment, and prevention. Medical professionals regularly apply concepts from ${topic} to improve patient outcomes and advance our understanding of human health and disease.

Educational applications demonstrate how ${topic} can enhance learning outcomes and pedagogical effectiveness. Educators who understand and apply these concepts are better equipped to design curricula, assess student progress, and adapt their teaching methods to meet diverse learning needs.

Environmental applications of ${topic} contribute to sustainability efforts and environmental protection initiatives. Researchers and practitioners use these concepts to develop solutions for climate change, pollution control, and resource conservation, demonstrating the topic's relevance to some of the most pressing challenges facing humanity.

Technological applications continue to expand as new innovations emerge from ongoing research and development. These applications often push the boundaries of what was previously thought possible, opening new frontiers for exploration and discovery.

## 5. COMMON MISCONCEPTIONS & CRITICAL ANALYSIS

Students and practitioners often encounter several persistent misconceptions about ${topic} that can impede their understanding and application of key concepts. These misconceptions typically arise from oversimplified explanations, incomplete information, or misapplication of concepts from other domains.

One common misconception involves the assumption that ${topic} operates according to simple, linear relationships when, in reality, the systems involved are often highly complex and nonlinear. This oversimplification can lead to incorrect predictions and ineffective interventions.

Another frequent error involves confusing correlation with causation, leading to inappropriate conclusions about the relationships between different variables or factors. Understanding the distinction between these concepts is crucial for proper analysis and interpretation of data.

Students often struggle with the counterintuitive aspects of ${topic}, where common sense or everyday experience may suggest one outcome while scientific analysis reveals a different reality. These counterintuitive elements require careful explanation and often benefit from concrete examples and demonstrations.

The limitations of simplified models and explanations must be clearly understood to avoid inappropriate applications or unrealistic expectations. While simplified models serve important pedagogical purposes, practitioners must understand when more sophisticated approaches are necessary.

Critical analysis of ${topic} reveals ongoing debates and controversies within the field, reflecting the dynamic nature of scientific and academic inquiry. Understanding these debates helps students develop critical thinking skills and appreciate the complexity of knowledge development.

## 6. INTERCONNECTIONS & ACADEMIC RELATIONSHIPS

The relationship between ${topic} and other areas within ${subject} demonstrates the interconnected nature of academic knowledge and the importance of interdisciplinary understanding. These connections often reveal unexpected insights and opportunities for innovation.

Prerequisites for understanding ${topic} include foundational knowledge from several related areas, each contributing essential concepts and methodologies. Students must master these prerequisites to develop a comprehensive understanding of the topic and its applications.

Advanced topics that build upon ${topic} represent natural extensions and applications of core concepts, providing pathways for continued learning and specialization. Understanding these connections helps students plan their academic and professional development.

Interdisciplinary connections reveal how ${topic} appears in fields beyond ${subject}, demonstrating its broad relevance and utility. These connections often lead to innovative applications and new research directions.

The role of ${topic} in current research reflects its continued importance and relevance in advancing human knowledge. Ongoing studies continue to refine our understanding and reveal new applications and implications.

## 7. ADVANCED STUDY STRATEGIES & MASTERY TECHNIQUES

Mastering ${topic} requires a multifaceted approach that combines theoretical study with practical application and critical analysis. Effective study strategies must address the complexity and depth of the material while building connections to related concepts and applications.

Active learning techniques prove particularly effective for this topic, encouraging students to engage directly with the material through problem-solving, analysis, and application. These techniques help develop deep understanding rather than superficial memorization.

Conceptual mapping and visualization techniques can help students understand the complex relationships and interconnections within ${topic}. These tools provide visual representations of abstract concepts and their relationships.

Regular practice and application of concepts through exercises, projects, and real-world applications help solidify understanding and develop practical skills. This hands-on experience is crucial for developing expertise.

Collaborative learning approaches, including study groups and peer discussions, can enhance understanding by exposing students to different perspectives and approaches to the material.

## 8. FUTURE DIRECTIONS & RESEARCH OPPORTUNITIES

The future of ${topic} promises continued evolution and expansion as new technologies, methodologies, and applications emerge from ongoing research and development. Current trends suggest several promising directions for future exploration and innovation.

Emerging technologies are creating new opportunities for application and research, potentially revolutionizing how we understand and apply concepts related to ${topic}. These technological advances often reveal new possibilities that were previously unimaginable.

Current research questions reflect the dynamic nature of the field and the ongoing quest to expand human knowledge and capability. These questions provide opportunities for students and researchers to contribute to the advancement of the field.

Career opportunities in fields related to ${topic} continue to expand as society recognizes the value and importance of expertise in this area. Professionals with deep understanding of ${topic} are well-positioned to contribute to innovation and progress in their chosen fields.

---

*This comprehensive guide provides a foundation for deep understanding of ${topic} at the ${academicLevel} level. Students are encouraged to use this as a starting point for further exploration and study, always seeking to connect new learning to existing knowledge and real-world applications.*
    `;
}

/**
 * Generate and show topic explanation
 */
async function generateAndShowTopicExplanation() {
    if (!currentTopic || !currentSubject) {
        showNotification('Please select a topic first', 'error');
        return;
    }

    const button = document.getElementById('generate-explanation-btn');
    const container = document.getElementById('topic-explanation');
    
    if (!button || !container) return;

    // Show loading state
    button.disabled = true;
    button.innerHTML = '⏳ Generating...';
    
    container.innerHTML = `
        <div class="text-center text-gray-400 py-12">
            <div class="animate-spin text-6xl mb-4">🧠</div>
            <h4 class="text-lg font-semibold text-white mb-2">Generating Comprehensive Academic Explanation</h4>
            <p class="text-sm mb-2">Creating an in-depth, 2000+ word expert-level analysis...</p>
            <div class="bg-gray-700 rounded-full h-2 w-64 mx-auto mb-3">
                <div class="bg-blue-500 h-2 rounded-full animate-pulse" style="width: 60%"></div>
            </div>
            <p class="text-xs text-gray-500">This comprehensive explanation will include detailed sections on theory, applications, and advanced concepts</p>
            <p class="text-xs text-gray-600 mt-2">⏱️ This may take 30-60 seconds for the best quality content</p>
        </div>
    `;

    try {
        const explanation = await generateTopicExplanation(
            currentSubject.name,
            currentTopic.name,
            userAcademicLevel
        );

        // Convert markdown-like content to HTML
        const formattedExplanation = formatExplanationToHTML(explanation);
        
        container.innerHTML = formattedExplanation;
        
        // Store explanation in topic for future reference
        currentTopic.expertExplanation = explanation;
        currentTopic.explanationGeneratedAt = new Date().toISOString();
        
        // Save to localStorage
        saveData();
        
        showNotification('Expert explanation generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating explanation:', error);
        container.innerHTML = `
            <div class="text-center text-red-400 py-8">
                <div class="text-4xl mb-3">⚠️</div>
                <p class="text-sm">Failed to generate explanation</p>
                <p class="text-xs text-gray-500 mt-2">Please try again later</p>
            </div>
        `;
        showNotification('Failed to generate explanation', 'error');
    } finally {
        // Reset button
        button.disabled = false;
        button.innerHTML = 'Regenerate Explanation';
    }
}

/**
 * Format explanation text to rich HTML with comprehensive styling
 */
function formatExplanationToHTML(text) {
    if (!text) return '';
    
    // Convert markdown-like formatting to rich HTML with academic styling
    let html = text
        // Main headers (H1) - Topic titles
        .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-white mb-6 mt-8 pb-3 border-b-2 border-blue-500">$1</h1>')
        
        // Section headers (H2) - Major sections
        .replace(/^## (\d+\.\s*)?(.*$)/gm, '<h2 class="text-2xl font-semibold text-blue-300 mb-4 mt-8 flex items-center"><span class="bg-blue-600 text-white px-3 py-1 rounded-full text-lg mr-3">$1</span>$2</h2>')
        
        // Subsection headers (H3)
        .replace(/^### (.*$)/gm, '<h3 class="text-xl font-medium text-green-300 mb-3 mt-6 pl-4 border-l-4 border-green-500">$3</h3>')
        
        // Sub-subsection headers (H4)
        .replace(/^#### (.*$)/gm, '<h4 class="text-lg font-medium text-yellow-300 mb-2 mt-4">$1</h4>')
        
        // Bold text - important concepts
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold bg-gray-700 px-2 py-1 rounded">$1</strong>')
        
        // Italic text - emphasis
        .replace(/\*(.*?)\*/g, '<em class="text-yellow-300 font-medium">$1</em>')
        
        // Code/technical terms
        .replace(/`(.*?)`/g, '<code class="bg-gray-800 text-green-300 px-2 py-1 rounded text-sm font-mono border border-gray-600">$1</code>')
        
        // Unordered lists
        .replace(/^- (.*$)/gm, '<li class="text-gray-300 mb-2 pl-2">• $1</li>')
        
        // Ordered lists
        .replace(/^(\d+)\. (.*$)/gm, '<li class="text-gray-300 mb-2 pl-2"><span class="text-blue-400 font-semibold">$1.</span> $2</li>')
        
        // Blockquotes for important notes
        .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-yellow-500 bg-yellow-900 bg-opacity-20 pl-4 py-2 my-3 text-yellow-100 italic">$1</blockquote>')
        
        // Line breaks and paragraphs
        .replace(/\n\n/g, '</p><p class="text-gray-300 mb-4 leading-relaxed">')
        .replace(/\n/g, '<br>');
    
    // Wrap in paragraphs
    html = '<p class="text-gray-300 mb-4 leading-relaxed">' + html + '</p>';
    
    // Handle lists properly
    html = html.replace(/(<li.*?<\/li>)/gs, (match) => {
        const listItems = match.match(/<li.*?<\/li>/g);
        if (listItems) {
            return '<ul class="list-none space-y-2 mb-6 ml-4 bg-gray-800 bg-opacity-30 p-4 rounded-lg border-l-4 border-blue-500">' + listItems.join('') + '</ul>';
        }
        return match;
    });
    
    // Clean up empty paragraphs and fix spacing
    html = html
        .replace(/<p[^>]*><\/p>/g, '')
        .replace(/<p([^>]*)><h/g, '<h')
        .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
        .replace(/<p([^>]*)><ul/g, '<ul')
        .replace(/<\/ul><\/p>/g, '</ul>')
        .replace(/<p([^>]*)><blockquote/g, '<blockquote')
        .replace(/<\/blockquote><\/p>/g, '</blockquote>');
    
    // Add reading time estimate
    const wordCount = text.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed
    
    // Add table of contents for long explanations
    const tocMatches = html.match(/<h2[^>]*>(.*?)<\/h2>/g);
    let toc = '';
    if (tocMatches && tocMatches.length > 3) {
        toc = `
            <div class="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-8">
                <h3 class="text-lg font-semibold text-white mb-3 flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                    </svg>
                    Table of Contents
                </h3>
                <div class="text-sm text-gray-400 mb-3">📖 Estimated reading time: ${readingTime} minutes | 📝 Word count: ~${wordCount} words</div>
                <ul class="space-y-1 text-sm">
                    ${tocMatches.map((match, index) => {
                        const title = match.replace(/<[^>]*>/g, '').replace(/^\d+\.\s*/, '');
                        return `<li><a href="#section-${index}" class="text-blue-400 hover:text-blue-300 transition-colors">→ ${title}</a></li>`;
                    }).join('')}
                </ul>
            </div>
        `;
        
        // Add IDs to sections for navigation
        html = html.replace(/<h2([^>]*)>/g, (match, attrs, offset) => {
            const index = (html.substring(0, offset).match(/<h2/g) || []).length;
            return `<h2${attrs} id="section-${index}">`;
        });
    }
    
    // Wrap everything in a comprehensive container
    return `
        <div class="prose prose-invert max-w-none">
            ${toc}
            <div class="academic-content">
                ${html}
            </div>
            <div class="mt-8 p-4 bg-blue-900 bg-opacity-20 border border-blue-600 border-opacity-30 rounded-lg">
                <p class="text-blue-200 text-sm mb-2">
                    <strong>📚 Study Tip:</strong> This comprehensive explanation is designed for deep learning. 
                    Take breaks between sections, make notes, and connect concepts to your existing knowledge.
                </p>
                <p class="text-blue-300 text-xs">
                    💡 Use the table of contents above to navigate between sections and review specific areas as needed.
                </p>
            </div>
        </div>
    `;
}

/**
 * Show topic detail view
 */
function showTopicDetail() {
    if (!currentTopic || !currentSubject) return;
    
    // Update topic title
    const topicTitle = document.getElementById('topic-title');
    if (topicTitle) {
        topicTitle.textContent = currentTopic.name;
    }
    
    // Load topic notes
    const topicNotes = document.getElementById('topic-notes');
    if (topicNotes) {
        topicNotes.value = currentTopic.notes || '';
    }
    
    // Load existing explanation if available
    const explanationContainer = document.getElementById('topic-explanation');
    const explanationButton = document.getElementById('generate-explanation-btn');
    
    if (explanationContainer && explanationButton) {
        if (currentTopic.expertExplanation) {
            // Show existing explanation
            explanationContainer.innerHTML = formatExplanationToHTML(currentTopic.expertExplanation);
            explanationButton.innerHTML = 'Regenerate Explanation';
        } else {
            // Show placeholder
            explanationContainer.innerHTML = `
                <div class="text-center text-gray-400 py-12">
                    <div class="text-6xl mb-4">🎓</div>
                    <h4 class="text-lg font-semibold text-white mb-2">Comprehensive Academic Explanation</h4>
                    <p class="text-sm mb-2">Generate an in-depth, expert-level explanation (2000+ words)</p>
                    <div class="grid grid-cols-2 gap-4 text-xs text-gray-500 max-w-md mx-auto mb-4">
                        <div class="bg-gray-800 p-2 rounded">📚 Theoretical Framework</div>
                        <div class="bg-gray-800 p-2 rounded">🔬 Detailed Analysis</div>
                        <div class="bg-gray-800 p-2 rounded">🌍 Real Applications</div>
                        <div class="bg-gray-800 p-2 rounded">🎯 Study Strategies</div>
                    </div>
                    <p class="text-xs text-gray-500">Tailored for ${userAcademicLevel} level • Academic quality content</p>
                </div>
            `;
            explanationButton.innerHTML = 'Generate Explanation';
        }
    }
    
    // Update progress (with null checks inside the function)
    updateTopicProgressDisplay();
    
    // Update links (with null checks inside the function)
    updateLinksDisplay();
    
    // Update quiz history (with null checks inside the function)
    updateQuizHistory();
    
    // Show detail view
    showView('detail');
}

/**
 * Update topic progress display
 */
function updateTopicProgressDisplay() {
    if (!currentTopic) return;
    
    // Check if progress elements exist (they might not be in all views)
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    if (progressBar && progressText) {
        const progress = currentTopic.progress || 0;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;
    }
    
    // Update topic performance section if it exists
    const topicPerformance = document.getElementById('topic-performance');
    if (topicPerformance && currentTopic) {
        const topicKey = `${currentSubject.name}-${currentTopic.name}`;
        const performance = topicPerformance[topicKey];
        
        if (performance && performance.totalQuizzes > 0) {
            topicPerformance.innerHTML = `
                <div class="bg-gray-700 rounded-lg p-4">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-white font-medium">${currentTopic.name}</span>
                        <span class="text-lg font-bold ${performance.averageScore >= 75 ? 'text-green-400' : performance.averageScore >= 60 ? 'text-yellow-400' : 'text-red-400'}">
                            ${Math.round(performance.averageScore)}%
                        </span>
                    </div>
                    <div class="w-full bg-gray-600 rounded-full h-2 mb-2">
                        <div class="h-2 rounded-full ${performance.averageScore >= 75 ? 'bg-green-500' : performance.averageScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}" 
                             style="width: ${performance.averageScore}%"></div>
                    </div>
                    <div class="text-sm text-gray-300">
                        ${performance.totalQuizzes} quiz${performance.totalQuizzes !== 1 ? 'es' : ''} completed
                    </div>
                </div>
            `;
        } else {
            topicPerformance.innerHTML = `
                <div class="text-center text-gray-400 py-4">
                    <div class="text-2xl mb-2">🎯</div>
                    <p class="text-sm">Take a quiz to see your performance</p>
                </div>
            `;
        }
    }
}

/**
 * Update links display
 */
function updateLinksDisplay() {
    if (!currentTopic) return;
    
    const container = document.getElementById('links-list');
    if (!container) return; // Element doesn't exist
    
    if (!currentTopic.links || currentTopic.links.length === 0) {
        container.innerHTML = '<p class="text-medium-contrast text-sm">No resource links added yet.</p>';
        return;
    }
    
    const linksHTML = currentTopic.links.map(link => `
        <div class="flex items-center justify-between p-2 bg-white bg-opacity-5 rounded border border-white border-opacity-10">
            <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="text-teal-400 hover:text-teal-300 text-sm truncate flex-1 mr-2">
                ${sanitizeHtml(link.title)}
            </a>
            <button onclick="removeLink('${link.id}')" class="text-gray-400 hover:text-red-400 p-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        </div>
    `).join('');
    
    container.innerHTML = linksHTML;
}

/**
 * Update quiz history display
 */
function updateQuizHistory() {
    if (!currentTopic) return;
    
    const container = document.getElementById('quiz-history');
    if (!container) return; // Element doesn't exist
    
    if (!currentTopic.quizHistory || currentTopic.quizHistory.length === 0) {
        container.innerHTML = '<p class="text-medium-contrast text-sm">No quizzes taken yet.</p>';
        return;
    }
    
    const historyHTML = currentTopic.quizHistory.slice(-3).reverse().map(quiz => `
        <div class="flex items-center justify-between p-2 bg-white bg-opacity-5 rounded border border-white border-opacity-10">
            <div class="flex-1">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-high-contrast">${quiz.type.toUpperCase()}</span>
                    <span class="text-xs px-2 py-1 bg-purple-600 text-white rounded">${quiz.grade}</span>
                </div>
                <div class="text-xs text-medium-contrast">${formatDate(quiz.completedAt)} • ${quiz.questions} questions</div>
            </div>
            <div class="text-right">
                <div class="text-sm font-medium text-teal-400">${quiz.percentage}%</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = historyHTML;
}

// ===== TOPIC MANAGEMENT =====

/**
 * Add topic to subject
 */
function addTopicToSubject(subjectId) {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    if (subject.topics.length >= 30) {
        showNotification('Maximum 30 topics allowed per subject', 'warning');
        return;
    }
    
    currentSubject = subject;
    showAddTopicModal();
}

/**
 * Show add topic modal
 */
function showAddTopicModal() {
    if (!currentSubject) {
        showNotification('Please select a subject first', 'error');
        return;
    }
    
    const content = `
        <div>
            <h3 class="text-lg font-semibold text-high-contrast mb-4">Add New Topic</h3>
            <p class="text-medium-contrast text-sm mb-4">Adding to: ${sanitizeHtml(currentSubject.name)}</p>
            <form id="add-topic-form" onsubmit="addTopic(event)">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-medium-contrast mb-2">Topic Name *</label>
                    <input type="text" id="topic-name" class="w-full p-3 border border-white border-opacity-20 rounded-lg text-sm bg-white bg-opacity-10 text-high-contrast placeholder-gray-400" placeholder="e.g., Quadratic Equations" required maxlength="100">
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-medium-contrast mb-2">Description (Optional)</label>
                    <textarea id="topic-description" class="w-full h-20 p-3 border border-white border-opacity-20 rounded-lg resize-none text-sm bg-white bg-opacity-10 text-high-contrast placeholder-gray-400" placeholder="Brief description of the topic" maxlength="500"></textarea>
                </div>
                <div class="flex gap-3 justify-end">
                    <button type="button" onclick="hideModal()" class="bg-gray-600 hover:bg-gray-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                        Add Topic
                    </button>
                </div>
            </form>
        </div>
    `;
    
    showModal(content);
    document.getElementById('topic-name').focus();
}

/**
 * Add new topic
 */
function addTopic(event) {
    event.preventDefault();
    
    if (!currentSubject) return;
    
    const name = document.getElementById('topic-name').value.trim();
    const description = document.getElementById('topic-description').value.trim();
    
    try {
        // Validate input
        Topic.validate({ name, description });
        
        // Create new topic
        const topic = new Topic(name, description);
        currentSubject.addTopic(topic);
        
        // Save and update UI
        saveData();
        updateUI();
        hideModal();
        
        showNotification('Topic added successfully', 'success');
        
        // Show the new topic
        currentTopic = topic;
        showTopicDetail();
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

/**
 * Add resource link
 */
function addResourceLink() {
    if (!currentTopic) return;
    
    const urlInput = document.getElementById('new-link');
    const url = urlInput.value.trim();
    
    if (!url) {
        showNotification('Please enter a URL', 'warning');
        return;
    }
    
    if (!isValidUrl(url)) {
        showNotification('Please enter a valid URL', 'error');
        return;
    }
    
    try {
        currentTopic.addLink(url);
        saveData();
        updateLinksDisplay();
        urlInput.value = '';
        showNotification('Link added successfully', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

/**
 * Remove resource link
 */
function removeLink(linkId) {
    if (!currentTopic) return;
    
    if (currentTopic.removeLink(linkId)) {
        saveData();
        updateLinksDisplay();
        showNotification('Link removed', 'success');
    }
}

/**
 * Save topic notes
 */
function saveTopicNotes() {
    if (!currentTopic) return;
    
    const notes = document.getElementById('topic-notes').value;
    currentTopic.notes = notes;
    currentTopic.lastUpdated = new Date().toISOString();
    
    saveData();
}

/**
 * Update topic progress
 */
function updateTopicProgress() {
    if (!currentTopic) return;
    
    const content = `
        <div>
            <h3 class="text-lg font-semibold text-high-contrast mb-4">Update Progress</h3>
            <div class="mb-6">
                <label class="block text-sm font-medium text-medium-contrast mb-2">Progress Percentage</label>
                <input type="range" id="progress-slider" class="w-full" min="0" max="100" value="${currentTopic.progress || 0}" oninput="updateProgressPreview(this.value)">
                <div class="flex justify-between text-xs text-medium-contrast mt-1">
                    <span>0%</span>
                    <span id="progress-preview">${currentTopic.progress || 0}%</span>
                    <span>100%</span>
                </div>
            </div>
            <div class="flex gap-3 justify-end">
                <button onclick="hideModal()" class="bg-gray-600 hover:bg-gray-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                    Cancel
                </button>
                <button onclick="saveProgress()" class="bg-orange-500 hover:bg-orange-600 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                    Update Progress
                </button>
            </div>
        </div>
    `;
    
    showModal(content);
}

/**
 * Update progress preview
 */
function updateProgressPreview(value) {
    document.getElementById('progress-preview').textContent = `${value}%`;
}

/**
 * Save progress
 */
function saveProgress() {
    if (!currentTopic) return;
    
    const progress = parseInt(document.getElementById('progress-slider').value);
    currentTopic.updateProgress(progress);
    
    saveData();
    updateTopicProgressDisplay();
    updateUI();
    hideModal();
    
    showNotification('Progress updated successfully', 'success');
}

// ===== ACADEMIC LEVEL MANAGEMENT =====

/**
 * Show academic level modal
 */
function showAcademicLevelModal() {
    const levels = ['Primary', 'Secondary', 'College', 'Competitive'];
    
    const levelsHTML = levels.map(level => `
        <button class="option-button ${userProfile.academicLevel === level ? 'selected' : ''}" onclick="selectAcademicLevel('${level}')">
            <div class="font-medium">${level}</div>
            <div class="text-sm opacity-80">${getAcademicLevelDescription(level)}</div>
        </button>
    `).join('');
    
    const content = `
        <div>
            <h3 class="text-lg font-semibold text-high-contrast mb-4">Select Academic Level</h3>
            <p class="text-medium-contrast text-sm mb-4">Choose your current academic level for personalized content.</p>
            <div class="space-y-2 mb-6">
                ${levelsHTML}
            </div>
            <div class="flex gap-3 justify-end">
                <button onclick="hideModal()" class="bg-gray-600 hover:bg-gray-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors">
                    Cancel
                </button>
                <button id="save-level-btn" onclick="saveAcademicLevel()" class="bg-teal-600 hover:bg-teal-700 text-high-contrast px-4 py-2 rounded-lg font-medium transition-colors" disabled>
                    Save Level
                </button>
            </div>
        </div>
    `;
    
    showModal(content);
}

/**
 * Get academic level description
 */
function getAcademicLevelDescription(level) {
    const descriptions = {
        'Primary': 'Elementary/Primary school level',
        'Secondary': 'High school/Secondary level',
        'College': 'University/College level',
        'Competitive': 'Competitive exams preparation'
    };
    return descriptions[level] || '';
}

/**
 * Select academic level
 */
function selectAcademicLevel(level) {
    // Update button states
    document.querySelectorAll('.option-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.closest('.option-button').classList.add('selected');
    
    // Enable save button
    document.getElementById('save-level-btn').disabled = false;
    
    // Store selected level temporarily
    window.selectedAcademicLevel = level;
}

/**
 * Save academic level
 */
function saveAcademicLevel() {
    const level = window.selectedAcademicLevel;
    if (!level) return;
    
    try {
        userProfile.setAcademicLevel(level);
        userAcademicLevel = level;
        
        StorageManager.saveUserProfile(userProfile);
        updateSidebarAcademicLevel();
        updateDashboard();
        hideModal();
        
        showNotification('Academic level updated successfully', 'success');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ===== DATA PERSISTENCE =====

/**
 * Save all data to localStorage
 */
function saveData() {
    StorageManager.saveSubjects(subjects);
    StorageManager.saveUserProfile(userProfile);
}

// ===== INITIALIZATION =====

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
