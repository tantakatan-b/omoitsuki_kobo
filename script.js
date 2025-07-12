// HTML要素
const chordDisplay = document.getElementById('chord-display');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const startButton = document.getElementById('start-button');
const playPauseButton = document.getElementById('play-pause-button');
const controlArea = document.getElementById('control-area');
const bpmInput = document.getElementById('bpm-input');
const beepToggleButton = document.getElementById('beep-toggle');
const metronomeDots = document.querySelectorAll('.beat-dot');
const messageArea = document.getElementById('message-area');
const canvasCtx = spectrumCanvas.getContext('2d');

// 定数と変数
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteList = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
let currentNote = 'Note';
let audioContext, analyserNode;
let isPlaying = false;
let isBeepEnabled = true;

let bpm = 120;
let lastBeatTime = 0;
let currentBeat = 0;

// --- 初期化 ---
chordDisplay.textContent = 'Note';
messageArea.textContent = 'Click or Press Space to Start';
drawSpectrum();

// --- イベントリスナー ---
startButton.addEventListener('click', initAudio);
playPauseButton.addEventListener('click', togglePlayPause);
beepToggleButton.addEventListener('click', toggleBeep);
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyB') toggleBeep();
    if (e.code === 'Space') {
        e.preventDefault();
        if (!audioContext) initAudio();
        else togglePlayPause();
    }
});
bpmInput.addEventListener('input', (e) => {
    let newBpm = parseInt(e.target.value, 10);
    if (!isNaN(newBpm) && newBpm >= 40 && newBpm <= 240) {
        bpm = newBpm;
    }
});
bpmInput.addEventListener('change', (e) => {
    if (bpm < 40) bpm = 40;
    if (bpm > 240) bpm = 240;
    e.target.value = bpm;
});

// --- メインロジック ---
function initAudio() {
    if (audioContext) return;
    startButton.style.display = 'none';
    messageArea.textContent = 'Starting...';
    
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(handleStream)
        .catch(handleError);
}

function handleStream(stream) {
    audioContext = new AudioContext();
    // --- 追加: AudioContextを「アンロック」する ---
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(audioContext.destination);
    sourceNode.start(0);
    // --- アンロックここまで ---

    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    source.connect(analyserNode);

    // 再生/停止のロジックを開始
    isPlaying = true;
    playPauseButton.style.display = 'block';
    playPauseButton.textContent = 'PAUSE';
    messageArea.textContent = '';
    lastBeatTime = performance.now();
    requestAnimationFrame(update);
}

function handleError(err) {
    messageArea.textContent = `Error: ${err.name}`;
    startButton.style.display = 'block';
}

function togglePlayPause() {
    if (!audioContext) return;
    isPlaying = !isPlaying;
    if (isPlaying) {
        audioContext.resume();
        playPauseButton.textContent = 'PAUSE';
        messageArea.textContent = '';
        lastBeatTime = performance.now() - ((60000 / bpm) * currentBeat);
        requestAnimationFrame(update);
    } else {
        audioContext.suspend();
        playPauseButton.textContent = 'PLAY';
    }
}

function toggleBeep() {
    isBeepEnabled = !isBeepEnabled;
    beepToggleButton.textContent = `Beep: ${isBeepEnabled ? 'ON' : 'OFF'}`;
}

const beatDuration = () => 60000 / bpm;

function update(currentTime) {
    if (!isPlaying) return;

    if (currentTime - lastBeatTime > beatDuration()) {
        lastBeatTime = currentTime;
        currentBeat = (currentBeat + 1) % 4;
        updateMetronomeDots(currentBeat);
        if (isBeepEnabled) playBeep(currentBeat);
        if (currentBeat === 0) changeNote();
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
    if (!audioContext || audioContext.state === 'suspended') return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    
    oscillator.frequency.value = (beat === 0) ? 880.0 : 440.0;
    oscillator.type = 'sine';
    
    oscillator.start(audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.05);
    oscillator.stop(audioContext.currentTime + 0.05);
}

function detectPitch() {
    if (!analyserNode) return;
    
    const buffer = new Float32Array(analyserNode.fftSize);
    analyserNode.getFloatTimeDomainData(buffer);
    const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / buffer.length);

    if (rms > 0.015) {
        const noteName = findFundamentalFreq(buffer, audioContext.sampleRate);
        if (noteName) {
            if (noteName.charAt(0) === currentNote) {
                flashSensor('correct');
                showResultMessage('nice!', 'correct');
            } else {
                flashSensor('incorrect');
                showResultMessage('Oops!', 'incorrect');
            }
        }
    }
}

function showResultMessage(message, className) {
    messageArea.textContent = message;
    messageArea.className = className;
    setTimeout(() => {
        if (messageArea.textContent === message) { // 他のメッセージで上書きされていなければクリア
            messageArea.textContent = '';
            messageArea.className = '';
        }
    }, 500);
}

function findFundamentalFreq(buffer, sampleRate){ /* ... 変更なし ... */ }
function frequencyToNoteName(frequency){ /* ... 変更なし ... */ }
function flashSensor(className){ /* ... 変更なし ... */ }
function drawSpectrum(){ /* ... 変更なし ... */ }
