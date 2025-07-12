// HTML要素
const chordDisplay = document.getElementById('chord-display');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const startButton = document.getElementById('start-button');
const controlArea = document.getElementById('control-area');
const bpmInput = document.getElementById('bpm-input');
const metronomeDots = document.querySelectorAll('.beat-dot');
const canvasCtx = spectrumCanvas.getContext('2d');

// 定数と変数
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteList = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
let currentNote = 'Note';
let audioContext, analyserNode;

let bpm = 120;
let lastBeatTime = 0;
let currentBeat = 0;

// --- 初期化 ---
chordDisplay.textContent = 'Note';
drawSpectrum();

// --- イベントリスナー ---
startButton.addEventListener('click', initAudio);

// BPM入力の修正
bpmInput.addEventListener('input', (e) => {
    let newBpm = parseInt(e.target.value, 10);
    // 入力が空、または数値でない場合は何もしない
    if (isNaN(newBpm)) return;
    bpm = newBpm;
});
bpmInput.addEventListener('change', (e) => {
    // 入力が確定したら範囲内に補正
    if (bpm < 40) bpm = 40;
    if (bpm > 240) bpm = 240;
    e.target.value = bpm;
});

// --- メインロジック ---
function initAudio() {
    if (audioContext) return;
    startButton.textContent = 'Starting...';
    startButton.disabled = true;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(handleStream)
        .catch(handleError);
}

function handleStream(stream) {
    controlArea.style.display = 'none'; // スタートボタンを隠す
    
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    source.connect(analyserNode);

    lastBeatTime = performance.now();
    requestAnimationFrame(update);
}

function handleError(err) {
    startButton.textContent = `Error: ${err.name}`;
    startButton.disabled = false;
    console.error('Error:', err);
}

function update(currentTime) {
    const beatDuration = 60000 / bpm; // BPMの変更を毎フレーム反映

    if (currentTime - lastBeatTime > beatDuration) {
        lastBeatTime = currentTime;
        currentBeat = (currentBeat + 1) % 4;
        updateMetronomeDots(currentBeat);
        playBeep(currentBeat);

        if (currentBeat === 0) {
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
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    oscillator.frequency.value = (beat === 0) ? 880.0 : 440.0;
    oscillator.type = 'sine';
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
}

function detectPitch() {
    if (!analyserNode) return;
    
    const buffer = new Float32Array(analyserNode.fftSize);
    analyserNode.getFloatTimeDomainData(buffer);
    const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / buffer.length);

    if (rms > 0.02) {
        const noteName = findFundamentalFreq(buffer, audioContext.sampleRate);
        if (noteName) {
            if (noteName.charAt(0) === currentNote) {
                flashSensor('correct');
            } else {
                flashSensor('incorrect');
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
    setTimeout(() => { sensorDot.className = ''; }, 200);
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
        canvasCtx.fillRect(x, spectrumCanvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
    }
}
