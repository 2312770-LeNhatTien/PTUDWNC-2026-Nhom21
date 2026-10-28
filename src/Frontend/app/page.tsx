"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { categoriesApi } from "@/lib/api/categories";
import { recipesApi } from "@/lib/api/recipes";
import RecipeCard from "@/components/recipes/RecipeCard";
import type { CategoryDto, RecipeListItemDto } from "@/types/api";
import { ErrorState } from '@/components/shared/ErrorState';

export default function HomePage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [recipes, setRecipes] = useState<RecipeListItemDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError('');
      try {
        const [cats, recsResult] = await Promise.all([
          categoriesApi.getAll(),
          recipesApi.getAll(),
        ]);
        setCategories(cats);
        setRecipes(recsResult.items);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu trang chủ:", err);
        setError('Không thể tải dữ liệu trang chủ. Vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [retry]);

  const handleCategoryFilter = async (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setIsLoading(true);
    try {
      const recsResult = await recipesApi.getAll(
        categoryId ? { categoryId } : undefined
      );
      setRecipes(recsResult.items);
    } catch (err) {
      console.error("Lỗi khi lọc công thức:", err);
      setError('Không thể lọc công thức. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const featuredRecipe = recipes[0];
  if (error) return <div className="container mx-auto p-8"><ErrorState message={error} onRetry={() => { setSelectedCategoryId(null); setRetry(value => value + 1); }} /></div>;

  return (
    <div className="space-y-20 pb-20">
      {/* ── HERO SECTION: MÓN NỔI BẬT ─────────────────────────── */}
      {featuredRecipe && (
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/80 via-amber-50/30 to-transparent pt-12 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-100/80 border border-orange-200 px-4 py-1.5 text-xs font-bold text-orange-800">
                <span>⭐ MÓN NỔI BẬT HÔM NAY</span>
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                <span>{featuredRecipe.categoryName}</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl leading-[1.15]">
                {featuredRecipe.title}
              </h1>

              <p className="text-base text-neutral-600 sm:text-lg leading-relaxed max-w-2xl">
                {featuredRecipe.description}
              </p>

              {/* Meta information tags */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-700 pt-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 shadow-sm border border-neutral-100 font-medium">
                  <span className="text-orange-500">⏱️</span>
                  <span>Tổng thời gian: {featuredRecipe.prepTime + featuredRecipe.cookTime} phút</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 shadow-sm border border-neutral-100 font-medium">
                  <span className="text-orange-500">👥</span>
                  <span>Khẩu phần: {featuredRecipe.servings} người</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 shadow-sm border border-neutral-100 font-medium">
                  <span className="text-orange-500">🔥</span>
                  <span>Độ khó: {featuredRecipe.difficulty === "Easy" ? "Dễ" : featuredRecipe.difficulty === "Medium" ? "Vừa" : "Khó"}</span>
                </div>
              </div>

              {/* Author & CTA */}
              <div className="pt-4 flex flex-wrap items-center gap-5">
                <Link
                  href={`/recipes/${featuredRecipe.slug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-700 hover:shadow-orange-600/40 transition-all transform hover:-translate-y-0.5"
                >
                  Xem Chi Tiết Công Thức
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <a
                  href="#categories"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-neutral-700 shadow-sm border border-neutral-200 hover:bg-neutral-50 hover:text-orange-600 transition-colors"
                >
                  Khám Phá Thêm
                </a>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto aspect-[4/3] max-w-lg lg:max-w-none overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/10">
                <img
                  src={featuredRecipe.primaryImageUrl || "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1200&q=80"}
                  alt={featuredRecipe.title}
                  className="h-full w-full object-cover transform hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white font-bold">
                      {featuredRecipe.authorDisplayName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-orange-300 uppercase tracking-wider">Đầu bếp sáng tạo</p>
                      <p className="text-sm font-bold text-white">{featuredRecipe.authorDisplayName}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 hidden sm:flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl border border-neutral-100">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl">
                  🍲
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Chuẩn vị truyền thống</p>
                  <p className="text-sm font-bold text-neutral-900">100% Công Thức Thực Tế</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── CHUYÊN MỤC ẨM THỰC (CATEGORIES) ───────────────────── */}
      <section id="categories" className="container mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-28">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Chuyên Mục Ẩm Thực
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Chọn một danh mục để lọc nhanh những món ăn phù hợp khẩu vị của bạn.
            </p>
          </div>

          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            {categories.length} Danh Mục Phổ Biến
          </span>
        </div>

        {/* Category Pills Selector */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-4 pt-1 no-scrollbar">
          <button
            onClick={() => handleCategoryFilter(null)}
            className={`whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-semibold transition-all ${
              selectedCategoryId === null
                ? "bg-orange-600 text-white shadow-md shadow-orange-600/20 ring-2 ring-orange-600"
                : "bg-white text-neutral-700 border border-neutral-200 hover:border-orange-300 hover:bg-orange-50/50"
            }`}
          >
            🍽️ Tất cả món ({recipes.length})
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryFilter(cat.id)}
                className={`whitespace-nowrap flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/20 ring-2 ring-orange-600"
                    : "bg-white text-neutral-700 border border-neutral-200 hover:border-orange-300 hover:bg-orange-50/50"
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {cat.recipeCount}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── DANH SÁCH CÔNG THỨC (RECIPE GRID) ─────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Công Thức Mới Cập Nhật
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Khám phá bí quyết chế biến từng món ăn ngon cùng hướng dẫn chi tiết.
            </p>
          </div>

          <Link
            href="/recipes"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            Xem tất cả
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="animate-pulse rounded-2xl bg-white border border-neutral-100 overflow-hidden shadow-sm"
              >
                <div className="aspect-[16/10] bg-neutral-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-neutral-200 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded w-full" />
                  <div className="h-3 bg-neutral-200 rounded w-2/3" />
                  <div className="pt-4 flex justify-between items-center">
                    <div className="h-6 w-6 rounded-full bg-neutral-200" />
                    <div className="h-3 bg-neutral-200 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center bg-white">
            <span className="text-4xl">🍳</span>
            <h3 className="mt-3 text-lg font-bold text-neutral-900">Không tìm thấy công thức nào</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Hãy thử chọn danh mục khác hoặc quay lại danh sách tất cả món.
            </p>
            <button
              onClick={() => handleCategoryFilter(null)}
              className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-orange-700"
            >
              Xem tất cả món
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </section>

      {/* ── GIÁ TRỊ NỀN TẢNG (WHY CULINARY BLOG) ───────────────── */}
      <section className="bg-white py-16 border-y border-neutral-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">
              LÝ DO CHỌN CULINARY BLOG
            </span>
            <h2 className="text-3xl font-extrabold text-neutral-900 mt-2">
              Nấu Ăn Ngon Hơn Mỗi Ngày
            </h2>
            <p className="text-sm text-neutral-500 mt-2">
              Chúng tôi cung cấp đầy đủ công cụ và thông tin để việc vào bếp của bạn trở nên đơn giản và đầy cảm hứng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl bg-orange-50/50 p-8 border border-orange-100/80 transition-transform hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 text-white text-xl mb-5 shadow-md shadow-orange-600/20">
                📝
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">Công Thức Chuẩn Từng Bước</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Mỗi công thức đều ghi rõ thời gian chuẩn bị, thời gian nấu, khẩu phần và hướng dẫn từng bước có đếm ngược tiện lợi.
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50/50 p-8 border border-amber-100/80 transition-transform hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white text-xl mb-5 shadow-md shadow-amber-500/20">
                🥗
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">Thông Tin Dinh Dưỡng Rõ Ràng</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Bảng thông tin chi tiết lượng Calo, Protein, Carbohydrate và Chất béo giúp bạn dễ dàng cân đối thực đơn ăn uống khoa học.
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50/50 p-8 border border-emerald-100/80 transition-transform hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white text-xl mb-5 shadow-md shadow-emerald-600/20">
                👨‍🍳
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">Cộng Đồng Đam Mê Ẩm Thực</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Không gian giao lưu, bình luận, đánh giá và chia sẻ những mẹo vặt nhà bếp đắt giá từ những người yêu nấu nướng.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION BANNER ──────────────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 px-6 py-12 sm:px-12 sm:py-16 text-white shadow-xl shadow-orange-500/20">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-xs font-semibold uppercase tracking-wider">
              Chia sẻ bí quyết của bạn
            </span>
            <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight leading-snug">
              Bạn Có Món Ngon Gia Truyền Muốn Chia Sẻ?
            </h2>
            <p className="text-sm sm:text-base text-orange-100 leading-relaxed">
              Hãy tham gia cùng chúng tôi để lưu trữ những công thức tâm đắc và truyền cảm hứng cho hàng ngàn người yêu ẩm thực khắp mọi miền.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                href="/recipes/create"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-orange-700 shadow-md hover:bg-orange-50 transition-colors"
              >
                Bắt Đầu Viết Công Thức Ngay
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/10 backdrop-blur-sm px-6 py-3.5 text-sm font-bold text-white hover:bg-white/20 transition-colors"
              >
                Đăng Ký Thành Viên
              </Link>
            </div>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:block text-9xl opacity-20 select-none">
            🥘
          </div>
        </div>
      </section>
    </div>
  );
}
