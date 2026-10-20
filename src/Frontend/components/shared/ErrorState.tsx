'use client';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function ErrorState({ title = 'Không thể tải nội dung', message = 'Vui lòng kiểm tra kết nối và thử lại.', onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"><h2 className="flex items-center gap-2 text-lg font-semibold"><AlertCircle aria-hidden="true" className="h-5 w-5" />{title}</h2><p className="my-3">{message}</p>{onRetry && <Button variant="outline" onClick={onRetry}>Thử lại</Button>}</div>;
}
