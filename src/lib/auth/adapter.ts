/**
 * Remote NextAuth adapter — calls the buberry API backend
 * instead of connecting to Postgres directly.
 */
import { Adapter, AdapterUser, AdapterAccount, VerificationToken } from 'next-auth/adapters';

const API = process.env.BACKEND_API_URL || 'https://api.buberryworldwide.com';

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API}/api/auth/adapter${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  return json.data;
}

function mapUser(row: Record<string, unknown> | null): AdapterUser | null {
  if (!row) return null;
  return {
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string) ?? null,
    image: (row.image as string) ?? null,
    emailVerified: row.emailVerified ? new Date(row.emailVerified as string) : null,
  };
}

export function BuberryAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, 'id'>) {
      const data = await api('/createUser', { method: 'POST', body: JSON.stringify(user) });
      return mapUser(data)!;
    },

    async getUser(id) {
      const data = await api(`/getUser?id=${id}`);
      return mapUser(data);
    },

    async getUserByEmail(email) {
      const data = await api(`/getUserByEmail?email=${encodeURIComponent(email)}`);
      return mapUser(data);
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const data = await api(`/getUserByAccount?providerAccountId=${encodeURIComponent(providerAccountId)}&provider=${encodeURIComponent(provider)}`);
      return mapUser(data);
    },

    async updateUser(user) {
      const data = await api('/updateUser', { method: 'POST', body: JSON.stringify(user) });
      return mapUser(data)!;
    },

    async deleteUser(userId) {
      // Not implemented — rarely needed
      console.warn('deleteUser not implemented', userId);
    },

    async linkAccount(account: AdapterAccount) {
      await api('/linkAccount', { method: 'POST', body: JSON.stringify(account) });
      return account as AdapterAccount;
    },

    async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      await api('/unlinkAccount', { method: 'POST', body: JSON.stringify({ providerAccountId, provider }) });
    },

    // JWT strategy — sessions stored in cookie, not DB. These are no-ops.
    async createSession() { return null as never; },
    async getSessionAndUser() { return null; },
    async updateSession() { return null as never; },
    async deleteSession() {},
    async createVerificationToken() { return null; },
    async useVerificationToken() { return null; },
  };
}
