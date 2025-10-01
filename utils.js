// Экспорт в файл
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

// Генерация QR-кода (без внешних библиотек)
export function generateQR(text, size = 200) {
  const container = document.createElement('div');
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  container.style.margin = '0 auto';
  
  // Простая реализация: ссылка на Google Charts (временно)
  const img = document.createElement('img');
  img.src = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(text)}`;
  img.alt = "QR Code";
  container.appendChild(img);
  
  return container;
}
