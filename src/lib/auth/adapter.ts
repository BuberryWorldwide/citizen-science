/**
 * Custom NextAuth adapter for the existing buberry DB schema.
 * Tables use camelCase columns in public schema.
 */
import { Adapter, AdapterUser, AdapterSession, AdapterAccount, VerificationToken } from 'next-auth/adapters';
import { pool } from '@/lib/db/connection';

type CreateUserInput = Omit<AdapterUser, 'id'>;

export function BuberryAdapter(): Adapter {
  return {
    async createUser(user: CreateUserInput) {
      const result = await pool.query(
        `INSERT INTO public."user" (email, name, image, "emailVerified")
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, image, "emailVerified"`,
        [user.email, user.name, user.image, user.emailVerified]
      );
      return mapUser(result.rows[0]);
    },

    async getUser(id: string) {
      const result = await pool.query(
        'SELECT id, email, name, image, "emailVerified" FROM public."user" WHERE id = $1',
        [id]
      );
      return result.rows[0] ? mapUser(result.rows[0]) : null;
    },

    async getUserByEmail(email: string) {
      const result = await pool.query(
        'SELECT id, email, name, image, "emailVerified" FROM public."user" WHERE email = $1',
        [email]
      );
      return result.rows[0] ? mapUser(result.rows[0]) : null;
    },

    async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      const result = await pool.query(
        `SELECT u.id, u.email, u.name, u.image, u."emailVerified"
         FROM public."user" u
         JOIN public.account a ON a."userId" = u.id
         WHERE a."providerAccountId" = $1 AND a.provider = $2`,
        [providerAccountId, provider]
      );
      return result.rows[0] ? mapUser(result.rows[0]) : null;
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>) {
      const result = await pool.query(
        `UPDATE public."user" SET name = COALESCE($2, name), email = COALESCE($3, email),
         image = COALESCE($4, image), "emailVerified" = COALESCE($5, "emailVerified"),
         "updatedAt" = NOW()
         WHERE id = $1
         RETURNING id, email, name, image, "emailVerified"`,
        [user.id, user.name, user.email, user.image, user.emailVerified]
      );
      return mapUser(result.rows[0]);
    },

    async deleteUser(userId: string) {
      await pool.query('DELETE FROM public."user" WHERE id = $1', [userId]);
    },

    async linkAccount(account: AdapterAccount) {
      await pool.query(
        `INSERT INTO public.account ("userId", type, provider, "providerAccountId",
         refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          account.userId, account.type, account.provider, account.providerAccountId,
          account.refresh_token, account.access_token, account.expires_at,
          account.token_type, account.scope, account.id_token, account.session_state,
        ]
      );
      return account;
    },

    async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      await pool.query(
        'DELETE FROM public.account WHERE "providerAccountId" = $1 AND provider = $2',
        [providerAccountId, provider]
      );
    },

    async createSession(session: { sessionToken: string; userId: string; expires: Date }) {
      await pool.query(
        `INSERT INTO public.session ("sessionToken", "userId", expires)
         VALUES ($1, $2, $3)`,
        [session.sessionToken, session.userId, session.expires]
      );
      return session as AdapterSession;
    },

    async getSessionAndUser(sessionToken: string) {
      const result = await pool.query(
        `SELECT s."sessionToken", s."userId", s.expires,
                u.id, u.email, u.name, u.image, u."emailVerified"
         FROM public.session s
         JOIN public."user" u ON u.id = s."userId"
         WHERE s."sessionToken" = $1`,
        [sessionToken]
      );
      if (!result.rows[0]) return null;
      const row = result.rows[0];
      return {
        session: {
          sessionToken: row.sessionToken,
          userId: row.userId,
          expires: row.expires,
        },
        user: mapUser(row),
      };
    },

    async updateSession(session: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>) {
      const result = await pool.query(
        `UPDATE public.session SET expires = $2 WHERE "sessionToken" = $1
         RETURNING "sessionToken", "userId", expires`,
        [session.sessionToken, session.expires]
      );
      return result.rows[0] as AdapterSession;
    },

    async deleteSession(sessionToken: string) {
      await pool.query(
        'DELETE FROM public.session WHERE "sessionToken" = $1',
        [sessionToken]
      );
    },

    async createVerificationToken(vt: VerificationToken) {
      await pool.query(
        `INSERT INTO public."verificationToken" (identifier, token, expires)
         VALUES ($1, $2, $3)`,
        [vt.identifier, vt.token, vt.expires]
      );
      return vt;
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
      const result = await pool.query(
        `DELETE FROM public."verificationToken"
         WHERE identifier = $1 AND token = $2
         RETURNING identifier, token, expires`,
        [identifier, token]
      );
      return result.rows[0] ?? null;
    },
  };
}

function mapUser(row: Record<string, unknown>): AdapterUser {
  return {
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string) ?? null,
    image: (row.image as string) ?? null,
    emailVerified: row.emailVerified ? new Date(row.emailVerified as string) : null,
  };
}
