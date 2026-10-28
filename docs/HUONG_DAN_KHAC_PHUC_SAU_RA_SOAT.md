# Kết quả xử lý sau rà soát và chuẩn bị Buổi 8

Cập nhật **28/10/2026**. Phạm vi sửa: các buổi trước tới hết phần đã merge Buổi 7, dựa trên [SRS](SRS_Culinary_Blog_v1.0.0.md) và [DECISIONS](DECISIONS.md).

## 1. Trạng thái bàn giao

Các nhóm **R01–R20, O01–O03, C01, Q01–Q03, U01–U04, D01–D02** đã có implementation và kiểm chứng local. Trưởng nhóm yêu cầu đưa toàn bộ đợt sửa lên `main` để cả nhóm tiếp tục Buổi 8. Thành viên lấy `main` mới nhất trước khi tạo nhánh; áp dụng migration và dependencies theo [SETUP](SETUP.md). Kết quả local không thay thế CI hoặc nghiệm thu deployment.

Theo yêu cầu trưởng nhóm, đã gỡ phần **Bổ sung trước Buổi 8 — Khắc phục sau rà soát toàn dự án** khỏi bốn file `docs/thanh-vien/`; không tiếp tục giao lại các mục đã sửa. Giữ nguyên nhiệm vụ Buổi 8: P01/P02/P03 và E2E nghiệm thu của Đức.

