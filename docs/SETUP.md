# Chạy dự án trên máy cá nhân

Cập nhật 28/10/2026. Các lệnh dưới đây chạy bằng PowerShell từ thư mục gốc repo, trừ khi có `cd`.

Lab 8 có bộ Docker/HTTPS riêng: xem [DEPLOYMENT](DEPLOYMENT.md) để build image,
chạy migrator, cấu hình secrets và kiểm chứng backup/restore. Các bước bên dưới là môi trường dev.

## 1. Chuẩn bị và lấy code

Cài .NET 10 SDK, Node.js 22 LTS, npm, Git và Docker Desktop. Kiểm tra cổng 5432/6379/9000 trước khi chạy; nếu đang dùng cho dự án khác, đổi mapping và connection string tương ứng.

```powershell
git clone https://github.com/2312770-LeNhatTien/PTUDWNC-2026-Nhom21.git
cd PTUDWNC-2026-Nhom21
docker compose up -d
docker compose ps
dotnet restore CulinaryBlog.slnx
dotnet build CulinaryBlog.slnx -c Release
```

Giữ version package đã ghim trong repo, không tự lấy bản mới nhất khi gặp lỗi restore. Kiểm tra SDK, mạng và nguồn NuGet trước.

## 2. Khóa và cấu hình backend

Project API đã có UserSecretsId. Tạo JWT key riêng tối thiểu 32 ký tự và lưu bằng user-secrets:

```powershell
dotnet user-secrets set 'JwtSettings:Key' '<chuoi-ngau-nhien-rieng-toi-thieu-32-ky-tu>' --project src/Backend/CulinaryBlog.API
```

`appsettings.Development.json` có connection PostgreSQL `culinary_blog` (pool tối đa40), Redis, MinIO, MailHog và Sitemap origin cho local. Khi deploy nhiều replica, chia ngân sách kết nối DB cho từng instance và Hangfire; không tăng pool tùy ý tới max_connections. Đây là cấu hình demo; không dùng mật khẩu demo cho production. Khóa thật dùng user-secrets hoặc biến môi trường, không commit `.env.local`, token hoặc file credentials.

Google là tùy chọn: backend cần `Google:ClientId`, frontend cần Google client ID tương ứng. Chưa có domain/credentials Search Console thì giữ `Sitemap:SubmitToSearchConsole=false`. Đọc [hướng dẫn jobs](../src/Backend/CulinaryBlog.Infrastructure/Jobs/README_JOBS.md).

## 3. Áp dụng migration đã có

Không tạo lại `InitialCreate`, xóa migrations hoặc reset database đang dùng. `DesignTimeDbContextFactory` không đọc user-secrets/appsettings của API; vì vậy phải chỉ rõ connection khi dùng EF CLI:

```powershell
dotnet tool install --global dotnet-ef --version '10.0.*'
# Bỏ qua install nếu đã có dotnet-ef 10; kiểm tra bằng dotnet ef --version.
$env:ConnectionStrings__DefaultConnection='Host=localhost;Port=5432;Database=culinary_blog;Username=postgres;Password=postgres'
dotnet ef database update --project src/Backend/CulinaryBlog.Infrastructure --startup-project src/Backend/CulinaryBlog.API
Remove-Item Env:ConnectionStrings__DefaultConnection
```

Migration hiện có bao gồm `unaccent`, concurrency token/trigger, full-text SearchVector/GIN, PendingJobs và CacheVersion. Không cần chạy SQL extension bằng tay. Khi chạy Development, API mặc định cũng migrate/seed; tắt bằng `Database__InitializeOnStartup=false` nếu chỉ muốn tự quản lý migration. Production phải apply migration riêng có kiểm soát; seeder tài khoản demo chỉ chạy Development.

```powershell
dotnet run --project src/Backend/CulinaryBlog.API
```

API ở `http://localhost:5000/api/v1`, Scalar ở `/scalar/v1`. Các nghiệp vụ đã được hiện thực; 501 không phải kết quả bình thường cần bỏ qua.

## 4. Frontend

Mở terminal khác từ root:

```powershell
cd src/Frontend
Copy-Item .env.example .env.local
# Điền AUTH_SECRET ngẫu nhiên riêng trong .env.local trước khi chạy.
npm ci
npm run dev
```

Mở `http://localhost:3000`. `API_URL` là địa chỉ backend cho Next.js server; `NEXT_PUBLIC_API_URL` là địa chỉ trình duyệt truy cập được. Cả hai mặc định `http://localhost:5000`; client tự chuẩn hóa `/api/v1`. Khi đổi cổng, cập nhật CORS và Auth URL tương ứng.

Tài khoản demo chỉ trên DB Development mới seed: `admin@culinary.local` / `Admin@123`, `bep_truong_an@culinary.local` / `Author@123`. Đừng đưa tài khoản demo lên môi trường public.

## 5. Các cổng local

| Dịch vụ | URL/cổng | Kiểm tra |
| --- | --- | --- |
| Frontend | http://localhost:3000 | Tạo/sửa Draft tại dashboard, preview riêng, Publish |
| API | http://localhost:5000/scalar/v1 | GET/PATCH/POST cần JWT theo từng quyền |
| Health | http://localhost:5000/health | PostgreSQL + Redis + MinIO |
| Liveness | http://localhost:5000/health/live | Chỉ tiến trình API |
| Readiness | http://localhost:5000/health/ready | PostgreSQL + Redis |
| Hangfire | http://localhost:5000/hangfire | Cookie Admin được cấp từ chức năng mở dashboard |
| PostgreSQL / Redis | 5432 / 6379 | Không có giao diện HTTP |
| MinIO | http://localhost:9001 | `minioadmin` / `minioadmin`, S3 ở 9000 |
| Seq | http://localhost:5341 | Log JSON, CorrelationId và thời gian handler/query |
| MailHog | http://localhost:8025 | SMTP 1025, xem email thử không gửi ra ngoài |

## 6. Kiểm thử trước PR

```powershell
dotnet test tests/Backend.Tests/Backend.Tests.csproj -c Release --collect:'XPlat Code Coverage' --results-directory artifacts/coverage
dotnet run --project tests/Lab06.CacheChecks -c Release
cd src/Frontend
npm audit
npx tsc --noEmit
npm run build
npx playwright install chromium
npx playwright test
npx playwright test --config playwright.recipes.config.ts recipe-management.ui.spec.ts
```

Backend tests tạo/drop database ngẫu nhiên `culinary_tests_<guid>` bằng user test có quyền CREATEDB. Mặc định server local 5432, database quản trị `postgres`; đổi bằng `CULINARY_TEST_ADMIN_CONNECTION` để dùng instance riêng. Không chạy test bằng tài khoản production. Coverage gate CI đo line coverage Application >=80% từ unit + API integration tests; không gọi đây là coverage unit thuần.

Playwright mặc định dùng API giả lập nhưng middleware/phiên thật. Suite jobs dùng backend thật và DB thử, xem hướng dẫn jobs; không chạy lên DB demo. Kiểm thử Google thật, Docker production/Nginx/HTTPS và Core Web Vitals trên deployment thuộc Buổi 8.
