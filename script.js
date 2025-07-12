// HTMLの要素を取得
const chordDisplay = document.getElementById('chord-display');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const bpmDisplay = document.getElementById('bpm-display');
const metronomeDots = document.querySelectorAll('.beat-dot');
const startButtonContainer = document.getElementById('start-button-container');
const startButton = document.getElementById('start-button');
const canvasCtx = spectrumCanvas.getContext('2d');

// 定数と変数
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteList = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
let currentNote = 'Note';
let audioContext, analyserNode;
const detectedNoteHistory = [];

let bpm = 120;
let beatDuration = 60000 / bpm;
let lastBeatTime = 0;
let currentBeat = 0;

// --- 初期化 ---
chordDisplay.textContent = 'Note';
drawSpectrum(); // 待機状態のアナライザを初回に描画

// --- イベントリスナー ---
startButton.addEventListener('click', initAudio);

// --- メインロジック ---
function initAudio() {
    if (audioContext) return; // 既に開始していたら何もしない

    startButton.textContent = 'Starting...';
    audioContext = new AudioContext();

    // ユーザーの操作直後にAudioContextを再開
    audioContext.resume().then(() => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(handleStream)
            .catch(handleError);
    });
}

function handleStream(stream) {
    startButtonContainer.style.display = 'none'; // スタートボタンを隠す
    
    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    source.connect(analyserNode);

    // ゲームループを開始
    lastBeatTime = performance.now();
    requestAnimationFrame(update);
}

function handleError(err) {
    startButton.textContent = `Error: ${err.name}`;
    console.error('Error:', err);
}

function update(currentTime) {
    // BPMメトロノーム処理
    if (currentTime - lastBeatTime > beatDuration) {
        lastBeatTime = currentTime;
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
            detectedNoteHistory.push(noteName);
            if (detectedNoteHistory.length > 7) detectedNoteHistory.shift();
            
            const mostFrequentNote = getMostFrequentNote(detectedNoteHistory);
            if (mostFrequentNote && mostFrequentNote.charAt(0) === currentNote) {
                flashSensor('correct');
            } else {
                flashSensor('incorrect');
            }
        }
    }
}

function getMostFrequentNote(arr) {
    if (arr.length === 0) return null;
    const counts = arr.reduce((acc, value) => ({...acc, [value]: (acc[value] || 0) + 1 }), {});
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

function flashSensor(className) {
    sensorDot.className = className;
    setTimeout(() => { sensorDot.className = ''; }, 200);
}

function frequencyToNoteName(frequency) {
    const midiNum = 69 + 12 * Math.log2(frequency / 440);
    return noteStrings[Math.round(midiNum) % 12];
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
