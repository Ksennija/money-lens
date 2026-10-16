export type RegisterCode =
  | 'registered'
  | 'invalid-email'
  | 'invalid-password'
  | 'email-taken'
  | 'server-error';

export type RegisterResult = { ok: boolean; code: RegisterCode; message: string };

const SERVER_ERROR: RegisterResult = {
  ok: false,
  code: 'server-error',
  message: 'Something went wrong',
};

export async function registerUser(email: string, password: string): Promise<RegisterResult> {
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();
    if (typeof body?.code !== 'string' || typeof body?.message !== 'string') {
      return SERVER_ERROR;
    }
    return { ok: res.ok, code: body.code, message: body.message };
  } catch {
    return SERVER_ERROR;
  }
}
