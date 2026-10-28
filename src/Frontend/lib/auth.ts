// Cookie Auth.js xác thực danh tính/vai trò cho middleware.
// Luồng backend-token dùng kho token và refresh hiện có của apiClient;
// authorize xác minh token với backend trước khi tạo cookie danh tính.
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";

declare module "next-auth" {
  interface Session {
    user: { id: string; accessToken?: string; roles: string[] } & DefaultSession["user"];
  }
  interface User {
    accessToken?: string;
    refreshToken?: string;
    roles?: string[];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: 'backend-token',
      credentials: { accessToken: {} },
      async authorize(credentials) {
        if (typeof credentials.accessToken !== 'string') return null;
        const base = (process.env.API_URL || 'http://localhost:5000').replace(/\/api\/v1\/?$/, '');
        const response = await fetch(`${base}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${credentials.accessToken}` }, cache: 'no-store',
        });
        if (!response.ok) return null;
        const { data } = await response.json();
        if (!data?.id || !Array.isArray(data.roles)) return null;
        return { id: data.id, email: data.email, name: data.displayName, image: data.avatarUrl, roles: data.roles };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.userId = user.id;
        token.roles = user.roles ?? [];
      }
      // Cookie chỉ giữ danh tính; apiClient thực hiện backend refresh/rotation.
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.accessToken = token.accessToken as string;
      session.user.roles = Array.isArray(token.roles) ? token.roles as string[] : [];
      return session;
    },
  },

  pages: { signIn: "/login" },
});
