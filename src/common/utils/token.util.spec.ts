import {
  generateSecureToken,
  generateComplaintRef,
  generateOrderRef,
  buildTrackingUrl,
} from './token.util';

describe('TokenUtil', () => {
  describe('generateSecureToken', () => {
    it('returns a 64-character hex string', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('generates unique tokens on each call', () => {
      const a = generateSecureToken();
      const b = generateSecureToken();
      expect(a).not.toBe(b);
    });
  });

  describe('generateComplaintRef', () => {
    it('matches CCMS-YYYY-NNNNN format', () => {
      const ref = generateComplaintRef();
      expect(ref).toMatch(/^CCMS-\d{4}-\d{5}$/);
    });
  });

  describe('generateOrderRef', () => {
    it('matches ORD-NNNN format', () => {
      const ref = generateOrderRef();
      expect(ref).toMatch(/^ORD-\d{4}$/);
    });
  });

  describe('buildTrackingUrl', () => {
    it('builds the correct URL', () => {
      const url = buildTrackingUrl('https://ccms.app', 'ORD-9921', 'abc123');
      expect(url).toBe('https://ccms.app/track/ORD-9921/abc123');
    });
  });
});
