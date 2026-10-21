import React from "react";
import Link from "next/link";
import type { RecipeListItemDto, RecipeDifficulty } from "@/types/api";

interface RecipeCardProps {
  recipe: RecipeListItemDto;
}

const difficultyConfig: Record<
  RecipeDifficulty,
  { label: string; bg: string; text: string }
> = {
  Easy: { label: "Dễ", bg: "bg-emerald-50", text: "text-emerald-700 border-emerald-200" },
  Medium: { label: "Vừa", bg: "bg-amber-50", text: "text-amber-700 border-amber-200" },
  Hard: { label: "Khó", bg: "bg-orange-50", text: "text-orange-700 border-orange-200" },
  Expert: { label: "Kỳ công", bg: "bg-rose-50", text: "text-rose-700 border-rose-200" },
};

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const diff = difficultyConfig[recipe.difficulty] ?? {
    label: recipe.difficulty,
    bg: "bg-neutral-50",
    text: "text-neutral-700 border-neutral-200",
  };

  const totalTime = recipe.prepTime + recipe.cookTime;
  const imageUrl =
    recipe.primaryImageUrl ||
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-white border border-neutral-100 shadow-sm hover:shadow-xl hover:border-orange-200/80 transition-all duration-300">
      {/* Image Container */}
      <Link href={`/recipes/${recipe.slug}`} className="relative aspect-[16/10] overflow-hidden bg-neutral-100">
        <img
          src={imageUrl}
          alt={recipe.title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-neutral-800 shadow-sm">
            {recipe.categoryName}
          </span>
        </div>

        {/* Difficulty Pill */}
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border backdrop-blur-sm bg-white/95 ${diff.text}`}
          >
            {diff.label}
          </span>
        </div>

        {/* Total Time Overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white drop-shadow">
          <svg className="h-3.5 w-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{totalTime} phút</span>
          <span className="mx-1">•</span>
          <svg className="h-3.5 w-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>{recipe.servings} người</span>
        </div>
        {recipe.reviewCount ? (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
            ⭐ {recipe.averageRating?.toFixed(1)} ({recipe.reviewCount})
          </div>
        ) : null}
      </Link>

      {/* Body Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-neutral-900 group-hover:text-orange-600 transition-colors line-clamp-1">
          <Link href={`/recipes/${recipe.slug}`}>{recipe.title}</Link>
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-neutral-500 line-clamp-2">
          {recipe.description}
        </p>

        {/* Footer info: Author & Action */}
        <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-bold text-xs">
              {recipe.authorDisplayName.charAt(0)}
            </div>
            <span className="text-xs font-medium text-neutral-700">
              {recipe.authorDisplayName}
            </span>
          </div>

          <Link
            href={`/recipes/${recipe.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 group/link"
          >
            Xem cách nấu
            <svg
              className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
