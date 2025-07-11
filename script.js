// HTMLの要素を取得
const resultMessage = document.getElementById('result-message');
const chordDisplay = document.getElementById('chord-display');
const pieTimerFill = document.getElementById('pie-timer-fill');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const sensorDot = document.getElementById('sensor-dot');
const noteDisplay = document.getElementById('note-display');
const canvasCtx = spectrumCanvas.getContext('2d');

// --- 変更: 単音のリストに変更 ---
const noteList = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
let currentNote = ''; // 変数名を currentChord から currentNote に変更

const DURATION = 10;
let analyserNode, pitchy, audioContext;
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
        if (audioContext && audioContext.state === 'running') {
            audioContext.suspend();
        }
        resultMessage.textContent = 'Paused';
        resultMessage.className = 'display';
        sensorDot.className = '';
    } else {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
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
        // --- 変更: noteList からランダムに選ぶ ---
        do { newNote = noteList[Math.floor(Math.random() * noteList.length)]; } while (newNote === currentNote);
        currentNote = newNote;
        chordDisplay.textContent = currentNote; // 表示するのも単音
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

// --- 変更: 単音を判定するシンプルなロジック ---
function checkPitch() {
    if (!analyserNode) return;
    try {
        const [pitch, clarity] = pitchy.getPitch();

        // 常に分析状況を表示
        if (pitch) {
            noteDisplay.textContent = `${pitchy.getNoteFromPitch(pitch)} (${clarity.toFixed(2)})`;
        } else {
            noteDisplay.textContent = `Clarity: ${clarity.toFixed(2)}`;
        }

        // 正解判定（単音なので、ヒットカウンターは不要）
        if (pitch && clarity > 0.92) { // 単音なので、基準値を少し上げる
            const detectedNote = pitchy.getNoteFromPitch(pitch).slice(0, 1); // "C#4" -> "C" (#は今は無視)

            if (detectedNote === currentNote) {
                stopTraining('nice!', 'correct');
            } else {
                flashSensor('incorrect');
            }
        }
    } catch (error) {
        console.error("Error in checkPitch:", error);
        noteDisplay.textContent = 'Error';
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

function drawSpectrum() {
    if (!canvasCtx) return;
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

function initAudio() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            noteDisplay.textContent = 'MIC OK';
            audioContext = new AudioContext();
            const microphoneNode = audioContext.createMediaStreamSource(stream);
            analyserNode = audioContext.createAnalyser();
            microphoneNode.connect(analyserNode);
            pitchy = new Pitchy(analyserNode);
        })
        .catch(err => {
            noteDisplay.textContent = `MIC Error: ${err.name}`;
            console.error("マイクエラー:", err);
        });
}
