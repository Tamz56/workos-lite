import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toYmd, timeAgo } from '@/lib/dates';

describe('dates utility library', () => {
  describe('toYmd', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date(2026, 5, 28); // June 28, 2026
      expect(toYmd(date)).toBe('2026-06-28');
    });

    it('should pad single-digit month and day with zeros', () => {
      const date = new Date(2026, 0, 5); // January 5, 2026
      expect(toYmd(date)).toBe('2026-01-05');
    });
  });

  describe('timeAgo', () => {
    beforeEach(() => {
      // Mock system time to a fixed timestamp: June 28, 2026 12:00:00
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 28, 12, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return seconds ago correctly', () => {
      const date = new Date(2026, 5, 28, 11, 59, 50); // 10 seconds ago
      expect(timeAgo(date)).toBe('10 seconds ago');
    });

    it('should return minutes ago correctly', () => {
      const date = new Date(2026, 5, 28, 11, 50, 0); // 10 minutes ago
      expect(timeAgo(date)).toBe('10 minutes ago');
    });

    it('should return hours ago correctly', () => {
      const date = new Date(2026, 5, 28, 9, 0, 0); // 3 hours ago
      expect(timeAgo(date)).toBe('3 hours ago');
    });

    it('should return days ago correctly', () => {
      const date = new Date(2026, 5, 25, 12, 0, 0); // 3 days ago
      expect(timeAgo(date)).toBe('3 days ago');
    });

    it('should return months ago correctly', () => {
      const date = new Date(2026, 3, 28, 12, 0, 0); // 2 months ago (April to June)
      expect(timeAgo(date)).toBe('2 months ago');
    });

    it('should return years ago correctly', () => {
      const date = new Date(2024, 5, 28, 12, 0, 0); // 2 years ago
      expect(timeAgo(date)).toBe('2 years ago');
    });
  });
});
