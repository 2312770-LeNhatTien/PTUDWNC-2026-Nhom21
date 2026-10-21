# Báo cáo Buổi 7 — Nguyễn Viết Toàn (2312777)

Nhánh: `2312777-NguyenVietToan-buoi7`
Phạm vi: FR-INT-001 — đánh giá sao và bình luận cho công thức.

## Chức năng đã thực hiện

- Thêm entity `RecipeReview`, cấu hình EF Core, migration `AddRecipeReviews` và ràng buộc mỗi tài khoản chỉ đánh giá một lần cho một công thức.
- Thêm API công khai `GET /api/v1/recipes/{id}/reviews` để trả danh sách bình luận, điểm trung bình và số lượt đánh giá.
- Thêm API yêu cầu đăng nhập `POST /api/v1/recipes/{id}/reviews` với rating 1–5 và bình luận tối đa 2.000 ký tự.
- Bổ sung điểm trung bình và số lượt đánh giá vào DTO danh sách/chi tiết công thức.
- Thêm UI chọn sao, nhập bình luận tại trang chi tiết; người chưa đăng nhập được hướng dẫn đăng nhập; `RecipeCard` hiển thị huy hiệu rating.

## Kiểm tra

- `dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj -c Release --no-restore -m:1`: đạt, 0 lỗi.
- `npx tsc --noEmit`: đạt.
- `npm run lint`: đạt, không warning/error.
- `npm run build`: đạt.
- Kiểm thử API thật với PostgreSQL/Redis/Docker:
  - GET reviews: 200, dữ liệu rỗng ban đầu.
  - POST review hợp lệ: 201.
  - POST lần hai cùng tài khoản/công thức: 409.
  - Rating ngoài khoảng 1–5: 400.
  - Dữ liệu review tạm phục vụ kiểm thử đã được xóa sau khi kiểm tra.

## Cách chạy

```powershell
docker compose up -d postgres redis seq
dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj -c Release --no-restore -m:1
$env:ASPNETCORE_ENVIRONMENT='Development'
dotnet run --project src/Backend/CulinaryBlog.API -c Release --no-build --no-launch-profile --urls http://localhost:5000
```

Mở trang `/recipes/{slug}`, kéo xuống khu vực **Đánh giá & bình luận**. Tài khoản đã đăng nhập có thể chọn số sao và gửi bình luận; API migration sẽ tự áp dụng trong môi trường Development.

## Ghi chú

Build vẫn có cảnh báo dependency bảo mật hiện hữu của `Microsoft.OpenApi 2.0.0` và `System.Security.Cryptography.Pkcs 9.0.0`; đây không phải lỗi phát sinh từ Buổi 7 và chưa nâng cấp ngoài phạm vi chức năng này.
