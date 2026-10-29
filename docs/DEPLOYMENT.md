# Triển khai Lab 8 — Docker, Nginx và HTTPS

Phần P01 của Lê Nhật Tiến (2312770), dựa trên SRS 6.2/6.5 và DECISIONS D19. Chạy lệnh PowerShell từ root repo. Cần Docker Compose v2, PowerShell 7; Node.js 22 chỉ cần khi chạy Playwright ngoài container. Docker Desktop phải dùng Linux containers.

## 1. Kiến trúc và cấu hình

```text
Browser --HTTPS--> Nginx --HTTP--> Next.js standalone
                       |-------> API .NET 10 --> PostgreSQL / Redis / MinIO
                       |-------> /hangfire, /sitemap.xml, /robots.txt ở API
Browser --HTTPS:9443--> Nginx --GET/HEAD--> MinIO public images
```

API upload kiểm tra bytes/quyền theo D18; không dùng lại presigned PUT. Nginx không mở cổng console MinIO. Các container dùng tên dịch vụ để kết nối nội bộ; browser nhận URL public, không nhận `http://api:8080` hoặc `http://minio:9000`.

| Dịch vụ | Nội bộ | Public mặc định | Local HTTPS |
| --- | --- | --- | --- |
| Nginx HTTP → HTTPS | 80 | 80 | 127.0.0.1:8088 |
| Nginx website/API/dashboard/SEO | 443 | 443 | 127.0.0.1:8443 |
| Nginx public media (chỉ GET/HEAD) | 9443 | 9443 | 127.0.0.1:9443 |
| API / Next / PostgreSQL / Redis / MinIO | 8080 / 3000 / 5432 / 6379 / 9000 | Không publish | Không publish |
| MailHog, chỉ override local | 8025 / 1025 | Không có | 127.0.0.1:8028 / 1028 |

`docker-compose.prod.yml` chứa cấu hình triển khai; `docker-compose.lab8.yml` chỉ thêm MailHog local. Không chạy compose dev cùng tên project production. Network mặc định `172.31.88.0/24`, Nginx `172.31.88.10`; đổi cả `PRODUCTION_SUBNET` và `PROXY_IP` nếu bị trùng mạng. API chỉ tin forwarded headers từ proxy được khai báo; Nginx ghi đè IP/scheme do client gửi.

Named volumes giữ PostgreSQL, Redis AOF, MinIO, SEO và Data Protection keys. API chạy user 1654, Next chạy user node. Runtime image không chứa source, `.env.local`, secrets, log, báo cáo Word hoặc kế hoạch local. Với API scale-out, SEO/key ring phải dùng storage chung có quyền phù hợp; volume local trên một Docker host không thay thế shared storage nhiều máy.

Registry MinIO Docker Hub/Quay từ chối tải release trên CI. Vì vậy cả compose dev
và production dùng image tự build bằng `deploy/minio/Dockerfile`, từ source chính thức
`RELEASE.2024-01-16T16-07-38Z`, kiểm SHA-256 archive và ghim commit upstream. Giữ nguyên
release để dùng lại dữ liệu hiện có. Lần build đầu cần tải Go builder và Go modules;
runtime chỉ có server, license upstream và HTTP health probe, không cần `mc`.

## 2. Chạy HTTPS local khi chưa có domain

```powershell
./scripts/Initialize-Deployment.ps1 -Local
docker compose --env-file .env.production.local -f docker-compose.prod.yml -f docker-compose.lab8.yml config --quiet
docker compose --env-file .env.production.local -f docker-compose.prod.yml -f docker-compose.lab8.yml build api frontend minio
docker compose --env-file .env.production.local -f docker-compose.prod.yml -f docker-compose.lab8.yml up -d --wait --wait-timeout 180
# Tạo demo CHỈ khi test local, không tự chạy ở production.
docker compose --env-file .env.production.local -f docker-compose.prod.yml -f docker-compose.lab8.yml run --rm seed-demo
curl.exe --fail --cacert .secrets/tls/tls.crt https://localhost:8443/health
```

