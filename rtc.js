// WebRTC & Media Logic
window.RTC = {
    initMedia: async () => {
        try {
            document.getElementById('loadingStatus').textContent = "Asking for Camera/Mic...";
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            
            window.AppState.localStream = stream;
            document.getElementById('localVideo').srcObject = stream;
            document.getElementById('loadingStatus').textContent = "Media Active!";
            return true;
        } catch (err) {
            console.error(err);
            alert("CAMERA ERROR: " + err.name + ". Please allow permissions and reload.");
            return false;
        }
    },

    createPeerConnection: (peerId, isInitiator) => {
        console.log(`Creating PC for ${peerId}`);
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // Add tracks
        window.AppState.localStream.getTracks().forEach(track => {
            pc.addTrack(track, window.AppState.localStream);
        });

        // Handle Remote Stream
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

    // === FIXED SCREEN SHARE LOGIC ===
    toggleScreenShare: async (btnElement) => {
        // If already sharing, stop it
        if (window.AppState.isScreenSharing) {
            // 1. Stop screen track
            window.AppState.screenStream.getTracks().forEach(track => track.stop());
            // 2. Switch back to Camera
            const camTrack = window.AppState.localStream.getVideoTracks()[0];
            window.RTC.replaceVideoTrack(camTrack);
            
            document.getElementById('localVideo').srcObject = window.AppState.localStream;
            
            window.AppState.isScreenSharing = false;
            btnElement.innerHTML = "🖥 Share";
            return;
        }

        try {
            // 1. Get Screen Stream
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            window.AppState.screenStream = screenStream;
            const screenTrack = screenStream.getVideoTracks()[0];

            // 2. Handle "Stop Sharing" browser floating bar
            screenTrack.onended = () => {
                if(window.AppState.isScreenSharing) window.RTC.toggleScreenShare(btnElement);
            };

            // 3. Replace Track in PeerConnections
            window.RTC.replaceVideoTrack(screenTrack);

            // 4. Update Local Video
            document.getElementById('localVideo').srcObject = screenStream;

            window.AppState.isScreenSharing = true;
            btnElement.innerHTML = "❌ Stop";

        } catch (err) {
            console.error("Screen share cancelled", err);
        }
    },

    // Helper to swap tracks for all peers
    replaceVideoTrack: (newTrack) => {
        Object.values(window.AppState.peers).forEach(peer => {
            if (peer.pc) {
                const sender = peer.pc.getSenders().find(s => s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(newTrack);
                }
            }
        });
    }
};

// Event Listeners
document.getElementById('toggleMicBtn').addEventListener('click', (e) => {
    const track = window.AppState.localStream.getAudioTracks()[0];
    if (track) {
        track.enabled = !track.enabled;
        e.target.innerHTML = track.enabled ? "🎤 Mute" : "🔇 Unmute";
    }
});

document.getElementById('toggleCamBtn').addEventListener('click', (e) => {
    const track = window.AppState.localStream.getVideoTracks()[0];
    if (track) {
        track.enabled = !track.enabled;
        e.target.innerHTML = track.enabled ? "📹 Off" : "📷 On";
    }
});

// Fix Screen Share Click
document.getElementById('shareScreenBtn').addEventListener('click', (e) => {
    window.RTC.toggleScreenShare(e.target);
});
