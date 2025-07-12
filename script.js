// HTML要素
const chordDisplay = document.getElementById('chord-display');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const bpmInput = document.getElementById('bpm-input');
const metronomeDots = document.querySelectorAll('.beat-dot');
const messageArea = document.getElementById('message-area');
const canvasCtx = spectrumCanvas.getContext('2d');

// 定数と変数
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteList = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
let currentNote = 'Note';
let audioContext, analyserNode;
let isPlaying = false;
const detectedNoteHistory = [];

let bpm = 120;
let beatDuration = 60000 / bpm;
let lastBeatTime = 0;
let currentBeat = 0;

// --- 初期化 ---
chordDisplay.textContent = 'Note';
messageArea.textContent = 'Click or Press Space to Start';
drawSpectrum();

// --- イベントリスナー ---
document.body.addEventListener('click', togglePlayPause);
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
    }
});
bpmInput.addEventListener('input', (e) => {
    bpm = parseInt(e.target.value, 10);
    if (bpm < 40) bpm = 40;
    if (bpm > 240) bpm = 240;
    e.target.value = bpm; // 入力値を補正
    beatDuration = 60000 / bpm;
});
// BPM入力中は再生/停止が発動しないようにする
bpmInput.addEventListener('click', (e) => e.stopPropagation());
bpmInput.addEventListener('keydown', (e) => e.stopPropagation());

// --- メインロジック ---
function togglePlayPause() {
    if (!audioContext) {
        initAudio();
        return;
    }

    isPlaying = !isPlaying;
    if (isPlaying) {
        audioContext.resume();
        messageArea.textContent = '';
        lastBeatTime = performance.now();
        requestAnimationFrame(update);
    } else {
        audioContext.suspend();
        messageArea.textContent = 'Paused';
    }
}

function initAudio() {
    messageArea.textContent = 'Starting...';
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(handleStream)
        .catch(handleError);
}

function handleStream(stream) {
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    source.connect(analyserNode);
    togglePlayPause(); // 初期化後に再生を開始
}

function handleError(err) {
    messageArea.textContent = `Error: ${err.name}`;
}

function update(currentTime) {
    if (!isPlaying) return;

    if (currentTime - lastBeatTime > beatDuration) {
        lastBeatTime = currentTime;
        currentBeat = (currentBeat + 1) % 4;
        updateMetronomeDots(currentBeat);
        playBeep(currentBeat);

        if (currentBeat === 0) { // 4拍終わって次の1拍目
            changeNote();
        }
    }

    drawSpectrum();
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
        dot.classList.toggle('active', index === beat);
    });
}

function playBeep(beat) {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    
    oscillator.frequency.value = (beat === 0) ? 880.0 : 440.0; // 1拍目は高く
    oscillator.type = 'sine';
    
    oscillator.start(audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.05);
    oscillator.stop(audioContext.currentTime + 0.05);
}

// --- 音声認識と判定 ---
function detectPitch() {
    if (!analyserNode) return;
    
    const buffer = new Float32Array(analyserNode.fftSize);
    analyserNode.getFloatTimeDomainData(buffer);
    const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / buffer.length);

    if (rms > 0.015) { // 感度を少し調整
        const noteName = findFundamentalFreq(buffer, audioContext.sampleRate);
        if (noteName) {
            detectedNoteHistory.push(noteName);
            if (detectedNoteHistory.length > 5) detectedNoteHistory.shift();
            
            const mostFrequentNote = getMostFrequentNote(detectedNoteHistory);
            
            if (mostFrequentNote.charAt(0) === currentNote) {
                flashSensor('correct');
                showResultMessage('nice!', 'correct');
            } else {
                flashSensor('incorrect');
                showResultMessage('Oops!', 'incorrect');
            }
        }
    }
}

function findFundamentalFreq(buffer, sampleRate) {
    let bestCorrelation = 0, bestLag = -1;
    for (let lag = 40; lag < 1000; lag++) {
        let correlation = 0;
        for (let i = 0; i < analyserNode.fftSize - lag; i++) {
            correlation += buffer[i] * buffer[i + lag];
        }
        if (correlation > bestCorrelation) { bestCorrelation = correlation; bestLag = lag; }
    }
    if (bestLag === -1) return null;
    return frequencyToNoteName(sampleRate / bestLag);
}

function frequencyToNoteName(frequency) {
    const midiNum = 69 + 12 * Math.log2(frequency / 440);
    return noteStrings[Math.round(midiNum) % 12];
}

function flashSensor(className) {
    sensorDot.className = className;
}

function showResultMessage(message, className) {
    messageArea.textContent = message;
    messageArea.className = className;
    setTimeout(() => {
        messageArea.textContent = '';
        messageArea.className = '';
    }, 500); // 0.5秒でメッセージを消す
}

function getMostFrequentNote(arr) {
    if (arr.length === 0) return null;
    const counts = arr.reduce((acc, value) => ({...acc, [value]: (acc[value] || 0) + 1 }), {});
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

function drawSpectrum() {
    if (!analyserNode) return;
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(dataArray);
    canvasCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
    const barWidth = (spectrumCanvas.width / dataArray.length) * 2.5;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i];
        canvasCtx.fillStyle = 'rgb(150, 150, 150)';
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
    }
}
