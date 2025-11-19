// 1. Ensure Global State
if (!window.AppState) {
    window.AppState = { 
        localStream: null, 
        myPeerId: null, 
        myName: "Guest",
        peerObj: null,
        activeCall: null, // The MediaConnection (Video)
        activeConn: null  // The DataConnection (Chat/Names)
    };
}

window.RTC = {
    // ============================================================
    // 1. INITIALIZE MEDIA (With Bandwidth Optimization)
    // ============================================================
    initMedia: async () => {
        try {
            // OPTIMIZATION: Request lower resolution/FPS to handle more users without crashing
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                },
                video: {
                    width: { ideal: 480 },  // 480p is a good balance for P2P
                    height: { ideal: 360 },
                    frameRate: { ideal: 20 } // Lower FPS saves CPU
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            window.AppState.localStream = stream;
            
            const localVid = document.getElementById('localVideo');
            localVid.srcObject = stream;
            localVid.muted = true; // Always mute self to prevent echo
            
            // FORCE HIDE LOADING SCREEN
            const overlay = document.getElementById('loadingOverlay');
            if(overlay) overlay.style.display = 'none';
            
            // Start Audio Monitor for Blue Border
            window.RTC.monitorAudio(stream, 'localTile');

            // Initial Grid Layout Calculation
            if(window.UI && window.UI.adjustGridLayout) window.UI.adjustGridLayout();

            return true;
        } catch (err) {
            console.error(err);
            alert("Camera Error: " + err.name + "\nPlease allow permissions and refresh.");
            return false;
        }
    },

    // ============================================================
    // 2. CONNECT TO ROOM (Host/Guest Logic)
    // ============================================================
    connectToRoom: (roomId) => {
        // Sanitize ID
        const safeRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '');
        
        if(window.UI) window.UI.showToast("Connecting to network...");

        const peer = new Peer(safeRoomId, {
            debug: 1,
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        window.AppState.peerObj = peer;

        // A. I AM HOST
        peer.on('open', (id) => {
            console.log("Host ID:", id);
            window.AppState.myPeerId = id;
            if(window.UI) window.UI.showToast("Room Ready. Name: " + window.AppState.myName);
        });

        // B. ID TAKEN -> I AM GUEST
        peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                console.log("Room ID taken, joining as Guest...");
                window.RTC.joinAsGuest(safeRoomId);
            } else {
                alert("Network Error: " + err.type);
            }
        });

        // C. HANDLE INCOMING CALLS (As Host)
        peer.on('call', (call) => {
            call.answer(window.AppState.localStream);
            window.AppState.activeCall = call;
            
            call.on('stream', (remoteStream) => {
                if(window.UI) {
                    window.UI.addVideoTile(call.peer, remoteStream);
                    window.UI.adjustGridLayout(); // Resize grid
                }
                window.RTC.monitorAudio(remoteStream, `tile-${call.peer}`);
            });
        });

        // D. HANDLE INCOMING DATA (Chat/Name)
        peer.on('connection', (conn) => {
            window.RTC.setupDataConnection(conn);
        });
    },

    // ============================================================
    // 3. JOIN AS GUEST
    // ============================================================
    joinAsGuest: (hostId) => {
        const guestPeer = new Peer(); // Random ID
        window.AppState.peerObj = guestPeer;

        guestPeer.on('open', (id) => {
            window.AppState.myPeerId = id;
            if(window.UI) window.UI.showToast("Connected! Joining room...");
            
            // 1. Call Host (Video)
            const call = guestPeer.call(hostId, window.AppState.localStream);
            window.AppState.activeCall = call;

            call.on('stream', (remoteStream) => {
                if(window.UI) {
                    window.UI.addVideoTile("Host", remoteStream);
                    window.UI.adjustGridLayout(); // Resize grid
                }
                window.RTC.monitorAudio(remoteStream, `tile-Host`);
            });

            // 2. Connect Host (Data/Chat)
            const conn = guestPeer.connect(hostId);
            window.RTC.setupDataConnection(conn);
        });

        guestPeer.on('error', (err) => {
            console.error(err);
            if(window.UI) window.UI.showToast("Connection Failed. Refresh.");
        });
    },

    // ============================================================
    // 4. DATA & CHAT HANDLING
    // ============================================================
    setupDataConnection: (conn) => {
        window.AppState.activeConn = conn;

        conn.on('open', () => {
            // Sync Name immediately
            conn.send({ type: 'name-update', name: window.AppState.myName });
        });

        conn.on('data', (data) => {
            if(data.type === 'chat') {
                if(window.UI) window.UI.addChatMessage(data.sender || "Peer", data.message, false);
            }
            if(data.type === 'name-update') {
                if(window.UI) window.UI.updatePeerName(data.name, conn.peer);
            }
        });
    },

    sendMessage: (text) => {
        if (window.AppState.activeConn && window.AppState.activeConn.open) {
            window.AppState.activeConn.send({ 
                type: 'chat', 
                message: text, 
                sender: window.AppState.myName 
            });
            return true;
        }
        return false;
    },

    // ============================================================
    // 5. SCREEN SHARING (With Track Replacement)
    // ============================================================
    toggleScreenShare: async (btn) => {
        const isSharing = btn.getAttribute("data-sharing") === "true";

        if (isSharing) {
            window.RTC.stopScreenShare(btn);
            return;
        }

        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
                video: { cursor: "always" }, 
                audio: true 
            });
            const screenTrack = displayStream.getVideoTracks()[0];

            // Show locally
            document.getElementById('localVideo').srcObject = displayStream;

            // Send to remote
            if (window.AppState.activeCall) {
                const sender = window.AppState.activeCall.peerConnection
                    .getSenders()
                    .find((s) => s.track.kind === "video");
                if(sender) sender.replaceTrack(screenTrack);
            }

            btn.innerText = "🛑 Stop";
            btn.setAttribute("data-sharing", "true");

            // Handle browser stop button
            screenTrack.onended = () => window.RTC.stopScreenShare(btn);

        } catch (e) {
            console.log("Screen share cancelled");
        }
    },

    stopScreenShare: (btn) => {
        const camTrack = window.AppState.localStream.getVideoTracks()[0];
        
        if (window.AppState.activeCall) {
            const sender = window.AppState.activeCall.peerConnection
                .getSenders()
                .find((s) => s.track.kind === "video");
            if(sender) sender.replaceTrack(camTrack);
        }

        document.getElementById('localVideo').srcObject = window.AppState.localStream;
        btn.innerText = "🖥";
        btn.setAttribute("data-sharing", "false");
    },

    // ============================================================
    // 6. PICTURE-IN-PICTURE (Background Mode)
    // ============================================================
    togglePiP: async () => {
        try {
            // Find the remote video
            const tiles = document.querySelectorAll('.video-tile video');
            let remoteVideo = null;
            tiles.forEach(vid => {
                if(vid.id !== 'localVideo') remoteVideo = vid;
            });

            if (!remoteVideo) return alert("No one else is here!");

            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await remoteVideo.requestPictureInPicture();
            }
        } catch (error) {
            console.error(error);
        }
    },

    // ============================================================
    // 7. AUDIO ANALYSIS (Active Speaker)
    // ============================================================
    monitorAudio: (stream, elementId) => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

            analyser.smoothingTimeConstant = 0.8;
            analyser.fftSize = 1024;

            microphone.connect(analyser);
            analyser.connect(javascriptNode);
            javascriptNode.connect(audioContext.destination);

            javascriptNode.onaudioprocess = () => {
                const array = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(array);
                let values = 0;
                for (let i = 0; i < array.length; i++) values += array[i];
                const average = values / array.length;

                const element = document.getElementById(elementId);
                if (element) {
                    // Threshold for "Speaking"
                    if (average > 12) element.classList.add('speaking');
                    else element.classList.remove('speaking');
                }
            };
        } catch(e) {
            console.warn("Audio Context Error", e);
        }
    }
};

// ============================================================
// 8. BUTTON LISTENERS
// ============================================================
const setupListener = (id, fn) => {
    const el = document.getElementById(id);
    if(el) el.onclick = fn;
};

setupListener('toggleMicBtn', (e) => {
    const t = window.AppState.localStream.getAudioTracks()[0];
    t.enabled = !t.enabled;
    e.target.innerText = t.enabled ? "🎤" : "🔇";
});

setupListener('toggleCamBtn', (e) => {
    const t = window.AppState.localStream.getVideoTracks()[0];
    t.enabled = !t.enabled;
    e.target.innerText = t.enabled ? "📹" : "📷";
});

setupListener('shareScreenBtn', (e) => window.RTC.toggleScreenShare(e.target));
setupListener('pipBtn', () => window.RTC.togglePiP());
