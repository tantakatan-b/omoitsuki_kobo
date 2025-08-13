// HTML要素を取得
const chordNameDisplay = document.getElementById('chord-name-display');
const fretboardSvg = document.getElementById('fretboard-svg');
const svgNS = 'http://www.w3.org/2000/svg';

// Cメジャーコードのデータ
// string: 1弦が1, 6弦が6
// fret: 0は開放弦, 'x'はミュート
const cMajorData = {
    name: 'C',
    positions: [
        { string: 6, fret: 'x' },
        { string: 5, fret: 3 },
        { string: 4, fret: 2 },
        { string: 3, fret: 0 },
        { string: 2, fret: 1 },
        { string: 1, fret: 0 }
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
    
    const fretboardWidth = 120;
    const fretboardHeight = 80;
    const startX = 20; // 左側にマージン
    const startY = 10; // 上側にマージン

    const stringSpacing = fretboardHeight / (stringCount - 1);
    const fretSpacing = fretboardWidth / fretCount;

    // 弦 (横線) を描画
    for (let i = 0; i < stringCount; i++) {
        const y = startY + i * stringSpacing;
        fretboardSvg.appendChild(createSvgElement('line', {
            x1: startX, y1: y, x2: startX + fretboardWidth, y2: y, class: 'string'
        }));
    }

    // フレット (縦線) を描画
    for (let i = 1; i <= fretCount; i++) {
        const x = startX + i * fretSpacing;
        fretboardSvg.appendChild(createSvgElement('line', {
            x1: x, y1: startY, x2: x, y2: startY + fretboardHeight, class: 'fret'
        }));
    }

    // ナット（0フレット）を描画
    fretboardSvg.appendChild(createSvgElement('line', {
        x1: startX, y1: startY, x2: startX, y2: startY + fretboardHeight, class: 'nut'
    }));

    // 押弦位置、開放弦、ミュート弦を描画
    chordData.positions.forEach(pos => {
        const y = startY + (pos.string - 1) * stringSpacing;

        if (pos.fret === 0) { // 開放弦 (○)
            fretboardSvg.appendChild(createSvgElement('circle', {
                cx: startX - 10, cy: y, r: 4, class: 'open-string'
            }));
        } else if (pos.fret === 'x') { // ミュート弦 (x)
            fretboardSvg.appendChild(createSvgElement('line', {
                x1: startX - 13, y1: y - 3, x2: startX - 7, y2: y + 3, class: 'muted-string'
            }));
            fretboardSvg.appendChild(createSvgElement('line', {
                x1: startX - 13, y1: y + 3, x2: startX - 7, y2: y - 3, class: 'muted-string'
            }));
        } else { // 押さえるフレット (●)
            const x = startX + (pos.fret * fretSpacing) - (fretSpacing / 2);
            fretboardSvg.appendChild(createSvgElement('circle', {
                cx: x, cy: y, r: 6, class: 'dot'
            }));
        }
    });
}

// ページ読み込み時にCメジャーを描画
drawFretboard(cMajorData);
