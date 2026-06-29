import SHA256 from 'crypto-js/sha256';

// App-lock password hashing. The password itself is never stored — only its
// SHA-256 hash, kept locally in the settings table. (crypto-js is already a
// dependency via the backup codec.)
export function hashPassword(pw: string): string {
  return SHA256(pw.trim()).toString();
}
