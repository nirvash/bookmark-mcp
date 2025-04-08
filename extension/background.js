// --- Constants ---
const WS_URL = "ws://localhost:8765";
const RECONNECT_INTERVAL_BASE = 1000; // Initial reconnect delay 1s
const RECONNECT_MAX_ATTEMPTS = 10;
const RECONNECT_MAX_DELAY = 60000; // Max delay 60s
const HEARTBEAT_INTERVAL = 30000; // Send heartbeat every 30s
const HEARTBEAT_TIMEOUT = 10000; // Expect response within 10s

// --- State ---
let ws = null;
let isConnected = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
let heartbeatTimer = null;
let heartbeatTimeoutTimer = null;
let lastMessageTimestamp = null; // Track last message for potential inactivity checks

// --- WebSocket Connection Management ---

function initializeWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log("WebSocket already open or connecting.");
        return;
    }

    cleanupWebSocket(); // Ensure previous connection is cleaned up

    console.log(`Attempting to connect to WebSocket: ${WS_URL} (Attempt ${reconnectAttempts + 1})`);
    try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log("WebSocket connection established. Waiting 500ms before proceeding...");
            // Wait a short period to allow server-side setup after connection
            setTimeout(() => {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                     console.log("WebSocket closed before post-open timeout completed.");
                     return; // Connection closed during wait
                }
                console.log("Proceeding after 500ms wait.");
                isConnected = true;
                reconnectAttempts = 0; // Reset attempts on successful connection
                broadcastConnectionStatus();
                startHeartbeat();
                lastMessageTimestamp = Date.now();
            }, 500); // 500ms delay
        };

        ws.onmessage = async (event) => {
            lastMessageTimestamp = Date.now();
            try {
                const request = JSON.parse(event.data);
                console.log("Received message from server:", request);

                if (request.method === 'heartbeat') {
                    // Respond to heartbeat
                    sendWsMessage({
                        jsonrpc: "2.0",
                        id: request.id || `heartbeat_${Date.now()}`,
                        method: "heartbeat_response", // Use method for response type
                        result: { status: "alive" }
                    });
                    // Clear potential timeout from server's perspective if needed
                } else if (request.method && request.id) {
                    // Handle MCP tool request
                    const response = await handleMCPRequest(request);
                    sendWsMessage(response);
                } else {
                     console.warn("Received non-request message or message without ID/method:", request);
                }
            } catch (error) {
                console.error("Error processing message from server:", error, event.data);
                // Send error response if it was a request with an ID
                if (typeof event.data === 'string') {
                    try {
                        const request = JSON.parse(event.data);
                        if (request.id) {
                             sendWsMessage({
                                jsonrpc: "2.0",
                                id: request.id,
                                error: { code: -32603, message: `Internal error processing message: ${error.message}` }
                            });
                        }
                    } catch (parseError) {
                         console.error("Failed to parse incoming message for error reporting:", parseError);
                    }
                }
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            // onClose will be called subsequently, triggering reconnect logic
        };

        ws.onclose = (event) => {
            console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
            isConnected = false;
            cleanupWebSocket(false); // Keep reconnect timer logic
            broadcastConnectionStatus();
            scheduleReconnect();
        };

    } catch (error) {
        console.error("Failed to create WebSocket:", error);
        scheduleReconnect(); // Attempt to reconnect even if creation fails
    }
}

function sendWsMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        try {
            const messageString = JSON.stringify(message);
            console.log("Sending message to server:", message);
            ws.send(messageString);
        } catch (error) {
            console.error("Failed to send message:", error, message);
        }
    } else {
        console.warn("WebSocket not open. Cannot send message:", message);
    }
}

function scheduleReconnect() {
    if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
        console.error("Max reconnect attempts reached. Stopping reconnection.");
        return;
    }
    if (reconnectTimer) {
        clearTimeout(reconnectTimer); // Avoid multiple timers
    }

    reconnectAttempts++;
    const delay = Math.min(
        RECONNECT_INTERVAL_BASE * Math.pow(2, reconnectAttempts - 1),
        RECONNECT_MAX_DELAY
    );
    console.log(`Scheduling reconnect attempt ${reconnectAttempts} in ${delay}ms`);
    reconnectTimer = setTimeout(initializeWebSocket, delay);
}

