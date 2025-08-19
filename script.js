// Firebase configuration - Replace with your Firebase config
const firebaseConfig = {
    // You'll need to add your Firebase configuration here
    apiKey: "AIzaSyArodrYq6D_ND9Js4o3TNknoSyPnhjlPhs",
    authDomain: "study-web-2efa5.firebaseapp.com",
    databaseURL: "https://study-web-2efa5-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "study-web-2efa5",
    storageBucket: "study-web-2efa5.firebasestorage.app",
    messagingSenderId: "372100269428",
    appId: "1:372100269428:web:fdffe6719c5253d44d1821",
    measurementId: "G-NHBX3KPD2W"
};

// Initialize Firebase (this will be updated when you add your config)
// import { initializeApp } from 'firebase/app';
// import { getFirestore } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth';
// import { getStorage } from 'firebase/storage';

// For now, we'll create a mock Firebase-like object for demonstration
const mockFirebase = {
    auth: {
        currentUser: null,
        signInWithEmailAndPassword: (email, password) => Promise.resolve({ user: { uid: '123', email } }),
        createUserWithEmailAndPassword: (email, password) => Promise.resolve({ user: { uid: '123', email } }),
        signOut: () => Promise.resolve()
    },
    firestore: {
        collection: (name) => ({
            add: (data) => Promise.resolve({ id: Date.now().toString() }),
            onSnapshot: (callback) => callback([]),
            doc: (id) => ({
                set: (data) => Promise.resolve(),
                get: () => Promise.resolve({ data: () => ({}) })
            })
        })
    }
};

// Global variables
let currentUser = null;
let currentChannel = 'general';
let studyTimer = {
    startTime: null,
    totalTime: 0,
    isRunning: false,
    interval: null
};
let isTyping = false;
let typingTimeout = null;

// DOM elements
const authModal = document.getElementById('authModal');
const app = document.getElementById('app');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubmit = document.getElementById('authSubmit');
const switchAuth = document.getElementById('switchAuth');
const currentUserSpan = document.getElementById('currentUser');
const currentChannelName = document.getElementById('currentChannelName');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    showAuthModal();
});

function initializeEventListeners() {
    // Auth form
    authForm.addEventListener('submit', handleAuth);
    switchAuth.addEventListener('click', toggleAuthMode);

    // Channel switching
    document.querySelectorAll('.channel').forEach(channel => {
        channel.addEventListener('click', () => switchChannel(channel.dataset.channel));
    });

    // Message sending
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        } else {
            handleTyping();
        }
    });

    // Modals
    document.getElementById('studyTimerBtn').addEventListener('click', () => openModal('studyTimerModal'));
    document.getElementById('goalsBtn').addEventListener('click', () => openModal('goalsModal'));
    document.getElementById('leaderboardBtn').addEventListener('click', () => openModal('leaderboardModal'));

    // Timer controls
    document.getElementById('startStudyBtn').addEventListener('click', startStudyTimer);
    document.getElementById('pauseStudyBtn').addEventListener('click', pauseStudyTimer);
    document.getElementById('endStudyBtn').addEventListener('click', endStudyTimer);

    // Goals
    document.getElementById('setGoalBtn').addEventListener('click', setDailyGoal);

    // File upload
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });

    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
}

// Authentication functions
function showAuthModal() {
    authModal.classList.remove('hidden');
}

function hideAuthModal() {
    authModal.classList.add('hidden');
    app.classList.remove('hidden');
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;

    try {
        const isLogin = authSubmit.textContent === 'Login';

        if (isLogin) {
            await mockFirebase.auth.signInWithEmailAndPassword(email, password);
        } else {
            await mockFirebase.auth.createUserWithEmailAndPassword(email, password);
        }

        currentUser = {
            uid: '123',
            email: email,
            username: username || email.split('@')[0],
            studyTime: 0,
            badges: [],
            joinDate: new Date()
        };

        currentUserSpan.textContent = currentUser.username;
        hideAuthModal();
        initializeApp();

    } catch (error) {
        alert('Authentication failed: ' + error.message);
    }
}

function toggleAuthMode() {
    const isLogin = authSubmit.textContent === 'Login';

    if (isLogin) {
        authTitle.textContent = 'Create Account';
        authSubmit.textContent = 'Sign Up';
        document.getElementById('authSwitch').innerHTML = 'Already have an account? <span id="switchAuth">Login</span>';
        document.getElementById('username').style.display = 'block';
    } else {
        authTitle.textContent = 'Welcome Back';
        authSubmit.textContent = 'Login';
        document.getElementById('authSwitch').innerHTML = 'Need an account? <span id="switchAuth">Sign Up</span>';
        document.getElementById('username').style.display = 'none';
    }

    // Re-attach event listener
    document.getElementById('switchAuth').addEventListener('click', toggleAuthMode);
}

