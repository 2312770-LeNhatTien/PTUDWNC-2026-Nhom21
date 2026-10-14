'use client';
import { Button } from '@/components/ui/button';
export function Pagination({ page, total, pageSize, onPageChange }: { page: number; total: number; pageSize: number; onPageChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return <nav aria-label="Phân trang" className="mt-8 flex flex-wrap items-center justify-center gap-4"><Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>Trước</Button><span aria-live="polite">Trang {page} / {pages}</span><Button variant="outline" disabled={page >= pages} onClick={() => onPageChange(Math.min(pages, page + 1))}>Sau</Button></nav>;
}
