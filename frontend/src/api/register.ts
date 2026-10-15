export type RegisterResult = { message: string };

export async function registerUser(email: string, password: string): Promise<RegisterResult> {
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return { message: body.message };
}
