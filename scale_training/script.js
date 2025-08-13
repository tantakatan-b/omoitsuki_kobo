// どの弦の、どのフレットを押さえるかのデータ
// string: 6弦(E)が1、1弦(e)が6
// fret: 0は開放弦、1は1フレット
const cMajorData = {
    name: 'C',
    positions: [
        { string: 2, fret: 1 }, // 2弦の1フレット
        { string: 4, fret: 2 }, // 4弦の2フレット
        { string: 5, fret: 3 }, // 5弦の3フレット
        { string: 1, fret: 0 }, // 1弦は開放弦
        { string: 3, fret: 0 }  // 3弦は開放弦
    ]
};

const fretboard = document.getElementById('fretboard');

// 弦とフレットの位置から、SVG上の座標を計算する関数
function getCoordinates(string, fret) {
    const x = 25 + (string - 1) * 20;
    const y = fret === 0 ? -5 : 10 + (fret - 1) * 40 + 20;
    return { x, y };
}

// データに基づいてドットを描画する関数
function drawDiagram(chordData) {
    chordData.positions.forEach(pos => {
        const coords = getCoordinates(pos.string, pos.fret);
        let shape;

        if (pos.fret === 0) {
            // 開放弦の「○」マーク
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shape.setAttribute('cx', coords.x);
            shape.setAttribute('cy', coords.y + 10);
            shape.setAttribute('r', 5);
            shape.setAttribute('class', 'open-string');
        } else {
            // 押さえる位置の「●」マーク
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shape.setAttribute('cx', coords.x);
            shape.setAttribute('cy', coords.y);
            shape.setAttribute('r', 8);
            shape.setAttribute('class', 'dot');
        }
        
        fretboard.appendChild(shape);
    });
}

// Cメジャーを描画
drawDiagram(cMajorData);