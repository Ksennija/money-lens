export type LoginCode = 'logged-in' | 'invalid-credentials' | 'server-error';

export type LoginResult = { ok: boolean; code: LoginCode; message: string };

const SERVER_ERROR: LoginResult = {
  ok: false,
  code: 'server-error',
  message: 'Something went wrong',
};

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch('/api/login', {
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