// App initialization
function initializeApp() {
    loadMessages();
    loadOnlineUsers();
    loadStudyStats();
    loadLeaderboard();

    // Add welcome message
    addSystemMessage(`Welcome to StudySync, ${currentUser.username}! Type /help to see available commands.`);
}

// Channel switching
function switchChannel(channelName) {
    // Remove active class from all channels
    document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));

    // Add active class to selected channel
    document.querySelector(`[data-channel="${channelName}"]`).classList.add('active');

    currentChannel = channelName;
    currentChannelName.textContent = channelName;
    messageInput.placeholder = `Message #${channelName}`;

    // Clear messages and load channel-specific messages
    messagesContainer.innerHTML = '';
    loadMessages();
}

// Message handling
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    messageInput.value = '';

    // Check if it's a command
    if (message.startsWith('/')) {
        handleCommand(message);
    } else {
        // Process mentions
        const processedMessage = processMentions(message);
        addMessage(currentUser.username, processedMessage, 'user');
    }

    // Update message count
    updateMessageCount();
}

function handleCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
        case '/help':
            showHelpMessage();
            break;
        case '/startstudies':
            startStudyTimer();
            addSystemMessage(`${currentUser.username} started studying! 📚`);
            break;
        case '/endstudies':
            endStudyTimer();
            addSystemMessage(`${currentUser.username} finished studying! Great job! 🎉`);
            break;
        case '/doubts':
            if (parts.length > 1) {
                const doubt = parts.slice(1).join(' ');
                addMessage(currentUser.username, `🤔 DOUBT: ${doubt}`, 'doubt');
            } else {
                addSystemMessage('Usage: /doubts <your question>');
            }
            break;
        case '/everyone':
            if (parts.length > 1) {
                const announcement = parts.slice(1).join(' ');
                addMessage(currentUser.username, `📢 @everyone ${announcement}`, 'announcement');
            } else {
                addSystemMessage('Usage: /everyone <your message>');
            }
            break;
        case '/usernametime':
            if (parts.length > 1) {
                const username = parts[1];
                showUserStudyTime(username);
            } else {
                addSystemMessage('Usage: /usernametime <username>');
            }
            break;
        case '/ping':
            if (parts.length > 1) {
                const username = parts[1];
                addMessage(currentUser.username, `Hey @${username}! 👋`, 'ping');
            } else {
                addSystemMessage('Usage: /ping <username>');
            }
            break;
        default:
            addSystemMessage(`Unknown command: ${cmd}. Type /help for available commands.`);
    }
}

function showHelpMessage() {
    const helpText = `
**Available Commands:**
• \`/startstudies\` - Start your study timer
• \`/endstudies\` - End your study session
• \`/doubts <question>\` - Ask a question in the doubts channel
• \`/everyone <message>\` - Send announcement to everyone
• \`/usernametime <username>\` - Check someone's study time
• \`/ping <username>\` - Ping a user
• \`/help\` - Show this help message
    `;
    addSystemMessage(helpText);
}

function processMentions(message) {
    return message.replace(/@(\w+)/g, '<span class="ping">@$1</span>');
}

function addMessage(author, text, type = 'user') {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message new';

    const avatar = `https://ui-avatars.com/api/?name=${author}&background=5865f2&color=fff&size=40`;

    let messageClass = '';
    if (type === 'command' || type === 'doubt' || type === 'announcement' || type === 'ping') {
        messageClass = 'command';
    }

    messageDiv.innerHTML = `
        <img src="${avatar}" alt="${author}" class="message-avatar">
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${author}</span>
                <span class="message-timestamp">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-text ${messageClass}">${text}</div>
            <div class="message-reactions">
                <span class="reaction" onclick="toggleReaction(this, '👍')">👍</span>
                <span class="reaction" onclick="toggleReaction(this, '❤️')">❤️</span>
                <span class="reaction" onclick="toggleReaction(this, '😂')">😂</span>
                <span class="reaction" onclick="toggleReaction(this, '🔥')">🔥</span>
            </div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Remove new animation class after animation
    setTimeout(() => messageDiv.classList.remove('new'), 300);
}

function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message new';

    messageDiv.innerHTML = `
        <img src="https://ui-avatars.com/api/?name=System&background=faa81a&color=fff&size=40" alt="System" class="message-avatar">
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">StudySync Bot</span>
                <span class="message-timestamp">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-text system">${text}</div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    setTimeout(() => messageDiv.classList.remove('new'), 300);
}

function toggleReaction(element, emoji) {
    element.classList.toggle('reacted');
    if (element.classList.contains('reacted')) {
        element.innerHTML = `${emoji} 1`;
    } else {
        element.innerHTML = emoji;
    }
}

// Typing indicator
function handleTyping() {
    if (!isTyping) {
        isTyping = true;
        // In a real app, you'd send this to other users
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isTyping = false;
        // In a real app, you'd stop showing typing indicator to other users
    }, 1000);
}

