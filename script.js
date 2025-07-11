// HTMLの要素を取得
const resultMessage = document.getElementById('result-message');
const chordDisplay = document.getElementById('chord-display');
const pieTimerFill = document.getElementById('pie-timer-fill');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const noteDisplay = document.getElementById('note-display');
const canvasCtx = spectrumCanvas.getContext('2d');

const noteList = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
let currentNote = '';

const DURATION = 10;
let audioContext, pitchDetection; // pitchDetectionをグローバルに
let gameLoopId, roundStartTime;
let isPaused = true;

resultMessage.textContent = "Click or Press Space to Start";
drawSpectrum();

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
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                if (!gameLoopId) getPitch(); // ポーズ解除時に認識を再開
            });
        }
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

    if (!audioContext) {
        initAudio();
    }
    
    roundStartTime = performance.now();
    if(gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(update);
}

function update(currentTime) {
    if (isPaused) return;
    const elapsedTime = (currentTime - roundStartTime) / 1000;
    const progress = Math.min(elapsedTime / DURATION, 1);
    updatePieTimer(progress);
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
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            noteDisplay.textContent = 'Loading Model...';
            // --- 変更: モデルのURLを直接指定 ---
            const modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
            pitchDetection = ml5.pitchDetection(modelUrl, audioContext, stream, modelLoaded);
        })
        .catch(err => {
            noteDisplay.textContent = `MIC Error: ${err.name}`;
            console.error("マイクエラー:", err);
        });
}

function modelLoaded() {
    noteDisplay.textContent = 'MIC OK';
    getPitch(); // モデルが読み込めたらピッチ検出を開始
}

function getPitch() {
    if (!pitchDetection || isPaused) return; // ポーズ中なら検出しない
    pitchDetection.getPitch((err, frequency) => {
        if (err) {
            console.error(err);
            noteDisplay.textContent = 'Error';
            return;
        }
        checkPitch(frequency);
        // 次のフレームでもう一度呼び出す
        requestAnimationFrame(getPitch);
    });
}

function frequencyToNoteName(frequency) {
    const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const midiNum = 69 + 12 * Math.log2(frequency / 440);
    return noteStrings[Math.round(midiNum) % 12];
}

function checkPitch(frequency) {
    if (!frequency || !gameLoopId) {
        noteDisplay.textContent = '--';
        return;
    }

    const detectedNote = frequencyToNoteName(frequency);
    noteDisplay.textContent = `${detectedNote} (${Math.round(frequency)} Hz)`;

    if (detectedNote.charAt(0) === currentNote) {
        flashSensor('correct');
        stopTraining('nice!', 'correct');
    } else {
        flashSensor('incorrect');
    }
}

function flashSensor(className) {
    sensorDot.classList.add(className);
    setTimeout(() => {
        sensorDot.classList.remove(className);
    }, 200);
}

function updatePieTimer(progress) {
    const angle = progress * 360;
    const x = 10 + Math.cos((angle - 90) * Math.PI / 180) * 8;
    const y = 10 + Math.sin((angle - 90) * Math.PI / 180) * 8;
    if (isNaN(x) || isNaN(y)) return;
    const largeArcFlag = angle > 180 ? 1 : 0;
    const d = `M 10,10 L 10,2 A 8,8 0 ${largeArcFlag},1 ${x},${y} Z`;
    
    if (progress < 1) {
      pieTimerFill.setAttribute('d', d);
    } else {
      pieTimerFill.setAttribute('d', 'M 10,10 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0');
    }
}

// アナライザはml5.jsと競合するため、現在無効化しています
function drawSpectrum() {}
