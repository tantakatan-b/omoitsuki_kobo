const statusDiv = document.getElementById('status');
const testButton = document.getElementById('test-button');

testButton.addEventListener('click', () => {
    statusDiv.textContent = 'Requesting microphone access...';
    statusDiv.className = '';

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusDiv.textContent = 'FAILURE: Your browser does not support getUserMedia.';
        statusDiv.className = 'failure';
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            // SUCCESS!
            statusDiv.textContent = 'SUCCESS! Microphone access was granted. The stream is active.';
            statusDiv.className = 'success';
            
            // Stop the tracks to release the microphone resource immediately
            stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
            // FAILURE!
            statusDiv.textContent = `FAILURE. Error name: ${err.name}. Error message: ${err.message}`;
            statusDiv.className = 'failure';
            console.error("getUserMedia error:", err);
        });
});