Danh sách giao việc ban đầu lưu trong [lịch sử Git tại 7843065](https://github.com/2312770-LeNhatTien/PTUDWNC-2026-Nhom21/blob/7843065fe0aca2c05bb5c72b4978b5f8b397610e/docs/HUONG_DAN_KHAC_PHUC_SAU_RA_SOAT.md). Tài liệu này mô tả bản sửa hiện tại và cách kiểm chứng, không phải một vòng phân công sửa mới.

## 2. Đã sửa gì và vì sao?

| Mã rà soát | Bản sửa / nơi đọc code | Vì sao làm như vậy |
| --- | --- | --- |
| R01 | `RecipesEndpoints`, handlers ManageSteps/ManageIngredients và query con kiểm tra xác thực, owner/Admin, Published | API phải tự bảo vệ dữ liệu; ẩn nút UI không ngăn Guest gọi trực tiếp |
| R02–R05 | `FilesEndpoints`, `MinioFileStorageService`, `ImageSafety`, `JobsEndpoints`: proxy <=5 MB, MIME/magic/decode, server cấp key owner, attach kiểm tra object; presign cũ 410; batch/stats chỉ Admin | Chặn đi vòng quyền và không để worker tải URL do người dùng tùy ý nhập; không gọi thử mạng nội bộ thật |
| R06 | `IGoogleTokenValidator` + Infrastructure Google validator; xác minh Audience/email/sub; từ chối tự ghép email local | Token đúng Google nhưng dành cho app khác không phải token của hệ thống; trùng email chưa đủ quyền liên kết |
| R07 | Nâng bản vá .NET/Next/React/Axios và transitive; thay ImageSharp bằng Magick.NET theo D15 | Vá advisory nhưng vẫn build Release được khi nhóm không có ImageSharp license; native decoder chỉ ở Infrastructure |
| R08 | Register/Google user thêm `PendingJob.Welcome` trước lần lưu Identity | User tạo thành công thì intent email cũng được lưu, không mất job khi queue đang lỗi |
| R09–R10 | `PendingJobDispatcher`/`PendingJobWorker`, concrete job method có queue/retry thật, khóa intent/image, key thumbnail cố định | Crash/retry không sinh thêm bộ file; từng ảnh có trạng thái lỗi riêng thay vì batch nuốt lỗi |
| R11 | `Jobs:Enabled=false` bỏ worker/dashboard nhưng giữ intent; không cần JobStorage trong request xử lý dữ liệu | Có thể chạy API khi tắt jobs và xử lý phần chờ khi bật lại |
| R12/C01 | `ICacheableQuery` + `CachingBehavior`, DB `CacheVersion` đổi cùng dữ liệu; Redis có fallback/circuit ngắn | Redis outage không biến thao tác lưu thành lỗi, và key cũ không sống lại khi Redis phục hồi; query auth bỏ shared cache |
| R13 | Form edit dùng Ingredient/Step/Gallery/Publish editors có sẵn; refresh DTO/RowVersion sau thay đổi con; khóa khi dirty/sync lỗi | Tránh lưu token cũ và tránh ghi đè nội dung chưa lưu. Đổi thứ tự nguyên liệu cũng gọi API thật |
| R14 | Recipe giữ slug khi `PublishedAt` đã có, kể cả sau Archive/Unpublish | URL đã được chia sẻ/index không đổi khi sửa tiêu đề |
| R15 | Validator/repository giữ chỗ slug/tên đã soft-delete; unique DB trả 409 an toàn | Khớp unique index, không báo 500 hoặc tái sử dụng URL cũ sai nội dung |
| R16 | Migration tạo/backfill weighted tsvector Title+Description/unaccent, GIN và trigger; search dùng vector + rank | Tìm được tiếng Việt không dấu, cập nhật vector sau sửa và index thực sự được planner dùng |
| R17 | Paging mặc định12/max50, sort D8, minServings/maxTotalTime/prepTime, meta đầy đủ; category detail dùng cùng public query | Các màn danh sách/tìm kiếm/danh mục có cùng hợp đồng, filter trước paging |
| R18 | Xóa gallery ghi intent, worker kiểm tra tham chiếu và dọn cả biến thể có thể chưa kịp lưu URL; soft-delete Recipe giữ file D1 | Không dọn nhầm ảnh còn được dùng và không mất dữ liệu bài đã xóa mềm |
| R19 | `RefreshToken.RevokedAt` là concurrency token; rotation atomic; phát hiện cạnh tranh/reuse thu hồi family | Hai request cùng refresh không cùng nhận được hai nhánh token còn hoạt động |
| R20 | Global100/auth10/login5/upload+jobs5 mỗi phút/IP; 429 có Retry-After và X-RateLimit-* | Endpoint tốn tài nguyên có giới hạn riêng, limiter chung vẫn áp dụng; tải thử dùng override được ghi rõ |
| O01–O03 | Health DB/Redis/MinIO, live chỉ tiến trình, ready DB/Redis; CorrelationId, handler/EF duration, traces/metrics OTLP tùy chọn, JSON log/Seq | Phân biệt tiến trình sống với phụ thuộc sẵn sàng, tra lỗi theo request, cảnh báo handler>500ms/query>100ms mà không ghi mật khẩu/token |
| Q01–Q03 | Sửa session Admin fixture, xUnit API trên PostgreSQL tạm, coverage gate80%, CI build/lint/audit/test, EditorConfig/SonarAnalyzer, tải100 đồng thời | Kiểm chứng quyền/nghiệp vụ/concurrency và ngăn hồi quy; test mock không được gọi là DB/runtime thật |
| U01 | Parser định lượng chung cho editor/new form, phân số/hỗn số/null; giới hạn avatar500/alt200; AVIF thay GIF | `1/2` không bị lưu thành1; UI/validator/DB không lệch ngưỡng tạo lỗi500 |
| U02 | Xóa file lỗi giữ trạng thái/retry; detail medium/card thumbnail, original rồi placeholder | UI phản ánh kết quả server, giảm tải ảnh và giữ layout ổn định |
| U03 | Lưu Draft thành công/publish lỗi thông báo riêng; chỉ404 mới not-found; public error/retry, private preview riêng theo D18 | Không tạo lặp Draft hoặc che lỗi dịch vụ thành danh sách rỗng; không cache chung nội dung riêng |
| U04 | Chặn `*-test` ở production, bỏ link reset/newsletter chưa xử lý và thông tin tài khoản demo trên UI; Auth.js thống nhất backend-token | Tránh đường cụt và các luồng auth thử nghiệm không đi qua backend xác thực chính |
| D01–D02 | SETUP/README/jobs/member guide/DECISIONS đồng bộ, giữ rating/comment đã merge theo D17 | Người mới chạy đúng migration/contract; không tự xóa tính năng thành viên vì mâu thuẫn scope trong SRS |

Migration bổ sung: `20261028035559_PreLab8Reliability` tạo PendingJobs/CacheVersion/SearchVector/GIN + trigger/backfill. Giữ toàn bộ lịch sử migration và dữ liệu; không tạo lại InitialCreate. Các pha đổi primary gallery và renumber steps nằm cùng transaction để không lưu trạng thái dở dang.

### Tổ chức code sau khi rà tính nhất quán

- Route health ở `API/Endpoints/HealthEndpoints.cs`, gọi từ `Program.cs` như các module khác. Redis/MinIO health checks và đăng ký PostgreSQL/Redis/MinIO ở Infrastructure; cấu hình HTTP tracing/metrics ở `API/DependencyInjection.cs`.
- `FilesEndpoints` và phần quản lý ảnh/phiên dashboard trong `JobsEndpoints` chỉ bind HTTP rồi gửi MediatR. Handler ở `Application/Features/Files`, `Features/Jobs`, `Features/Auth/Commands/CreateDashboardSession`; DTO ở `Application/DTOs`. Không truy vấn hoặc lưu DB trực tiếp trong endpoint.
- Response resize/stats dùng `ApiResponse` giống module khác; raw delete-file vẫn202 không body. `JobId` của resize đơn là ID intent; dispatcher mới cấp Hangfire ID. API regression đã kiểm tra envelope/ID/count.
- Dispatcher/worker, SitemapOptions và DisabledBackgroundJobService có file riêng đúng tên. Giữ chữ ký batch job cũ để các job đã lưu trước refactor vẫn chạy được.
- Frontend dùng `lib/api/errors.ts` chung cho dashboard, publish, gallery, steps, ingredients, uploader và profile. `components/dashboard/format.ts` chỉ định dạng ngày/trạng thái. Bỏ state/badge/comment presigned không còn dùng.
- Chuẩn hóa whitespace theo EditorConfig trong các file backend đang sửa; không format toàn repo hoặc sửa báo cáo/kế hoạch cá nhân.

## 3. Bằng chứng kiểm chứng local

| Phép kiểm tra | Kết quả ngày 28/10/2026 | Phạm vi/giới hạn |
| --- | --- | --- |
| Backend Release build + .NET/Sonar analyzers | 0 lỗi, 0 cảnh báo | Không thay thế review kiến trúc |
| xUnit backend | **52/52**, không skip | DB PostgreSQL16.15 mới ngẫu nhiên; S3 transport và Google validator giả lập trong suite; có health khi Redis lỗi và delete-file intent |
| Application line coverage | **91,20%** | Unit + API integration, không phải unit thuần; Domain86,62%, Infrastructure89,42%, API73,01% |
| Playwright mặc định | **16/16** | API stubs, middleware/phiên Admin/Author/Guest thật; có mobile/desktop layout |
| Recipe management UI | **2/2** | Conflict reload, phân số, refresh RowVersion sau sửa con, khóa khi dirty/sync lỗi |
| Hangfire/SEO browser | **2/2** | API/Hangfire/PostgreSQL thật trên DB thử, cookie revocation và Next rewrite |
| Sitemap console | **13/13** | XML/cancel/replace/lock/retry; HTTP Google giả lập, không gửi Google thật |
| Redis console | **10/10** | Redis thật, prefix thử riêng; corrupt/cancel/prefix isolation |
| Media smoke | Qua | API + Hangfire + Magick native + MinIO thật: upload/attach/resize, ảnh gốc+2 biến thể200, xóa gallery rồi cả3 object404 |
| Welcome SMTP smoke | Qua | Đăng ký thật → intent → Hangfire → MailKit → MailHog nhận1 email local; không gửi ra ngoài |
| Frontend | ESLint/TypeScript/production build qua | First Load JS cao nhất khoảng160KB theo Next build; không thay thế CWV trên deployment |
| Dependency audit | npm0 advisory; NuGet không phát hiện gói có advisory | Theo nguồn audit tại thời điểm chạy, gồm transitive |
| PostgreSQL search EXPLAIN | Bitmap Index Scan `IDX_Recipe_SearchVector`, execution0,155ms | Dataset thử nhỏ, không suy ra mọi truy vấn production đều đạt |

Log/coverage/fixture/load JSON nằm local ở `artifacts/lab7/`, không commit lên Git. Tests và CI cần để tái lập kết quả được giữ trong repo; kế hoạch local và báo cáo Word cá nhân không thuộc bản sửa.

### Tải đồng thời và cách đọc kết quả

Máy local Windows/i7-12700H,20 logical CPU,7,7GiB RAM; API Kestrel, PostgreSQL16.15 riêng, Redis7 Docker,100 bài Published mẫu, pool40. Bài tải ngắn:100 client closed-loop x20 GET (2.000 request), sau đó100 POST tạo Draft đồng thời. GET warm4 URL: list/search/category/detail; POST warm5 lần. Limiter chỉ ở môi trường thử: global100000/min, auth/login/upload10000/min; không đổi ngưỡng mặc định production.

- GET: p50 **85,92ms**, p95 **112,54ms**, p99 **122,16ms**,2.000 HTTP200,~1.139req/s. Cache HIT2.000/2.000 sau warmup.
- POST: p50 **91,78ms**, p95 **101,81ms**, p99 **102,93ms**,100 HTTP201.
- Số đo đầu trước tối ưu được giữ local: quá nhiều SQL log, reload aggregate sau create, pool chiếm hết kết nối; đã giảm log SQL thường, bỏ truy vấn dư và giới hạn pool local40. Cold-start POST trước warmup vẫn có p95 khoảng566ms; không che bằng kết quả steady-state.
- Đây là smoke/burst local vài giây, **chưa chứng minh** mức2vCPU/4GB, soak lâu, tải đọc/ghi trộn hoặc internet production. Nghiệm thu đó cùng CWV/HTTPS nằm trong Buổi8. Cache hit100% ở4 key đã warm không phải hit rate của mọi workload.

## 4. Cách chạy lại trước khi review/merge

Đọc [SETUP](SETUP.md) để đặt secrets và áp dụng migration đã có. Test ghi chỉ dùng DB/bucket thử; backend fixture tự tạo/drop `culinary_tests_<guid>`, không migrate/xóa DB demo. `CULINARY_TEST_ADMIN_CONNECTION` trỏ instance test và cần quyền CREATEDB.

```powershell
dotnet build CulinaryBlog.slnx -c Release
dotnet test tests/Backend.Tests/Backend.Tests.csproj -c Release --collect:'XPlat Code Coverage' --results-directory artifacts/coverage
dotnet run --project tests/Lab06.CacheChecks -c Release
Push-Location src/Frontend
npm ci
npm audit
npm run lint
npx tsc --noEmit
npm run build
npx playwright test
npx playwright test --config playwright.recipes.config.ts recipe-management.ui.spec.ts
Pop-Location
```

Sitemap/browser jobs dùng cấu hình DB/port riêng trong [README_JOBS](../src/Backend/CulinaryBlog.Infrastructure/Jobs/README_JOBS.md). CI `.github/workflows/ci.yml` chạy baseline backend/coverage/Redis và frontend lint/type/build/audit/UI; kết quả workflow trên GitHub cần được kiểm tra trên commit đã push. Kết quả Windows không được gọi là đã nghiệm thu native Linux.

SMTP welcome là at-least-once (D16): crash sau SMTP chấp nhận/trước commit có thể gửi lại. Google OAuth/Google sitemap thật cần ClientId/domain/credentials, hiện chưa có nên không ghi đã gửi thật. Thư viện ảnh đã đổi theo xác nhận trưởng nhóm; Linux codec/runtime cần kiểm tra trong image Buổi8.

## 5. Buổi 8 — các nhiệm vụ vẫn giữ nguyên

### P01 — Docker production, Nginx, HTTPS và vận hành

**Chính: Tiến · Căn cứ: phân công Lab 8, NFR-SEC/SCALE/REL.**

1. Tạo Dockerfile multi-stage API/Next.js và compose production/reverse proxy theo layout repo; chỉ mở cổng cần cho browser, cấu hình network/volume/healthcheck. Seq/MailHog là công cụ dev; không đưa nguyên cấu hình demo lên public, chọn SMTP/log production phù hợp.
2. Tách secrets khỏi Git, có env example; cấu hình API URL phía server/browser, public origin/canonical, URL MinIO browser truy cập được, CORS origin cụ thể. Không nhúng secret build vào frontend bundle.
3. Nginx TLS termination/forwarded headers, redirect HTTPS không vòng lặp; cookie dashboard Secure, path và thời hạn đúng D14. Nếu nhiều API instance, key ring Data Protection và file SEO phải persistent/dùng chung theo thiết kế, job dùng storage/lock đúng.
4. Apply migration bằng bước triển khai có kiểm soát và backup trước; không dựa vào việc mỗi replica tự chạy migrate/seed. Kiểm thử restore backup, restart container và dữ liệu/SEO/object vẫn còn.

**Đạt khi:** một máy mới dựng được theo tài liệu; kiểm tra ngoài trình duyệt qua HTTPS từ login tới upload/jobs/sitemap; không lộ dịch vụ quản trị/secrets. Google sitemap submit vẫn tắt local; chỉ nghiệm thu gửi thật khi có domain đã xác minh và quyền phù hợp, không ghi đã gửi nếu chưa có.

### P02 — ProblemDetails, security headers và hợp đồng API

**Chính: Toàn · Đức: auth/limiter · Tiến: nginx/exception handler.**

1. Thống nhất RFC 7807 cho 400/401/403/404/409/429/500, correlation ID và application error code có trường ổn định; frontend đọc cùng quy ước. Không lộ SQL/stack/token ở production.
2. Đối chiếu status: register 201, child/gallery DELETE 204 theo SRS hoặc ghi quyết định thay đổi được chốt; cập nhật client không parse JSON ở 204. Phân biệt lỗi unique/concurrency/publish bằng mã, không dò chuỗi tiếng Việt.
3. Rà CORS/HSTS/CSP/X-Frame-Options tại lớp sở hữu response thực tế (Nginx/Next/API). CSP phải thử với Google Sign-In, ảnh MinIO, Next scripts; cấu hình HSTS production khi HTTPS đúng, không phá dev HTTP. Kiểm tra cả `/hangfire` và static SEO.

**Đạt khi:** test response thật từng mã qua proxy, không chỉ exception tự ném; auth challenge/forbid/limiter có format nhất quán, UI vẫn login/upload/publish được khi bật headers.

### P03 — SEO từng bài, JSON-LD và Core Web Vitals

**Chính: Tuấn · Tiến: sitemap/slug · Toàn: rating/query.**

Tạo metadata theo bài (title/description/OpenGraph/Twitter/canonical), Schema.org Recipe JSON-LD lấy từ dữ liệu thật; escape JSON-LD an toàn, không đưa nội dung private hoặc rating giả vào public. Đồng bộ canonical với slug R14 và public origin; kiểm tra robots/noindex cho login/dashboard/preview, sitemap chỉ chứa URL phù hợp.

Chạy Lighthouse trên production build với cấu hình/mạng/thiết bị ghi rõ; tối ưu ảnh U02, font, lazy loading, JS, layout. Dùng **INP** theo SRS thay mô tả FID cũ; đối chiếu LCP≤2.5s, CLS≤0.1, INP≤200ms, first-load JS≤200KB gzip và mục tiêu Performance≥90 trong phân công. Lighthouse một lần không đủ xác nhận INP thực tế; ghi rõ lab measurement và phần cần dữ liệu tương tác/field.

**Đạt khi:** HTML bài Published có metadata/JSON-LD đúng, dữ liệu riêng không bị index; có báo cáo mobile/desktop và số đo, không chỉ ảnh chụp điểm SEO.


## 6. Bàn giao trên Git

Đợt sửa này được trưởng nhóm yêu cầu commit trực tiếp lên `main` để cả nhóm bắt đầu Buổi 8. Commit gồm code, migration, CI, tests và tài liệu; secrets, `.env.local`, báo cáo Word, kế hoạch và log local giữ ngoài Git. Thành viên cập nhật `main`, đọc SETUP và làm nhiệm vụ Buổi 8 ở mục 5 trên nhánh riêng. Các PR Buổi 8 tiếp tục review/merge theo quy trình nhóm; kiểm tra CI và smoke sau khi ghép.