Script sinh secret ngẫu nhiên vào `.secrets/` và cert tự ký localhost có hạn 30 ngày. Không cài CA vào máy. Browser có thể cảnh báo certificate; local có thể mở/cho phép certificate của website và media, hoặc dùng Playwright `ignoreHTTPSErrors`. Production phải dùng certificate hợp lệ, không tắt xác minh TLS. Local tắt HSTS (`max-age=0`), còn profile production mặc định bật một năm.

Nếu đã có `.env.production.local`, script dừng để tránh vô tình thay khóa deployment. Có thể dùng `-EnvFile .env.production.tien.local`; khi đó truyền cùng đường dẫn đó vào mọi lệnh compose/backup/restore. Khi đổi project name phải hiểu rằng Docker sẽ dùng bộ volumes mới. Không đổi credentials PostgreSQL chỉ bằng sửa file khi đang dùng volume cũ; phải thực hiện rotation tương ứng trong dịch vụ.

Tài khoản demo từ seeder hiện có: Admin `admin@culinary.local` / `Admin@123`, Author `bep_truong_an@culinary.local` / `Author@123`. Chúng chỉ được tạo khi gọi `seed-demo` với môi trường Development. Website local: https://localhost:8443; mail: http://localhost:8028. Bộ này tách với web dev/Lab 7 ở cổng 3000/5000.

## 3. Domain/máy chủ thật

```powershell
./scripts/Initialize-Deployment.ps1 -PublicHost culinary.example.com
# Điền .env.production.local: public origin, media origin, SMTP relay và các đường dẫn.
# Đặt certificate chain/key hợp lệ tại .secrets/tls/tls.crt và tls.key.
docker compose --env-file .env.production.local -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production.local -f docker-compose.prod.yml build api frontend minio
docker compose --env-file .env.production.local -f docker-compose.prod.yml up -d --wait --wait-timeout 180
```

DNS phải trỏ đúng host; firewall chỉ mở các cổng public cần thiết. `.env.production.example` chỉ có giá trị cấu hình mẫu. Đặt secrets ngoài Git và giới hạn quyền thư mục `.secrets/` cho người vận hành. Script trên Linux đặt thư mục host 700, secret files 444 để UID thường trong container đọc được bind mount; người dùng khác trên host không đi qua được thư mục 700. Khi rotation, owner đổi quyền file tạm để cập nhật rồi trả lại read-only; không chuyển thư mục thành public. Private key TLS giữ mode 600. Container chỉ nhận các secret cần thiết tại `/run/secrets`, không đưa khóa vào image hay `NEXT_PUBLIC_*`.

Next.js nhúng `NEXT_PUBLIC_API_URL`/media URL và remotePatterns khi build. Nếu đổi public origin/media origin phải build lại frontend. `API_URL=http://api:8080` phục vụ SSR; Nginx sở hữu redirect HTTPS, API không redirect các probe/private HTTP khi `ReverseProxy:Enabled=true`. Auth.js dùng `AUTH_URL` public và `AUTH_SECRET` đọc lúc chạy. Key ring bền vững giữ cookie dashboard sau recreate; không làm token đã logout/rotation hợp lệ trở lại.

MinIO dùng public image origin cùng cấu hình API/Next. Đổi origin của deployment đã có dữ liệu cần kế hoạch chuyển URL trong database; không chỉ sửa env rồi bỏ ảnh cũ. `MinIO:Endpoint` là địa chỉ nội bộ cho S3 SDK, độc lập `MinIO:PublicUrl` cho browser.

SMTP hiện hỗ trợ host/port/from, TLS theo port 465/587. Chọn relay cho phép ứng dụng gửi qua mạng đã kiểm soát; nếu nhà cung cấp yêu cầu SMTP username/password, phối hợp phần mail của Đức bổ sung xác thực trước khi chuyển sang provider đó. Compose không giả định những cấu hình chưa có implementation. MailHog/Seq dev không nằm trong bộ production mặc định. Log JSON ra stdout và rolling file; có thể gắn `Seq__ServerUrl` hoặc hệ thống thu thập log theo hạ tầng thật.

Không chạy `seed-demo` trên production. Migrator chỉ áp dụng migration hiện có và tạo ba role, không tạo tài khoản với mật khẩu cố định. Khi cấp Admin đầu tiên, đăng ký tài khoản thật rồi người quản trị database thêm đúng role `Admin` cho tài khoản đã xác minh qua `AspNetUserRoles`; không lấy demo account làm tài khoản vận hành. Google OAuth/Search Console cần credentials/domain riêng; gửi sitemap Google mặc định tắt và chưa được nghiệm thu thật.

