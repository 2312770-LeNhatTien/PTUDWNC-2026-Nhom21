# Chạy dự án trên máy cá nhân

Cập nhật 28/10/2026. Các lệnh dưới đây chạy bằng PowerShell từ thư mục gốc repo, trừ khi có `cd`.

Lab 8 có bộ Docker/HTTPS riêng: xem [DEPLOYMENT](DEPLOYMENT.md) để build image,
chạy migrator, cấu hình secrets và kiểm chứng backup/restore. Các bước bên dưới là môi trường dev.

## 1. Chuẩn bị và lấy code

Cài .NET 10 SDK, Node.js 22 LTS, npm, Git và Docker Desktop. Kiểm tra cổng 5432/6379/9000 trước khi chạy; nếu đang dùng cho dự án khác, đổi mapping và connection string tương ứng.

```powershell
git clone https://github.com/2312770-LeNhatTien/PTUDWNC-2026-Nhom21.git
cd PTUDWNC-2026-Nhom21
docker compose build minio
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

### Bộ 50 công thức của Lê Nhật Tiến

Khi chạy backend Development với cấu hình mặc định, seeder tự nạp **50 công thức thuộc 18 danh mục, 574 nguyên liệu, 172 bước nấu, 50 ảnh bìa và đủ 172 ảnh bước nấu**. Nội dung đã nhập qua giao diện được lưu tại `Persistence/Data/vietnamese-recipes.json` trong Infrastructure, nhúng vào bản build; 222 ảnh đi cùng repo tại `src/Frontend/public/recipe-images/`, có trong cả image Docker frontend. Không cần tải ZIP hay nhập SQL riêng.

Seeder dọn các bài nhận diện đúng là mẫu cũ của năm tài khoản demo, giữ bài thật và không nạp trùng slug. Không xóa volume/database để cập nhật dữ liệu. Nếu đã tắt tự khởi tạo, sau migration có thể chạy thủ công ở Development:

```powershell
dotnet run --project src/Backend/CulinaryBlog.API -- --seed-demo
```

Tên lệnh `--seed-demo` được giữ tương thích với Compose hiện có; nội dung nạp là bộ 50 công thức cố định, không sinh ngẫu nhiên. Hồ sơ tác giả là **Lê Nhật Tiến — 2312770@dlu.edu.vn**. Tài khoản đã có trên máy Tiến giữ nguyên mật khẩu/quyền; máy mới chỉ tạo hồ sơ không có mật khẩu đăng nhập, không chia sẻ thông tin xác thực cá nhân. Thành viên dùng tài khoản riêng hoặc Admin dev để thử quản lý bài.

Công thức được biên soạn lại từ Hungry Huy; một số ảnh thao tác bổ sung từ Cookbeo, CET, Hội Đầu Bếp Á Âu và BlueStone. Nguồn được ghi trong hướng dẫn từng món. Đây không phải ảnh tự chụp hay công thức đã nấu kiểm chứng; không tự điền dinh dưỡng khi chưa có số liệu xác thực. Xem quyết định D20.

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

Development nạp năm tài khoản demo dưới đây. Mỗi tài khoản sở hữu 10 trong bộ 50 công thức kèm ảnh, có thể mở **Công thức của tôi** để sửa, lưu trữ và xóa bài của mình.

| Tài khoản | Email đăng nhập | Mật khẩu ban đầu | Số công thức |
| --- | --- | --- | --- |
| Admin | `admin@culinary.local` | `Admin@123` | 10 |
| Lê Nhật Tiến | `tien@culinary.local` | `Demo@123` | 10 |
| Nguyễn Viết Toàn | `toan@culinary.local` | `Demo@123` | 10 |
| Nguyễn Đình Tuấn | `tuan@culinary.local` | `Demo@123` | 10 |
| Lâm Văn Đức | `duc@culinary.local` | `Demo@123` | 10 |

Sau khi pull, chạy lại backend Development để nạp tài khoản và chuyển quyền sở hữu bộ bài cũ theo `author_email` trong JSON. Database mới cũng dùng đúng phân chia này. Chạy lại giữ mật khẩu đã đổi, nội dung đã sửa và trạng thái xóa. Nếu tự tắt `Database:InitializeOnStartup`, chạy rõ `dotnet run --project src/Backend/CulinaryBlog.API -- --seed-demo` trong môi trường Development. Khi thành viên thêm hoặc xóa bài, số bài trong dashboard sẽ thay đổi tương ứng.

Các email trên dành riêng cho demo. Tài khoản email cá nhân của Tiến trên database cũ giữ thông tin đăng nhập riêng. Dùng tài khoản demo để trình diễn trên máy khác. Các tài khoản mật khẩu công khai chỉ dùng trong Development.

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
