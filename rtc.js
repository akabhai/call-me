if (!window.AppState) {
    window.AppState = { 
        localStream: null, 
        myPeerId: null, 
        myName: "Guest",
        peerObj: null,
        activeCall: null, // Stores the MediaConnection (Video)
        activeConn: null  // Stores the DataConnection (Chat)
    };
}

window.RTC = {
    initMedia: async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            window.AppState.localStream = stream;
            const localVid = document.getElementById('localVideo');
            localVid.srcObject = stream;
            localVid.muted = true; 
            
            if(document.getElementById('loadingOverlay')) 
                document.getElementById('loadingOverlay').style.display = 'none';
            
            window.RTC.monitorAudio(stream, 'localTile');
            return true;
        } catch (err) {
            alert("Camera Error: " + err.message);
            return false;
        }
    },

    connectToRoom: (roomId) => {
        const peer = new Peer(roomId, { debug: 1 });
        window.AppState.peerObj = peer;

        peer.on('open', (id) => {
            window.AppState.myPeerId = id;
            window.UI.showToast("Room Created. ID: " + id);
        });

        peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                window.RTC.joinAsGuest(roomId);
            } else {
                alert("Network Error: " + err.type);
            }
        });

        // HOST RECEIVING CALL
        peer.on('call', (call) => {
            call.answer(window.AppState.localStream);
            window.AppState.activeCall = call; // Store call to replace tracks later
            
            call.on('stream', (remoteStream) => {
                window.UI.addVideoTile(call.peer, remoteStream);
                window.RTC.monitorAudio(remoteStream, `tile-${call.peer}`);
            });
        });

        peer.on('connection', (conn) => window.RTC.setupDataConnection(conn));
    },

    joinAsGuest: (hostId) => {
        const guestPeer = new Peer();
        window.AppState.peerObj = guestPeer;

        guestPeer.on('open', (id) => {
            window.AppState.myPeerId = id;
            
            // CALL HOST
            const call = guestPeer.call(hostId, window.AppState.localStream);
            window.AppState.activeCall = call; // Store call

            call.on('stream', (remoteStream) => {
                window.UI.addVideoTile("Host", remoteStream);
                window.RTC.monitorAudio(remoteStream, `tile-Host`);
            });

            const conn = guestPeer.connect(hostId);
            window.RTC.setupDataConnection(conn);
        });
    },

    setupDataConnection: (conn) => {
        window.AppState.activeConn = conn;
        conn.on('open', () => conn.send({ type: 'name-update', name: window.AppState.myName }));
        conn.on('data', (data) => {
            if(data.type === 'chat') window.UI.addChatMessage(data.sender || "Peer", data.message, false);
            if(data.type === 'name-update') window.UI.updatePeerName(data.name, conn.peer);
        });
    },

    sendMessage: (text) => {
        if (window.AppState.activeConn && window.AppState.activeConn.open) {
            window.AppState.activeConn.send({ type: 'chat', message: text, sender: window.AppState.myName });
            return true;
        }
        return false;
    },

    // === NEW: ROBUST SCREEN SHARE (WORKS ON ANDROID & DESKTOP) ===
    toggleScreenShare: async (btn) => {
        // 1. Check if we are already sharing (button state check)
        const isSharing = btn.getAttribute("data-sharing") === "true";

        if (isSharing) {
            // STOP SHARING
            window.RTC.stopScreenShare(btn);
            return;
        }

        try {
            // 2. Get Screen Stream (with audio if supported)
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
                video: { cursor: "always" }, 
                audio: true 
            });
            
            const screenTrack = displayStream.getVideoTracks()[0];

            // 3. Show on Local Video (so you know you are sharing)
            document.getElementById('localVideo').srcObject = displayStream;

            // 4. Replace Track in Peer Connection (The Magic Part)
            if (window.AppState.activeCall) {
                const sender = window.AppState.activeCall.peerConnection
                    .getSenders()
                    .find((s) => s.track.kind === "video");
                
                if(sender) {
                    sender.replaceTrack(screenTrack);
                }
            }

            // 5. Update Button State
            btn.innerText = "🛑 Stop";
            btn.setAttribute("data-sharing", "true");

            // 6. Handle "Stop" clicked from Browser Native UI
            screenTrack.onended = () => window.RTC.stopScreenShare(btn);

        } catch (e) {
            console.error("Screen Share Error:", e);
        }
    },

    stopScreenShare: (btn) => {
        // 1. Get original Camera Track
        const camTrack = window.AppState.localStream.getVideoTracks()[0];
        
        // 2. Replace in Peer Connection
        if (window.AppState.activeCall) {
            const sender = window.AppState.activeCall.peerConnection
                .getSenders()
                .find((s) => s.track.kind === "video");
            
            if(sender) sender.replaceTrack(camTrack);
        }

        // 3. Restore Local View
        document.getElementById('localVideo').srcObject = window.AppState.localStream;

        // 4. Reset Button
        btn.innerText = "🖥";
        btn.setAttribute("data-sharing", "false");
    },

    // === NEW: BACKGROUND MODE (Picture-in-Picture) ===
    togglePiP: async () => {
        try {
            // Find the remote video element (not the local one)
            const tiles = document.querySelectorAll('.video-tile video');
            let remoteVideo = null;

            // Find a video that ISN'T the local one
            tiles.forEach(vid => {
                if(vid.id !== 'localVideo') remoteVideo = vid;
            });

            if (!remoteVideo) {
                alert("Wait for someone to join first!");
                return;
            }

            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await remoteVideo.requestPictureInPicture();
            }
        } catch (error) {
            alert("Background mode failed: " + error.message);
        }
    },

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
            for (let i = 0; i < array.length; i++) values += array[i];
            const average = values / array.length;

            const element = document.getElementById(elementId);
            if (element) {
                if (average > 10) element.classList.add('speaking');
                else element.classList.remove('speaking');
            }
        };
    }
};

// BUTTON LISTENERS
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
document.getElementById('pipBtn').onclick = () => window.RTC.togglePiP(); // NEW
