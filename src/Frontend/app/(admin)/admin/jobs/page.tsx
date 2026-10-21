'use client';

import { useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api/client';
import { getApiError } from '@/lib/api/errors';

export default function JobsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const openDashboard = async () => {
    setBusy(true); setError('');
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      try {
        await apiClient.post('/admin/hangfire/session', { refreshToken }, { withCredentials: true });
      } catch (err) {
        // Silent refresh may rotate the token while replaying this POST's old body.
        const current = localStorage.getItem('refreshToken');
        if (getApiError(err).status !== 401 || !current || current === refreshToken) throw err;
        await apiClient.post('/admin/hangfire/session', { refreshToken: current }, { withCredentials: true });
      }
      const api = (apiClient.defaults.baseURL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');
      window.location.assign(`${api}/hangfire`);
    } catch (err) { setError(getApiError(err).message); setBusy(false); }
  };
  return <main className="mx-auto max-w-3xl px-4 py-12">
    <Link href="/admin/categories" className="text-orange-700 underline">← Quản trị</Link>
    <h1 className="mt-5 text-3xl font-bold">Tác vụ nền</h1>
    <p className="my-5 text-neutral-600">Theo dõi lịch sử chạy, lỗi và tạo lại sitemap trong bảng điều khiển Hangfire. Chỉ quản trị viên được truy cập.</p>
    <p className="mb-6 text-sm text-neutral-600">Sitemap chạy hằng ngày lúc 02:00 UTC (09:00 giờ Việt Nam). Bạn có thể chọn “Trigger now” trong mục Recurring Jobs để chạy ngay.</p>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    <button onClick={openDashboard} disabled={busy} className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Đang mở...' : 'Mở bảng tác vụ'}</button>
    <div className="mt-8 flex gap-5"><a href="/sitemap.xml" className="text-orange-700 underline">Xem sitemap</a><a href="/robots.txt" className="text-orange-700 underline">Xem robots.txt</a></div>
  </main>;
}
