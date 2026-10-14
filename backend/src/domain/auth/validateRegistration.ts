const MIN_PASSWORD_LENGTH = 8;

export type RegistrationValidationError = 'invalid-email' | 'invalid-password';

export function validateRegistration(
  email: unknown,
  password: unknown,
): RegistrationValidationError | null {
  if (typeof email !== 'string' || !email.includes('@')) {
    return 'invalid-email';
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return 'invalid-password';
  }
  return null;
}
