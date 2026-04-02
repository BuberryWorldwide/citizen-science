const API_BASE = process.env.BACKEND_API_URL || 'https://api.buberryworldwide.com';

export async function backendFetch(path: string, options?: RequestInit & { userId?: string }) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  if (options?.userId) {
    headers['x-user-id'] = options.userId;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  return res.json();
}
