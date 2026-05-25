import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a cryptographically secure random token for customer tracking links.
 * e.g. "a3f9c2d1e8b4..."  (64-char hex string)
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generates a sequential-style complaint reference.
 * Format: CCMS-YYYY-NNNNN
 * NOTE: The sequence number is derived from a random 5-digit number here.
 * In production this would use a DB sequence for true sequential refs.
 */
export function generateComplaintRef(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(10000 + Math.random() * 90000); // 5-digit number
  return `CCMS-${year}-${seq}`;
}

/**
 * Generates a random order reference.
 * Format: ORD-NNNN
 */
export function generateOrderRef(): string {
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${seq}`;
}

/**
 * Builds the public customer tracking URL.
 * Format: {frontendUrl}/track/{orderRef}/{secureToken}
 */
export function buildTrackingUrl(
  frontendUrl: string,
  orderRef: string,
  secureToken: string,
): string {
  return `${frontendUrl}/track/${orderRef}/${secureToken}`;
}

export { uuidv4 };
