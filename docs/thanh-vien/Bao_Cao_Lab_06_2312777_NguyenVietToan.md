# Báo cáo Buổi 6 — Nguyễn Viết Toàn (2312777)

Nhánh: `2312777-NguyenVietToan-buoi6`, dựa trên `main` commit `15f9f06`.
Phạm vi theo mục Tuần 6 trong tài liệu phân công cá nhân: Redis Caching & tối ưu thời gian phản hồi. Giao diện tìm kiếm và bộ lọc đã hoàn thành ở buổi 5.

## Kết quả nghiệm thu

- [x] `RedisCacheService` dùng `IDistributedCache`, System.Text.Json UTF-8 byte[], hỗ trợ Get/Set/Remove và CancellationToken.
- [x] Danh sách danh mục cache-aside, absolute TTL 30 phút; cache HIT không truy vấn PostgreSQL.
- [x] `RemoveByPrefixAsync("categories:*")` dùng SCAN, xóa theo lô 128 khóa trên primary; chỉ xóa namespace `culinaryblog:`, không FLUSHDB hoặc danh sách khóa trong RAM.
- [x] Invalidate sau lệnh thêm/sửa/xóa danh mục thành công. Lệnh công thức cũng invalidate vì số công thức Published có thể thay đổi.
- [x] Generation token chia sẻ trên Redis ngăn truy vấn cũ đang chạy ghi lại kết quả có thể được đọc sau invalidation. Token nằm ngoài prefix danh mục; dữ liệu thuộc generation cũ tự hết hạn sau 30 phút.
- [x] Một multiplexer dùng chung cho distributed cache và SCAN, không tạo kết nối cho mỗi request.
- [x] Cache JSON hỏng được loại bỏ để truy vấn lại dữ liệu.
- [x] Seq nhận structured log `CacheStatus`, `ElapsedMs`; console Development chỉ ghi Warning trở lên để tránh chặn đường xử lý request do I/O console.
- [x] Build Debug và Release thành công; kiểm thử Redis thật và HTTP thật đạt.
- [x] Benchmark cuối: trung bình 2,7372 ms, median 2,4402 ms, p95 3,7106 ms (200 request tuần tự, 20 lượt warm-up).

## Chạy lại

Từ thư mục gốc, khởi động Docker Desktop rồi:

```powershell
docker compose up -d postgres redis seq
dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj -c Release
dotnet run --project tests/Lab06.CacheChecks
$env:ASPNETCORE_ENVIRONMENT='Development'
dotnet run --project src/Backend/CulinaryBlog.API -c Release --no-build --no-launch-profile --urls http://localhost:5000
```

Trong terminal thứ hai:

```powershell
pwsh -File scripts/check-lab06-api.ps1
pwsh -File scripts/benchmark-lab06.ps1
```

Bộ kiểm tra Redis dùng khóa `lab06:<guid>:` và dọn trong `finally`. Kiểm thử API đăng nhập bằng Admin mẫu, tạo danh mục riêng, kiểm tra thêm/sửa/xóa với cache đã được đọc trước đó, bảo toàn slug D12 và dọn danh mục thử bằng xóa mềm D1. Không in token hoặc mật khẩu ra log.

Mở Seq tại http://localhost:5341, lọc `CacheStatus = 'HIT'` hoặc `CacheStatus = 'MISS'`. Đã đọc lại sự kiện qua Seq API; 5 HIT cuối có ElapsedMs 0,999–1,1206 ms.

## Bằng chứng đo và giới hạn

`lab06-benchmark-2312777.json` lưu lần đo cuối 14/10/2026 (giờ Việt Nam), Release + Seq logging. HTTP stopwatch bao gồm đọc body, dùng một HttpClient tái sử dụng kết nối. FirstRequestMs là request đầu của lần đo, không đồng nghĩa cache cold; JIT, kết nối HTTP và Redis có thể đã được warm từ kiểm thử trước đó.

Giữ cả hai lần đo trước tối ưu console để đối chiếu:

| Cấu hình | Mean ms | p95 ms |
| --- | ---: | ---: |
| Debug + console Information | 3,7815 | 5,3522 |
| Release + console Information | 4,2506 | 6,2537 |
| Release + Seq, console Warning | 2,7372 | 3,7106 |

Mục tiêu được kiểm tra ở p95, không chỉ giá trị trung bình. Max lần đo cuối là 19,8123 ms; đây là benchmark máy local, không phải cam kết mọi request dưới 5 ms hay kiểm thử tải đồng thời. Script trả lỗi nếu p95 vượt 5 ms; kết quả phụ thuộc tải máy và khoảng cách tới Redis.

NuGet vẫn có cảnh báo từ dependency hiện hữu Microsoft.OpenApi 2.0.0 và System.Security.Cryptography.Pkcs 9.0.0; build không có lỗi. Không nâng cấp ngoài phạm vi buổi 6. Redis là dịch vụ bắt buộc: hiện không có cơ chế bỏ qua Redis khi mất kết nối. Invalidation chạy sau commit DB; lỗi Redis ở bước này cần khôi phục Redis và làm mới cache, không có transaction chung DB/Redis.

Không tự merge vào main. Trưởng nhóm review nhánh buổi 6 trước khi gộp.
