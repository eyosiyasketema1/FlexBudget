// Lightweight unique id generator (no native crypto needed).
export function makeId(prefix = 'id'): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${t}-${r}`;
}
