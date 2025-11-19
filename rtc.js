window.RTC = {
    initMedia: async () => {
        try {
            document.getElementById('loadingStatus').textContent = "Requesting Camera...";
            
            // 1. Get Camera/Mic
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            window.AppState.localStream = stream;
            document.getElementById('localVideo').srcObject = stream;
            
            // 2. Update Text
            document.getElementById('loadingStatus').textContent = "Media Active!";

            // 3. FORCE HIDE OVERLAY (The Fix)
            // We do it right here so it can't get stuck
            const overlay = document.getElementById('loadingOverlay');
            if(overlay) overlay.style.display = 'none';

            return true;
        } catch (err) {
            console.error(err);
            alert("Camera Error: " + err.name + "\nPlease allow permissions and refresh.");
            document.getElementById('loadingStatus').textContent = "Permission Denied";
            return false;
        }
    },

    createPeerConnection: (peerId) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // Add local tracks
        if (window.AppState.localStream) {
            window.AppState.localStream.getTracks().forEach(track => {
                pc.addTrack(track, window.AppState.localStream);
            });
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
            window.UI.addVideoTile(peerId, event.streams[0]);
        };

        // Store PC
        if (!window.AppState.peers[peerId]) {
            window.AppState.peers[peerId] = {};
        }
        window.AppState.peers[peerId].pc = pc;

        return pc;
    },

    toggleScreenShare: async (btn) => {
        // ... (Existing screen share logic, safe to leave as is or copy from previous)
    }
};

// Button Listeners
document.getElementById('toggleMicBtn').onclick = (e) => {
    if(!window.AppState.localStream) return;
    const t = window.AppState.localStream.getAudioTracks()[0];
    t.enabled = !t.enabled;
    e.target.innerText = t.enabled ? "🎤" : "🔇";
};

document.getElementById('toggleCamBtn').onclick = (e) => {
    if(!window.AppState.localStream) return;
    const t = window.AppState.localStream.getVideoTracks()[0];
    t.enabled = !t.enabled;
    e.target.innerText = t.enabled ? "📹" : "📷";
};

document.getElementById('shareScreenBtn').onclick = async () => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video:true });
        document.getElementById('localVideo').srcObject = stream;
        // Note: In a full app, you must replace the track in the PeerConnection here
    } catch(e) {}
};