function cleanupWebSocket(clearReconnect = true) {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    if (heartbeatTimeoutTimer) {
        clearTimeout(heartbeatTimeoutTimer);
        heartbeatTimeoutTimer = null;
    }
    if (clearReconnect && reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        reconnectAttempts = 0; // Reset if cleanup is not for reconnecting
    }
    if (ws) {
        // Remove listeners to prevent memory leaks and issues on reconnect
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            console.log("Closing existing WebSocket connection.");
            ws.close();
        }
        ws = null;
    }
}

function startHeartbeat() {
    stopHeartbeat(); // Ensure no duplicate timers

    heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log("Sending heartbeat to server.");
            sendWsMessage({ jsonrpc: "2.0", method: "heartbeat_response" }); // Send response type

            // Optional: Set a timeout for server heartbeat if needed
            // This assumes the server also sends heartbeats
            /*
            if (heartbeatTimeoutTimer) clearTimeout(heartbeatTimeoutTimer);
            heartbeatTimeoutTimer = setTimeout(() => {
                console.warn("Server heartbeat timeout. Closing connection.");
                ws?.close();
            }, HEARTBEAT_TIMEOUT);
            */
        } else {
            stopHeartbeat(); // Stop if connection lost
        }
    }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    // if (heartbeatTimeoutTimer) {
    //     clearTimeout(heartbeatTimeoutTimer);
    //     heartbeatTimeoutTimer = null;
    // }
}

// --- MCP Request Handling ---

async function handleMCPRequest(request) {
    const { method, params, id } = request;
    let result = null;
    let error = null;

    try {
        console.log(`Handling MCP request: ${method}`);
        switch (method) {
            case 'bookmark_add':
                result = await handleAddBookmark(params);
                break;
            case 'bookmark_get':
                result = await handleGetBookmark(params);
                break;
            case 'bookmark_get_tree':
                result = await handleGetTree(params);
                break;
            case 'bookmark_search':
                result = await handleSearchBookmarks(params);
                break;
            case 'bookmark_update':
                result = await handleUpdateBookmark(params);
                break;
            case 'bookmark_remove':
                result = await handleRemoveBookmark(params);
                break;
            case 'bookmark_remove_tree':
                result = await handleRemoveBookmarkTree(params);
                break;
            case 'bookmark_create_folder':
                result = await handleCreateFolder(params);
                break;
            case 'bookmark_move':
                result = await handleMoveBookmark(params);
                break;
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    } catch (e) {
        console.error(`Error handling method ${method}:`, e);
        error = { code: -32603, message: e.message || "Internal server error in extension" };
    }

    // Construct JSON-RPC response
    const response = {
        jsonrpc: "2.0",
        id: id,
    };
    if (error) {
        response.error = error;
    } else {
        response.result = result;
        // Wrap result in the expected content structure if needed by the server?
        // Or assume server handles the raw result. Let's send raw result for now.
        // response.content = [{ type: "text", text: JSON.stringify(result) }];
    }
    return response;
}

// --- Bookmark API Handlers ---

async function handleAddBookmark(params) {
    if (!params || !params.title || !params.url) {
        throw new Error("Missing required parameters: title and url");
    }
    const createDetails = {
        title: params.title,
        url: params.url,
    };
    if (params.parentId) {
        createDetails.parentId = params.parentId;
    }
    return await chrome.bookmarks.create(createDetails);
}

async function handleGetBookmark(params) {
    if (!params || !params.id) {
        throw new Error("Missing required parameter: id");
    }
    return await chrome.bookmarks.get(params.id);
}

async function handleGetTree(params) {
    return await chrome.bookmarks.getTree();
}

async function handleSearchBookmarks(params) {
    if (!params || typeof params.query !== 'string') {
        throw new Error("Missing or invalid required parameter: query (must be a string)");
    }
    return await chrome.bookmarks.search(params.query);
}

async function handleUpdateBookmark(params) {
    if (!params || !params.id) {
        throw new Error("Missing required parameter: id");
    }
    const changes = {};
    if (params.title !== undefined) changes.title = params.title;
    if (params.url !== undefined) changes.url = params.url;
    if (Object.keys(changes).length === 0) {
        throw new Error("No update parameters provided (title or url)");
    }
    return await chrome.bookmarks.update(params.id, changes);
}

async function handleRemoveBookmark(params) {
    if (!params || !params.id) {
        throw new Error("Missing required parameter: id");
    }
    await chrome.bookmarks.remove(params.id);
    return { success: true }; // Indicate success
}

async function handleRemoveBookmarkTree(params) {
    if (!params || !params.id) {
        throw new Error("Missing required parameter: id");
    }
    await chrome.bookmarks.removeTree(params.id);
    return { success: true }; // Indicate success
}

async function handleCreateFolder(params) {
    if (!params || !params.title) {
        throw new Error("Missing required parameter: title");
    }
     const createDetails = {
        title: params.title,
    };
    if (params.parentId) {
        createDetails.parentId = params.parentId;
    }
    return await chrome.bookmarks.create(createDetails);
}

async function handleMoveBookmark(params) {
    if (!params || !params.id || !params.parentId) {
        throw new Error("Missing required parameters: id and parentId");
    }
    const destination = { parentId: params.parentId };
    if (params.index !== undefined) {
        destination.index = params.index;
    }
    return await chrome.bookmarks.move(params.id, destination);
}


// --- Event Listeners & Internal Communication ---

// Broadcast connection status to popup etc.
function broadcastConnectionStatus() {
    chrome.runtime.sendMessage({
        type: "connectionStatus", // Changed from method to type for clarity
        payload: { isConnected, url: WS_URL }
    }).catch(error => {
        // Ignore errors if no popup is open to receive the message
        if (error.message !== "Could not establish connection. Receiving end does not exist.") {
             console.warn("Error broadcasting connection status:", error);
        }
    });
     // Update popup icon based on status (optional)
    const iconPath = isConnected ? "icons/icon_on_128.png" : "icons/icon128.png"; // Assuming you have an 'on' icon
    chrome.action.setIcon({ path: iconPath }).catch(e => console.warn("Failed to set icon:", e));
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getConnectionStatus") { // Changed from method to type
        sendResponse({ isConnected, url: WS_URL });
    } else if (message.type === "reconnect") {
        console.log("Reconnect requested from popup.");
        cleanupWebSocket();
        initializeWebSocket();
        sendResponse({ status: "reconnecting" });
    }
    // Return true if sendResponse will be called asynchronously (it won't here)
    return false;
});

