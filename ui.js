window.UI = {
    showToast: (msg) => {
        const d = document.createElement('div');
        d.innerText = msg;
        d.style.cssText = "position:fixed; top:20px; right:20px; background:#333; color:#fff; padding:12px; border-radius:5px; z-index:9000; box-shadow:0 5px 15px rgba(0,0,0,0.3); animation: fadeIn 0.3s;";
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 3000);
    },

    // ADVANCED TILE ADDITION
    addVideoTile: (id, stream) => {
        const grid = document.getElementById('videoGrid');
        const existing = document.getElementById(`tile-${id}`) || (id === "Host" ? document.getElementById('tile-Host') : null);
        
        if(existing) {
            existing.querySelector('video').srcObject = stream;
            return;
        }

        const d = document.createElement('div');
        d.className = 'video-tile';
        d.id = `tile-${id}`;
        
        // HTML includes a "Fit" button to toggle object-fit
        d.innerHTML = `
            <div class="video-controls">
                <button class="btn-mini" onclick="window.UI.toggleFit('${id}')">⤢ Fit</button>
            </div>
            <video autoplay playsinline></video>
            <div class="user-info" id="name-${id}">${id}</div>
        `;
        
        grid.appendChild(d);
        
        const vid = d.querySelector('video');
        vid.srcObject = stream;
        // Mirror local video only
        if(id === 'You') vid.style.transform = "scaleX(-1)";
        else vid.style.transform = "none"; // Don't mirror others

        // Recalculate Grid Layout
        window.UI.adjustGridLayout();
    },

    // Fix for "Half Cut Video"
    toggleFit: (id) => {
        const tile = document.getElementById(`tile-${id}`);
        const vid = tile.querySelector('video');
        if (vid.style.objectFit === 'contain') {
            vid.style.objectFit = 'cover'; // Fill (Zoomed)
        } else {
            vid.style.objectFit = 'contain'; // Fit (Black bars, but full video)
        }
    },

    // SMART GRID ALGORITHM
    adjustGridLayout: () => {
        const grid = document.getElementById('videoGrid');
        const tiles = document.querySelectorAll('.video-tile');
        const count = tiles.length;

        // Remove old classes
        grid.className = 'video-grid-container';

        // Apply classes based on count to CSS can resize
        if (count > 1 && count <= 4) {
            // 2x2 Grid
            tiles.forEach(t => { t.style.width = "45%"; t.style.height = "45%"; });
        } else if (count > 4 && count <= 9) {
            // 3x3 Grid
            tiles.forEach(t => { t.style.width = "30%"; t.style.height = "30%"; });
        } else if (count > 9) {
            // Many small tiles
            grid.classList.add('large-group');
            tiles.forEach(t => { t.style.width = "200px"; t.style.height = "150px"; });
        } else {
            // 1 User (Full Screen)
            tiles.forEach(t => { t.style.width = "80%"; t.style.height = "80%"; });
        }
    },

    updatePeerName: (name, peerId) => {
        const allTiles = document.querySelectorAll('.video-tile');
        allTiles.forEach(tile => {
            // Logic to find the right tile (simplified for demo)
            if(!tile.classList.contains('local-stream')) {
                tile.querySelector('.user-info').innerText = name;
            }
        });
    },

    addChatMessage: (sender, text, isLocal) => {
        const msgBox = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.style.cssText = `margin-bottom: 10px; padding: 8px 12px; border-radius: 15px; max-width: 80%; word-wrap: break-word; font-size: 14px; font-family: sans-serif; ${isLocal ? 'background: #0e71eb; color: white; align-self: flex-end;' : 'background: #f1f3f4; color: #333; align-self: flex-start;'}`;
        div.innerHTML = `<strong>${sender}:</strong> ${text}`;
        msgBox.appendChild(div);
        msgBox.scrollTop = msgBox.scrollHeight;
    }
};

// Listeners
document.getElementById('chatBtn').onclick = () => document.getElementById('chatSidebar').classList.toggle('open');
document.getElementById('closeChatBtn').onclick = () => document.getElementById('chatSidebar').classList.remove('open');
document.getElementById('leaveBtn').onclick = () => { if(confirm("Leave?")) window.location.href = 'index.html'; };
document.getElementById('sendChatBtn').onclick = () => {
    const i = document.getElementById('chatInput');
    if(i.value) {
        window.RTC.sendMessage(i.value);
        window.UI.addChatMessage("You", i.value, true);
        i.value = "";
    }
};
