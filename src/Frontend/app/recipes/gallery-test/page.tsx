import { redirect } from 'next/navigation';

// Quản lý ảnh thuộc trang sửa công thức, không dùng màn hình thử component.
export default function LegacyGalleryPage() {
  redirect('/dashboard/recipes');
}
