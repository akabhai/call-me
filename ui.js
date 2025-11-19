// Global State Object
window.AppState = {
    peers: {}, 
    localStream: null,
    screenStream: null,
    isScreenSharing: false,
    myPeerId: 'Me'
};

// UI Helper Functions
window.UI = {
    showToast: (msg) => {
        const div = document.createElement('div');
        div.style.cssText = "position:fixed; top:20px; right:20px; background:#333; color:#fff; padding:10px; border-radius:5px; z-index:1000; box-shadow: 0 2px 10px rgba(0,0,0,0.3);";
        div.textContent = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    },

    addVideoTile: (peerId, stream) => {
        const grid = document.getElementById('videoGrid');
        let tile = document.getElementById(`tile-${peerId}`);
        if (!tile) {
            tile = document.createElement('div');
            tile.className = 'video-tile';
            tile.id = `tile-${peerId}`;
            tile.innerHTML = `<video autoplay playsinline></video><div class="user-info">${peerId}</div>`;
            grid.appendChild(tile);
        }
        tile.querySelector('video').srcObject = stream;
    },

    // === FIXED CHAT UI LOGIC ===
    addChatMessage: (sender, text, isLocal) => {
        const msgBox = document.getElementById('chatMessages');
        const div = document.createElement('div');
        
        // styling for chat bubbles
        div.style.cssText = `
            margin-bottom: 10px; 
            padding: 8px 12px; 
            border-radius: 15px; 
            max-width: 80%; 
            word-wrap: break-word;
            font-size: 14px;
            ${isLocal 
                ? 'background: #0e71eb; color: white; align-self: flex-end; margin-left: auto;' 
                : 'background: #f1f3f4; color: #333; align-self: flex-start;'}
        `;
        
        div.innerHTML = `<strong>${sender}:</strong> ${text}`;
        
        // Make the container flex to support left/right bubbles
        msgBox.style.display = 'flex';
        msgBox.style.flexDirection = 'column';
        
        msgBox.appendChild(div);
        msgBox.scrollTop = msgBox.scrollHeight; // Auto scroll to bottom
    }
};

// Chat Listeners
document.getElementById('chatBtn').addEventListener('click', () => {
    document.getElementById('chatSidebar').classList.toggle('open');
});

document.getElementById('closeChatBtn').addEventListener('click', () => {
    document.getElementById('chatSidebar').classList.remove('open');
});

document.getElementById('leaveBtn').addEventListener('click', () => {
    if(confirm("Are you sure you want to leave?")) {
        window.location.href = 'index.html';
    }
});

// === SEND BUTTON LOGIC ===
document.getElementById('sendChatBtn').addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (text) {
        // 1. Add to local UI
        window.UI.addChatMessage("You", text, true);
        
        // 2. Send to peers (simulated for DataChannel)
        // In a real app, you iterate AppState.peers and send via dataChannel
        // Object.values(window.AppState.peers).forEach(p => p.dataChannel.send(text));
        
        input.value = "";
    }
});

// Allow "Enter" key to send
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') document.getElementById('sendChatBtn').click();
});
