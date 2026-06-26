const WS_URL = "ws://localhost:8000/ws";
const API_URL = "http://localhost:8000";

const messageHistory = document.getElementById("messageHistory");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const channelTitle = document.querySelector(".channel_title")
const usernameInput = document.getElementById("usernameInput")
const sendUsername = document.getElementById("sendUsername")

let socket = null;
let isConnected = false;
let reconnect_attempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

let messageIds = new Set();

let USERNAME = "";

function getUsername() {
    let savedUsername = localStorage.getItem("quechat_username");

    if (savedUsername) {
        return savedUsername;
    }

    return `User_${Math.floor(Math.random() * 10000)}`;
}

async function setUsername(newUsername) {

    if (newUsername && newUsername.trim()) {
        USERNAME = newUsername.trim();
        localStorage.setItem("quechat_username", USERNAME);
        try {
            const response = await fetch(`${API_URL}/profile/create/${newUsername}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`)
            }
            updateUserInterface();  
            showNotification(`Имя пользователя изменено на: ${USERNAME}`, "info");
            showUsernameDisplay();

        } catch (error) {
            console.error(`Error creating profile - ${error}`);
            showNotification(`Ошибка при создании профиля`, "error");
        }
    }
}

function showUsernameDisplay() {
    usernameInput.style.display = "none";
    sendUsername.style.display = "none";

    const oldDisplay = document.getElementById("usernameDisplay");
    if (oldDisplay) {
        oldDisplay.remove();
    }

    const usernameContainer = usernameInput.parentElement;
    const usernameDisplay = document.createElement("div");

    usernameDisplay.id = "usernameDisplay";
    usernameDisplay.textContent = USERNAME;
    usernameDisplay.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
        flex-shrink: 0;
    `;

    const nameSpan = document.createElement("div");
    nameSpan.textContent = USERNAME;
    nameSpan.style.cssText = `
        color: white;
        font-size: 16px;
        padding: 8px 15px;
        background-color: #2A2D36;
        border-radius: 8px;
        font-weight: bold;
        color: #4A90E2;
        border: 1px solid #4A90E2;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    const changeBtn = document.createElement("button");
    changeBtn.textContent = "✏️";
    changeBtn.style.cssText = `
        padding: 8px 15px;
        border: none;
        border-radius: 8px;
        background-color: #4A90E2;
        color: white;
        cursor: pointer;
        content: none;
        font-size: 14px;
        transition: background-color 0.2s;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    changeBtn.onmouseover = () => changeBtn.style.background = "#357ABD";
    changeBtn.onmouseout = () => changeBtn.style.background = "#4A90E2";

    changeBtn.onclick = function() {
        usernameInput.style.display = "block";
        sendUsername.style.display = "block";

        usernameInput.value = USERNAME;
        usernameInput.focus();
        usernameDisplay.remove();
    };

    usernameDisplay.appendChild(nameSpan);
    usernameDisplay.appendChild(changeBtn);
    usernameContainer.appendChild(usernameDisplay);

}

function updateUserInterface() {
    if (channelTitle) {
        channelTitle.textContent = "QueChat"
    }
}

function initWebSocket() {
    try {
        socket = new WebSocket(WS_URL);

        socket.onopen = handleWebSocketOpen;
        socket.onmessage = handleWebSocketMessage;
        socket.onclose = handleWebSocketClose;
        socket.onerror = handleWebSocketError;

        updateConnectionStatus("Connection...")
    } catch (error) {
        console.log(`Error connection - ${error}`)
        attemptReconnect()
    }
}

function handleWebSocketOpen(event) {
    console.log("Connection - Great!");
    isConnected = true;
    reconnect_attempts = 0;    
}

function handleWebSocketMessage(event) {
    try {
        const data = JSON.parse(event.data)
        console.log("New message!")

        if (data.type === "new_message") {
            if (data.message.id && !messageIds.has(data.message.id)) {
                displayMessage(data.message);
            }
        }
    } catch (error) {
        console.log(`ERROR - ${error}`)
    }
}

function handleWebSocketClose(event) {
    isConnected = false;
    attemptReconnect();
}

function handleWebSocketError(error) {
    console.log(`ERROR - ${error}`)
}

function attemptReconnect() {
    if (reconnect_attempts < MAX_RECONNECT_ATTEMPTS) {
        reconnect_attempts++;
        console.log(`Attempt includes: ${reconnect_attempts}/${MAX_RECONNECT_ATTEMPTS}`)
        updateConnectionStatus(`Reinclude: ${reconnect_attempts}/${MAX_RECONNECT_ATTEMPTS}`)
        
        setTimeout(() => {
            if (!isConnected) {
                initWebSocket();
            }
        }, RECONNECT_DELAY);
   } else {
        console.error("Max count includes (limit)");
        updateConnectionStatus("Error include");
   }
}

function updateConnectionStatus(status) {
    console.log(`Status includes: ${status}`)
}

USERNAME = getUsername();

function clearMessageHistory() {
    messageHistory.innerHTML = "";
    messageIds.clear();
}

function displayMessage(message) {
    if (message.id && messageIds.has(message.id)) {
        console.log(`Duplicate detected. Skip - ${message.id}`)
        return;
    }

    if (message.id) {
        messageIds.add(message.id);
    }

    const messageElement = createMessageElement(message);
    messageHistory.appendChild(messageElement);
    scrollToBottom();
}

function createMessageElement(message) {
    const messageDiv = document.createElement("div");

    const isOwnMessage = message.username === USERNAME;
    messageDiv.className = isOwnMessage ? "message_send" : "message_received"

    const nicknameDiv = document.createElement("div");
    nicknameDiv.className = "nickname";
    nicknameDiv.textContent = message.username || "Anonim";

    const messageContentDiv = document.createElement("div");
    messageContentDiv.className = "message";
    messageContentDiv.textContent = message.text || "";

    const timeDiv = document.createElement("div");
    timeDiv.className = "message-time";
    timeDiv.style.cssText = "font-size: 10px; color: #000000; margin-top: 4px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;";
    if (message.timestamp) {
        const date = new Date(message.timestamp)
        timeDiv.textContent = date.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    messageDiv.appendChild(nicknameDiv);
    messageDiv.appendChild(messageContentDiv);
    messageDiv.appendChild(timeDiv);

    messageDiv.style.animation = "fadeIn 0.3s ease-in";

    return messageDiv;
}

async function loadMessageHistory() {
    try {
        console.log("Load message history in database...");

        const response = await fetch(`${API_URL}/messages/history`);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const historyMessage = await response.json()
        console.log(`Load is success: ${historyMessage.length}`)

        clearMessageHistory();

        if (historyMessage.length > 0) {
            historyMessage.forEach(message => {
                displayMessage(message);
            });
        } else {

            const welcomeMessage = {
                id: "Welcome",
                username: "System",
                text: `Добро пожаловать в QueChat, ${USERNAME}!`,
                timestamp: new Date().toISOString()
            };
            displayMessage(welcomeMessage);
        }

        scrollToBottom();

   } catch (error) {
        console.error(`Error load history: ${error}`)

        const welcomeMessage = {
            id: "Welcome",
            username: "System",
            text: `Добро пожаловать в QueChat, ${USERNAME}!`,
            timestamp: new Date().toISOString()
        };
        displayMessage(welcomeMessage);
   }
}

async function sendMessage() {
    const text = messageInput.value.trim();

    if (!text) {
        messageInput.focus();
        return
    }

    if (!isConnected || !socket || socket.readyState !== WebSocket.OPEN) {
        showNotification("Not includs on server...");
        return;
    }

    messageInput.value = "";
    messageInput.focus();

    try {
        const response = await fetch(`${API_URL}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: USERNAME,
                text: text,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`Error validatioin: ${errorData}`);

            let errorMessage = "Error send";
            if (errorData.detail) {
                if (Array.isArray(errorData.detail)) {
                    errorMessage = errorData.detail.map(e => e.msg).join(", ");
                } else {
                    errorMessage = errorData.detail;
                }
            }
            showNotification(errorMessage, "error");
            return;
        }
    } catch (error) {
        console.error(`Error send message: ${error}`);
        showNotification("Error send message. Try again.", "error");
    }
}

