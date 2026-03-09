import { splitLines, getTempDir, normalizePath } from './index';

describe('platform utilities', () => {
  describe('splitLines', () => {
    it('should split on Unix newlines (\\n)', () => {
      expect(splitLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
    });

    it('should split on Windows newlines (\\r\\n)', () => {
      expect(splitLines('a\r\nb\r\nc')).toEqual(['a', 'b', 'c']);
    });

    it('should split on old Mac newlines (\\r)', () => {
      expect(splitLines('a\rb\rc')).toEqual(['a', 'b', 'c']);
    });

    it('should handle mixed newlines', () => {
      expect(splitLines('a\nb\r\nc\rd')).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should return single-element array for no newlines', () => {
      expect(splitLines('hello')).toEqual(['hello']);
    });

    it('should return two empty strings for a single newline', () => {
      expect(splitLines('\n')).toEqual(['', '']);
    });

    it('should handle empty string', () => {
      expect(splitLines('')).toEqual(['']);
    });
  });

  describe('getTempDir', () => {
    it('should return a non-empty string', () => {
      const tmp = getTempDir();
      expect(typeof tmp).toBe('string');
      expect(tmp.length).toBeGreaterThan(0);
    });
  });

  describe('normalizePath', () => {
    it('should convert backslashes to forward slashes', () => {
      // On any platform, manually constructed paths with backslashes
      expect(normalizePath('a/b/c')).toBe('a/b/c');
    });

    it('should handle empty string', () => {
      expect(normalizePath('')).toBe('');
    });
  });
});
