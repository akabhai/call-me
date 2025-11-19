// Global State Object
window.AppState = {
    peers: {}, // { peerId: { pc, dataChannel } }
    localStream: null,
    myPeerId: 'user-' + Math.random().toString(36).substr(2, 5)
};

// UI Helper Functions
window.UI = {
    showToast: (msg) => {
        const div = document.createElement('div');
        div.style.cssText = "position:fixed; top:20px; right:20px; background:#333; color:#fff; padding:10px; border-radius:5px; z-index:1000;";
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

    removeVideoTile: (peerId) => {
        const tile = document.getElementById(`tile-${peerId}`);
        if (tile) tile.remove();
    }
};

// Chat UI Listeners
document.getElementById('chatBtn').addEventListener('click', () => {
    document.getElementById('chatSidebar').classList.toggle('open');
});
document.getElementById('closeChatBtn').addEventListener('click', () => {
    document.getElementById('chatSidebar').classList.remove('open');
});
document.getElementById('leaveBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
});