// Study timer functions
function startStudyTimer() {
    if (!studyTimer.isRunning) {
        studyTimer.startTime = Date.now();
        studyTimer.isRunning = true;

        document.getElementById('startStudyBtn').classList.add('hidden');
        document.getElementById('pauseStudyBtn').classList.remove('hidden');
        document.getElementById('endStudyBtn').classList.remove('hidden');

        studyTimer.interval = setInterval(updateTimerDisplay, 1000);
        updateUserStatus('studying');
    }
}

function pauseStudyTimer() {
    if (studyTimer.isRunning) {
        studyTimer.totalTime += Date.now() - studyTimer.startTime;
        studyTimer.isRunning = false;
        clearInterval(studyTimer.interval);

        document.getElementById('startStudyBtn').classList.remove('hidden');
        document.getElementById('pauseStudyBtn').classList.add('hidden');

        updateUserStatus('away');
    }
}

function endStudyTimer() {
    if (studyTimer.isRunning) {
        studyTimer.totalTime += Date.now() - studyTimer.startTime;
    }

    studyTimer.isRunning = false;
    studyTimer.startTime = null;
    clearInterval(studyTimer.interval);

    document.getElementById('startStudyBtn').classList.remove('hidden');
    document.getElementById('pauseStudyBtn').classList.add('hidden');
    document.getElementById('endStudyBtn').classList.add('hidden');

    // Update user's total study time
    currentUser.studyTime += studyTimer.totalTime;
    studyTimer.totalTime = 0;

    updateUserStatus('online');
    updateStudyStats();
    checkAchievements();

    document.getElementById('timerTime').textContent = '00:00:00';
}

function updateTimerDisplay() {
    const currentTime = studyTimer.totalTime + (studyTimer.isRunning ? Date.now() - studyTimer.startTime : 0);
    const hours = Math.floor(currentTime / 3600000);
    const minutes = Math.floor((currentTime % 3600000) / 60000);
    const seconds = Math.floor((currentTime % 60000) / 1000);

    document.getElementById('timerTime').textContent =
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function showUserStudyTime(username) {
    // In a real app, you'd fetch this from the database
    const mockTime = Math.floor(Math.random() * 10) + 1; // Random hours between 1-10
    addSystemMessage(`${username} has studied for ${mockTime} hours today! 📊`);
}

// Goals system
function setDailyGoal() {
    const goalHours = parseInt(document.getElementById('dailyGoal').value);
    if (goalHours && goalHours > 0) {
        currentUser.dailyGoal = goalHours * 3600000; // Convert to milliseconds
        updateGoalProgress();
        addSystemMessage(`Daily goal set to ${goalHours} hours! 🎯`);
    }
}

function updateGoalProgress() {
    if (currentUser.dailyGoal) {
        const progress = (currentUser.studyTime / currentUser.dailyGoal) * 100;
        const clampedProgress = Math.min(progress, 100);

        document.getElementById('progressFill').style.width = `${clampedProgress}%`;
        document.getElementById('progressText').textContent = `${Math.round(clampedProgress)}% complete`;

        if (progress >= 100) {
            addSystemMessage('🎉 Daily goal achieved! Great job!');
            awardBadge('Goal Achiever');
        }
    }
}

// Achievements system
function checkAchievements() {
    const studyHours = currentUser.studyTime / 3600000;

    if (studyHours >= 1 && !currentUser.badges.includes('First Hour')) {
        awardBadge('First Hour');
    }
    if (studyHours >= 10 && !currentUser.badges.includes('Dedicated Student')) {
        awardBadge('Dedicated Student');
    }
    if (studyHours >= 100 && !currentUser.badges.includes('Study Master')) {
        awardBadge('Study Master');
    }

    const currentHour = new Date().getHours();
    if (currentHour < 6 && !currentUser.badges.includes('Night Owl')) {
        awardBadge('Night Owl');
    }
    if (currentHour < 7 && !currentUser.badges.includes('Early Bird')) {
        awardBadge('Early Bird');
    }
}

function awardBadge(badgeName) {
    currentUser.badges.push(badgeName);
    addSystemMessage(`🏆 Achievement unlocked: ${badgeName}!`);
    updateBadgeDisplay();
}

function updateBadgeDisplay() {
    const badgesContainer = document.getElementById('userBadges');
    badgesContainer.innerHTML = '';

    currentUser.badges.forEach(badge => {
        const badgeElement = document.createElement('span');
        badgeElement.className = 'badge';
        badgeElement.textContent = badge;
        badgesContainer.appendChild(badgeElement);
    });
}

// File upload handling
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const fileSize = (file.size / 1024 / 1024).toFixed(2); // Size in MB
        const fileName = file.name;
        const fileType = file.type;

        // Create file message
        const fileMessage = `
            <div class="file-preview">
                <i class="fas fa-file"></i>
                <div class="file-info">
                    <div class="file-name">${fileName}</div>
                    <div class="file-size">${fileSize} MB</div>
                </div>
                <button class="download-btn" onclick="downloadFile('${fileName}')">Download</button>
            </div>
        `;

        addMessage(currentUser.username, `Shared a file: ${fileMessage}`, 'file');

        // Clear the input
        e.target.value = '';
    }
}

