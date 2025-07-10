// HTMLの要素を取得
const resultMessage = document.getElementById('result-message');
const chordDisplay = document.getElementById('chord-display');
const pieTimerFill = document.getElementById('pie-timer-fill');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const noteDisplay = document.getElementById('note-display');
const canvasCtx = spectrumCanvas.getContext('2d');

const chordFormulas = {
    'C':  ['C', 'E', 'G'], 'G':  ['G', 'B', 'D'], 'Am': ['A', 'C', 'E'], 'F':  ['F', 'A', 'C'],
    'Dm': ['D', 'F', 'A'], 'A':  ['A', 'C#', 'E'], 'D':  ['D', 'F#', 'A'], 'E7': ['E', 'G#', 'B', 'D']
};
const chordList = Object.keys(chordFormulas);

const DURATION = 10;
let currentChord = '';
let analyserNode, pitchy, audioContext;
let gameLoopId, roundStartTime;
let isPaused = true;
let correctHitCount = 0;

// 初期描画
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
        resultMessage.textContent = 'Paused';
        resultMessage.className = 'display';
        sensorDot.className = '';
    } else {
        startNextRound();
    }
}

function startNextRound() {
    if (isPaused) return;
    
    correctHitCount = 0;
    resultMessage.textContent = '';
    sensorDot.className = '';
    noteDisplay.textContent = '--';
    
    chordDisplay.classList.remove('flipping');
    chordDisplay.textContent = ''; 

    setTimeout(() => {
        let newChord;
        do { newChord = chordList[Math.floor(Math.random() * chordList.length)]; } while (newChord === currentChord);
        currentChord = newChord;
        chordDisplay.textContent = currentChord;
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

    if (analyserNode) checkPitch();

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

function checkPitch() { /* ... 変更なし ... */ }
function flashSensor(className) { /* ... 変更なし ... */ }
function initAudio() { /* ... 変更なし ... */ }

// --- 変更: 致命的なエラーを修正 ---
function updatePieTimer(progress) {
    const angle = progress * 360;
    const x = 10 + Math.cos((angle - 90) * Math.PI / 180) * 8;
    const y = 10 + Math.sin((angle - 90) * Math.PI / 180) * 8; // Math.I を Math.PI に修正
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    if (isNaN(x) || isNaN(y)) return; // 計算エラーを防ぐ

    const d = `M 10,10 L 10,2 A 8,8 0 ${largeArcFlag},1 ${x},${y} Z`;
    
    if (progress < 1) {
      pieTimerFill.setAttribute('d', d);
    } else {
      pieTimerFill.setAttribute('d', 'M 10,10 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0');
    }
}

function drawSpectrum() {
    canvasCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
    const barWidth = 2;
    let x = 0;
    
    if (analyserNode) {
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);
        
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 3;
            canvasCtx.fillStyle = 'rgb(100, 100, 100)';
            canvasCtx.fillRect(x, spectrumCanvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    } else {
        for (let i = 0; i < 30; i++) {
            const barHeight = 2;
            canvasCtx.fillStyle = 'rgb(180, 180, 180)';
            canvasCtx.fillRect(x, spectrumCanvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
}