## 4. Migration, cập nhật và rollback

- `migrate` chạy `--migrate` một lần; API chỉ khởi động khi migrator hoàn tất. Worker bị tắt trong migrator. Giữ lịch sử migrations main, không tạo lại InitialCreate hoặc thêm schema thay thế PendingJobs.
- Trước mỗi đợt deploy có thay đổi schema, chạy backup và thử restore. Giữ image tag cũ cùng bản backup. Lần đầu chưa có DB thì migrator tạo schema.
- Build image tag mới với `APP_TAG` riêng; chạy `docker compose ... up -d --wait`. Không dùng `down -v` vì sẽ xóa dữ liệu.
- Rollback code có thể dùng image cũ khi schema còn tương thích. Nếu migration không tương thích, restore vào DB/volumes mới đã kiểm chứng và chuyển cấu hình có kiểm soát; không tự chạy migration Down trên dữ liệu đang phục vụ.
- Nginx dùng Docker DNS resolve để tìm lại API/Next sau recreate. Kiểm health, website, dashboard và ảnh sau mỗi lần cập nhật.

## 5. Backup và restore có kiểm chứng

```powershell
./scripts/Backup-Deployment.ps1 -EnvFile .env.production.local -Local
# Lấy đường dẫn BACKUP_PATH từ kết quả lệnh trên.
./scripts/Restore-Deployment.ps1 -EnvFile .env.production.local -Local `
  -BackupDirectory artifacts/lab8/backups/<thu-muc-backup> `
  -TargetDatabase culinary_restore_check
```

Với production bỏ `-Local`. Backup dừng Nginx/Next/API/MinIO để không có writer trong mốc snapshot, giữ PostgreSQL chạy để `pg_dump -Fc`. Archive đi kèm chứa MinIO objects, SEO và Data Protection keys; manifest lưu checksum SHA-256. Các service được bật lại trong `finally`, kể cả backup thất bại. Đây là backup có downtime ngắn, chưa phải point-in-time recovery/WAL hay high availability.

Restore kiểm checksum và tên/path, chỉ nhận database mới và thư mục mới trong `artifacts/lab8/restored/<db>`. Script không ghi đè database/volumes đang chạy. Kết quả DB dùng để kiểm counts, dữ liệu nghiệp vụ, migration, trạng thái jobs. Kiểm ảnh bằng MinIO thử dùng bản copy `minio/`, kiểm hash SEO và keys. Redis là cache có thể dựng lại; một deployment khôi phục nên dùng Redis trống để tránh cache không khớp snapshot.

Để phục hồi dịch vụ hoàn chỉnh trên host thay thế: tạo project và named volumes mới, dùng PostgreSQL đã restore, copy nội dung `minio/`, `seo/`, `keys/` vào đúng volume trước khi bật app. Gán quyền SEO/keys cho UID 1654, giữ MinIO đọc/ghi được data. Đặt lại secrets/cert từ kho an toàn, public origin đúng URL đang lưu rồi chạy bộ smoke. Không trộn object/key ring của hai deployment. Backup chứa dữ liệu người dùng và key ring nên phải hạn chế quyền, mã hóa khi lưu ngoài máy và thử khôi phục định kỳ; không commit lên Git.

## 6. Kiểm thử và vận hành

```powershell
dotnet build CulinaryBlog.slnx -c Release
dotnet test tests/Backend.Tests/Backend.Tests.csproj -c Release --no-build
Push-Location src/Frontend
npm ci
npm run lint
npx tsc --noEmit
npx playwright test --config playwright.recipes.config.ts recipe-management.ui.spec.ts
npx playwright test --config playwright.deployment.config.ts
Pop-Location
```

Deployment smoke chỉ chạy sau khi dựng bộ local riêng và gọi `seed-demo`; test tạo recipe, upload ảnh và xóa một ảnh thử. Nó kiểm health/live/ready, HTTP308, TLS origin, upload có validate, resize native Linux, ảnh 300×300, cleanup MinIO, publish/public SSR, Admin cookie Secure/HttpOnly và dashboard/sitemap. Regression editor có request con chậm để kiểm tra không mất nội dung vừa gõ và RowVersion mới.

