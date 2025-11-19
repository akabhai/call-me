// Global State
if (!window.AppState) {
    window.AppState = { 
        localStream: null, 
        myPeerId: null, 
        peerObj: null,
        connections: {} // To track multiple users if needed
    };
}

window.RTC = {
    // 1. Initialize Camera
    initMedia: async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            window.AppState.localStream = stream;
            document.getElementById('localVideo').srcObject = stream;
            document.getElementById('localVideo').muted = true; // Mute self
            return true;
        } catch (err) {
            alert("Camera Access Denied. Please allow permissions.");
            return false;
        }
    },

    // 2. Connect to Room (Real Networking)
    connectToRoom: (roomId) => {
        console.log("Attempting to join room:", roomId);
        
        // Initialize PeerJS
        const peer = new Peer(roomId, {
            debug: 2
        });

        window.AppState.peerObj = peer;

        // CASE A: I am the HOST (First one here)
        peer.on('open', (id) => {
            window.AppState.myPeerId = id;
            window.UI.showToast("You created the room. Waiting for friend...");
            console.log("Room Created with ID:", id);
        });

        // CASE B: I am the GUEST (Room already exists)
        peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                // The ID is taken, which means the Host is already there.
                // Let's create a new random ID for ourselves and connect to the Host.
                console.log("Room exists. Joining as guest...");
                window.RTC.joinAsGuest(roomId);
            } else {
                console.error("PeerJS Error:", err);
            }
        });

        // CASE C: Someone calls ME (I answer)
        peer.on('call', (call) => {
            console.log("Incoming call...");
            // Answer with my stream
            call.answer(window.AppState.localStream);
            // Handle their stream
            call.on('stream', (remoteStream) => {
                window.UI.addVideoTile(call.peer, remoteStream);
            });
        });
    },

    // Logic for the Guest to call the Host
    joinAsGuest: (hostRoomId) => {
        const guestPeer = new Peer(); // Get random ID

        guestPeer.on('open', (id) => {
            window.AppState.myPeerId = id;
            window.UI.showToast("Connected! Joining room...");
            
            // Call the Host
            const call = guestPeer.call(hostRoomId, window.AppState.localStream);
            
            call.on('stream', (remoteStream) => {
                window.UI.addVideoTile("Host", remoteStream);
            });
        });

        guestPeer.on('call', (call) => {
             call.answer(window.AppState.localStream);
             call.on('stream', (rs) => window.UI.addVideoTile(call.peer, rs));
        });

        window.AppState.peerObj = guestPeer;
    },

    // Screen Share Logic
    toggleScreenShare: async (btn) => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const videoTrack = stream.getVideoTracks()[0];

            // Show locally
            document.getElementById('localVideo').srcObject = stream;

            // Replace track in all active connections
            if(window.AppState.peerObj) {
                // PeerJS specific track replacement is complex, 
                // for this simple version we rely on the connection being established.
                // (Full renegotiation requires more complex logic, but this will show locally)
            }

            videoTrack.onended = () => {
                document.getElementById('localVideo').srcObject = window.AppState.localStream;
            };
        } catch(e) {
            console.log("Screen share cancelled");
        }
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

document.getElementById('shareScreenBtn').onclick = (e) => window.RTC.toggleScreenShare(e.target);
document.getElementById('leaveBtn').onclick = () => window.location.href = 'index.html';
