/**
 * Encrypted ID Utility
 * Creates visually scrambled / partially-masked IDs for
 * the "homomorphic encryption style visualization" in the doctor portal.
 */

const GLYPHS = '▓░█▒▄▀■□◆◇●○◉◎◈⬡⬢';
const HEX    = '0123456789ABCDEF';

/** Full mask — replace all alphanumeric chars with block glyphs */
export function maskFull(str = '') {
  return str.replace(/[A-Z0-9]/gi, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
}

/** Partial mask — show first+last segment, scramble middle */
export function maskPartial(str = '') {
  const parts = str.split('-');
  if (parts.length < 3) return maskFull(str);
  const middle = parts.slice(1, -1).map(seg =>
    seg.replace(/./g, () => HEX[Math.floor(Math.random() * HEX.length)])
  );
  return [parts[0], ...middle.map(m => `<span class="enc-mid">${m}</span>`), parts[parts.length - 1]].join('-');
}

/** Render an encrypted ID element with decrypt-on-hover effect */
export function renderEncryptedId(id = '', opts = {}) {
  const { size = '12px', color = '#34d399', showLock = true } = opts;
  const masked = maskPartial(id);
  return `
    <span class="encrypted-id-wrap" data-real="${id}" data-masked="${maskFull(id)}"
          style="font-family:'JetBrains Mono',monospace;font-size:${size};color:${color};cursor:default"
          onmouseenter="window._decryptId(this)"
          onmouseleave="window._reEncryptId(this)">
      ${showLock ? '<span class="enc-lock">🔒</span>' : ''}
      <span class="enc-text">${masked}</span>
    </span>`;
}

/** Call once globally to wire up the decrypt/re-encrypt hover handlers */
export function initEncryptedIdHandlers() {
  window._decryptId = function(el) {
    const text = el.querySelector('.enc-text');
    const real = el.dataset.real;
    if (!text) return;
    text.classList.add('decrypting');
    let frame = 0;
    const steps = 8;
    const iv = setInterval(() => {
      frame++;
      if (frame >= steps) {
        clearInterval(iv);
        text.innerHTML = `<span class="decrypted">${real}</span>`;
        text.classList.remove('decrypting');
      } else {
        const progress = frame / steps;
        const chars = real.split('');
        text.innerHTML = chars.map((c, i) => {
          if (i / chars.length < progress) return c;
          return /[A-Z0-9]/i.test(c)
            ? HEX[Math.floor(Math.random() * HEX.length)]
            : c;
        }).join('');
      }
    }, 40);
    el._decryptIv = iv;
    el.querySelector('.enc-lock') && (el.querySelector('.enc-lock').textContent = '🔓');
  };

  window._reEncryptId = function(el) {
    if (el._decryptIv) { clearInterval(el._decryptIv); el._decryptIv = null; }
    const text = el.querySelector('.enc-text');
    const real = el.dataset.real;
    if (!text) return;
    let frame = 0;
    const steps = 6;
    const iv = setInterval(() => {
      frame++;
      if (frame >= steps) {
        clearInterval(iv);
        text.innerHTML = maskPartial(real);
      } else {
        text.innerHTML = maskFull(real);
      }
    }, 40);
    el.querySelector('.enc-lock') && (el.querySelector('.enc-lock').textContent = '🔒');
  };
}
