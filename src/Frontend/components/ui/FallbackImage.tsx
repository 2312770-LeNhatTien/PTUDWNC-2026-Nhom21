'use client';

import React, { useState, useEffect } from 'react';

interface FallbackImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  fallbackText?: string;
}

export default function FallbackImage({
  src,
  alt = 'Hình ảnh',
  fallbackSrc,
  fallbackText = 'Hình ảnh không khả dụng',
  className = '',
  ...props
}: FallbackImageProps) {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    // Nếu cả ảnh chính và ảnh dự phòng lỗi, dừng thử và hiện placeholder.
    if (fallbackSrc && currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
    else setHasError(true);
  };

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100/60 border border-orange-200/60 text-slate-500 rounded-2xl p-4 text-center select-none ${className}`}
      >
        <span className="text-3xl mb-1">🍲</span>
        <span className="text-xs font-medium text-slate-600 line-clamp-1">{alt}</span>
        <span className="text-[10px] text-amber-600/80 font-semibold mt-0.5">{fallbackText}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      onError={handleError}
      className={className}
      {...props}
    />
  );
}
