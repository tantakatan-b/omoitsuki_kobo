// HTML要素
const chordDisplay = document.getElementById('chord-display');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const startButtonContainer = document.getElementById('start-button-container');
const startButton = document.getElementById('start-button');
const metronomeDots = document.querySelectorAll('.beat-dot');
const resultMessage = document.getElementById('result-message'); // resultMessageを取得
const canvasCtx = spectrumCanvas.getContext('2d');

// 定数と変数
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteList = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
let currentNote = 'Note';
let audioContext, analyserNode;
let gameLoopId = null;
let isPlaying = false; // ポーズ状態を管理

let bpm = 120;
let beatDuration = 60000 / bpm;
let lastBeatTime = 0;
let currentBeat = 0;

// --- 初期化 ---
chordDisplay.textContent = 'Note';
resultMessage.textContent = "Click or Press Space to Start";
drawSpectrum();

// --- イベントリスナー ---
document.body.addEventListener('click', togglePlayPause);
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
    }
});

// --- メインロジック ---
function togglePlayPause() {
    // 最初のクリックでオーディオを初期化
    if (!audioContext) {
        initAudio();
        return;
    }

    // 2回目以降は再生/一時停止を切り替え
    isPlaying = !isPlaying;
    if (isPlaying) {
        audioContext.resume();
        resultMessage.textContent = '';
        lastBeatTime = performance.now() - (beatDuration * currentBeat); // 停止した拍から再開
        update();
    } else {
        audioContext.suspend();
        cancelAnimationFrame(gameLoopId);
        resultMessage.textContent = 'Paused';
    }
}

function initAudio() {
    startButton.textContent = 'Starting...';
    startButton.disabled = true;

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

    // 最初のクリックでは開始せず、ユーザーが再度操作するのを待つ
    isPlaying = false;
    resultMessage.textContent = 'Ready. Click or Press Space to Play.';
    audioContext.suspend(); // すぐに一時停止
}

function handleError(err) {
    startButton.textContent = `Error: ${err.name}`;
    console.error('Error:', err);
}

function update() {
    if (!isPlaying) return; // isPlayingがfalseならループを停止

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

    if (rms > 0.02) {
        const noteName = findFundamentalFreq(buffer, audioContext.sampleRate);
        if (noteName) {
            // デバッグ表示を復活
            document.getElementById('note-display').textContent = noteName;
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
