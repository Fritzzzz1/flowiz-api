/**
 * UUID mock for testing
 */

export function v4(): string {
  return 'test-uuid-' + Math.random().toString(36).substr(2, 9);
}
