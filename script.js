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

// --- 変更: コードとその構成音の定義 ---
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const chordFormulas = {
    // Major
    'C': ['C', 'E', 'G'], 'G': ['G', 'B', 'D'], 'D': ['D', 'F#', 'A'], 'A': ['A', 'C#', 'E'], 'E': ['E', 'G#', 'B'], 'B': ['B', 'D#', 'F#'], 'F#': ['F#', 'A#', 'C#'], 'C#': ['C#', 'F', 'G#'], 'F': ['F', 'A', 'C'], 'B♭': ['A#', 'D', 'F'], 'E♭': ['D#', 'G', 'A#'], 'A♭': ['G#', 'C', 'D#'],
    // Minor
    'Am': ['A', 'C', 'E'], 'Em': ['E', 'G', 'B'], 'Bm': ['B', 'D', 'F#'], 'F#m': ['F#', 'A', 'C#'], 'C#m': ['C#', 'E', 'G#'], 'G#m': ['G#', 'B', 'D#'], 'D#m': ['D#', 'F#', 'A#'], 'A#m': ['A#', 'C#', 'F'], 'Dm': ['D', 'F', 'A'], 'Gm': ['G', 'A#', 'D'], 'Cm': ['C', 'D#', 'G'], 'Fm': ['F', 'G#', 'C'],
    // Dominant 7th
    'C7': ['C', 'E', 'G', 'A#'], 'G7': ['G', 'B', 'D', 'F'], 'D7': ['D', 'F#', 'A', 'C'], 'A7': ['A', 'C#', 'E', 'G'], 'E7': ['E', 'G#', 'B', 'D'], 'B7': ['B', 'D#', 'F#', 'A'],
    // Major 7th
    'CM7': ['C', 'E', 'G', 'B'], 'GM7': ['G', 'B', 'D', 'F#'], 'DM7': ['D', 'F#', 'A', 'C#'], 'AM7': ['A', 'C#', 'E', 'G#'], 'EM7': ['E', 'G#', 'B', 'D#'], 'FM7': ['F', 'A', 'C', 'E'],
    // Minor 7th
    'Am7': ['A', 'C', 'E', 'G'], 'Em7': ['E', 'G', 'B', 'D'], 'Bm7': ['B', 'D', 'F#', 'A'], 'F#m7': ['F#', 'A', 'C#', 'E'], 'C#m7': ['C#', 'E', 'G#', 'B'], 'Dm7': ['D', 'F', 'A', 'C'],
};
const chordList = Object.keys(chordFormulas);
let currentChord = 'Note'; // 変数名を currentNote から currentChord に戻す

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

// --- イベントリスナー (変更なし) ---
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
    const newBpm = parseInt(e.target.value, 10);
    if (!isNaN(newBpm) && newBpm >= 40 && newBpm <= 240) bpm = newBpm;
});
bpmInput.addEventListener('change', (e) => {
    let finalBpm = parseInt(e.target.value, 10);
    if (isNaN(finalBpm) || finalBpm < 40) finalBpm = 40;
    if (finalBpm > 240) finalBpm = 240;
    e.target.value = finalBpm;
    bpm = finalBpm;
});

// --- メインロジック ---
function initAudio() { /* ... 変更なし ... */ }
function handleStream(stream) { /* ... 変更なし ... */ }
function handleError(err) { /* ... 変更なし ... */ }
function togglePlayPause() { /* ... 変更なし ... */ }
function toggleBeep() { /* ... 変更なし ... */ }
const beatDuration = () => 60000 / bpm;

function update(currentTime) {
    if (!isPlaying) return;
    if (currentTime - lastBeatTime > beatDuration()) {
        lastBeatTime = currentTime;
        currentBeat = (currentBeat + 1) % 4;
        updateMetronomeDots(currentBeat);
        if (isBeepEnabled) playBeep(currentBeat);
        if (currentBeat === 0) changeChord(); // changeNoteから変更
    }
    drawSpectrum();
    detectPitch();
    requestAnimationFrame(update);
}

// --- 変更: changeNoteからchangeChordへ ---
function changeChord() {
    let newChord;
    do { newChord = chordList[Math.floor(Math.random() * chordList.length)]; } while (newChord === currentChord);
    currentChord = newChord;
    chordDisplay.textContent = currentChord;
}

function updateMetronomeDots(beat) { /* ... 変更なし ... */ }
function playBeep(beat) { /* ... 変更なし ... */ }

// --- 変更: コード構成音で判定するロジック ---
function detectPitch() {
    if (!analyserNode) return;
    
    const buffer = new Float32Array(analyserNode.fftSize);
    analyserNode.getFloatTimeDomainData(buffer);
    const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / buffer.length);

    if (rms > 0.02) {
        const detectedNote = findFundamentalFreq(buffer, audioContext.sampleRate);
        if (detectedNote) {
            const correctNotes = chordFormulas[currentChord]; // 正解の構成音リストを取得
            if (correctNotes && correctNotes.includes(detectedNote)) {
                flashSensor('correct');
            } else {
                flashSensor('incorrect');
            }
        }
    }
}

function findFundamentalFreq(buffer, sampleRate) { /* ... 変更なし ... */ }
function frequencyToNoteName(frequency) { /* ... 変更なし ... */ }
function flashSensor(className) { /* ... 変更なし ... */ }
function drawSpectrum() { /* ... 変更なし ... */ }
