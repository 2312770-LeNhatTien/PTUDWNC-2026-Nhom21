'use client';

import { signIn } from 'next-auth/react';
import type { AuthResponseDto } from '@/types/api';

// Bridge the existing backend JWT login to the server-validated page session.
// API token rotation remains in apiClient; the page cookie stores identity only.
export async function establishLoginSession(data: AuthResponseDto) {
  const result = await signIn('backend-token', { accessToken: data.accessToken, redirect: false });
  if (!result || result.error) throw new Error('Không thể tạo phiên đăng nhập. Vui lòng thử lại.');
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  window.dispatchEvent(new Event('auth-changed'));
}

export function loginDestination(): string {
  const callback = new URLSearchParams(window.location.search).get('callbackUrl');
  return callback?.startsWith('/') && !callback.startsWith('//') && !callback.includes('\\') ? callback : '/';
}
