'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { recipesApi } from '@/lib/api/recipes';
import { useAuthStore } from '@/stores/auth-store';
import type { RecipeReviewDto, RecipeReviewsDto } from '@/types/api';

interface RecipeReviewsProps {
  recipeId: string;
  initialAverageRating?: number;
  initialReviewCount?: number;
}

function Stars({ value, interactive = false, onChange }: {
  value: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
}) {
  return (
    <span className="inline-flex items-center" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map(star => interactive ? (
        <button
          key={star}
          type="button"
          aria-label={`${star} sao`}
          className={`text-2xl leading-none transition-transform hover:scale-110 ${star <= value ? 'text-amber-400' : 'text-neutral-300'}`}
          onClick={() => onChange?.(star)}
        >★</button>
      ) : (
        <span key={star} className={`text-lg leading-none ${star <= Math.round(value) ? 'text-amber-400' : 'text-neutral-300'}`}>★</span>
      ))}
    </span>
  );
}

function ReviewItem({ review }: { review: RecipeReviewDto }) {
  return (
    <article className="border-t border-neutral-100 py-4 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100 font-bold text-orange-700">
          {review.authorAvatarUrl ? (
            <img src={review.authorAvatarUrl} alt={review.authorDisplayName} className="h-full w-full object-cover" />
          ) : review.authorDisplayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-neutral-900">{review.authorDisplayName}</p>
            <time className="text-xs text-neutral-400" dateTime={review.createdAt}>
              {new Date(review.createdAt).toLocaleDateString('vi-VN')}
            </time>
          </div>
          <Stars value={review.rating} />
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">{review.comment}</p>
        </div>
      </div>
    </article>
  );
}

export default function RecipeReviews({ recipeId, initialAverageRating = 0, initialReviewCount = 0 }: RecipeReviewsProps) {
  const user = useAuthStore(state => state.user);
  const [data, setData] = useState<RecipeReviewsDto>({ averageRating: initialAverageRating, reviewCount: initialReviewCount, reviews: [] });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadReviews = useCallback(async () => {
    try {
      setError('');
      setData(await recipesApi.getReviews(recipeId));
    } catch {
      setError('Không thể tải đánh giá lúc này.');
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => { void loadReviews(); }, [loadReviews]);

  const averageLabel = useMemo(() => data.reviewCount ? data.averageRating.toFixed(1) : 'Chưa có', [data]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) { setError('Bạn hãy nhập bình luận trước khi gửi.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      await recipesApi.addReview(recipeId, { rating, comment: comment.trim() });
      setComment('');
      setMessage('Đã gửi đánh giá của bạn.');
      await loadReviews();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(detail || 'Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally { setSaving(false); }
  }

  return (
    <section className="container mx-auto mt-8 px-4 sm:px-6 lg:px-8" aria-labelledby="recipe-reviews-title">
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-100 pb-4">
          <div>
            <h2 id="recipe-reviews-title" className="text-xl font-black text-neutral-900">Đánh giá & bình luận</h2>
            <p className="mt-1 text-sm text-neutral-500">Chia sẻ cảm nhận và mẹo nấu món này.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-neutral-900">{averageLabel}</span>
            <div><Stars value={data.averageRating} /><p className="text-xs text-neutral-400">{data.reviewCount} đánh giá</p></div>
          </div>
        </div>

        {user ? (
          <form onSubmit={submit} className="mt-5 rounded-xl bg-orange-50/60 p-4">
            <p className="text-sm font-semibold text-neutral-900">Đánh giá của bạn</p>
            <div className="mt-2"><Stars value={rating} interactive onChange={setRating} /></div>
            <textarea
              aria-label="Bình luận"
              value={comment}
              maxLength={2000}
              onChange={event => setComment(event.target.value)}
              placeholder="Bạn thấy món này thế nào?"
              className="mt-3 min-h-24 w-full rounded-lg border border-orange-200 bg-white p-3 text-sm outline-none focus:border-orange-500"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-neutral-400">{comment.length}/2000</span>
              <button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving ? 'Đang gửi…' : 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-5 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600">
            <Link href="/login" className="font-bold text-orange-600 hover:underline">Đăng nhập</Link> để đánh giá và bình luận.
          </p>
        )}

        {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5">
          {loading ? <p className="text-sm text-neutral-500">Đang tải đánh giá…</p> : data.reviews.length ? data.reviews.map(review => <ReviewItem key={review.id} review={review} />) : <p className="text-sm text-neutral-500">Chưa có đánh giá. Hãy là người đầu tiên chia sẻ cảm nhận.</p>}
        </div>
      </div>
    </section>
  );
}
