import * as React from 'react';
import { cn } from '@/lib/utils';
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input type={type} className={cn('flex h-12 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50', className)} ref={ref} {...props} />
));
Input.displayName = 'Input';
export { Input };
