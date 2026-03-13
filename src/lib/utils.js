/** Fisher-Yates shuffle (immutable) */
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Get the answer form of a word (conjugated form or base word) */
export function getAnswer(w) {
  return w.cj || w.w
}
