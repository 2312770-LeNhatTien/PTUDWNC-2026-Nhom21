'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ui/ImageUploader';
import { recipesApi } from '@/lib/api/recipes';
import PublishRequirementModal from '@/components/recipes/PublishRequirementModal';

/**
 * Interface biểu diễn danh mục tải từ API GET /api/v1/categories
 */
interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

/**
 * Interface nguyên liệu thêm vào công thức (SRS mục 7.4)
 */
interface IngredientFormItem {
  name: string;
  quantity: string;
  unit: string;
  notes: string;
}

/**
 * Interface bước thực hiện công thức (SRS mục 7.3)
 */
interface StepFormItem {
  title: string;
  description: string;
  timerMinutes: string;
  imageUrl: string;
}

/**
 * Trang tạo công thức nấu ăn mới (FR-RCP-003, SRS mục 3.3 và 5.1).
 * Hỗ trợ giao diện trực quan nhập đầy đủ thông tin:
 * - Thông tin cơ bản (Tiêu đề, mô tả, hướng dẫn chung, danh mục, độ khó, khẩu phần, thời gian)
 * - Thông tin dinh dưỡng (Calories, Protein, Carb, Fat, Fiber, Sodium)
 * - Danh sách nguyên liệu linh hoạt (thêm/xóa hàng, hỗ trợ gia vị nêm nếm vừa đủ)
 * - Danh sách các bước chế biến (thêm/xóa, hẹn giờ phút, tải ảnh minh họa qua MinIO)
 */
