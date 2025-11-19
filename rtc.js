// Initialize Local Media
window.RTC = {
    initMedia: async () => {
        try {
            document.getElementById('loadingStatus').textContent = "Asking for Camera/Mic...";
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
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
            console.log("Received remote stream");
            window.UI.addVideoTile(peerId, event.streams[0]);
        };

        // Handle ICE Candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                // In a real app, send this via WebTorrent
                console.log("New ICE Candidate generated");
            }
        };

        // Store PC
        if (!window.AppState.peers[peerId]) {
            window.AppState.peers[peerId] = {};
        }
        window.AppState.peers[peerId].pc = pc;

        return pc;
    }
};

// Toggle Buttons
document.getElementById('toggleMicBtn').addEventListener('click', (e) => {
    const track = window.AppState.localStream.getAudioTracks()[0];
    if (track) {
        track.enabled = !track.enabled;
        e.target.textContent = track.enabled ? "🎤 Mute" : "🔇 Unmute";
    }
});

document.getElementById('toggleCamBtn').addEventListener('click', (e) => {
    const track = window.AppState.localStream.getVideoTracks()[0];
    if (track) {
        track.enabled = !track.enabled;
        e.target.textContent = track.enabled ? "📹 Off" : "📷 On";
    }
});
