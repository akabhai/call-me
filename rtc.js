// Ensure global state exists if ui.js hasn't loaded it yet
if (!window.AppState) {
    window.AppState = { peers: {}, localStream: null, myPeerId: 'Me' };
}

window.RTC = {
    // Initialize Camera & Microphone
    initMedia: async () => {
        try {
            const statusText = document.getElementById('loadingStatus');
            if (statusText) statusText.textContent = "Requesting Camera Access...";
            
            // 1. Get the Stream
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            // 2. Save Stream to Global State
            window.AppState.localStream = stream;
            
            // 3. Show in Local Video Tile
            const localVid = document.getElementById('localVideo');
            if (localVid) {
                localVid.srcObject = stream;
                // Mute local video to prevent feedback loop
                localVid.muted = true;
            }
            
            if (statusText) statusText.textContent = "Media Active!";

            // 4. === THE FIX: FORCE HIDE LOADING SCREEN ===
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }

            return true;

        } catch (err) {
            console.error("Media Error:", err);
            alert("Camera Error: " + err.name + "\nPlease click the lock icon in your URL bar to allow permissions, then refresh.");
            if (statusText) statusText.textContent = "Permission Denied";
            return false;
        }
    },

    // Create WebRTC Peer Connection (Standard Boilerplate)
    createPeerConnection: (peerId) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // Add local tracks to the connection
        if (window.AppState.localStream) {
            window.AppState.localStream.getTracks().forEach(track => {
                pc.addTrack(track, window.AppState.localStream);
            });
        }

        // Handle incoming remote tracks
        pc.ontrack = (event) => {
            if (window.UI && window.UI.addVideoTile) {
                window.UI.addVideoTile(peerId, event.streams[0]);
            }
        };

        // Save PC to state
        if (!window.AppState.peers[peerId]) {
            window.AppState.peers[peerId] = {};
        }
        window.AppState.peers[peerId].pc = pc;

        return pc;
    },

    // Screen Share Logic
    toggleScreenShare: async (btnElement) => {
        try {
            // If we implement full toggling, we check a flag here.
            // For now, request display media:
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            
            // Show on local video
            const localVid = document.getElementById('localVideo');
            if (localVid) localVid.srcObject = stream;

            // Track ended listener (user clicks "Stop Sharing" in browser UI)
            stream.getVideoTracks()[0].onended = () => {
                // Revert to camera
                if (localVid) localVid.srcObject = window.AppState.localStream;
            };

        } catch (e) {
            console.log("Screen share cancelled");
        }
    }
};

// ===============================
// BUTTON EVENT LISTENERS
// ===============================

// Toggle Microphone
const micBtn = document.getElementById('toggleMicBtn');
if (micBtn) {
    micBtn.addEventListener('click', (e) => {
        if (!window.AppState.localStream) return;
        const track = window.AppState.localStream.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            e.target.innerText = track.enabled ? "🎤" : "🔇";
        }
    });
}

// Toggle Camera
const camBtn = document.getElementById('toggleCamBtn');
if (camBtn) {
    camBtn.addEventListener('click', (e) => {
        if (!window.AppState.localStream) return;
        const track = window.AppState.localStream.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            e.target.innerText = track.enabled ? "📹" : "📷";
        }
    });
}

// Share Screen
const shareBtn = document.getElementById('shareScreenBtn');
if (shareBtn) {
    shareBtn.addEventListener('click', (e) => {
        window.RTC.toggleScreenShare(e.target);
    });
}
