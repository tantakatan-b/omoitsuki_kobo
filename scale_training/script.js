// HTML要素を取得
const chordNameDisplay = document.getElementById('chord-name-display');
const fretboardSvg = document.getElementById('fretboard-svg');
const svgNS = 'http://www.w3.org/2000/svg'; // SVG要素を作成するためのおまじない

// Cメジャーコードのデータ
// string: 6弦が6, 1弦が1
// fret: 0は開放弦, 'x'はミュート
const cMajorData = {
    name: 'C',
    positions: [
        { string: 6, fret: 'x' }, // 6弦: ミュート
        { string: 5, fret: 3 },   // 5弦: 3フレット
        { string: 4, fret: 2 },   // 4弦: 2フレット
        { string: 3, fret: 0 },   // 3弦: 開放
        { string: 2, fret: 1 },   // 2弦: 1フレット
        { string: 1, fret: 0 }    // 1弦: 開放
    ]
};

// SVG要素を作成して追加するヘルパー関数
function createSvgElement(tag, attributes) {
    const el = document.createElementNS(svgNS, tag);
    for (const key in attributes) {
        el.setAttribute(key, attributes[key]);
    }
    return el;
}

// 指板を描画するメインの関数
function drawFretboard(chordData) {
    fretboardSvg.innerHTML = '';
    chordNameDisplay.textContent = chordData.name;

    const fretCount = 4;
    const stringCount = 6;
    
    const fretboardWidth = 100;
    const fretboardHeight = 100;
    const startX = 10;
    const startY = 10;

    const stringSpacing = fretboardWidth / (stringCount - 1);
    const fretSpacing = fretboardHeight / fretCount;

    // フレット線を描画
    for (let i = 1; i <= fretCount; i++) {
        const y = startY + i * fretSpacing;
        fretboardSvg.appendChild(createSvgElement('line', {
            x1: startX, y1: y, x2: startX + fretboardWidth, y2: y, class: 'fret'
        }));
    }

    // 弦を描画
    for (let i = 0; i < stringCount; i++) {
        const x = startX + i * stringSpacing;
        fretboardSvg.appendChild(createSvgElement('line', {
            x1: x, y1: startY, x2: x, y2: startY + fretboardHeight, class: 'string'
        }));
    }

    // ナット（0フレット）を描画
    fretboardSvg.appendChild(createSvgElement('line', {
        x1: startX, y1: startY, x2: startX + fretboardWidth, y2: startY, class: 'nut'
    }));

    // 押弦位置、開放弦、ミュート弦を描画
    chordData.positions.forEach(pos => {
        const x = startX + (stringCount - pos.string) * stringSpacing;

        if (pos.fret === 0) { // 開放弦 (○)
            fretboardSvg.appendChild(createSvgElement('circle', {
                cx: x, cy: startY - 7, r: 3, class: 'open-string'
            }));
        } else if (pos.fret === 'x') { // ミュート弦 (x)
            fretboardSvg.appendChild(createSvgElement('line', {
                x1: x - 3, y1: startY - 10, x2: x + 3, y2: startY - 4, class: 'muted-string'
            }));
            fretboardSvg.appendChild(createSvgElement('line', {
                x1: x - 3, y1: startY - 4, x2: x + 3, y2: startY - 10, class: 'muted-string'
            }));
        } else { // 押さえるフレット (●)
            // フレットの中央にドットを配置するための計算
            const y = startY + (pos.fret * fretSpacing) - (fretSpacing / 2);
            fretboardSvg.appendChild(createSvgElement('circle', {
                cx: x, cy: y, r: 7, class: 'dot'
            }));
        }
    });
}

// ページ読み込み時にCメジャーを描画
drawFretboard(cMajorData);
