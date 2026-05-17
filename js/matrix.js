/*
 * matrix.js
 * Creates a Matrix-style digital rain effect on a full-screen canvas appended to .matrix-overlay.
 */

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.querySelector('.matrix-overlay');
  if (!overlay) return;

  const canvas = document.createElement('canvas');
  canvas.classList.add('matrix-canvas');
  overlay.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  
  // Set dimensions
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Characters to use in the rain
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?/\\~`'
                + 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレゲゼデベペオォコソトノホモヨョロゴゾドボポヴッン';
  const charArray = chars.split('');

  const fontSize = 14;
  let columns = canvas.width / fontSize;
  const drops = [];

  for (let x = 0; x < columns; x++) {
    drops[x] = 1;
  }

  function draw() {
    // Translucent background to show trail
    ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F0'; // Neon green text
    ctx.font = fontSize + 'px "Share Tech Mono", monospace';

    for (let i = 0; i < drops.length; i++) {
      const text = charArray[Math.floor(Math.random() * charArray.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  // Handle dynamic resizing for drops array length
  window.addEventListener('resize', () => {
    const newColumns = canvas.width / fontSize;
    if (newColumns > columns) {
      for (let x = columns; x < newColumns; x++) {
        drops[x] = 1;
      }
    }
    columns = newColumns;
  });

  setInterval(draw, 33);
});
