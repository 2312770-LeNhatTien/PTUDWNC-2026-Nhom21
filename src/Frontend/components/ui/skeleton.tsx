import { cn } from '@/lib/utils';
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-lg bg-neutral-200 motion-reduce:animate-none', className)} {...props} />;
}
