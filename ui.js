// Global UI Helper
window.UI = {
    showToast: (msg) => {
        const d = document.createElement('div');
        d.innerText = msg;
        d.style.cssText = "position:fixed; top:20px; right:20px; background:#333; color:#fff; padding:12px 20px; border-radius:8px; z-index:9000; font-family:sans-serif; box-shadow:0 5px 15px rgba(0,0,0,0.3); animation: fadeIn 0.3s;";
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 3000);
    },

    // Add Video Tile Logic
    addVideoTile: (id, stream) => {
        // Prevent duplicate videos
        const existing = document.getElementById(`tile-${id}`);
        if(existing) return;

        const d = document.createElement('div');
        d.className = 'video-tile';
        d.id = `tile-${id}`;
        d.innerHTML = `<video autoplay playsinline></video><div class="user-info">${id}</div>`;
        document.getElementById('videoGrid').appendChild(d);
        
        const vid = d.querySelector('video');
        vid.srcObject = stream;
        // Don't mute remote stream!
        vid.muted = false; 
    },

    // Add Chat Message
    addChatMessage: (sender, text, isLocal) => {
        const msgBox = document.getElementById('chatMessages');
        const div = document.createElement('div');
        
        div.style.cssText = `
            margin-bottom: 10px; 
            padding: 8px 12px; 
            border-radius: 15px; 
            max-width: 80%; 
            word-wrap: break-word;
            font-size: 14px;
            font-family: sans-serif;
            ${isLocal 
                ? 'background: #0e71eb; color: white; align-self: flex-end; margin-left: auto; border-bottom-right-radius: 2px;' 
                : 'background: #f1f3f4; color: #333; align-self: flex-start; border-bottom-left-radius: 2px;'}
        `;
        
        div.innerHTML = `<strong>${isLocal ? 'You' : 'Peer'}:</strong> ${text}`;
        
        msgBox.style.display = 'flex';
        msgBox.style.flexDirection = 'column';
        msgBox.appendChild(div);
        msgBox.scrollTop = msgBox.scrollHeight;

        // If sidebar is closed, show a dot notification (Optional)
        if(!document.getElementById('chatSidebar').classList.contains('open')) {
            window.UI.showToast("New Chat Message");
        }
    }
};

// UI Listeners
document.getElementById('chatBtn').onclick = () => document.getElementById('chatSidebar').classList.toggle('open');
document.getElementById('closeChatBtn').onclick = () => document.getElementById('chatSidebar').classList.remove('open');
document.getElementById('leaveBtn').onclick = () => {
    if(confirm("Leave Meeting?")) window.location.href = 'index.html';
};

// Send Message Logic
const sendMsg = () => {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (text) {
        // 1. Send over network
        const sent = window.RTC.sendMessage(text);
        
        // 2. If network sent or offline, show locally
        if(sent || true) {
            window.UI.addChatMessage("You", text, true);
            input.value = "";
        }
    }
};

document.getElementById('sendChatBtn').onclick = sendMsg;
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') sendMsg();
});
