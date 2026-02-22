import * as os from 'os';
import * as path from 'path';

/**
 * Split a string into lines, handling all line-ending conventions:
 * \r\n (Windows), \r (old Mac), \n (Unix/Linux/macOS)
 */
export function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}

/**
 * Get the OS-appropriate temporary directory.
 */
export function getTempDir(): string {
  return os.tmpdir();
}

/**
 * Normalize a file path to use forward slashes (POSIX-style).
 * Useful for consistent path handling across platforms.
 */
export function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
