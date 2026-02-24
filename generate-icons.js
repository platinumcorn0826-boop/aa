/**
 * generate-icons.js
 * SVGからPWA用アイコンを生成するNode.jsスクリプト
 */
const fs = require('fs');
const path = require('path');

// Canvas を使わずに、SVGをPNGに変換するためのHTMLを使用
// → ブラウザが使えないため、SVGをそのままiconとして使用し
//    Chromeがmanifestを読む際に対応するフォールバックを設定

// SVGをBase64 PNG風に使うため、専用のHTMLファイルを生成
const svgContent = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');

const html = `<!DOCTYPE html>
<html>
<head><style>body{margin:0;background:#07070d;}</style></head>
<body>
<canvas id="c" width="512" height="512"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  const blob = new Blob([${JSON.stringify(svgContent)}], {type: 'image/svg+xml'});
  img.onload = () => {
    ctx.drawImage(img, 0, 0, 512, 512);
    const link512 = document.createElement('a');
    link512.download = 'icon-512.png';
    link512.href = canvas.toDataURL('image/png');
    link512.click();
    
    setTimeout(() => {
      const c2 = document.createElement('canvas');
      c2.width = 192; c2.height = 192;
      c2.getContext('2d').drawImage(img, 0, 0, 192, 192);
      const link192 = document.createElement('a');
      link192.download = 'icon-192.png';
      link192.href = c2.toDataURL('image/png');
      link192.click();
    }, 500);
  };
  img.src = URL.createObjectURL(blob);
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'generate-icons.html'), html);
console.log('generate-icons.html を生成しました。ブラウザで開いてアイコンをダウンロードしてください。');
