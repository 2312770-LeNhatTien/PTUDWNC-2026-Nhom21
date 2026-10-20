import axios from 'axios';
import type { ProblemDetails } from '@/types/api';

export function problemOf(error: unknown): ProblemDetails {
  if (axios.isAxiosError<ProblemDetails>(error)) return { ...error.response?.data, status: error.response?.status };
  return { detail: 'Không thể kết nối máy chủ. Vui lòng thử lại.' };
}

export function errorMessage(error: unknown): string {
  const p = problemOf(error);
  if (p.status === 403) return 'Bạn không có quyền quản lý công thức này.';
  if (p.status === 404) return 'Công thức không tồn tại hoặc đã được xóa.';
  if (p.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  return p.detail || p.title || 'Không thể kết nối máy chủ. Vui lòng thử lại.';
}

export function displayDate(value?: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value)) || new Date(value).getFullYear() < 2000) return 'Chưa có thông tin';
  return new Date(value).toLocaleString('vi-VN');
}

export const statusLabel = { Draft: 'Bản nháp', Published: 'Đã xuất bản', Archived: 'Đã lưu trữ' };
