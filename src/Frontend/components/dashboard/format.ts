export function displayDate(value?: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value)) || new Date(value).getFullYear() < 2000) return 'Chưa có thông tin';
  return new Date(value).toLocaleString('vi-VN');
}

export const statusLabel = { Draft: 'Bản nháp', Published: 'Đã xuất bản', Archived: 'Đã lưu trữ' };
