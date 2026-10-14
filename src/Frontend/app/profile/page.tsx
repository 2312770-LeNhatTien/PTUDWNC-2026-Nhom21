// ============================================================================
// TRANG HỒ SƠ CÁ NHÂN (Profile Page - FR-AUTH-006 & FR-AUTH-007)
// Tuần 5: Frontend Integration & Profile / Editor UI
// Tác giả: Nguyễn Đình Tuấn (MSSV: 2312792)
// Tính năng:
//   1. Hiển thị Avatar lớn, Tên, Bio, Email, Role badge bảo mật
//   2. Upload Avatar trực tiếp từ máy tính lên MinIO Storage
//   3. Form chỉnh sửa DisplayName (<= 50) và Bio (<= 500) có đếm ký tự
// ============================================================================

'use client';

import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import type { UserDto } from '@/types/api';

export default function ProfilePage() {
  // 1. Trạng thái người dùng
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 2. Trạng thái Form chỉnh sửa
  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // 3. Trạng thái Upload ảnh MinIO
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4. Thông báo Toast
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  // Helper lấy baseURL cho upload
  const getApiBaseUrl = () => {
    const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const base = raw.replace(/\/api\/v1\/?$/, '');
    return `${base}/api/v1`;
  };

  // Tải thông tin hồ sơ từ backend GET /api/v1/auth/me
  useEffect(() => {
    async function fetchProfile() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const profile = await authApi.getProfile();
        setUser(profile);
        setDisplayName(profile.displayName || '');
        setBio(profile.bio || '');
        setAvatarUrl(profile.avatarUrl || '');
      } catch (err: unknown) {
        // Nếu chưa đăng nhập hoặc lỗi kết nối
        console.error('Lỗi khi tải hồ sơ:', err);
        setErrorMsg('Không thể tải thông tin hồ sơ. Vui lòng đảm bảo bạn đã đăng nhập.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  // Xử lý chọn file ảnh từ máy tính (chỉ xem trước, upload khi nhấn Lưu)
  const handleSelectAvatarFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    // Kiểm tra dung lượng <= 5MB
    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh vượt quá giới hạn 5MB.', true);
      return;
    }

    // Kiểm tra định dạng
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      showToast('Chỉ chấp nhận các định dạng ảnh: JPEG, PNG, WebP, GIF.', true);
      return;
    }

    // Lưu file vào state và tạo Blob Preview ngay lập tức
    setSelectedFile(file);
    const localBlob = URL.createObjectURL(file);
    setAvatarPreview(localBlob);
    showToast('Đã chọn ảnh đại diện mới. Hãy nhấn "Lưu Cập Nhật Hồ Sơ" để tải lên MinIO.');
  };

  // Xử lý lưu cập nhật hồ sơ (Tải ảnh lên MinIO nếu có chọn mới -> PATCH /api/v1/auth/me)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      showToast('Tên hiển thị không được để trống.', true);
      return;
    }

    if (displayName.trim().length > 50) {
      showToast('Tên hiển thị không được vượt quá 50 ký tự.', true);
      return;
    }

    if (bio.trim().length > 500) {
      showToast('Tiểu sử không được vượt quá 500 ký tự.', true);
      return;
    }

    setIsSubmitting(true);
    try {
      let finalAvatarUrl = avatarUrl.trim() || undefined;

      // Nếu người dùng đã chọn file ảnh mới -> tải lên MinIO trước
      if (selectedFile) {
        setIsUploadingAvatar(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('folder', 'avatars');

        const uploadRes = await fetch(`${getApiBaseUrl()}/files/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Máy chủ từ chối file ảnh tải lên MinIO.');
        }

        const uploadJson = await uploadRes.json();
        const minioUploadedUrl = uploadJson?.data?.url || uploadJson?.url;

        if (!minioUploadedUrl) {
          throw new Error('Không nhận được đường dẫn ảnh từ MinIO.');
        }

        finalAvatarUrl = minioUploadedUrl;
        setAvatarUrl(minioUploadedUrl);
      }

      // Cập nhật thông tin vào CSDL qua API PATCH /api/v1/auth/me
      const updated = await authApi.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        avatarUrl: finalAvatarUrl,
      });

      setUser(updated);
      setSelectedFile(null);
      setAvatarPreview(null);
      showToast('Cập nhật hồ sơ cá nhân và ảnh đại diện thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cập nhật hồ sơ thất bại.';
      showToast(msg, true);
    } finally {
      setIsUploadingAvatar(false);
      setIsSubmitting(false);
    }
  };

  // Ảnh đại diện đang hiển thị (ưu tiên preview blob -> avatarUrl -> ảnh mặc định)
  const currentAvatarSrc =
    avatarPreview ||
    avatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50/60 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-neutral-500 font-medium">Đang tải thông tin hồ sơ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-neutral-500 flex items-center gap-2">
          <Link href="/" className="hover:text-amber-600 transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">Hồ sơ cá nhân</span>
        </nav>

        {/* Thông báo thông điệp */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🎉</span>
              <span className="font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">✕</button>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">⚠️</span>
              <span className="font-medium">{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900 text-xs font-bold">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* CỘT TRÁI: THÔNG TIN TỔNG QUAN & AVATAR LỚN */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-xs text-center flex flex-col items-center">
              {/* AVATAR TRÒN LỚN CÓ NÚT UPLOAD MINIO */}
              <div className="relative group mb-4">
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-amber-100 shadow-md relative bg-neutral-100">
                  <Image
                    src={currentAvatarSrc}
                    alt={displayName || 'Avatar'}
                    fill
                    sizes="144px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    priority
                  />
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-xs gap-1">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang tải lên...</span>
                    </div>
                  )}
                </div>

                {/* Nút bấm Camera Overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="Thay đổi ảnh đại diện từ máy tính"
                  className="absolute bottom-1 right-1 p-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-lg transition-transform hover:scale-110 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* Input chọn file ẩn */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleSelectAvatarFile}
                  className="hidden"
                />
              </div>

              {/* Tên & Email */}
              <h2 className="text-xl font-bold text-neutral-800">{displayName || user?.displayName || 'Người dùng'}</h2>
              <p className="text-xs text-neutral-400 mt-0.5">{user?.email || 'user@culinary.local'}</p>

              {/* Badge Vai trò (Role) */}
              <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                {user?.roles && user.roles.length > 0 ? (
                  user.roles.map((r) => (
                    <span
                      key={r}
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        r === 'Admin'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : r === 'Author'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {r}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                    Thành viên ẩm thực
                  </span>
                )}
              </div>

              {/* Nút Upload trực tiếp phụ */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="mt-5 w-full py-2 px-3 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>📤</span>
                <span>Tải ảnh từ máy lên MinIO</span>
              </button>
            </div>

            {/* Khối bảo mật & kỹ thuật */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-xs space-y-2.5 text-xs text-neutral-500">
              <h4 className="font-bold text-neutral-700 uppercase tracking-wider text-[11px]">Thông Tin Hệ Thống</h4>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span>Mã người dùng:</span>
                <span className="font-mono text-neutral-700 truncate max-w-[150px]">{user?.id || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span>Trạng thái:</span>
                <span className="text-emerald-600 font-semibold">● Hoạt động bình thường</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Mật khẩu:</span>
                <span className="font-mono text-neutral-400">•••••••• (Đã mã hóa PBKDF2)</span>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: FORM CHỈNH SỬA HỒ SƠ */}
          <div className="md:col-span-7">
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs">
              <div className="pb-5 border-b border-neutral-100 mb-6">
                <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                  <span>✏️</span> Chỉnh Sửa Hồ Sơ Cá Nhân
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Cập nhật thông tin hiển thị với cộng đồng đầu bếp và người yêu ẩm thực.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email (Read-only) */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Địa chỉ Email (Định danh tài khoản)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full text-xs px-3.5 py-2.5 bg-neutral-100 text-neutral-500 border border-neutral-200 rounded-xl cursor-not-allowed"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">Email không thể thay đổi sau khi đăng ký.</p>
                </div>

                {/* Tên hiển thị (DisplayName <= 50) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-neutral-700">Tên hiển thị *</label>
                    <span className={`text-[11px] font-mono ${displayName.length > 50 ? 'text-rose-600 font-bold' : 'text-neutral-400'}`}>
                      {displayName.length}/50 ký tự
                    </span>
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    placeholder="Nhập tên hiển thị của bạn..."
                    className="w-full text-xs px-3.5 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                {/* Tiểu sử (Bio <= 500) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-neutral-700">Tiểu sử giới thiệu bản thân</label>
                    <span className={`text-[11px] font-mono ${bio.length > 500 ? 'text-rose-600 font-bold' : 'text-neutral-400'}`}>
                      {bio.length}/500 ký tự
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={500}
                    placeholder="Chia sẻ niềm đam mê ẩm thực, sở trường nấu ăn của bạn..."
                    className="w-full text-xs px-3.5 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-none"
                  />
                </div>

                {/* Đường dẫn AvatarUrl */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Đường dẫn ảnh đại diện (URL ảnh hoặc MinIO)
                  </label>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setAvatarPreview(null);
                    }}
                    placeholder="https://... hoặc tải trực tiếp bằng nút máy ảnh bên trái"
                    className="w-full text-xs px-3.5 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-400">
                    <span>Hỗ trợ ảnh từ MinIO hoặc các dịch vụ lưu trữ ảnh trực tuyến.</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-amber-700 font-semibold hover:underline"
                    >
                      Tải ảnh mới lên MinIO →
                    </button>
                  </div>
                </div>

                {/* Nút Submit */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploadingAvatar}
                    className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-bold rounded-2xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Đang lưu thông tin...</span>
                      </>
                    ) : (
                      <>
                        <span>Lưu Cập Nhật Hồ Sơ</span>
                        <span>💾</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
