// HTMLの要素を取得
const resultMessage = document.getElementById('result-message');
const chordDisplay = document.getElementById('chord-display');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const metronomeDots = document.querySelectorAll('.beat-dot');
const canvasCtx = spectrumCanvas.getContext('2d');

// 定数と変数
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteList = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
let currentNote = 'Note';
let audioContext, analyserNode;
let isPaused = true;
const detectedNoteHistory = [];

let bpm = 120;
let beatDuration = 60000 / bpm;
let lastBeatTime = 0;
let currentBeat = 0;

// --- 初期化 ---
resultMessage.textContent = "Click or Press Space to Start";
chordDisplay.textContent = 'Note';
drawSpectrum();

// --- イベントリスナー ---
document.body.addEventListener('click', togglePause);
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); togglePause(); }
});

// --- メインロジック ---
function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        if (audioContext && audioContext.state === 'running') audioContext.suspend();
        resultMessage.textContent = 'Paused';
    } else {
        if (!audioContext) {
            initAudio();
        } else if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        resultMessage.textContent = '';
        lastBeatTime = performance.now();
        requestAnimationFrame(update);
    }
}

// --- 変更: 単一のループにすべてを統合 ---
function update(currentTime) {
    if (isPaused) return;

    // 1. BPMメトロノーム処理
    if (currentTime - lastBeatTime > beatDuration) {
        lastBeatTime = currentTime;
        currentBeat = (currentBeat % 4) + 1;
        updateMetronomeDots(currentBeat);
        if (currentBeat === 1) {
            changeNote();
        }
    }

    // 2. アナライザ描画
    drawSpectrum();

    // 3. 音声認識
    detectPitch();

    requestAnimationFrame(update);
}

function changeNote() {
    let newNote;
    do { newNote = noteList[Math.floor(Math.random() * noteList.length)]; } while (newNote === currentNote);
    currentNote = newNote;
    chordDisplay.textContent = currentNote;
}

function updateMetronomeDots(beat) {
    metronomeDots.forEach((dot, index) => {
        dot.classList.toggle('active', index < beat);
    });
}

// --- 音声認識ロジック ---
function initAudio() {
    audioContext = new AudioContext();
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 2048;
            source.connect(analyserNode);
        })
        .catch(err => {
            resultMessage.textContent = `Error: ${err.name}`;
        });
}

function detectPitch() {
    if (!analyserNode) return;
    
    const bufferLength = analyserNode.frequencyBinCount;
    const buffer = new Float32Array(bufferLength);
    analyserNode.getFloatTimeDomainData(buffer);
    const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / bufferLength);

    if (rms > 0.01) {
        let bestCorrelation = 0, bestLag = -1;
        for (let lag = 40; lag < 1000; lag++) {
            let correlation = 0;
            for (let i = 0; i < bufferLength - lag; i++) {
                correlation += buffer[i] * buffer[i + lag];
            }
            if (correlation > bestCorrelation) { bestCorrelation = correlation; bestLag = lag; }
        }
        if (bestLag !== -1) {
            const frequency = audioContext.sampleRate / bestLag;
            const noteName = frequencyToNoteName(frequency);
            detectedNoteHistory.push(noteName);
            if (detectedNoteHistory.length > 7) detectedNoteHistory.shift();
            
            const mostFrequentNote = getMostFrequentNote(detectedNoteHistory);

            if (mostFrequentNote.charAt(0) === currentNote) {
                flashSensor('correct');
            } else {
                flashSensor('incorrect');
            }
        }
    }
}

function getMostFrequentNote(arr) {
    if (arr.length === 0) return "--";
    const counts = arr.reduce((acc, value) => ({...acc, [value]: (acc[value] || 0) + 1 }), {});
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

function flashSensor(className) {
    sensorDot.className = className;
    setTimeout(() => { sensorDot.className = ''; }, 200);
}

function frequencyToNoteName(frequency) {
    const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const midiNum = 69 + 12 * Math.log2(frequency / 440);
    return noteStrings[Math.round(midiNum) % 12];
}

function drawSpectrum() {
    if (!analyserNode) return;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);
    canvasCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
    const barWidth = (spectrumCanvas.width / bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i];
        canvasCtx.fillStyle = 'rgb(150, 150, 150)'; // アナライザの色を少し薄く
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
    }
}
