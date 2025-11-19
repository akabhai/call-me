window.UI = {
    showToast: (msg) => {
        const d = document.createElement('div');
        d.innerText = msg;
        d.style.cssText = "position:fixed; top:20px; right:20px; background:#333; color:#fff; padding:12px; border-radius:5px; z-index:9000; box-shadow:0 5px 15px rgba(0,0,0,0.3);";
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 3000);
    },

    addVideoTile: (id, stream) => {
        // If "Host" comes in, we might want to ID it by peerId later to match name
        // For now, we rely on the single connection nature of this demo
        const existing = document.getElementById(`tile-${id}`) || document.getElementById('tile-Host') || document.getElementById('tile-Guest');
        if(existing) {
            existing.querySelector('video').srcObject = stream;
            return;
        }

        const d = document.createElement('div');
        d.className = 'video-tile';
        // If it's the generic "Host" or "Guest" label, we assign that ID
        // If it's a specific peer ID, we use that
        d.id = `tile-${id}`; 
        d.innerHTML = `<video autoplay playsinline></video><div class="user-info" id="name-${id}">${id}</div>`;
        document.getElementById('videoGrid').appendChild(d);
        
        const vid = d.querySelector('video');
        vid.srcObject = stream;
    },

    // NEW: Update Name Label
    updatePeerName: (name, peerId) => {
        // In 1-on-1, we might just have "tile-Host" or "tile-Guest"
        // Try to find any remote tile that isn't local
        const allTiles = document.querySelectorAll('.video-tile');
        allTiles.forEach(tile => {
            if(!tile.classList.contains('local-stream')) {
                const info = tile.querySelector('.user-info');
                info.innerText = name;
            }
        });
    },

    addChatMessage: (sender, text, isLocal) => {
        const msgBox = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.style.cssText = `
            margin-bottom: 10px; padding: 8px 12px; border-radius: 15px; max-width: 80%; word-wrap: break-word; font-size: 14px; font-family: sans-serif;
            ${isLocal ? 'background: #0e71eb; color: white; align-self: flex-end; margin-left: auto;' : 'background: #f1f3f4; color: #333; align-self: flex-start;'}
        `;
        div.innerHTML = `<strong>${sender}:</strong> ${text}`;
        msgBox.style.display = 'flex';
        msgBox.style.flexDirection = 'column';
        msgBox.appendChild(div);
        msgBox.scrollTop = msgBox.scrollHeight;
    }
};

document.getElementById('chatBtn').onclick = () => document.getElementById('chatSidebar').classList.toggle('open');
document.getElementById('closeChatBtn').onclick = () => document.getElementById('chatSidebar').classList.remove('open');
document.getElementById('leaveBtn').onclick = () => window.location.href = 'index.html';
document.getElementById('sendChatBtn').onclick = () => {
    const i = document.getElementById('chatInput');
    if(i.value) {
        window.RTC.sendMessage(i.value);
        window.UI.addChatMessage("You", i.value, true);
        i.value = "";
    }
};
document.getElementById('chatInput').onkeypress = (e) => { if(e.key==='Enter') document.getElementById('sendChatBtn').click(); };
