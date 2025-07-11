// HTMLの要素を取得
const resultMessage = document.getElementById('result-message');
const chordDisplay = document.getElementById('chord-display');
const pieTimerFill = document.getElementById('pie-timer-fill');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const noteDisplay = document.getElementById('note-display');
const canvasCtx = spectrumCanvas.getContext('2d');

const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteList = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
let currentNote = '';

const DURATION = 10;
let audioContext;
let analyserNode;
let gameLoopId, roundStartTime;
let isPaused = true;
const detectedNoteHistory = []; // 音の履歴を保存する配列

resultMessage.textContent = "Click or Press Space to Start";
drawSpectrum(); // 待機状態のアナライザを初回に描画

document.body.addEventListener('click', togglePause);
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); togglePause(); }
});

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
        if (audioContext && audioContext.state === 'running') audioContext.suspend();
        resultMessage.textContent = 'Paused';
        resultMessage.className = 'display';
        sensorDot.className = '';
    } else {
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
        startNextRound();
    }
}

function startNextRound() {
    if (isPaused) return;
    
    resultMessage.textContent = '';
    sensorDot.className = '';
    noteDisplay.textContent = '--';
    
    chordDisplay.classList.remove('flipping');
    chordDisplay.textContent = ''; 

    setTimeout(() => {
        let newNote;
        do { newNote = noteList[Math.floor(Math.random() * noteList.length)]; } while (newNote === currentNote);
        currentNote = newNote;
        chordDisplay.textContent = currentNote;
        chordDisplay.classList.add('flipping');
    }, 100);

    if (!audioContext) initAudio();
    
    roundStartTime = performance.now();
    if(gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(update);
}

function update(currentTime) {
    if (isPaused) return;
    const elapsedTime = (currentTime - roundStartTime) / 1000;
    const progress = Math.min(elapsedTime / DURATION, 1);
    updatePieTimer(progress);
    drawSpectrum();
    if (progress >= 1) {
        stopTraining('Oops!', 'incorrect');
        return;
    }
    gameLoopId = requestAnimationFrame(update);
}

function stopTraining(message, className) {
    if (!gameLoopId) return;
    
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;

    resultMessage.textContent = message;
    resultMessage.className = `display ${className}`;
    sensorDot.className = className;
    
    if (!isPaused) {
        setTimeout(startNextRound, 1500);
    }
}

function initAudio() {
    audioContext = new AudioContext();
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
            noteDisplay.textContent = 'MIC OK';
            const source = audioContext.createMediaStreamSource(stream);
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 2048;
            source.connect(analyserNode);
            detectPitch(); // 認識ループを開始
        })
        .catch(err => {
            noteDisplay.textContent = `Error: ${err.name}`;
        });
}

function detectPitch() {
    if (!analyserNode || isPaused) {
        requestAnimationFrame(detectPitch);
        return;
    };
    
    const bufferLength = analyserNode.frequencyBinCount;
    const buffer = new Float32Array(bufferLength);
    analyserNode.getFloatTimeDomainData(buffer);

    const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / bufferLength);

    if (rms > 0.01) {
        let bestCorrelation = 0;
        let bestLag = -1;
        for (let lag = 40; lag < 1000; lag++) {
            let correlation = 0;
            for (let i = 0; i < bufferLength - lag; i++) {
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
            noteDisplay.textContent = `${mostFrequentNote} (Detected: ${noteName})`;

            // 正解判定
            if (gameLoopId && mostFrequentNote.charAt(0) === currentNote) {
                flashSensor('correct');
                stopTraining('nice!', 'correct');
            }
        }
    } else {
        noteDisplay.textContent = 'Listening...';
    }

    requestAnimationFrame(detectPitch);
}

function getMostFrequentNote(arr) {
    if (arr.length === 0) return "--";
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

function updatePieTimer(progress) {
    const angle = progress * 360;
    const x = 10 + Math.cos((angle - 90) * Math.PI / 180) * 8;
    const y = 10 + Math.sin((angle - 90) * Math.PI / 180) * 8;
    if (isNaN(x) || isNaN(y)) return;
    const largeArcFlag = angle > 180 ? 1 : 0;
    const d = `M 10,10 L 10,2 A 8,8 0 ${largeArcFlag},1 ${x},${y} Z`;
    
    if (progress < 1) pieTimerFill.setAttribute('d', d);
    else pieTimerFill.setAttribute('d', 'M 10,10 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0');
}

function drawSpectrum() {
    if (!analyserNode) return;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i];
        canvasCtx.fillStyle = 'rgb(100, 100, 100)';
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
    }
}
