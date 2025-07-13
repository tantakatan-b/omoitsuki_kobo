const chordDisplay = document.getElementById('chord-display');
const chordRoot = document.getElementById('chord-root');
const chordSuffix = document.getElementById('chord-suffix');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const bpmInput = document.getElementById('bpm-input');
const beepToggleButton = document.getElementById('beep-toggle');
const metronomeDots = document.querySelectorAll('.beat-dot');
const messageArea = document.getElementById('message-area');
const canvasCtx = spectrumCanvas.getContext('2d');

const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const chordFormulas = {
    'C': ['C', 'E', 'G'], 'G': ['G', 'B', 'D'], 'D': ['D', 'F#', 'A'], 'A': ['A', 'C#', 'E'], 'E': ['E', 'G#', 'B'], 'B': ['B', 'D#', 'F#'], 'F#': ['F#', 'A#', 'C#'], 'C#': ['C#', 'F', 'G#'], 'F': ['F', 'A', 'C'], 'B♭': ['A#', 'D', 'F'], 'E♭': ['D#', 'G', 'A#'], 'A♭': ['G#', 'C', 'D#'],
    'Am': ['A', 'C', 'E'], 'Em': ['E', 'G', 'B'], 'Bm': ['B', 'D', 'F#'], 'F#m': ['F#', 'A', 'C#'], 'C#m': ['C#', 'E', 'G#'], 'G#m': ['G#', 'B', 'D#'], 'D#m': ['D#', 'F#', 'A#'], 'A#m': ['A#', 'C#', 'F'], 'Dm': ['D', 'F', 'A'], 'Gm': ['G', 'A#', 'D'], 'Cm': ['C', 'D#', 'G'], 'Fm': ['F', 'G#', 'C'],
    'C7': ['C', 'E', 'G', 'A#'], 'G7': ['G', 'B', 'D', 'F'], 'D7': ['D', 'F#', 'A', 'C'], 'A7': ['A', 'C#', 'E', 'G'], 'E7': ['E', 'G#', 'B', 'D'], 'B7': ['B', 'D#', 'F#', 'A'],
    'CM7': ['C', 'E', 'G', 'B'], 'GM7': ['G', 'B', 'D', 'F#'], 'DM7': ['D', 'F#', 'A', 'C#'], 'AM7': ['A', 'C#', 'E', 'G#'], 'EM7': ['E', 'G#', 'B', 'D#'], 'FM7': ['F', 'A', 'C', 'E'],
    'Am7': ['A', 'C', 'E', 'G'], 'Em7': ['E', 'G', 'B', 'D'], 'Bm7': ['B', 'D', 'F#', 'A'], 'F#m7': ['F#', 'A', 'C#', 'E'], 'C#m7': ['C#', 'E', 'G#', 'B'], 'Dm7': ['D', 'F', 'A', 'C'],
};
const chordList = Object.keys(chordFormulas);
let currentChord = 'Note';

let audioContext, analyserNode;
let isPlaying = false;
let isBeepEnabled = true;
let bpm = 80; // 初期値を80に変更
let lastBeatTime = 0;
let currentBeat = 0;
let roundSuccess = false; // 1小節内の成功フラグ

// 初期化
chordRoot.textContent = 'Note';
chordSuffix.textContent = '';
messageArea.textContent = 'Click or Press Space to Start';
drawSpectrum();

// イベントリスナー
document.body.addEventListener('click', handleUserInteraction);
window.addEventListener('keydown', (e) => {
    if (e.target === bpmInput) return;
    if (e.code === 'KeyB') toggleBeep();
    if (e.code === 'Space') {
        e.preventDefault();
        handleUserInteraction();
    }
});
bpmInput.addEventListener('input', (e) => { /* ... 変更なし ... */ });
bpmInput.addEventListener('change', (e) => { /* ... 変更なし ... */ });
beepToggleButton.addEventListener('click', (e) => {
    e.stopPropagation(); // ボディのクリックイベントを発動させない
    toggleBeep();
});


// メインロジック
function handleUserInteraction() {
    if (!audioContext) {
        initAudio();
    } else {
        togglePlayPause();
    }
}

function initAudio() {
    messageArea.textContent = 'Starting...';
    audioContext = new AudioContext();
    audioContext.resume().then(() => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(handleStream)
            .catch(handleError);
    });
}

function handleStream(stream) {
    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    source.connect(analyserNode);
    togglePlayPause();
}

function handleError(err) {
    messageArea.textContent = `Error: ${err.name}`;
}

function togglePlayPause() {
    isPlaying = !isPlaying;
    if (isPlaying) {
        messageArea.textContent = '';
        audioContext.resume();
        lastBeatTime = performance.now();
        changeChord(); // 最初のコードをすぐに表示
        updateMetronomeDots(3); // 最初の拍の準備
        requestAnimationFrame(update);
    } else {
        audioContext.suspend();
        messageArea.textContent = 'Paused';
    }
}

function toggleBeep() { /* ... 変更なし ... */ }
const beatDuration = () => 60000 / bpm;

function update(currentTime) {
    if (!isPlaying) return;

    if (currentTime - lastBeatTime > beatDuration()) {
        lastBeatTime = currentTime;
        currentBeat = (currentBeat + 1) % 4;
        updateMetronomeDots(currentBeat);
        if (isBeepEnabled) playBeep(currentBeat);
        
        if (currentBeat === 0) {
            // 4拍終わった時点で成功していなければOops!
            if (!roundSuccess) {
                showResultMessage('Oops!', 'incorrect');
            }
            changeChord();
        }
    }
    drawSpectrum();
    detectPitch();
    requestAnimationFrame(update);
}

function changeChord() {
    roundSuccess = false; // 新しいラウンドの成功フラグをリセット
    let newChord;
    do { newChord = chordList[Math.floor(Math.random() * chordList.length)]; } while (newChord === currentChord);
    currentChord = newChord;
    
    const match = currentChord.match(/^([A-G][#b♭]?)(.*)/);
    if (match) {
        chordRoot.textContent = match[1];
        chordSuffix.textContent = match[2];
    } else {
        chordRoot.textContent = currentChord;
        chordSuffix.textContent = '';
    }
}

function updateMetronomeDots(beat) { /* ... 変更なし ... */ }
function playBeep(beat) { /* ... 変更なし ... */ }

function detectPitch() {
    if (!analyserNode) return;
    
    const buffer = new Float32Array(analyserNode.fftSize);
    analyserNode.getFloatTimeDomainData(buffer);
    const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / buffer.length);

    if (rms > 0.02) {
        const detectedNote = findFundamentalFreq(buffer, audioContext.sampleRate);
        if (detectedNote) {
            const correctNotes = chordFormulas[currentChord];
            if (correctNotes && correctNotes.includes(detectedNote)) {
                flashSensor('correct');
                if (!roundSuccess) {
                    roundSuccess = true;
                    showResultMessage('nice!', 'correct');
                }
            } else {
                flashSensor('incorrect');
            }
        }
    }
}

function showResultMessage(message, className) { /* ... 変更なし ... */ }
function findFundamentalFreq(buffer, sampleRate){ /* ... 変更なし ... */ }
function frequencyToNoteName(frequency){ /* ... 変更なし ... */ }
function flashSensor(className){ /* ... 変更なし ... */ }
function drawSpectrum(){ /* ... 変更なし ... */ }
