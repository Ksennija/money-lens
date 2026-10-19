export type CurrentUser = { email: string };

// Returns null when there is no active session or the session can't be confirmed.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) return null;
    const body = await res.json();
    if (typeof body?.email !== 'string') return null;
    return { email: body.email };
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<boolean> {
  try {
    const res = await fetch('/api/logout', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}
