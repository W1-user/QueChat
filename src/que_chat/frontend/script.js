// script.js - Полная версия с историей из БД

// Конфигурация WebSocket
const WS_URL = `ws://localhost:8000/ws`;
const API_URL = `http://localhost:8000/messages`;

// DOM элементы
const messageHistory = document.getElementById('messageHistory');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const channelTitle = document.querySelector('.channel_title');
const channelAvatar = document.querySelector('.channel_avatar');

// Состояние приложения
let socket = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// Хранилище ID отображенных сообщений для предотвращения дубликатов
let displayedMessageIds = new Set();

// Имя пользователя
let USERNAME = '';

// --- Управление пользователями ---

function getUsername() {
    let savedUsername = localStorage.getItem('quechat_username');
    
    if (savedUsername) {
        return savedUsername;
    }
    
    const newUsername = prompt('Введите ваше имя для чата:', `User_${Math.floor(Math.random() * 10000)}`);
    if (newUsername && newUsername.trim()) {
        return newUsername.trim();
    }
    return `User_${Math.floor(Math.random() * 10000)}`;
}

function setUsername(newUsername) {
    if (newUsername && newUsername.trim()) {
        USERNAME = newUsername.trim();
        localStorage.setItem('quechat_username', USERNAME);
        updateUserInterface();
        showNotification(`Имя изменено на: ${USERNAME}`, 'info');
    }
}

function updateUserInterface() {
    if (channelAvatar) {
        channelAvatar.textContent = USERNAME.substring(0, 1).toUpperCase();
    }
    if (channelTitle) {
        channelTitle.textContent = `QueChat - ${USERNAME}`;
    }
}

// Инициализация имени пользователя
USERNAME = getUsername();

// --- Управление WebSocket ---

function initWebSocket() {
    try {
        socket = new WebSocket(WS_URL);
        
        socket.onopen = handleWebSocketOpen;
        socket.onmessage = handleWebSocketMessage;
        socket.onclose = handleWebSocketClose;
        socket.onerror = handleWebSocketError;
        
        updateConnectionStatus('Подключение...');
    } catch (error) {
        console.error('Ошибка при создании WebSocket:', error);
        attemptReconnect();
    }
}

function handleWebSocketOpen(event) {
    console.log('WebSocket подключен');
    isConnected = true;
    reconnectAttempts = 0;
    updateConnectionStatus('Подключено');
    channelTitle.textContent = `QueChat - ${USERNAME}`;
    channelAvatar.style.backgroundColor = '#4CAF50';
}

function handleWebSocketMessage(event) {
    try {
        const data = JSON.parse(event.data);
        console.log('Получено сообщение:', data);
        
        if (data.type === 'new_message') {
            // Проверяем, не отображали ли уже это сообщение
            if (data.message.id && !displayedMessageIds.has(data.message.id)) {
                displayMessage(data.message);
            }
        }
    } catch (error) {
        console.error('Ошибка при обработке сообщения:', error);
    }
}

function handleWebSocketClose(event) {
    console.log('WebSocket закрыт:', event.code, event.reason);
    isConnected = false;
    updateConnectionStatus('Отключено');
    channelTitle.textContent = 'Оффлайн';
    channelAvatar.style.backgroundColor = '#f44336';
    attemptReconnect();
}

function handleWebSocketError(error) {
    console.error('Ошибка WebSocket:', error);
    updateConnectionStatus('Ошибка соединения');
}

