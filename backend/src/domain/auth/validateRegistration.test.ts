import { validateRegistration } from './validateRegistration.js';

describe('validateRegistration', () => {
  it('accepts a valid email and password', () => {
    expect(validateRegistration('newuser@example.com', 'ValidPass123')).toBeNull();
  });

  it('rejects an email without @', () => {
    expect(validateRegistration('newuser.example.com', 'ValidPass123')).toBe('invalid-email');
  });

  it('rejects a missing or non-string email', () => {
    expect(validateRegistration(undefined, 'ValidPass123')).toBe('invalid-email');
    expect(validateRegistration(42, 'ValidPass123')).toBe('invalid-email');
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(validateRegistration('newuser@example.com', '1234567')).toBe('invalid-password');
  });

  it('accepts a password of exactly 8 characters', () => {
    expect(validateRegistration('newuser@example.com', '12345678')).toBeNull();
  });

  it('rejects a missing or non-string password', () => {
    expect(validateRegistration('newuser@example.com', undefined)).toBe('invalid-password');
  });
});