// Optional: Bookmark Event Listeners
/*
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
    console.log("Bookmark created:", id, bookmark);
    broadcastBookmarkEvent('created', { id, bookmark });
});
chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
    console.log("Bookmark changed:", id, changeInfo);
    broadcastBookmarkEvent('changed', { id, changeInfo });
});
chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
    console.log("Bookmark removed:", id, removeInfo);
    broadcastBookmarkEvent('removed', { id, removeInfo });
});
chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
    console.log("Bookmark moved:", id, moveInfo);
    broadcastBookmarkEvent('moved', { id, moveInfo });
});

function broadcastBookmarkEvent(eventType, data) {
    if (isConnected) {
        sendWsMessage({
            jsonrpc: "2.0",
            method: "bookmark_event",
            params: { type: eventType, data: data }
        });
    }
}
*/

// --- Initialization ---
console.log("Bookmark MCP background script initializing...");
initializeWebSocket(); // Initial connection attempt

// Keep service worker alive mechanism (basic version)
// More robust solutions might involve alarms or monitoring connections
let keepAliveInterval = null;
function startKeepAlive() {
    stopKeepAlive();
    keepAliveInterval = setInterval(() => {
        // Perform a minimal async operation to keep the worker alive
        // if (ws && ws.readyState === WebSocket.OPEN) {
        //     chrome.runtime.getPlatformInfo().then(info => {}); // Example operation
        // } else {
        //     stopKeepAlive(); // Stop if not connected
        // }
        // Or simply log:
        // console.log("Keep alive check");
    }, 20000); // Every 20 seconds
}
function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
}
// Start keep alive when connected, stop when disconnected?
// This needs careful consideration based on WebSocket state.
// For now, let's rely on the WebSocket connection itself.

// Optional: Add listener for startup to ensure connection attempt
chrome.runtime.onStartup.addListener(() => {
    console.log("Extension started up.");
    initializeWebSocket();
});