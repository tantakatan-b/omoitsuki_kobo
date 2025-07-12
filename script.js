// HTML要素の取得
const chordDisplay = document.getElementById('chord-display');
const spectrumCanvas = document.getElementById('spectrum-canvas'); // 正しい変数名で取得
const sensorDot = document.getElementById('sensor-dot');
const startButtonContainer = document.getElementById('start-button-container');
const startButton = document.getElementById('start-button');
const metronomeDots = document.querySelectorAll('.beat-dot');
const canvasCtx = spectrumCanvas.getContext('2d'); // 正しい変数名からgetContextする

// 定数と変数
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteList = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
let currentNote = 'Note';
let audioContext, analyserNode;

let bpm = 120;
let beatDuration = 60000 / bpm;
let lastBeatTime = 0;
let currentBeat = 0;
let gameLoopId = null;

// --- 初期化 ---
chordDisplay.textContent = 'Note';
drawSpectrum();

// --- イベントリスナー ---
startButton.addEventListener('click', initAudio);

// --- メインロジック ---
function initAudio() {
    if (audioContext) return;
    startButton.textContent = 'Starting...';
    startButton.disabled = true;

    // 起動ロジック
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(handleStream)
        .catch(handleError);
}

function handleStream(stream) {
    startButtonContainer.style.display = 'none';
    
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    source.connect(analyserNode);

    lastBeatTime = performance.now();
    update(); // メインループを開始
}

function handleError(err) {
    startButton.textContent = `Error: ${err.name}`;
    console.error('Error:', err);
}

function update() {
    // BPMメトロノーム処理
    if (performance.now() - lastBeatTime > beatDuration) {
        lastBeatTime = performance.now();
        currentBeat = (currentBeat % 4) + 1;
        updateMetronomeDots(currentBeat);
        if (currentBeat === 1) {
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
        dot.classList.toggle('active', index < beat);
    });
}

function detectPitch() {
    if (!analyserNode) return;
    
    const buffer = new Float32Array(analyserNode.fftSize);
    analyserNode.getFloatTimeDomainData(buffer);
    const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / buffer.length);

    if (rms > 0.01) {
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
    // この関数内では、すべて'spectrumCanvas'と'canvasCtx'を使用
    if (!analyserNode) {
        canvasCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
        return;
    };
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
