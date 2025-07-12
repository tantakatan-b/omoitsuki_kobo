// HTMLの要素を取得
const chordDisplay = document.getElementById('chord-display');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const startButtonContainer = document.getElementById('start-button-container');
const startButton = document.getElementById('start-button');
const metronomeDots = document.querySelectorAll('.beat-dot');
const canvasCtx = spectrumCanvas.getContext('2d');

console.log("Script loaded. Initializing variables.");

// 定数と変数
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteList = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
let currentNote = 'Note';
let audioContext, analyserNode;

let bpm = 120;
let beatDuration = 60000 / bpm;
let lastBeatTime = 0;
let currentBeat = 0;
let frameCount = 0; // ループ確認用のカウンター

// --- 初期化 ---
chordDisplay.textContent = 'Note';
drawSpectrum();

// --- イベントリスナー ---
startButton.addEventListener('click', initAudio);
console.log("Event listener attached to START button.");

// --- メインロジック ---
function initAudio() {
    console.log("START button clicked. initAudio() called.");
    if (audioContext) {
        console.log("AudioContext already exists. Exiting initAudio.");
        return;
    }
    startButton.textContent = 'Requesting MIC...';
    startButton.disabled = true;

    console.log("Requesting microphone access (getUserMedia)...");
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(handleStream)
        .catch(handleError);
}

function handleStream(stream) {
    console.log("SUCCESS: Microphone access granted. handleStream() called.");
    startButtonContainer.style.display = 'none';
    
    console.log("Creating new AudioContext...");
    audioContext = new AudioContext();
    
    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    source.connect(analyserNode);
    console.log("Audio nodes connected.");

    lastBeatTime = performance.now();
    console.log("Starting main update loop...");
    update();
}

function handleError(err) {
    console.error('CRITICAL ERROR:', err);
    startButton.textContent = `Error: ${err.name}`;
    chordDisplay.textContent = 'FAIL';
}

function update() {
    if (frameCount < 5) { // 最初の5フレームだけログを出す
        console.log(`Update loop frame: ${frameCount + 1}`);
    }
    frameCount++;

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
    console.log("Changing note...");
    let newNote;
    do { newNote = noteList[Math.floor(Math.random() * noteList.length)]; } while (newNote === currentNote);
    currentNote = newNote;
    chordDisplay.textContent = currentNote;
}

// ... (以下の関数は変更ありませんが、念のためすべて記載します) ...

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
        let bestCorrelation = 0, bestLag = -1;
        for (let lag = 40; lag < 1000; lag++) {
            let correlation = 0;
            for (let i = 0; i < analyserNode.fftSize - lag; i++) {
                correlation += buffer[i] * buffer[i + lag];
            }
            if (correlation > bestCorrelation) { bestCorrelation = correlation; bestLag = lag; }
        }
        if (bestLag !== -1) {
            const frequency = audioContext.sampleRate / bestLag;
            const noteName = frequencyToNoteName(frequency);
            if (noteName.charAt(0) === currentNote) {
                flashSensor('correct');
            } else {
                flashSensor('incorrect');
            }
        }
    }
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
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
    }
}
