# Báo cáo Lab 05 — Nguyễn Viết Toàn (2312777)

Nhánh: `2312777-NguyenVietToan-buoi5`. Vai trò: Category & Search UI.

## Chức năng đã thực hiện

- `/categories`: lưới danh mục, hình minh họa, mô tả, số công thức; trạng thái rỗng và lỗi có thể thử lại. Tải động để build không phụ thuộc API đang chạy.
- `/categories/[slug]`: danh sách công thức theo danh mục; điều hướng về danh sách danh mục.
- `/admin/categories`: modal thêm/sửa; xác nhận xóa; validation, trạng thái lưu, lỗi API và tải lại dữ liệu. Đổi tên bảo toàn slug D12; API xóa mềm D1 và từ chối danh mục còn công thức (409). Endpoint sửa/xóa yêu cầu Admin.
- `/recipes`: tìm kiếm tiếng Việt có/không dấu bằng `GET /recipes/search`, debounce 300ms, hủy request cũ tránh kết quả về sai thứ tự.
- Dropdown bộ lọc danh mục, độ khó, thời gian nấu tối đa; sắp xếp theo ngày tạo/tên/thời gian nấu/độ khó và chiều tăng/giảm. Giữ bộ lọc trong URL khi phân trang; xóa bộ lọc, trạng thái tải, rỗng, lỗi và thử lại.
- Nối tham số lọc vào endpoint danh sách; áp dụng tìm kiếm + bộ lọc + sắp xếp trước khi phân trang. Chỉ trả công thức Published chưa bị xóa.
- D8 hỗ trợ `sortBy`/`sortOrder` và `sort`; sắp xếp ổn định bằng Id khi trùng giá trị.
- Migration `EnableUnaccentSearch` tự bật extension PostgreSQL `unaccent`.

## Kiểm chứng

- Backend .NET 10: build thành công.
- Frontend Next.js: production build thành công.
- Playwright/Chrome: 5 bài kiểm thử thực hiện luồng tìm kiếm debounce, đổi nhanh nhiều bộ lọc + phân trang, tạo/sửa danh mục, xác nhận xóa với lỗi 409 và thành công, lỗi tải dữ liệu + thử lại. API được giả lập trong kiểm thử trình duyệt.
- Kiểm thử tích hợp API thật trên PostgreSQL riêng `culinary_lab05_test`: tạo/sửa giữ slug, validation 400, chặn xóa ẩn danh 401, xóa mềm 204 và không còn xuất hiện trong danh sách, chặn xóa danh mục có công thức 409, lọc/sắp xếp, tìm kiếm có/không dấu, tìm kiếm kết hợp bộ lọc và phân trang.
- Các cảnh báo dependency NuGet/npm tồn tại từ phiên bản của dự án; không nâng cấp framework trong phạm vi Lab 05.

## Chạy lại

```powershell
# Từ src/Frontend
npm ci
npm run build
npx playwright install chromium
npm run test:e2e
# Hoặc dùng Chrome sẵn có trên Windows:
$env:PLAYWRIGHT_CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npm run test:e2e

# API integration: chỉ chạy trên database kiểm thử riêng đã seed.
$env:LAB05_API_URL = 'http://localhost:5105/api/v1'
npm run test:api
```

API integration có tạo/sửa/xóa danh mục thử nghiệm. Chạy backend với `ConnectionStrings__DefaultConnection` trỏ tới database kiểm thử riêng, `ASPNETCORE_ENVIRONMENT=Development` và khóa JWT development của bạn. Migration và seeder sẽ được áp dụng tự động theo cấu hình dự án.

## Demo nộp bài

1. Mở `/categories`, chọn một danh mục và xem các công thức.
2. Đăng nhập Admin, mở `/admin/categories`, thêm danh mục, sửa tên và kiểm tra slug giữ nguyên, xóa danh mục rỗng; thử xóa danh mục có món để thấy cảnh báo.
3. Mở `/recipes`, nhập `cong thuc`, bật bộ lọc, chọn danh mục/độ khó/thời gian, sắp xếp tăng dần và chuyển trang.