function attemptReconnect() {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Попытка переподключения ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        updateConnectionStatus(`Переподключение... ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        
        setTimeout(() => {
            if (!isConnected) {
                initWebSocket();
            }
        }, RECONNECT_DELAY);
    } else {
        console.error('Максимальное количество попыток переподключения достигнуто');
        updateConnectionStatus('Не удалось подключиться');
    }
}

function updateConnectionStatus(status) {
    console.log('Статус соединения:', status);
}

// --- Управление сообщениями ---

function clearMessageHistory() {
    messageHistory.innerHTML = '';
    displayedMessageIds.clear();
}

function displayMessage(message) {
    // Проверяем, не отображали ли уже это сообщение
    if (message.id && displayedMessageIds.has(message.id)) {
        console.log('⚠️ Дубликат сообщения, пропускаем:', message.id);
        return;
    }
    
    // Сохраняем ID сообщения
    if (message.id) {
        displayedMessageIds.add(message.id);
    }
    
    const messageElement = createMessageElement(message);
    messageHistory.appendChild(messageElement);
    scrollToBottom();
}

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    
    const isOwnMessage = message.username === USERNAME;
    messageDiv.className = isOwnMessage ? 'message_send' : 'message_received';
    
    // Никнейм
    const nicknameDiv = document.createElement('div');
    nicknameDiv.className = 'nickname';
    nicknameDiv.textContent = message.username || 'Аноним';
    
    // Текст сообщения
    const messageContentDiv = document.createElement('div');
    messageContentDiv.className = 'message';
    messageContentDiv.textContent = message.text || '';
    
    // Время
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.style.cssText = 'font-size: 10px; color: #6A6F7D; margin-top: 4px;';
    if (message.timestamp) {
        const date = new Date(message.timestamp);
        timeDiv.textContent = date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    messageDiv.appendChild(nicknameDiv);
    messageDiv.appendChild(messageContentDiv);
    messageDiv.appendChild(timeDiv);
    
    messageDiv.style.animation = 'fadeIn 0.3s ease-in';
    
    return messageDiv;
}

// --- Загрузка истории из базы данных ---

async function loadMessageHistory() {
    try {
        console.log('📥 Загрузка истории сообщений из БД...');
        
        // Запрос к API для получения истории
        const response = await fetch(`${API_URL}/history`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const historyMessages = await response.json();
        console.log(`✅ Загружено ${historyMessages.length} сообщений из БД`);
        
        // Очищаем историю перед загрузкой
        clearMessageHistory();
        
        // Отображаем все сообщения из истории
        if (historyMessages.length > 0) {
            historyMessages.forEach(message => {
                displayMessage(message);
            });
        } else {
            // Если сообщений нет, показываем приветствие
            const welcomeMessage = {
                id: 'welcome',
                username: 'Система',
                text: `Добро пожаловать в QueChat, ${USERNAME}!`,
                timestamp: new Date().toISOString()
            };
            displayMessage(welcomeMessage);
        }
        
        // Прокручиваем вниз после загрузки
        scrollToBottom();
        
    } catch (error) {
        console.error('❌ Ошибка при загрузке истории:', error);
        
        // При ошибке показываем приветствие
        const welcomeMessage = {
            id: 'welcome',
            username: 'Система',
            text: `Добро пожаловать в QueChat, ${USERNAME}! (История недоступна)`,
            timestamp: new Date().toISOString()
        };
        displayMessage(welcomeMessage);
    }
}

// --- Отправка сообщений ---

async function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!text) {
        messageInput.focus();
        return;
    }
    
    if (!isConnected || !socket || socket.readyState !== WebSocket.OPEN) {
        showNotification('Нет подключения к серверу. Сообщение не отправлено.', 'error');
        return;
    }
    
    // Очищаем поле ввода
    messageInput.value = '';
    messageInput.focus();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: USERNAME,
                text: text,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Ошибка валидации:', errorData);
            
            let errorMessage = 'Ошибка при отправке';
            if (errorData.detail) {
                if (Array.isArray(errorData.detail)) {
                    errorMessage = errorData.detail.map(e => e.msg).join(', ');
                } else {
                    errorMessage = errorData.detail;
                }
            }
            showNotification(errorMessage, 'error');
            return;
        }
        
        console.log('✅ Сообщение отправлено и сохранено в БД');
        
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        showNotification('Ошибка при отправке сообщения. Попробуйте снова.', 'error');
    }
}

// --- Вспомогательные функции ---

function scrollToBottom() {
    setTimeout(() => {
        messageHistory.scrollTop = messageHistory.scrollHeight;
    }, 100);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 10px 20px;
        border-radius: 8px;
        color: white;
        background-color: ${type === 'error' ? '#f44336' : '#4CAF50'};
        z-index: 1000;
        animation: fadeInUp 0.3s ease-in;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 80%;
        text-align: center;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function addAnimationStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        
        .message_received {
            background-color: #2A2D36;
            color: white;
            align-self: flex-start;
            border-bottom-left-radius: 4px;
        }
        
        .message_send {
            background-color: #4A90E2;
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 4px;
        }
        
        .message_received, .message_send {
            padding: 10px 15px;
            margin-bottom: 10px;
            border-radius: 10px;
            max-width: 70%;
            word-wrap: break-word;
        }
        
        .nickname {
            display: flex;
            justify-content: start;
            color: #6A6F7D;
            flex-shrink: 0;
            padding: 5px;
            font-size: 12px;
        }
        
        .message_send .nickname {
            color: rgba(255,255,255,0.8);
        }
        
        .message {
            display: flex;
            justify-content: start;
            word-wrap: break-word;
        }
    `;
    document.head.appendChild(styleSheet);
}

// --- Обработчики событий ---

function setupEventListeners() {
    sendBtn.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    
    messageInput.addEventListener('focus', () => {
        messageInput.style.backgroundColor = '#323640';
    });
    
    messageInput.addEventListener('blur', () => {
        messageInput.style.backgroundColor = '#2A2D36';
    });
    
    window.addEventListener('online', () => {
        console.log('Интернет появился');
        if (!isConnected) {
            attemptReconnect();
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('Интернет пропал');
        updateConnectionStatus('Нет интернета');
    });
    
    channelAvatar.addEventListener('dblclick', () => {
        const newUsername = prompt('Введите новое имя пользователя:', USERNAME);
        if (newUsername && newUsername.trim()) {
            setUsername(newUsername.trim());
        }
    });
}

function checkWebSocketStatus() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        isConnected = true;
    } else {
        isConnected = false;
        if (socket) {
            socket.close();
        }
    }
}

// --- Инициализация ---

function initApp() {
    console.log('🚀 Инициализация QueChat...');
    
    updateUserInterface();
    addAnimationStyles();
    setupEventListeners();
    
    // Загружаем историю из БД
    loadMessageHistory();
    
    // Инициализируем WebSocket
    initWebSocket();
    
    setInterval(checkWebSocketStatus, 5000);
}

document.addEventListener('DOMContentLoaded', initApp);

// Экспорт для тестирования
window.QueChat = {
    sendMessage,
    initWebSocket,
    displayMessage,
    USERNAME,
    setUsername,
    getUsername,
    clearMessageHistory,
    loadMessageHistory
};