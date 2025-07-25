# Code Training

これは、Webブラウザのマイク機能を利用して、ギターのコードや単音の練習ができるアプリケーションです。

## 概要

このアプリは、BPMに合わせて進行するメトロノームと共に、画面に表示されるコード（または単音）を練習するためのツールです。あなたが弾いた音をリアルタイムで分析し、正しく演奏できているかをフィードバックします。

## 主な機能

- **BPM連動メトロノーム**: 設定したBPMに合わせて4拍子のメトロノームが視覚的に動作し、1小節ごとに新しいコードが出題されます。
- **リアルタイム音声分析**: PCやスマートフォンのマイクから入力された音を直接分析し、ピッチ（音の高さ）を特定します。
- **直感的なフィードバック**: 演奏した音が正しいかどうかを、画面下部のセンサーの色（緑/赤）で即座に知らせます。
- **カスタマイズ機能**:
    - BPMは40から240まで自由に設定可能です。
    - メトロノームのビープ音は、Bキーまたは画面上のボタンでいつでもオン/オフを切り替えられます。

## 使用技術

- HTML5
- CSS3 (Flexbox, Grid, Animation)
- JavaScript (ES6+)
- Web Audio API (ネイティブの音声分析)

## 既知の問題と今後の展望

- 現在は単音（C, D, E...）の練習モードになっていますが、今後はコード（Am7, G7など）の構成音を正しく判定できるようにロジックを改善していく予定です。
- スマートフォンでの表示レイアウトが一部崩れることがあるため、レスポンシブ対応を強化していきます。

---
*このプロジェクトはtantakatanの「思いつき工房」の一環として作成されました。*
