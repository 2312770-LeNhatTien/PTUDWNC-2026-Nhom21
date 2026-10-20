"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";
import { useAuthStore } from '@/stores/auth-store';
import { useEffect, useState } from "react";

// Bọc toàn bộ app trong TanStack Query (quản lý dữ liệu từ API) và
// SessionProvider (trạng thái đăng nhập).
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const sync = () => useAuthStore.getState().syncFromStorage();
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('auth-changed', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('auth-changed', sync); };
  }, []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </SessionProvider>
  );
}
