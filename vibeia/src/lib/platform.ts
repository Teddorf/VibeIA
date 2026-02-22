/**
 * Split a string into lines, handling all line-ending conventions:
 * \r\n (Windows), \r (old Mac), \n (Unix/Linux/macOS)
 *
 * Frontend-safe: no Node.js dependencies.
 */
export function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}
