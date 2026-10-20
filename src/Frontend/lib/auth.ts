// Cookie Auth.js xác thực danh tính/vai trò cho middleware.
// Luồng backend-token dùng kho token và refresh hiện có của apiClient;
// authorize xác minh token với backend trước khi tạo cookie danh tính.
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

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
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const response = await fetch(`${process.env.API_URL}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) return null;

          // Backend bọc response trong { data } (SRS mục 8).
          const body = await response.json();
          const tokens = body.data;

          // TODO (người phụ trách FR-AUTH): endpoint /auth/login chỉ trả token,
          // nên cần gọi thêm GET /auth/me để lấy displayName/avatar rồi map vào
          // đây cho đủ thông tin hiển thị.
          return {
            id: credentials.email as string,
            email: credentials.email as string,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            roles: tokens.user?.roles ?? [],
          };
        } catch {
          return null;
        }
      },
    }),

    // FR-AUTH-003. Sau khi Google trả về, cần gọi POST /api/v1/auth/google
    // với idToken để đổi lấy JWT của hệ thống mình.
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
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
      // TODO (người phụ trách FR-AUTH-004): access token chỉ sống 15 phút,
      // cần bổ sung logic tự gọi /auth/refresh khi token sắp hết hạn.
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
