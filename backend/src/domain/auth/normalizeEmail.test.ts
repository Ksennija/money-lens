import { normalizeEmail } from './normalizeEmail.js';

describe('normalizeEmail', () => {
  it('leaves an already normalized email unchanged', () => {
    expect(normalizeEmail('newuser@example.com')).toBe('newuser@example.com');
  });

  it('lowercases the email', () => {
    expect(normalizeEmail('NewUser@Example.COM')).toBe('newuser@example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeEmail('  newuser@example.com \t')).toBe('newuser@example.com');
  });

  it('maps case and whitespace variants to the same value', () => {
    expect(normalizeEmail(' Newuser@Example.com ')).toBe(normalizeEmail('newuser@example.com'));
  });
});
