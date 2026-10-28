# Background Jobs (FR-JOB)

Hangfire lưu lịch/hàng đợi trong schema `hangfire` của PostgreSQL hiện có.
Dashboard tại `/hangfire` chỉ dành cho Admin. Domain/Application không phụ thuộc Hangfire.

| Mã FR | Job | Loại | Kích hoạt khi |
| --- | --- | --- | --- |
| FR-JOB-001 | Gửi email chào mừng | Fire-and-forget | Sau khi đăng ký thành công (FR-AUTH-001) |
| FR-JOB-002 | Tạo thumbnail 300x300 + medium 800x600 | Fire-and-forget | Sau khi upload ảnh thành công (FR-RCP-008) |
| FR-JOB-003 | Sinh sitemap.xml | Recurring | Hằng ngày 02:00 UTC (cron `0 2 * * *`) |

## Đã hiện thực: FR-JOB-003 và dashboard

- `SitemapJob`: recurring ID `sitemap-daily`, cron `0 2 * * *`, múi giờ **UTC**
  (09:00 Việt Nam), retry **2 lần** theo SRS 3.6. Đăng ký lại khi restart không tạo lịch trùng.
- Khi chưa có file, startup enqueue một lần để website có sitemap trước lịch kế tiếp.
- Application query lấy toàn bộ Recipe Published và Category chưa xóa mềm, cùng `/`,
  `/recipes`, `/categories`. Không phân trang, không dùng cache hoặc lấy trang quản trị.
- XML UTF-8 đúng namespace, lastmod lấy từ dữ liệu, loại URL trùng. Ghi file tạm rồi thay
  file đích; khóa PostgreSQL ngăn nhiều worker ghi đồng thời. Vượt 50.000 URL/50MB sẽ báo lỗi,
  cần mở rộng sitemap index khi đạt giới hạn này.
- API phục vụ đúng `/sitemap.xml`, `/robots.txt`; Next.js rewrite hai URL gốc sang API,
  không ghi vào source Frontend. File mới có hiệu lực cả khi chạy `next start`.
- Admin đăng nhập website → menu **Tác vụ nền** → **Mở bảng tác vụ** →
  **Recurring Jobs** → chọn `sitemap-daily` → **Trigger now**. Lịch sử/lỗi nằm trong dashboard.
- `POST /api/v1/admin/hangfire/session` nhận JWT Admin và refresh token đang hoạt động,
  cấp cookie HttpOnly, SameSite Strict, Path `/hangfire`, Secure ở production, tối đa 15 phút
  và không quá hạn JWT. Mỗi request kiểm tra lại quyền Admin, tài khoản hoạt động và refresh
  token chưa thu hồi. Logout/rotation vô hiệu cả cookie đã sao chép. API nghiệp vụ giữ Bearer.
- Có thể trigger bằng `POST /api/v1/admin/hangfire/sitemap` với Bearer Admin (202).
  Cơ chế chống giả mạo thao tác mặc định của dashboard vẫn bật.

## Cấu hình

| Cấu hình | Mặc định / ý nghĩa |
| --- | --- |
| `Jobs__Enabled` | `true`; `false` tắt worker, dashboard và đăng ký lịch; vẫn phục vụ file đã có |
| `ConnectionStrings__DefaultConnection` | PostgreSQL hiện có; tài khoản cần quyền tạo schema Hangfire |
| `Sitemap__SiteBaseUrl` | Dev `http://localhost:3000`; production bắt buộc đặt origin website công khai |
| `Sitemap__OutputDirectory` | `public/seo`, tương đối với API content root; cần quyền ghi, dùng volume bền vững khi deploy |
| `Sitemap__Cron` | `0 2 * * *`, luôn dùng UTC |
| `Sitemap__SubmitToSearchConsole` | `false`, đặc biệt khi chạy local |
| `Sitemap__SearchConsoleSiteUrl` | Khi submit: property đã xác minh, ví dụ `sc-domain:example.com` hoặc `https://example.com/` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Đường dẫn ADC JSON ngoài Git; tài khoản phải có quyền với property Search Console |
| Frontend `API_URL` | API dùng cho rewrite phía server; nếu đổi phải build lại Next.js production |
| Frontend `NEXT_PUBLIC_API_URL` | API mà trình duyệt truy cập; dùng cùng hostname website khi chạy local (`localhost`) |

Google đã [ngừng endpoint ping cũ](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping).
Khi bật submit, job dùng [Search Console `sitemaps.submit`](https://developers.google.com/webmaster-tools/v1/sitemaps/submit)
với ADC và scope `webmasters`. HTTP lỗi làm job retry nhưng vẫn giữ file vừa tạo.
Local chưa có domain đã xác minh/credentials nên **chưa nghiệm thu gửi Google thật**;
robots vẫn khai báo Sitemap. Không đưa khóa/token Google vào appsettings hoặc Git.

## Kiểm chứng

Chạy API riêng cổng `5107` trên **bản sao database** `culinary_blog_lab7_20261021`
(đã migrate/seed), với các override:

```powershell
$env:ASPNETCORE_ENVIRONMENT='Development'
$env:ConnectionStrings__DefaultConnection='Host=localhost;Port=5432;Database=culinary_blog_lab7_20261021;Username=postgres;Password=postgres'
$env:AllowedOrigins__1='http://localhost:3107'
$env:Sitemap__SiteBaseUrl='http://localhost:3107'
# Dùng thư mục thử riêng ngoài thư mục SEO đang phục vụ website chính.
$env:Sitemap__OutputDirectory=Join-Path $env:TEMP 'culinary-seo-api-checks'
dotnet run --project src/Backend/CulinaryBlog.API --no-launch-profile --urls http://localhost:5107
```

Terminal khác ở root repo:

```powershell
dotnet run --project tests/SitemapChecks
cd src/Frontend
$env:PLAYWRIGHT_CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
npx playwright test --config playwright.jobs.config.ts
```

Console checks kiểm tra XML/escaping, lỗi/cancel giữ file, giới hạn URL, chạy đồng thời,
retry và Google API giả lập. Browser tests dùng login/backend thật, kiểm tra Admin/Author/Guest,
thu hồi cookie, Trigger now, XML/robots qua Next.js và vòng đời Recipe/Category.
Không chạy test trên database thật: test có tạo/lưu trữ/xóa mềm dữ liệu mẫu.
Muốn kiểm tra rewrite production: build với `API_URL=http://localhost:5107`,
`NEXT_PUBLIC_API_URL=http://localhost:5107/api/v1`, rồi đặt `JOBS_TEST_PRODUCTION=1` khi chạy cùng suite.

## Phần dùng chung còn lại

FR-JOB-001 (email, Đức) và FR-JOB-002 (resize, Tuấn) chưa nằm trong thay đổi này.
Các job tiếp theo dùng lại storage/server đã đăng ký; retry theo SRS 3.6
(email 3 lần với backoff 1/5/30 phút, ảnh 3 lần). Không tạo thêm storage riêng trong Program.
