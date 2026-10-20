'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface RecipeAdminActionsProps {
  recipeId: string;
  authorId?: string;
}

export default function RecipeAdminActions({ recipeId, authorId }: RecipeAdminActionsProps) {
  const [canEdit, setCanEdit] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        const isAdmin = user.roles?.includes('Admin');
        if (isAdmin) {
          setCanEdit(true);
        }
      }
    } catch {
      setCanEdit(false);
    }
  }, [authorId]);

  if (!canEdit) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-amber-50/90 to-orange-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-lg shadow-xs">
          ⚙️
        </span>
        <div>
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-2">
            <span>Bàn Điều Khiển Quản Trị & Tác Giả</span>
            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-extrabold">
              Quyền Chỉnh Sửa
            </span>
          </h4>
          <p className="text-xs text-neutral-600 mt-0.5">
            Mọi thay đổi về nguyên liệu và bước nấu sẽ cập nhật tức thì trên trang công thức này cho độc giả.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
        <Link
          href={`/recipes/ingredients-test?recipeId=${recipeId}`}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-bold text-neutral-800 hover:bg-neutral-50 hover:text-orange-600 transition shadow-2xs"
        >
          <span>🥗</span> Sửa nguyên liệu
        </Link>
        <Link
          href={`/recipes/steps-test?recipeId=${recipeId}`}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-xs font-bold text-white transition shadow-xs"
        >
          <span>🍳</span> Sửa bước nấu
        </Link>
      </div>
    </div>
  );
}
