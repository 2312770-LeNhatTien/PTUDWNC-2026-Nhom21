'use client';

import React, { useState } from 'react';
import ImageUploader from '@/components/ui/ImageUploader';
import FallbackImage from '@/components/ui/FallbackImage';
import { filesApi } from '@/lib/api/files';

interface UploadedMediaItem {
  id: string;
  url: string;
  folder: string;
  createdAt: string;
}

export default function MediaStudioPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'library' | 'inspector'>('upload');
  const [selectedFolder, setSelectedFolder] = useState<string>('recipes/covers');
  
  // Danh sách các ảnh đã tải gần đây trong phiên làm việc
  const [mediaList, setMediaList] = useState<UploadedMediaItem[]>([
    {
      id: 'demo-1',
      url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      folder: 'recipes/covers',
      createdAt: 'Hôm nay, 10:30',
    },
    {
      id: 'demo-2',
      url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
      folder: 'recipes/steps',
      createdAt: 'Hôm nay, 11:15',
    },
  ]);

  // Trạng thái cho tab Kiểm tra hiển thị & Ảnh lỗi (Inspector)
  const [testImageUrl, setTestImageUrl] = useState<string>('http://localhost:9000/culinary-blog/recipes/anh-da-bi-xoa-404.jpg');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleUploadSuccess = (url: string) => {
    const newItem: UploadedMediaItem = {
      id: `upload-${Date.now()}`,
      url,
      folder: selectedFolder,
      createdAt: 'Vừa xong',
    };
    setMediaList((prev) => [newItem, ...prev]);
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteItem = async (item: UploadedMediaItem) => {
    if (!window.confirm('Bạn có chắc muốn xóa ảnh này khỏi hệ thống không?')) return;
    await filesApi.deleteFile(item.url);
    setMediaList((prev) => prev.filter((i) => i.id !== item.id));
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      
      {/* 1. Header Banner phong cách Cloud Media Studio */}
      <div className="bg-white border-b border-orange-100 shadow-xs">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold mb-2 border border-orange-200/50">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>MinIO S3 Storage Connected (Port 9000)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <span>📸</span> Media Studio & Thư Viện Ảnh
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Tải lên, quản lý và tối ưu hóa hình ảnh món ăn với cơ chế bảo mật đám mây và xử lý lỗi tự động.
              </p>
            </div>

            {/* Menu Tabs chuyển đổi */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'upload'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📤 Tải ảnh mới
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'library'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🖼️ Thư viện</span>
                <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-700 text-[10px]">
                  {mediaList.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inspector')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'inspector'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔍 Soi ảnh lỗi
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Nội dung các Tab */}
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* TAB 1: TẢI ẢNH MỚI (TÍCH HỢP PRESIGNED URL & TIẾN TRÌNH THỜI GIAN THỰC) */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            
            {/* Bộ chọn thư mục lưu trữ */}
            <div className="bg-white rounded-3xl p-5 border border-orange-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Thư mục phân loại ảnh trên đám mây</span>
                <span className="text-[11px] text-slate-400">Chọn đúng danh mục để hệ thống tự động sắp xếp thư viện.</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'recipes/covers', label: 'Ảnh bìa công thức' },
                  { id: 'recipes/steps', label: 'Các bước nấu ăn' },
                  { id: 'avatars', label: 'Ảnh hồ sơ tác giả' },
                  { id: 'general', label: 'Ảnh chung' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFolder(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedFolder === f.id
                        ? 'bg-orange-600 text-white shadow-sm shadow-orange-500/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Khung tải ảnh chính */}
            <ImageUploader
              folder={selectedFolder}
              title="Đăng tải hình ảnh món ăn chất lượng cao"
              description="Hình ảnh được tải trực tiếp lên MinIO S3 bằng đường truyền bảo mật có thanh tiến trình %."
              onUploadSuccess={handleUploadSuccess}
            />

            {/* Thẻ giải thích công nghệ thân thiện */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                <span className="text-xl">⚡</span>
                <h4 className="text-xs font-bold text-slate-800">Tải trực tiếp không nghẽn server</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Trình duyệt xin vé tạm thời (Presigned URL) và bắn file thẳng tới MinIO, giúp máy chủ web luôn mượt mà.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                <span className="text-xl">👁️</span>
                <h4 className="text-xs font-bold text-slate-800">Xem trước ảnh Blob tức thì</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Ngay khi bạn chọn file, ảnh hiển thị lập tức để bạn kiểm tra bố cục trước khi quyết định bấm lưu.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                <span className="text-xl">🛡️</span>
                <h4 className="text-xs font-bold text-slate-800">Bảo mật tuyệt đối</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Khóa bí mật Admin không bao giờ để lộ xuống trình duyệt. Vé tải lên tự động hết hạn sau 15 phút.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: THƯ VIỆN ẢNH ĐÃ TẢI (MEDIA LIBRARY) */}
        {activeTab === 'library' && (
          <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Thư viện ảnh trên hệ thống</h2>
                <p className="text-xs text-slate-500">Toàn bộ ảnh bạn tải lên trong phiên làm việc hiện tại.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
              >
                + Tải thêm ảnh
              </button>
            </div>

            {mediaList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Chưa có ảnh nào trong thư viện. Hãy qua tab &quot;Tải ảnh mới&quot; để thêm ảnh nhé!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {mediaList.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50 flex flex-col transition hover:shadow-md"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                      <FallbackImage
                        src={item.url}
                        alt="Ảnh món ăn"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs">
                        {item.folder}
                      </span>
                    </div>

                    <div className="p-3 bg-white flex-1 flex flex-col justify-between gap-2 border-t border-slate-100">
                      <div className="overflow-hidden">
                        <span className="text-[10px] text-slate-400 block">{item.createdAt}</span>
                        <p className="text-xs font-mono text-slate-600 truncate mt-0.5" title={item.url}>
                          {item.url}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(item.url, item.id)}
                          className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                        >
                          {copiedId === item.id ? '✓ Đã sao chép' : '📋 Sao chép link'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="text-[11px] font-semibold text-red-500 hover:text-red-700"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BỘ CÔNG CỤ TEST ẢNH LỖI (FALLBACK INSPECTOR) */}
        {activeTab === 'inspector' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>🔍</span> Bộ Công Cụ Thử Nghiệm Xử Lý Ảnh Lỗi (Fallback Image)
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Trong thực tế, ảnh có thể bị lỗi do máy chủ MinIO mất kết nối, người dùng xóa nhầm ảnh, hoặc đường dẫn ảnh bị sai.
                Thay vì để hiện icon gạch chéo xấu xí làm hỏng giao diện, công nghệ **Fallback Image** tự động biến thành khung placeholder món ăn cao cấp.
              </p>
            </div>

            {/* Ô dán link ảnh tự do */}
            <div className="space-y-3 p-4 bg-orange-50/40 rounded-2xl border border-orange-100">
              <label className="text-xs font-bold text-slate-700 block">
                Nhập hoặc dán bất kỳ đường dẫn ảnh nào bạn muốn kiểm tra:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={testImageUrl}
                  onChange={(e) => setTestImageUrl(e.target.value)}
                  placeholder="https://... hoặc http://localhost:9000/..."
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTestImageUrl('http://localhost:9000/culinary-blog/recipes/anh-khong-ton-tai-404.jpg')}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-xl transition"
                  >
                    💥 Thử Link Lỗi (404)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestImageUrl('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80')}
                    className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl transition"
                  >
                    ✅ Thử Link Chuẩn
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestImageUrl('https://wrong-domain-domain-khong-co-that-xyz.com/image.jpg')}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition"
                  >
                    🌐 Thử Server Sập
                  </button>
                </div>
              </div>
            </div>

            {/* Màn hình hiển thị kết quả thời gian thực */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Bên trái: Dùng thẻ <img> thông thường của trình duyệt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    ❌ Thẻ &lt;img&gt; thông thường (Không có Fallback):
                  </span>
                  <span className="text-[10px] text-red-600 font-semibold">Bị vỡ icon xấu</span>
                </div>
                <div className="h-56 rounded-2xl border-2 border-dashed border-red-200 bg-red-50/30 flex items-center justify-center p-2 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={testImageUrl}
                    alt="Ảnh thử nghiệm"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  Khi link hỏng, trình duyệt chỉ hiện icon ảnh rách và dòng alt nhỏ, làm trang web trông thiếu chuyên nghiệp.
                </p>
              </div>

              {/* Bên phải: Dùng FallbackImage của hệ thống */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    ✨ Component FallbackImage của nhóm (Đã tối ưu):
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Tự động cứu giao diện</span>
                </div>
                <div className="h-56 rounded-2xl border border-emerald-200 bg-emerald-50/20 flex items-center justify-center overflow-hidden">
                  <FallbackImage
                    src={testImageUrl}
                    alt="Món Ăn Thử Nghiệm"
                    fallbackText="Hình ảnh món ăn đang được cập nhật"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[11px] text-emerald-700/80 font-medium italic">
                  Tự động nhận diện lỗi 404/kết nối và thay thế bằng card ẩm thực sang trọng có biểu tượng món ăn, giữ nguyên bố cục layout.
                </p>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
