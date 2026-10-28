# Background jobs, ảnh và sitemap

Cập nhật 28/10/2026. Hangfire dùng PostgreSQL/schema `hangfire`, worker 2–4, queue `default` và `images`; không dùng MemoryStorage trong runtime.

## Công việc bền vững

Đăng ký local/Google ghi welcome intent cùng user; attach gallery ghi resize intent; xóa gallery ghi delete intent. `PendingJobDispatcher` chuyển intent đã commit sang Hangfire mỗi 5 giây. `Jobs:Enabled=false` bỏ server/dispatcher/dashboard nhưng API vẫn lưu intent; bật lại sẽ xử lý phần chờ.

Welcome retry 3 lần, trễ 60/300/1800 giây, dùng MailKit/template hiện có. Resize và xóa retry 3 lần ở queue `images`. Khóa intent + `CompletedAt` chống lặp thông thường; crash giữa SMTP delivery và commit vẫn có thể gửi email lặp (at-least-once), xem D16. Job lỗi cuối cùng nằm trong Hangfire để Admin xem và Retry.

Ảnh dùng Magick.NET theo D15: upload proxy kiểm tra bytes/MIME/decode <=5 MB và ownership; presign cũ trả 410. Thumbnail WebP crop giữa 300x300, medium giữ tỉ lệ trong 800x600, quality75. Key biến thể ổn định, retry ghi đè; worker chỉ đọc object được quản lý, không HTTP fallback. Xóa gallery dọn cả biến thể sau khi kiểm tra tham chiếu; soft-delete Recipe giữ ảnh theo D1. Không đảm bảo mọi ảnh đều giảm >70%: ảnh gốc quá nhỏ có thể tăng kích thước sau crop/upscale, log ghi số đo thực.

## Sitemap và dashboard

API file/resize/stats đi qua MediatR ở Application; endpoint chỉ xử lý HTTP. Response resize/stats dùng envelope `{ data, meta }` như các module khác. `data.jobId` của resize đơn là ID PendingJob; Hangfire ID có sau dispatch. Batch trả thêm `data.pendingCount`; raw delete-file trả202 không body. Handler tạo phiên Admin xác minh user/refresh token; cookie và claims được tạo ở API.

Sitemap query chỉ lấy Published và Category hợp lệ. Lịch UTC02:00 (09:00 Việt Nam), retry2; ghi file tạm rồi thay thế an toàn. API phục vụ `/sitemap.xml` và `/robots.txt`; Next.js rewrite về API bằng `API_URL`. Không ghi vào source Frontend/public.

Dashboard `/hangfire` yêu cầu cookie Admin HttpOnly theo D14. Mở từ UI Admin để cấp cookie; dán Bearer vào URL hoặc mở thẳng Guest sẽ không có quyền. Logout/refresh rotation làm phiên dashboard cũ mất hiệu lực. Stats/resize-all chỉ Admin; resize ảnh đơn chỉ owner/Admin, đúng recipe/image.

## Cấu hình

```json
{
  "Jobs": { "Enabled": true },
  "Sitemap": {
    "SiteBaseUrl": "http://localhost:3000",
    "OutputDirectory": "public/seo",
    "Cron": "0 2 * * *",
    "SubmitToSearchConsole": false
  }
}
```

Development có MinIO, Redis và SMTP MailHog trong appsettings.Development. Google submission mặc định tắt. Chỉ bật với domain public đã xác minh trong Search Console, ADC có quyền sitemaps.submit và cấu hình `Sitemap:SearchConsoleSiteUrl` đúng thuộc tính. Không dùng ping Google cũ, không commit credentials. Nhóm chưa có domain/credentials nên chưa nghiệm thu Google thật.

## Kiểm thử tự động

`tests/Backend.Tests` kiểm tra pending welcome, idempotence, retry/queue attributes thật, resize đúng kích thước/WebP, quyền file/jobs, xóa ảnh và giữ ảnh soft-delete trên database tạm (S3 transport giả lập). Suite `SitemapChecks` kiểm tra XML/escaping, query failure/cancel giữ file, URL limit, khóa đồng thời và Google HTTP giả lập.

```powershell
$env:SITEMAP_TEST_CONNECTION='<connection-database-thu-rieng-da-tao>'
dotnet run --project tests/SitemapChecks
```

Browser jobs regression dùng API thật cổng5107 + DB thử đã migrate/seed, không dùng DB demo:

```powershell
$env:ASPNETCORE_ENVIRONMENT='Development'
$env:ConnectionStrings__DefaultConnection='<connection-database-thu-rieng>'
$env:AllowedOrigins__1='http://localhost:3107'
$env:Sitemap__SiteBaseUrl='http://localhost:3107'
$env:Sitemap__OutputDirectory=Join-Path $env:TEMP 'culinary-seo-checks'
$env:Sitemap__SubmitToSearchConsole='false'
dotnet run --project src/Backend/CulinaryBlog.API --no-launch-profile --urls http://localhost:5107
```

Terminal khác:

```powershell
cd src/Frontend
npx playwright test --config playwright.jobs.config.ts
```

Suite dùng login thật, kiểm tra Admin/Author/Guest, cookie thu hồi, trigger job, XML/robots qua Next.js và vòng đời dữ liệu. Test có tạo/archive/soft-delete dữ liệu; chỉ chạy DB thử. Khi kiểm tra rewrite production, build với API_URL/NEXT_PUBLIC_API_URL trỏ5107 rồi đặt `JOBS_TEST_PRODUCTION=1`. MinIO Linux/native image codecs, HTTPS/proxy và Google thật cần nghiệm thu trên deployment Buổi8.
