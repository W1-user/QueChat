const WS_URL = "ws://localhost:8000/ws";
const API_URL = "http://localhost:8000/messages";

const messageHistory = document.getElementById("messageHistory");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let isConnected = false;
let reconnect_attempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

let messageIds = new Set();

function initWebSocket() {
    try {
        socket = new WebSocket(WS_URL),

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

function handlerWebSocketMessage(event) {
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

function handlerWebSocketOnClose(event) {
    isConnected = false;
    attemptReconnect();
}

function handlerWebSocketOnError(error) {
    console.log(`ERROR - ${error}`)
}


function initApp() {
    //
}