// utils.js
export function downloadJSON(data, filename) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateQR(text, size = 200) {
  const container = document.createElement('div');
  const img = document.createElement('img');
  // use Google Charts quick approach (ok for small payloads). Ensure no accidental spaces.
  img.src = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(text)}`;
  img.alt = "QR Code";
  img.style.width = '100%';
  container.appendChild(img);
  return container;
}