function scrollToBottom() {
    setTimeout(() => {
        messageHistory.scrollTop = messageHistory.scrollHeight;
    }, 100);
}

function showNotification(message, type = "info") {
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
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
        
        * {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
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
            margin: 5px 25px 0px 0px;
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
            color: #9a9ea9;
            flex-shrink: 0;
            padding: 0px 0px 10px 0px;
            font-size: 12px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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

function setupEventListeners () {
    sendBtn.addEventListener("click", sendMessage);
    sendUsername.addEventListener("click", function () {
        let newUsername = usernameInput.value.trim()
        if (newUsername) {
            setUsername(newUsername);
        } else {
            showNotification("Введите имя пользователя!", "error");
        }
    })

    messageInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    usernameInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            let newUsername = usernameInput.value.trim()
            event.preventDefault();
            if (newUsername) {
                setUsername(newUsername);
            } else {
                showNotification("Введите имя пользователя!", "error");
            }
        }
    });
    
    messageInput.addEventListener("focus", () => {
        messageInput.style.backgroundColor = "#323640";
    });

    messageInput.addEventListener("blur", () => {
        messageInput.style.backgroundColor = "#2A2D36";
    });

    usernameInput.addEventListener("focus", () => {
        usernameInput.style.backgroundColor = "#323640";
    });

    usernameInput.addEventListener("blur", () => {
        usernameInput.style.backgroundColor = "#2A2D36";
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

function initApp() {

    updateUserInterface();
    addAnimationStyles();
    setupEventListeners();

    loadMessageHistory();

    initWebSocket();

    setInterval(checkWebSocketStatus, 5000);
}

document.addEventListener("DOMContentLoaded", initApp);

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