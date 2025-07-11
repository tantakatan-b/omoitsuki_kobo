const noteDisplay = document.getElementById('note-display');
const startButton = document.getElementById('start-button');
const canvas = document.getElementById('analyzer');
const canvasCtx = canvas.getContext('2d');

let audioContext;
let analyserNode;
let dataArray;

const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

startButton.addEventListener('click', () => {
    if (audioContext) return; // 既に開始している場合は何もしない

    audioContext = new AudioContext();
    
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
            startButton.style.display = 'none'; // ボタンを隠す
            noteDisplay.textContent = 'Listening...';

            const source = audioContext.createMediaStreamSource(stream);
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 2048; // 解像度を上げる
            source.connect(analyserNode);
            
            dataArray = new Uint8Array(analyserNode.frequencyBinCount);
            
            detectPitch();
            drawSpectrum();
        })
        .catch(err => {
            noteDisplay.textContent = `Error: ${err.name}`;
        });
});

function drawSpectrum() {
    if (!analyserNode) return;
    requestAnimationFrame(drawSpectrum);
    analyserNode.getByteFrequencyData(dataArray);
    canvasCtx.fillStyle = '#f0f0f0';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i];
        canvasCtx.fillStyle = 'rgb(50, ' + (barHeight + 100) + ', 50)';
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
    }
}

function detectPitch() {
    if (!analyserNode) return;
    
    const bufferLength = analyserNode.frequencyBinCount;
    const buffer = new Float32Array(bufferLength);
    analyserNode.getFloatTimeDomainData(buffer);

    // オートコレレーション（自己相関）でピッチを検出するシンプルなアルゴリズム
    let bestCorrelation = 0;
    let bestLag = -1;
    const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / bufferLength);

    if (rms > 0.01) { // ある程度の音量がある場合のみ
        for (let lag = 40; lag < 1000; lag++) {
            let correlation = 0;
            for (let i = 0; i < bufferLength - lag; i++) {
                correlation += buffer[i] * buffer[i + lag];
            }
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestLag = lag;
            }
        }
        if (bestLag !== -1) {
            const frequency = audioContext.sampleRate / bestLag;
            const noteName = frequencyToNoteName(frequency);
            noteDisplay.textContent = `${noteName} (${Math.round(frequency)} Hz)`;
        }
    } else {
        noteDisplay.textContent = 'Listening...';
    }

    requestAnimationFrame(detectPitch);
}

function frequencyToNoteName(frequency) {
    const midiNum = 69 + 12 * Math.log2(frequency / 440);
    return noteStrings[Math.round(midiNum) % 12];
}