```powershell
docker compose --env-file .env.production.local -f docker-compose.prod.yml -f docker-compose.lab8.yml ps
docker compose --env-file .env.production.local -f docker-compose.prod.yml -f docker-compose.lab8.yml logs --tail 100 api nginx frontend
docker compose --env-file .env.production.local -f docker-compose.prod.yml -f docker-compose.lab8.yml restart api frontend nginx
```

`/health/live` chỉ đo tiến trình, `/health/ready` đo PostgreSQL/Redis, `/health` thêm MinIO. Readiness lỗi là tín hiệu sửa phụ thuộc, không xóa volume để chữa lỗi. Jobs lỗi kiểm tra dashboard/Admin và log correlation ID; retry theo D14/D16. Đừng gửi token hoặc nội dung secrets vào báo cáo.

CI giữ các job backend/coverage và frontend hiện có, thêm job deployment: build Linux images, tạo cert/secrets local, migrate/up, seed demo rõ ràng, rồi chạy HTTPS smoke. Xem kết quả workflow trên PR/commit tương ứng; kiểm tra local không đồng nghĩa CI trên GitHub đã xanh.

## 7. Tổng hợp báo cáo và slide phần Tiến

Nội dung đề xuất: sơ đồ triển khai và lý do multi-stage; bảng public/private ports; secrets/runtime env và migration; demo HTTPS login → upload → jobs → sitemap; bằng chứng backup/restore/restart; giới hạn nghiệm thu và bàn giao cho các thành viên. Dùng log/screenshot thật ở thời điểm chạy, ghi commit/image tag và môi trường.

Phần Toàn P02 (ProblemDetails/security headers), Tuấn P03 (metadata/JSON-LD/CWV), Đức E2E auth và Google thật cần bằng chứng của đúng phần. Không lấy smoke local để tuyên bố SLA 99,5%, tải 2 vCPU/4 GB hay CWV production đã đạt. Báo cáo Word/slide cá nhân và kế hoạch local không tự thêm vào commit code.

Tài liệu tham chiếu: [Next standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), [ASP.NET proxy](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0), [Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/).

## 8. Kết quả kiểm chứng phần Tiến, 29/10/2026

Nhánh `2312770-LeNhatTien-buoi8`, nền main `415bc99` cộng các thay đổi Lab 8. Docker Desktop Linux/amd64, project `culinary-lab8-tien`, `.env.production.tien.local`. Kế hoạch và bằng chứng chi tiết nằm local, không commit.

| Phép kiểm tra | Kết quả thực tế |
| --- | --- |
| Backend Release build | Qua, 0 lỗi/0 cảnh báo |
| Backend suite hiện có | 52/52 qua, không skip, DB fixture riêng |
| Recipe management UI | 3/3 qua, gồm request con chậm và bảo toàn form/RowVersion |
| Frontend lint/TypeScript | Qua |
| Build images Linux | API/Next standalone qua; API publish theo TARGETARCH |
| Dung lượng image API (Docker Size, chưa nén) | Từ 1.050.321.185 xuống 556.809.214 bytes, khoảng 47% |
| HTTPS E2E trên image cuối | 3/3 qua: upload/resize/xóa/publish/SSR, sitemap có bài mới, Admin cookie/dashboard, recreate giữ cookie/SEO |
| Backup/restore thực tế | Khớp snapshot 101 Recipes, 102 RecipeImages, 5 migrations |
| Object restore | MinIO thử đọc được original/thumbnail, SHA-256 khớp nguồn |
| SEO/key ring restore | Hash sitemap và 1 key XML khớp |
| Cổng và user runtime | Chỉ proxy public + MailHog loopback local; API UID1654, Next user node |

Frontend build còn cảnh báo upstream `jose` về CompressionStream trong Edge Runtime;
build và các luồng đăng nhập thực tế vẫn qua. Không tự đổi dependency/auth ngoài phần triển khai.
Kết quả job CI deployment trên GitHub cần xem theo PR/commit đang review. Chưa có domain/máy chủ
thật, chưa nghiệm thu Google thật, CWV, SLA hoặc hạ tầng tải 2 vCPU/4GB.
