// HTML要素
const chordDisplay = document.getElementById('chord-display');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const startButton = document.getElementById('start-button');
const playPauseButton = document.getElementById('play-pause-button');
const beepToggleButton = document.getElementById('beep-toggle');
const metronomeDots = document.querySelectorAll('.beat-dot');
const canvasCtx = spectrumCanvas.getContext('2d');

// 定数と変数
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
let bpm = 120;
let lastBeatTime = 0;
let currentBeat = 0;

// --- 初期化 ---
chordDisplay.textContent = 'Note';
drawSpectrum();

// --- イベントリスナー ---
startButton.addEventListener('click', initAudio);
playPauseButton.addEventListener('click', togglePlayPause);
beepToggleButton.addEventListener('click', toggleBeep);

// --- メインロジック ---
function initAudio() {
    if (audioContext) return;
    startButton.textContent = '...';
    startButton.disabled = true;

    audioContext = new AudioContext();
    audioContext.resume().then(() => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(handleStream)
            .catch(handleError);
    });
}

function handleStream(stream) {
    startButton.style.display = 'none';
    playPauseButton.style.display = 'block';
    
    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    source.connect(analyserNode);

    togglePlayPause(); // 最初の再生を開始
}

function handleError(err) {
    document.getElementById('control-area').innerHTML = `<span style="color: red;">Error: ${err.name}</span>`;
}

function togglePlayPause() {
    isPlaying = !isPlaying;
    if (isPlaying) {
        audioContext.resume();
        playPauseButton.textContent = 'PAUSE';
        lastBeatTime = performance.now() - ((60000 / bpm) * currentBeat);
        update();
    } else {
        audioContext.suspend();
        playPauseButton.textContent = 'PLAY';
    }
}

function toggleBeep() {
    isBeepEnabled = !isBeepEnabled;
    beepToggleButton.classList.toggle('active', isBeepEnabled);
}

function update() {
    if (!isPlaying) return;
    const beatDuration = 60000 / bpm;

    if (performance.now() - lastBeatTime > beatDuration) {
        lastBeatTime = performance.now();
        currentBeat = (currentBeat + 1) % 4;
        updateMetronomeDots(currentBeat);
        if (isBeepEnabled) playBeep(currentBeat);
        if (currentBeat === 0) {
            changeChord();
        }
    }
    drawSpectrum();
    detectPitch();

    requestAnimationFrame(update);
}

function changeChord() {
    let newChord;
    do { newChord = chordList[Math.floor(Math.random() * chordList.length)]; } while (newChord === currentChord);
    currentChord = newChord;
    chordDisplay.textContent = currentChord;
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
            const correctNotes = chordFormulas[currentChord];
            if (correctNotes && correctNotes.includes(noteName)) {
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
    sensorDot.className = `active ${className}`;
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
        const barHeight = dataArray[i] / 2;
        canvasCtx.fillStyle = 'rgb(150, 150, 150)';
        canvasCtx.fillRect(x, spectrumCanvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
}
