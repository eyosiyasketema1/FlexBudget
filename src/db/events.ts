// Tiny pub/sub so the UI can refresh after any write. Replaces WatermelonDB's
// observables: repository mutations call notifyChange(); hooks subscribe via
// onDataChange() and re-run their queries.

type Listener = () => void;
const listeners = new Set<Listener>();

export function onDataChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function notifyChange(): void {
  listeners.forEach((l) => l());
}
