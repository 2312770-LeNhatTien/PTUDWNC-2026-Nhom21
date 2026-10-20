'use client';

import { useEffect } from 'react';

const message = 'Bạn còn thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?';

// Capture navigation before Next Link/router handlers, including Navbar/Footer.
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const next = new URL(link.href, window.location.href);
      if (next.origin === location.origin && next.pathname === location.pathname && next.search === location.search) return;
      if (!window.confirm(message)) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const submit = (event: SubmitEvent) => {
      if (event.target instanceof HTMLFormElement && !event.target.hasAttribute('data-recipe-editor') && !window.confirm(message)) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    };
    // Navigation API covers browser Back/Forward where supported; ordinary
    // document exits use beforeunload and app links/forms use capture above.
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const traverse = (event: Event) => {
      if ((event as Event & { navigationType?: string }).navigationType === 'traverse' && event.cancelable && !window.confirm(message)) event.preventDefault();
    };
    document.addEventListener('click', click, true);
    document.addEventListener('submit', submit, true);
    window.addEventListener('beforeunload', warn);
    navigation?.addEventListener('navigate', traverse);
    return () => {
      document.removeEventListener('click', click, true);
      document.removeEventListener('submit', submit, true);
      window.removeEventListener('beforeunload', warn);
      navigation?.removeEventListener('navigate', traverse);
    };
  }, [dirty]);
}
