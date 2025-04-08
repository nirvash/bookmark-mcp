document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    const serverUrlElement = document.getElementById('server-url');
    const reconnectButton = document.getElementById('reconnect-button');

    // Function to update the UI based on connection status
    function updateStatus(isConnected, url) {
        if (isConnected) {
            statusElement.textContent = 'Connected';
            statusElement.className = 'connected';
            reconnectButton.textContent = 'Reconnect'; // Or maybe 'Disconnect'? For now, always Reconnect.
        } else {
            statusElement.textContent = 'Disconnected';
            statusElement.className = 'disconnected';
            reconnectButton.textContent = 'Connect';
        }
        serverUrlElement.textContent = url || 'N/A';
    }

    // Request initial status when popup opens
    chrome.runtime.sendMessage({ type: "getConnectionStatus" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error getting initial status:", chrome.runtime.lastError.message);
            updateStatus(false, 'Error');
        } else if (response) {
            console.log("Initial status received:", response);
            updateStatus(response.isConnected, response.url);
        } else {
             console.warn("No response received for initial status request.");
             updateStatus(false, 'Unknown');
        }
    });

    // Listen for status updates from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "connectionStatus") {
            console.log("Connection status update received:", message.payload);
            updateStatus(message.payload.isConnected, message.payload.url);
        }
        // No need to return true as we are not responding asynchronously here
    });

    // Handle reconnect button click
    reconnectButton.addEventListener('click', () => {
        console.log("Reconnect button clicked");
        statusElement.textContent = 'Connecting...';
        statusElement.className = ''; // Reset class
        chrome.runtime.sendMessage({ type: "reconnect" }, (response) => {
             if (chrome.runtime.lastError) {
                console.error("Error sending reconnect message:", chrome.runtime.lastError.message);
                // Status might be updated by background script's broadcast anyway
            } else {
                console.log("Reconnect message sent, response:", response);
            }
        });
    });
});