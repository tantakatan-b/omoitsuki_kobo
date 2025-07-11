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
let audioContext;
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
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
        startNextRound();
    }
}

function startNextRound() {
    if (isPaused) return;
    
    resultMessage.textContent = ''; sensorDot.className = '';
    noteDisplay.textContent = '--';
    
    chordDisplay.classList.remove('flipping'); chordDisplay.textContent = ''; 

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
    // アナライザの描画はml5.jsの処理と競合するため、一旦停止
    // drawSpectrum(); 
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

// --- ここから下がml5.jsを使った新しい音声認識ロジック ---

function initAudio() {
    audioContext = new AudioContext();
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            noteDisplay.textContent = 'MIC OK';
            // ml5.jsのピッチ検出モデルを準備
            const pitchDetection = ml5.pitchDetection('./model/', audioContext, stream, modelLoaded);
            
            function modelLoaded() {
                noteDisplay.textContent = 'Model Loaded!';
                getPitch();
            }

            function getPitch() {
                pitchDetection.getPitch((err, frequency) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    if (frequency && !isPaused) {
                        // 周波数が検出されたら判定
                        checkPitch(frequency);
                    }
                    // 繰り返し呼び出す
                    if (!isPaused) getPitch();
                });
            }
        })
        .catch(err => {
            noteDisplay.textContent = `MIC Error: ${err.name}`;
            console.error("マイクエラー:", err);
        });
}

// 周波数(Hz)を音名に変換するヘルパー関数
function frequencyToNoteName(frequency) {
    const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const midiNum = 69 + 12 * Math.log2(frequency / 440);
    const noteIndex = Math.round(midiNum) % 12;
    return noteStrings[noteIndex];
}

function checkPitch(frequency) {
    if (!frequency || !gameLoopId) return;

    const detectedNote = frequencyToNoteName(frequency);
    noteDisplay.textContent = `${detectedNote} (${Math.round(frequency)} Hz)`;

    // #やbを無視した単純な比較
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

// 以下の関数は変更なし
function updatePieTimer(progress) { /* ... */ }
function drawSpectrum() { /* ... */ } // 現在は未使用
