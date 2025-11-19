// Ensure Global State
if (!window.AppState) {
    window.AppState = { 
        localStream: null, 
        myPeerId: null, 
        peerObj: null,
        activeCall: null, // Video Connection
        activeConn: null  // Chat Connection
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
            
            // Hide Loading Overlay Immediately
            const overlay = document.getElementById('loadingOverlay');
            if(overlay) overlay.style.display = 'none';
            
            return true;
        } catch (err) {
            alert("Camera Error. Please check permissions.");
            return false;
        }
    },

    // 2. Connect to Room (Host/Guest Logic)
    connectToRoom: (roomId) => {
        // Clean the ID to be URL safe
        const safeRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '');
        
        window.UI.showToast("Connecting to network...");

        // ATTEMPT 1: Try to be the HOST (Claim the Room ID)
        const peer = new Peer(safeRoomId, {
            debug: 2,
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        window.AppState.peerObj = peer;

        // --- IF WE BECOME HOST ---
        peer.on('open', (id) => {
            console.log("I am HOST. ID:", id);
            window.AppState.myPeerId = id;
            window.UI.showToast("Room Created! Waiting for guest...");
        });

        // --- IF ID IS TAKEN -> WE ARE GUEST ---
        peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                console.log("Room ID taken. Switching to GUEST mode...");
                peer.destroy(); // Kill failed attempt
                window.RTC.joinAsGuest(safeRoomId); // Retry as guest
            } else {
                console.error("PeerJS Error:", err);
                window.UI.showToast("Connection Error: " + err.type);
            }
        });

        // --- HANDLE INCOMING CONNECTIONS (As Host) ---
        
        // 1. Video Calls
        peer.on('call', (call) => {
            console.log("Incoming Video Call...");
            window.UI.showToast("Guest Joining...");
            
            // Answer the call with our stream
            call.answer(window.AppState.localStream);
            window.AppState.activeCall = call;

            // Show their video
            call.on('stream', (remoteStream) => {
                window.UI.addVideoTile("Guest", remoteStream);
            });
        });

        // 2. Chat Data Connections
        peer.on('connection', (conn) => {
            console.log("Incoming Chat Connection...");
            window.RTC.setupDataConnection(conn);
        });
    },

    // 3. Guest Logic (Call the Host)
    joinAsGuest: (hostId) => {
        // Create a random ID for ourselves
        const guestPeer = new Peer({
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        window.AppState.peerObj = guestPeer;

        guestPeer.on('open', (id) => {
            console.log("I am GUEST. My ID:", id);
            window.AppState.myPeerId = id;
            window.UI.showToast("Found Room. Calling Host...");

            // A. CALL HOST (Video)
            const call = guestPeer.call(hostId, window.AppState.localStream);
            window.AppState.activeCall = call;

            call.on('stream', (remoteStream) => {
                console.log("Received Host Stream");
                window.UI.addVideoTile("Host", remoteStream);
            });

            // B. CONNECT HOST (Chat)
            const conn = guestPeer.connect(hostId);
            window.RTC.setupDataConnection(conn);
        });

        guestPeer.on('error', (err) => {
            console.error("Guest Error:", err);
            window.UI.showToast("Connection Failed. Try refreshing.");
        });
    },

    // 4. Chat Connection Setup (Shared)
    setupDataConnection: (conn) => {
        window.AppState.activeConn = conn;

        conn.on('open', () => {
            console.log("Chat Channel Open");
            window.UI.showToast("Chat Connected!");
        });

        conn.on('data', (data) => {
            console.log("Received Data:", data);
            // If it's a chat message object
            if(data.type === 'chat') {
                window.UI.addChatMessage("Peer", data.message, false);
            }
        });
    },

    // 5. Send Chat Message
    sendMessage: (text) => {
        if (window.AppState.activeConn && window.AppState.activeConn.open) {
            window.AppState.activeConn.send({ type: 'chat', message: text });
            return true;
        } else {
            window.UI.showToast("No one is connected to chat.");
            return false;
        }
    },

    // 6. Screen Share
    toggleScreenShare: async (btn) => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const videoTrack = stream.getVideoTracks()[0];
            
            // Show locally
            document.getElementById('localVideo').srcObject = stream;

            // Replace track for remote peer
            if (window.AppState.activeCall) {
                const sender = window.AppState.activeCall.peerConnection.getSenders().find((s) => s.track.kind === "video");
                if(sender) sender.replaceTrack(videoTrack);
            }

            btn.innerText = "🛑 Stop";

            videoTrack.onended = () => {
                // Revert to camera
                const camTrack = window.AppState.localStream.getVideoTracks()[0];
                if (window.AppState.activeCall) {
                    const sender = window.AppState.activeCall.peerConnection.getSenders().find((s) => s.track.kind === "video");
                    if(sender) sender.replaceTrack(camTrack);
                }
                document.getElementById('localVideo').srcObject = window.AppState.localStream;
                btn.innerText = "🖥";
            };
        } catch(e) {
            console.log("Share cancelled");
        }
    }
};

// Listeners
document.getElementById('toggleMicBtn').onclick = (e) => {
    const t = window.AppState.localStream.getAudioTracks()[0];
    t.enabled = !t.enabled;
    e.target.innerText = t.enabled ? "🎤" : "🔇";
};

document.getElementById('toggleCamBtn').onclick = (e) => {
    const t = window.AppState.localStream.getVideoTracks()[0];
    t.enabled = !t.enabled;
    e.target.innerText = t.enabled ? "📹" : "📷";
};

document.getElementById('shareScreenBtn').onclick = (e) => window.RTC.toggleScreenShare(e.target);
