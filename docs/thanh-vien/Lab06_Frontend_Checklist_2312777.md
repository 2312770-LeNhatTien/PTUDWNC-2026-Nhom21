# Đối chiếu yêu cầu tối thiểu Lab 6 — 2312777

Nhánh: `2312777-NguyenVietToan-buoi6`.
Tài liệu này bổ sung tiêu chí frontend do giảng viên cung cấp; phần Redis và benchmark vẫn được lưu trong [báo cáo Redis](Bao_Cao_Lab_06_2312777_NguyenVietToan.md).

| Yêu cầu tối thiểu | Hiện thực và bằng chứng |
| --- | --- |
| Tiện ích xử lý lỗi, gọi API | `lib/api/client.ts`: Axios base URL, timeout, Bearer token, hàng đợi refresh 401. `lib/api/errors.ts`: chuẩn hóa ProblemDetails, validation fields, timeout, cancellation; thông báo 5xx không lộ chi tiết hệ thống. Dùng ở login và RecipeExplorer. `lib/utils.ts`: ghép class với clsx/tailwind-merge. |
| Thư viện hỗ trợ thiết kế | shadcn/ui theo cơ chế phân phối mã nguồn: `components.json`, `components/ui/button.tsx`, `input.tsx`, `skeleton.tsx`; dựa trên Radix Slot, CVA, Lucide và Tailwind CSS 3. Có dependency thực tế trong package.json/lockfile. Button/Input dùng trên tìm kiếm; Button dùng ở phân trang, lỗi, 404; Skeleton dùng khi loading. Các component được điều chỉnh màu cam theo giao diện hiện hữu. |
| Store quản lý trạng thái | Zustand `stores/auth-store.ts`: user, hydrated, setSession, updateUser, clearSession, syncFromStorage. Providers khởi tạo và đồng bộ giữa tab; Navbar subscribe store. Auth API đăng nhập/đăng ký/Google/refresh cập nhật store; logout xóa store; cập nhật profile đồng bộ tên/avatar. Tương thích storage key hiện hữu để tránh mất phiên khi cập nhật. |
| Thiết kế giao diện blog | Trang chủ, lưới danh mục, chi tiết danh mục, khám phá/tìm kiếm và bộ lọc, chi tiết công thức, login/register, profile và quản trị danh mục hiện có. Bố cục responsive theo breakpoint Tailwind. |
| Component dùng chung | Navbar, Footer, RecipeCard, ImageUploader; bổ sung `shared/Pagination.tsx`, `LoadingState.tsx`, `ErrorState.tsx`. RecipeExplorer dùng cả ba; boundary danh mục và boundary toàn app dùng ErrorState; loading toàn app dùng LoadingState. |
| Layout chung | `app/layout.tsx`: HTML tiếng Việt, metadata, Providers, Navbar, vùng nội dung, Footer. Bổ sung skip link bàn phím, loading/error/not-found mặc định. Sửa liên kết Footer về các route đang tồn tại. |

## Kiểm tra lại

```powershell
cd src/Frontend
npm ci
npx tsc --noEmit
npm run lint
npm run build
$env:PLAYWRIGHT_CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
npx playwright test tests/lab05.spec.ts tests/lab06.spec.ts
```

Có thể bỏ biến PLAYWRIGHT_CHROME_PATH nếu đã cài Chromium qua `npx playwright install chromium`.
Bộ test dùng mock API để kiểm tra độc lập với database: tìm kiếm/filter/pagination, modal CRUD danh mục, loading/error/retry, login → Navbar → reload → logout, token refresh đồng thời, dữ liệu lưu trữ hỏng và responsive 390/1440px. Kiểm tra Redis/HTTP thật có lệnh riêng trong báo cáo Redis.

Mã nguồn component shadcn/ui được lưu trong repo thay vì runtime package tên `shadcn/ui`; đây là mô hình source distribution. Tham khảo: https://ui.shadcn.com và https://github.com/shadcn-ui/ui (MIT). Chưa thay đổi cơ chế xác thực middleware của nhóm; backend vẫn là nơi thực thi phân quyền. Không dùng store phía client làm ranh giới bảo mật.

## Kết quả xác minh 14/10/2026

- `npx tsc --noEmit`: đạt.
- `npm run build`: đạt, build production và kiểm tra lint/types đầy đủ.
- Playwright Chrome: **10/10 ca đạt** (5 ca hồi quy buổi 5, 5 ca buổi 6).
- Ảnh responsive 390px và 1440px được chụp tại `src/Frontend/test-results/lab06-layout-*.png` khi chạy test; đã kiểm tra ảnh mobile và kiểm tra không tràn ngang ở cả hai kích thước. Ảnh test dùng dữ liệu API giả lập.
- `npm install` báo 16 advisory dependency (2 moderate, 11 high, 3 critical) trong cây dependency hiện hữu; chưa thực hiện nâng cấp framework ngoài phạm vi Lab 6. Đây là hạn chế cần xử lý trước triển khai production, không phải lỗi build hoặc thiếu sáu hạng mục của lab.