function downloadFile(fileName) {
    addSystemMessage(`Download started for: ${fileName}`);
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');

    if (modalId === 'leaderboardModal') {
        loadLeaderboard();
    }
}

// Stats and leaderboard
function updateStudyStats() {
    const studyHours = Math.floor(currentUser.studyTime / 3600000);
    const studyMinutes = Math.floor((currentUser.studyTime % 3600000) / 60000);

    document.getElementById('userStudyTime').textContent = `${studyHours}h ${studyMinutes}m`;
}

function updateMessageCount() {
    const current = parseInt(document.getElementById('messagesSent').textContent) || 0;
    document.getElementById('messagesSent').textContent = current + 1;
}

function loadLeaderboard() {
    const leaderboardContent = document.getElementById('leaderboardContent');

    // Mock leaderboard data
    const mockLeaderboard = [
        { username: 'StudyMaster', studyTime: 15.5 },
        { username: 'BookWorm', studyTime: 12.3 },
        { username: 'NightOwl', studyTime: 10.8 },
        { username: currentUser.username, studyTime: currentUser.studyTime / 3600000 },
        { username: 'EarlyBird', studyTime: 8.2 }
    ].sort((a, b) => b.studyTime - a.studyTime);

    leaderboardContent.innerHTML = '';

    mockLeaderboard.forEach((user, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';

        let rankClass = '';
        if (index === 0) rankClass = 'first';
        else if (index === 1) rankClass = 'second';
        else if (index === 2) rankClass = 'third';

        item.innerHTML = `
            <div class="leaderboard-rank ${rankClass}">#${index + 1}</div>
            <div class="leaderboard-user">${user.username}</div>
            <div class="leaderboard-time">${user.studyTime.toFixed(1)}h</div>
        `;

        leaderboardContent.appendChild(item);
    });
}

function loadMessages() {
    // In a real app, this would load from Firebase
    // For now, add some sample messages for the channel
    setTimeout(() => {
        if (currentChannel === 'general') {
            addSystemMessage('Welcome to the general channel! This is where you can chat about anything study-related.');
        } else if (currentChannel === 'doubts') {
            addSystemMessage('This is the doubts channel. Ask any questions you have here!');
        } else if (currentChannel === 'resources') {
            addSystemMessage('Share your study resources here - PDFs, links, notes, and more!');
        }
    }, 100);
}

function loadOnlineUsers() {
    const onlineUsersList = document.getElementById('onlineUsersList');

    // Mock online users
    const mockUsers = [
        { username: currentUser.username, status: 'online' },
        { username: 'StudyBuddy', status: 'studying' },
        { username: 'QuizMaster', status: 'away' },
        { username: 'NoteTaker', status: 'online' }
    ];

    onlineUsersList.innerHTML = '';

    mockUsers.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';

        let statusClass = 'online';
        if (user.status === 'studying') statusClass = 'busy';
        else if (user.status === 'away') statusClass = 'away';

        userDiv.innerHTML = `
            <img src="https://ui-avatars.com/api/?name=${user.username}&background=5865f2&color=fff&size=32" alt="${user.username}">
            <span>${user.username}</span>
            <div class="user-status ${statusClass}"></div>
        `;

        onlineUsersList.appendChild(userDiv);
    });
}

function updateUserStatus(status) {
    // Update user's status in the UI and database
    const userStatus = document.querySelector('.user-info .user-status');
    userStatus.className = `user-status ${status}`;
}

// Notification system (mock)
function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('StudySync', {
            body: message,
            icon: 'https://ui-avatars.com/api/?name=StudySync&background=5865f2&color=fff&size=64'
        });
    }
}

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Auto-save study progress every minute
setInterval(() => {
    if (currentUser && studyTimer.isRunning) {
        // In a real app, you'd save to Firebase here
        console.log('Auto-saving study progress...');
    }
}, 60000);

// Google Calendar sync (mock function)
function syncWithGoogleCalendar() {
    addSystemMessage('📅 Google Calendar sync is not yet implemented. Coming soon!');
}

// Theme switching (bonus feature)
function switchTheme(theme) {
    document.body.className = theme;
    localStorage.setItem('studySync-theme', theme);
}

// Load saved theme
const savedTheme = localStorage.getItem('studySync-theme');
if (savedTheme) {
    switchTheme(savedTheme);
}