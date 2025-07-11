const noteDisplay = document.getElementById('note-display');
const startButton = document.getElementById('start-button');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const canvasCtx = spectrumCanvas.getContext('2d');

let audioContext;
let pitch; // ml5.jsのピッチ検出オブジェクト
let analyserNode;

startButton.addEventListener('click', () => {
    // AudioContextの初期化
    audioContext = new AudioContext();
    // ユーザーの操作後にAudioContextを再開
    audioContext.resume().then(() => {
        noteDisplay.textContent = 'AudioContext Resumed';
        
        // マイクへのアクセス
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(handleSuccess)
            .catch(handleError);
    });
});

function handleSuccess(stream) {
    noteDisplay.textContent = 'MIC OK. Loading Model...';
    
    // アナライザノードのセットアップ
    analyserNode = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyserNode);

    // ml5.jsのピッチ検出モデルを準備
    const modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
    pitch = ml5.pitchDetection(modelUrl, audioContext, stream, modelLoaded);
}

function modelLoaded() {
    noteDisplay.textContent = 'Model Loaded. Listening...';
    getPitch();
    drawSpectrum(); // アナライザの描画を開始
}

function getPitch() {
    pitch.getPitch((err, frequency) => {
        if (err) {
            console.error(err);
            noteDisplay.textContent = 'Error getting pitch.';
            return;
        }
        if (frequency) {
            const noteName = frequencyToNoteName(frequency);
            noteDisplay.textContent = `${noteName} (${Math.round(frequency)} Hz)`;
        }
        // 繰り返し呼び出す
        requestAnimationFrame(getPitch);
    });
}

function drawSpectrum() {
    if (!analyserNode) return;
    
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
    const barWidth = (spectrumCanvas.width / bufferLength) * 2;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 4;
        canvasCtx.fillStyle = 'rgb(150, 150, 150)';
        canvasCtx.fillRect(x, spectrumCanvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
    
    requestAnimationFrame(drawSpectrum);
}


function handleError(err) {
    console.error('Error:', err);
    noteDisplay.textContent = `Error: ${err.name}`;
}

// 周波数(Hz)を音名に変換するヘルパー関数
function frequencyToNoteName(frequency) {
    const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const midiNum = 69 + 12 * Math.log2(frequency / 440);
    return noteStrings[Math.round(midiNum) % 12];
}
