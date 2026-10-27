import { KEYS, safeRead, safeWrite } from './storage.js';
export function getTheme() {
  const saved = safeRead(KEYS.theme, 'light');
  return saved === 'dark' ? 'dark' : 'light';
}
export function applyTheme(theme = getTheme()) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('theme-dark', next === 'dark');
  document.documentElement.dataset.theme = next;
  const label = next === 'dark' ? 'Aktifkan tema terang' : 'Aktifkan tema gelap';
  document.querySelectorAll('[data-theme-toggle], #store-theme-toggle').forEach(button => {
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    const icon = button.querySelector('use');
    if (icon) { const base = document.body?.dataset.app === 'admin' ? '../assets/icons/sprite.svg#' : './assets/icons/sprite.svg#'; icon.setAttribute('href', `${base}${next === 'dark' ? 'sun' : 'moon'}`); }
    const text = button.querySelector('[data-theme-label]');
    if (text) text.textContent = next === 'dark' ? 'Tema terang' : 'Tema gelap';
  });
  safeWrite(KEYS.theme, next);
  return next;
}
export function toggleTheme() { return applyTheme(getTheme() === 'dark' ? 'light' : 'dark'); }
