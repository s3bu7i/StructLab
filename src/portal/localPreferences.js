export function readLocalPreference(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}

export function writeLocalPreference(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
