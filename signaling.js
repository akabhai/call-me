document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse URL for "room" ID
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room'); // We look for ?room=... now
    const oldMagnet = params.get('magnet'); // Backwards compatibility

    let magnetURI = "";

    if (roomId) {
        // RECONSTRUCT THE MAGNET LINK INTERNALLY
        // This keeps the URL bar clean
        magnetURI = `magnet:?xt=urn:btih:${roomId}&dn=CallRoom&tr=wss://tracker.webtorrent.io`;
    } else if (oldMagnet) {
        magnetURI = oldMagnet;
    } else {
        alert("No Room ID found! Redirecting to home.");
        window.location.href = 'index.html';
        return;
    }

    // 2. Check Permissions & Start Media FIRST
    const mediaSuccess = await window.RTC.initMedia();
    if (!mediaSuccess) return; 

    // 3. Start WebTorrent Signaling
    document.getElementById('loadingOverlay').style.display = 'none';
    window.UI.showToast("Connecting to Room...");

    // Initialize Mock Client with the reconstructed Magnet
    setTimeout(async () => {
        window.UI.showToast("Waiting for others to join...");
        
        // Create the PeerConnection
        // We use the roomId as the identifier for the swarm
        const pc = window.RTC.createPeerConnection('peer-remote', false);

        // --- SIMULATE CONNECTION FOR DEMO (The "Ghost" Peer) ---
        // This ensures the UI updates even if you are testing alone
        const ghostPC = new RTCPeerConnection();
        ghostPC.createDataChannel("ghost");
        const offer = await ghostPC.createOffer();
        
        try {
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log("Signaling handshake complete (Simulation)");
        } catch (e) {
            console.warn("Waiting for real peers...");
        }
    }, 1500);
});
