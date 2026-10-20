'use client';

import React, { useState, useEffect } from 'react';
import PublishToggle from './PublishToggle';

interface RecipeOwnerActionsProps {
  recipeId: string;
  initialStatus: string;
  authorId: string;
  ingredientCount: number;
  stepCount: number;
}

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  roles?: string[];
  role?: string;
}

/**
 * ============================================================================
 * KHỐI THAO TÁC DÀNH CHO TÁC GIẢ & QUẢN TRỊ VIÊN (RecipeOwnerActions)
 * ============================================================================
 * Hiển thị thanh công cụ quản lý nhanh trên trang chi tiết công thức nếu người
 * dùng đang đăng nhập chính là tác giả bài viết hoặc quản trị viên (Admin).
 * Cho phép bật/tắt Publish/Unpublish trực tiếp tuân thủ điều kiện D11.
 * 
 * Tác giả: Lâm Văn Đức (MSSV: 2314299)
 * Nhóm 21 - PTUDWNC-2026
 */
export default function RecipeOwnerActions({
  recipeId,
  initialStatus,
  authorId,
  ingredientCount,
  stepCount,
}: RecipeOwnerActionsProps) {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    const syncUser = () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }
    };

    syncUser();
    window.addEventListener('auth-changed', syncUser);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('auth-changed', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  if (!isMounted || !currentUser) {
    return null;
  }

  // Kiểm tra quyền: tác giả sở hữu hoặc có role Admin
  const isOwner = currentUser.id === authorId;
  const isAdmin =
    currentUser.roles?.includes('Admin') ||
    currentUser.role === 'Admin' ||
    currentUser.roles?.includes('Administrator');

  if (!isOwner && !isAdmin) {
    return null;
  }

  const roleLabel = isAdmin && !isOwner ? 'Quản trị viên (Admin)' : 'Tác giả bài viết';
  const isD11Ready = ingredientCount >= 1 && stepCount >= 1;

  return (
    <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200/80 py-3 px-4 sm:px-6 lg:px-8 shadow-2xs">
      <div className="container mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Thông tin quyền hạn và tiêu chuẩn D11 */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-base flex-shrink-0 border border-orange-500/20">
            ⚙️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-900">
                Thao Tác Quản Lý Bài Viết
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                {roleLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-600">
              <span>Tiêu chuẩn D11:</span>
              {isD11Ready ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Đủ điều kiện xuất bản ({ingredientCount} NL, {stepCount} bước)
                </span>
              ) : (
                <span className="text-rose-600 font-semibold flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Chưa đủ điều kiện ({ingredientCount} NL, {stepCount} bước)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Công tắc Publish / Unpublish tương tác trực tiếp */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs font-semibold text-neutral-600 hidden sm:inline">
            Trạng thái hiển thị:
          </span>
          <PublishToggle
            recipeId={recipeId}
            initialStatus={initialStatus}
            ingredientCount={ingredientCount}
            stepCount={stepCount}
          />
        </div>
      </div>
    </div>
  );
}
