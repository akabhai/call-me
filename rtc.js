if (!window.AppState) {
    window.AppState = { 
        localStream: null, 
        myPeerId: null, 
        myName: "Guest",
        peerObj: null,
        activeCall: null,
        activeConn: null
    };
}

window.RTC = {
    initMedia: async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            window.AppState.localStream = stream;
            document.getElementById('localVideo').srcObject = stream;
            document.getElementById('localVideo').muted = true; 
            document.getElementById('loadingOverlay').style.display = 'none';
            
            // START DETECTING LOCAL SPEAKING
            window.RTC.monitorAudio(stream, 'localTile');

            return true;
        } catch (err) {
            alert("Camera Error. Allow permissions.");
            return false;
        }
    },

    connectToRoom: (roomId) => {
        const peer = new Peer(roomId, { debug: 1 });
        window.AppState.peerObj = peer;

        // HOST LOGIC
        peer.on('open', (id) => {
            window.AppState.myPeerId = id;
            window.UI.showToast("Room Created. Name: " + window.AppState.myName);
        });

        peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                window.RTC.joinAsGuest(roomId);
            }
        });

        // INCOMING CALL (Host)
        peer.on('call', (call) => {
            call.answer(window.AppState.localStream);
            window.AppState.activeCall = call;
            
            call.on('stream', (remoteStream) => {
                window.UI.addVideoTile(call.peer, remoteStream);
                // DETECT REMOTE SPEAKING
                window.RTC.monitorAudio(remoteStream, `tile-${call.peer}`);
            });
        });

        // INCOMING DATA (For Name Sync & Chat)
        peer.on('connection', (conn) => {
            window.RTC.setupDataConnection(conn);
        });
    },

    joinAsGuest: (hostId) => {
        const guestPeer = new Peer();
        window.AppState.peerObj = guestPeer;

        guestPeer.on('open', (id) => {
            window.AppState.myPeerId = id;
            
            // 1. Call Video
            const call = guestPeer.call(hostId, window.AppState.localStream);
            window.AppState.activeCall = call;

            call.on('stream', (remoteStream) => {
                window.UI.addVideoTile("Host", remoteStream);
                // DETECT HOST SPEAKING
                window.RTC.monitorAudio(remoteStream, `tile-Host`);
            });

            // 2. Connect Data (Send Name)
            const conn = guestPeer.connect(hostId);
            window.RTC.setupDataConnection(conn);
        });
    },

    setupDataConnection: (conn) => {
        window.AppState.activeConn = conn;
        
        conn.on('open', () => {
            // IMMEDIATE: Send my Name
            conn.send({ type: 'name-update', name: window.AppState.myName });
        });

        conn.on('data', (data) => {
            if(data.type === 'chat') {
                window.UI.addChatMessage(data.sender || "Peer", data.message, false);
            }
            if(data.type === 'name-update') {
                // Update the label on the video tile
                window.UI.updatePeerName(data.name, conn.peer);
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

    // === AUDIO DETECTION LOGIC ===
    monitorAudio: (stream, elementId) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
            const length = array.length;
            for (let i = 0; i < length; i++) {
                values += array[i];
            }
            const average = values / length;

            // Threshold for "Speaking" (Adjust 10-20 based on sensitivity)
            const element = document.getElementById(elementId);
            if (element) {
                if (average > 10) { 
                    element.classList.add('speaking');
                } else {
                    element.classList.remove('speaking');
                }
            }
        };
    },

    toggleScreenShare: (btn) => { /* (Keep existing logic) */ }
};

// Listeners (Mic/Cam/Share) - Keep existing
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