export default function CreateRecipePage() {
  const router = useRouter();

  // Danh mục từ API
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);

  // Trạng thái form cơ bản
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [prepTime, setPrepTime] = useState<number>(15);
  const [cookTime, setCookTime] = useState<number>(30);
  const [servings, setServings] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<number>(1); // 1: Easy, 2: Medium, 3: Hard, 4: Expert

  // Trạng thái thông tin dinh dưỡng (tùy chọn)
  const [showNutrition, setShowNutrition] = useState(false);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbohydrates, setCarbohydrates] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sodium, setSodium] = useState('');

  // Danh sách nguyên liệu (mặc định 2 dòng trống)
  const [ingredients, setIngredients] = useState<IngredientFormItem[]>([
    { name: '', quantity: '', unit: '', notes: '' },
    { name: '', quantity: '', unit: '', notes: '' },
  ]);

  // Danh sách bước thực hiện (mặc định 1 bước)
  const [steps, setSteps] = useState<StepFormItem[]>([
    { title: 'Sơ chế nguyên liệu', description: '', timerMinutes: '', imageUrl: '' },
  ]);

  // Trạng thái submit & lỗi
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successSlug, setSuccessSlug] = useState<string | null>(null);

  // Trạng thái xuất bản & kiểm tra điều kiện D11 (FR-RCP-005 UI)
  const [shouldPublish, setShouldPublish] = useState<boolean>(false);
  const [isD11ModalOpen, setIsD11ModalOpen] = useState<boolean>(false);

  // Tính số lượng nguyên liệu và bước nấu hợp lệ
  const validIngredientsCount = ingredients.filter((item) => item.name.trim().length > 0).length;
  const validStepsCount = steps.filter(
    (s) => s.title.trim().length > 0 || s.description.trim().length > 0
  ).length;

  // Xử lý bật/tắt công tắc xuất bản kèm kiểm tra điều kiện D11
  const handleTogglePublish = () => {
    if (!shouldPublish) {
      if (validIngredientsCount < 1 || validStepsCount < 1) {
        setIsD11ModalOpen(true);
        return;
      }
      setShouldPublish(true);
    } else {
      setShouldPublish(false);
    }
  };

  const getApiBaseUrl = () => {
    const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const base = raw.replace(/\/api\/v1\/?$/, '');
    return `${base}/api/v1`;
  };

  // Tải danh sách danh mục
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`${getApiBaseUrl()}/categories`);
        if (res.ok) {
          const json = await res.json();
          const items: CategoryItem[] = json.data || json || [];
          setCategories(items);
          if (items.length > 0) {
            setCategoryId(items[0].id);
          }
        }
      } catch (err) {
        console.error('Không thể tải danh mục:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  // Xử lý thêm/xóa/sửa nguyên liệu
  const handleAddIngredient = () => {
    setIngredients((prev) => [...prev, { name: '', quantity: '', unit: '', notes: '' }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof IngredientFormItem, value: string) => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Xử lý thêm/xóa/sửa bước thực hiện
  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      { title: `Bước ${prev.length + 1}`, description: '', timerMinutes: '', imageUrl: '' },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: keyof StepFormItem, value: string) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Submit tạo công thức
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation cơ bản phía client
    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề công thức.');
      return;
    }
    if (!description.trim()) {
      setFormError('Vui lòng nhập mô tả ngắn cho công thức.');
      return;
    }
    if (!categoryId) {
      setFormError('Vui lòng chọn danh mục cho công thức.');
      return;
    }

    // Chuẩn bị payload nguyên liệu (chỉ lấy các dòng có nhập tên)
    const validIngredients = ingredients
      .filter((item) => item.name.trim().length > 0)
      .map((item, idx) => ({
        name: item.name.trim(),
        quantity: item.quantity ? parseFloat(item.quantity) : null,
        unit: item.unit.trim() || null,
        notes: item.notes.trim() || null,
        orderIndex: idx + 1,
      }));

    // Chuẩn bị payload các bước thực hiện (chỉ lấy các bước có mô tả hoặc tiêu đề)
    const validSteps = steps
      .filter((s) => s.title.trim().length > 0 || s.description.trim().length > 0)
      .map((s, idx) => ({
        stepNumber: idx + 1,
        title: s.title.trim() || `Bước ${idx + 1}`,
        description: s.description.trim() || 'Thực hiện theo chỉ dẫn.',
        timerMinutes: s.timerMinutes ? parseInt(s.timerMinutes, 10) : null,
        imageUrl: s.imageUrl.trim() || null,
      }));

    // Chuẩn bị payload dinh dưỡng
    const hasAnyNutrition =
      calories || protein || carbohydrates || fat || fiber || sodium;
    const nutritionPayload = hasAnyNutrition
      ? {
          calories: calories ? parseFloat(calories) : null,
          protein: protein ? parseFloat(protein) : null,
          carbohydrates: carbohydrates ? parseFloat(carbohydrates) : null,
          fat: fat ? parseFloat(fat) : null,
          fiber: fiber ? parseFloat(fiber) : null,
          sodium: sodium ? parseFloat(sodium) : null,
        }
      : null;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      instructions: instructions.trim() || 'Xem chi tiết các bước bên dưới.',
      categoryId,
      prepTime: Number(prepTime),
      cookTime: Number(cookTime),
      servings: Number(servings),
      difficulty: Number(difficulty),
      nutrition: nutritionPayload,
      ingredients: validIngredients.length > 0 ? validIngredients : null,
      steps: validSteps.length > 0 ? validSteps : null,
    };

    // Kiểm tra điều kiện D11 nếu người dùng chọn chế độ "Xuất bản ngay"
    if (shouldPublish && (validIngredients.length < 1 || validSteps.length < 1)) {
      setIsD11ModalOpen(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Lấy JWT token nếu đã lưu ở localStorage hoặc cookie
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${getApiBaseUrl()}/recipes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // Xử lý lỗi theo format RFC 7807 ProblemDetails
        if (data?.errors) {
          const firstErrKey = Object.keys(data.errors)[0];
          const firstErrMsg = data.errors[firstErrKey]?.[0] || 'Dữ liệu không hợp lệ.';
          throw new Error(firstErrMsg);
        }
        throw new Error(data?.detail || data?.title || `Lỗi tạo công thức (${res.status})`);
      }

      const createdRecipe = data?.data || data;
      const createdId = createdRecipe?.id;
      const slug = createdRecipe?.slug;

      // Nếu người dùng chọn Xuất bản ngay, gọi API publish (FR-RCP-005)
      if (shouldPublish && createdId) {
        try {
          await recipesApi.publish(createdId);
        } catch (publishErr) {
          console.warn('Lỗi khi kích hoạt xuất bản tự động:', publishErr);
        }
      }

      setSuccessSlug(slug || '');

      // Tự động chuyển trang sau 1.5 giây
      setTimeout(() => {
        if (slug) {
          router.push(`/recipes/${slug}`);
        } else {
          router.push('/recipes');
        }
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi không xác định xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Thanh tiêu đề & nút điều hướng */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
          <div>
            <Link
              href="/recipes"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-orange-600 transition mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Quay lại danh sách
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Tạo Công Thức Món Ăn Mới
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Chia sẻ bí quyết nấu nướng với nguyên liệu chi tiết và từng bước trực quan.
            </p>
          </div>

          {/* Công tắc chọn chế độ Lưu nháp / Xuất bản ngay (FR-RCP-005 UI) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-neutral-100/90 px-3.5 py-2 rounded-2xl border border-neutral-200">
            <span className="text-xs font-semibold text-neutral-600">
              Chế độ xuất bản:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={shouldPublish}
                onClick={handleTogglePublish}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  shouldPublish ? 'bg-emerald-500' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    shouldPublish ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              {shouldPublish ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Xuất bản ngay
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Lưu bản nháp
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Thông báo tạo thành công */}
        {successSlug !== null && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 animate-in fade-in">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="font-semibold">
                {shouldPublish
                  ? 'Công thức đã được tạo và xuất bản công khai thành công!'
                  : 'Công thức đã được lưu bản nháp thành công!'}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Đang chuyển hướng sang trang chi tiết công thức...
              </p>
            </div>
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {formError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-3 animate-in fade-in">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">{formError}</p>
          </div>
        )}

        {/* Form chính */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* PHẦN 1: THÔNG TIN CƠ BẢN */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-6">
            <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-100 pb-3 flex items-center gap-2">
              <span className="text-orange-600">1.</span> Thông Tin Chung
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Tiêu đề món ăn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  placeholder="Ví dụ: Phở Bò Tái Lăn Hà Nội Chuẩn Vị"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none text-sm transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Mô tả ngắn gọn <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={2000}
                  placeholder="Mô tả hương vị đặc trưng, nguồn gốc món ăn hoặc ấn tượng của bạn..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none text-sm transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Ghi chú hướng dẫn tổng quát
                </label>
                <textarea
                  rows={2}
                  placeholder="Mẹo nhỏ, lưu ý chọn thịt hoặc bí quyết để nước dùng trong..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none text-sm transition"
                />
              </div>

              {/* Lưới các thuộc tính: Danh mục, Độ khó, Khẩu phần, Thời gian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Danh mục món ăn <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={isLoadingCategories}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none text-sm bg-white transition"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Độ khó
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none text-sm bg-white transition"
                  >
                    <option value={1}>Dễ (Easy)</option>
                    <option value={2}>Trung bình (Medium)</option>
                    <option value={3}>Khó (Hard)</option>
                    <option value={4}>Chuyên nghiệp (Expert)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Chuẩn bị (phút)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={prepTime}
                    onChange={(e) => setPrepTime(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Nấu (phút)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cookTime}
                    onChange={(e) => setCookTime(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none text-sm transition"
                  />
                </div>
              </div>

              <div className="w-full sm:w-1/3 pt-1">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Số khẩu phần (người ăn)
                </label>
                <input
                  type="number"
                  min={1}
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none text-sm transition"
                />
              </div>
            </div>
          </div>

          {/* PHẦN 2: NGUYÊN LIỆU */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <span className="text-orange-600">2.</span> Nguyên Liệu Nấu Ăn
              </h2>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition"
              >
                + Thêm nguyên liệu
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Mẹo: Các loại gia vị nêm nếm &quot;vừa đủ&quot; có thể để trống định lượng và đơn vị.
            </p>

            <div className="space-y-3">
              {ingredients.map((ing, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 p-3 rounded-xl bg-neutral-50 border border-neutral-200/60"
                >
                  <div className="w-full sm:w-2/5">
                    <input
                      type="text"
                      placeholder="Tên nguyên liệu (vd: Bánh phở, Thịt bò)"
                      value={ing.name}
                      onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                    />
                  </div>
                  <div className="w-full sm:w-1/5">
                    <input
                      type="number"
                      step="any"
                      placeholder="Số lượng (vd: 500)"
                      value={ing.quantity}
                      onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                    />
                  </div>
                  <div className="w-full sm:w-1/5">
                    <input
                      type="text"
                      placeholder="Đơn vị (gram, ml, muỗng...)"
                      value={ing.unit}
                      onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                    />
                  </div>
                  <div className="w-full sm:w-1/5">
                    <input
                      type="text"
                      placeholder="Ghi chú (thái mỏng, băm nhỏ)"
                      value={ing.notes}
                      onChange={(e) => handleIngredientChange(index, 'notes', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                    />
                  </div>

                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      aria-label="Xóa nguyên liệu"
                      onClick={() => handleRemoveIngredient(index)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 transition rounded-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* PHẦN 3: CÁC BƯỚC THỰC HIỆN */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <span className="text-orange-600">3.</span> Các Bước Nấu Nướng
              </h2>
              <button
                type="button"
                onClick={handleAddStep}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition"
              >
                + Thêm bước
              </button>
            </div>

            <div className="space-y-6">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-4 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                      Bước {index + 1}
                    </span>

                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(index)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium transition"
                      >
                        Xóa bước này
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Tên bước
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Ninh nước dùng xương"
                        value={step.title}
                        onChange={(e) => handleStepChange(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Hẹn giờ (phút - tùy chọn)
                      </label>
                      <input
                        type="number"
                        min={0}
                        placeholder="Ví dụ: 30"
                        value={step.timerMinutes}
                        onChange={(e) => handleStepChange(index, 'timerMinutes', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Nội dung hướng dẫn chi tiết
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Mô tả kỹ thao tác, nhiệt độ lửa, dấu hiệu khi món ăn đạt chuẩn..."
                      value={step.description}
                      onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Tải ảnh cho bước nấu qua MinIO */}
                  <div className="border-t border-neutral-200/60 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-neutral-600 flex items-center gap-1">
                        <span>📷</span> Ảnh minh họa cho bước này:
                      </label>
                      {step.imageUrl && (
                        <span className="text-[10px] text-emerald-600 font-semibold">✓ Đã có ảnh</span>
                      )}
                    </div>

                    {step.imageUrl ? (
                      <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-neutral-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={step.imageUrl}
                          alt={`Bước ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1 text-[11px] text-neutral-500 truncate">
                          {step.imageUrl}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStepChange(index, 'imageUrl', '')}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                        >
                          Xóa ảnh
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white p-3 rounded-xl border border-neutral-200">
                        <ImageUploader
                          folder="steps"
                          onUploadSuccess={(url) => handleStepChange(index, 'imageUrl', url)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PHẦN 4: THÔNG TIN DINH DƯỠNG (OPTIONAL) */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <span className="text-orange-600">4.</span> Thông Tin Dinh Dưỡng
                <span className="text-xs font-normal text-neutral-400">(Tùy chọn)</span>
              </h2>

              <button
                type="button"
                onClick={() => setShowNutrition(!showNutrition)}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                {showNutrition ? 'Thu gọn' : '+ Khai báo dinh dưỡng'}
              </button>
            </div>

            {showNutrition && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-neutral-100 animate-in fade-in">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Calories (kcal / phần)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="vd: 450"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Chất đạm - Protein (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="vd: 25.5"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Tinh bột - Carbs (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="vd: 55"
                    value={carbohydrates}
                    onChange={(e) => setCarbohydrates(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Chất béo - Fat (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="vd: 12"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Chất xơ - Fiber (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="vd: 3.5"
                    value={fiber}
                    onChange={(e) => setFiber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Natri - Sodium (mg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="vd: 800"
                    value={sodium}
                    onChange={(e) => setSodium(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* NÚT THAO TÁC SUBMIT */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-neutral-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-neutral-600">
                Xuất bản ngay sau khi lưu:
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={shouldPublish}
                onClick={handleTogglePublish}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  shouldPublish ? 'bg-emerald-500' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    shouldPublish ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-xs font-medium text-neutral-700">
                {shouldPublish ? (
                  <span className="text-emerald-700 font-bold">Bật (Công khai)</span>
                ) : (
                  <span className="text-neutral-500">Tắt (Bản nháp)</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link
                href="/recipes"
                className="px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-sm font-semibold hover:bg-neutral-100 transition"
              >
                Hủy bỏ
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2 ${
                  shouldPublish
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-orange-500/20 hover:from-amber-600 hover:to-orange-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <span>{shouldPublish ? 'Xuất Bản Ngay' : 'Lưu Bản Nháp'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Modal cảnh báo điều kiện D11 (FR-RCP-005 UI) */}
        <PublishRequirementModal
          isOpen={isD11ModalOpen}
          onClose={() => setIsD11ModalOpen(false)}
          ingredientCount={validIngredientsCount}
          stepCount={validStepsCount}
        />
      </div>
    </div>
  );
}
