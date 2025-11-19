document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse URL
    const params = new URLSearchParams(window.location.search);
    const magnet = params.get('magnet');

    if (!magnet) {
        alert("No room ID!");
        return;
    }

    // 2. Start Media FIRST
    const mediaSuccess = await window.RTC.initMedia();
    if (!mediaSuccess) return; // Stop if permission denied

    // 3. Simulate WebTorrent Connection
    document.getElementById('loadingOverlay').style.display = 'none';
    window.UI.showToast("Joined Room! Waiting for peers...");

    // ============================================================
    // THE FIX: SIMULATE INCOMING PEER WITH VALID DATA
    // ============================================================
    setTimeout(async () => {
        window.UI.showToast("Peer-Alpha joining...");
        
        // Create the PeerConnection on our side
        const pc = window.RTC.createPeerConnection('peer-alpha', false);

        // --- GHOST PEER LOGIC (To prevent crash) ---
        // We create a fake remote peer locally to generate valid SDP
        const ghostPC = new RTCPeerConnection();
        ghostPC.createDataChannel("ghost"); // Needed to create offer
        const offer = await ghostPC.createOffer();
        
        // Feed valid offer to our real PC
        try {
            console.log("Setting Remote Description...");
            await pc.setRemoteDescription(offer);
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            console.log("Connection established (Mock)");
            window.UI.showToast("Connected to Peer-Alpha (Simulation)");
        } catch (e) {
            console.error("Signaling Error:", e);
            alert("WebRTC Error: " + e.message);
        }

    }, 2000);
});
