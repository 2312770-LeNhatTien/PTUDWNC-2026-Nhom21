import { LoaderCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
export function LoadingState({ message = 'Đang tải nội dung…' }: { message?: string }) {
  return <div className="py-10" role="status" aria-live="polite"><p className="mb-6 flex items-center justify-center gap-2 text-neutral-600"><LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />{message}</p><div aria-hidden="true" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div></div>;
}
