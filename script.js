const message = document.getElementById('message');
const startButton = document.getElementById('start-button');
const canvas = document.getElementById('analyzer');
const canvasCtx = canvas.getContext('2d');

let analyserNode;
let dataArray;
let animationFrameId;

startButton.addEventListener('click', () => {
    message.textContent = 'Requesting microphone access...';
    
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(handleSuccess)
        .catch(handleError);
});

function handleSuccess(stream) {
    message.textContent = 'Microphone connected. Analyzer is active.';
    
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    
    source.connect(analyserNode);
    
    dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    
    draw();
}

function handleError(err) {
    message.textContent = `Error: ${err.name}`;
    console.error('Error accessing microphone:', err);
}

function draw() {
    if (!analyserNode) return;
    
    animationFrameId = requestAnimationFrame(draw);
    
    analyserNode.getByteFrequencyData(dataArray);
    
    canvasCtx.fillStyle = '#f0f0f0';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / dataArray.length) * 2;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i];
        
        canvasCtx.fillStyle = `rgb(50, ${barHeight + 100}, 50)`;
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        
        x += barWidth + 1;
    }
}
