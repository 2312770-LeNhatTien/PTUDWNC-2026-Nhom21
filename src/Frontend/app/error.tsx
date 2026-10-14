'use client';
import { ErrorState } from '@/components/shared/ErrorState';
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="container mx-auto px-4 py-10"><ErrorState onRetry={reset} /></div>;
}
