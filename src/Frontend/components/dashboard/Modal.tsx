'use client';

import { useEffect, useRef, useId } from 'react';

export default function Modal({ title, children, onClose }: {
  title: string; children: React.ReactNode; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }}
    className="w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-neutral-200 p-6 shadow-xl backdrop:bg-black/40">
    <h2 id={titleId} className="mb-4 text-xl font-bold text-neutral-900">{title}</h2>
    {children}
  </dialog>;
}
