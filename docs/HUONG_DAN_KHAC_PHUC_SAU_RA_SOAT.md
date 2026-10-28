# Hướng dẫn khắc phục sau rà soát và nghiệm thu buổi 8

Cập nhật: **28/10/2026**. Phạm vi: toàn bộ dự án từ đầu đến hết các phần đã merge ở buổi 7, sau đó hoàn thành các nhiệm vụ buổi 8.

## 1. Đọc tài liệu này như thế nào?

- Căn cứ rà soát là `main` trên GitHub tại [commit e2cb966](https://github.com/2312770-LeNhatTien/PTUDWNC-2026-Nhom21/tree/e2cb9668ac5c42308287a9a81f337dd9201d72a2). Bản làm việc lúc lập tài liệu đang ở `54c69c8`, chậm 6 commit; không dùng bản cũ đó để kết luận thiếu code review/resize mới merge.
- Đây là **danh sách việc cần xử lý**, chưa phải xác nhận đã sửa. Trước khi sửa, lấy `main` mới nhất và kiểm tra lại từng vấn đề; nếu code đã thay đổi, ghi bằng chứng và kết quả test vào PR.
- Đọc [SRS](SRS_Culinary_Blog_v1.0.0.md), [DECISIONS](DECISIONS.md), rồi file phân công cá nhân. D1–D14 xử lý các điểm mâu thuẫn cụ thể; không tự thay đổi quyết định của nhóm bằng một bản sửa cục bộ.
- **Giai đoạn A — sửa sau rà soát:** sửa lỗi/tích hợp còn thiếu của các buổi trước. Hoàn thành các mục khẩn/cao trước khi đưa ứng dụng lên public.
- **Giai đoạn B — buổi 8:** triển khai production, SEO, quan sát hệ thống và nghiệm thu. Các phần đã được giao cho buổi 8 không bị coi là lỗi vì chưa hoàn thành từ buổi 7.
- Báo cáo rà soát gốc và các log/probe đang lưu local, không đưa lên Git. Tài liệu này có đủ hướng dẫn để thành viên khác làm việc mà không cần truy cập thư mục `artifacts` trên máy trưởng nhóm.

### Quy ước mức độ và đánh dấu hoàn thành

**Khẩn:** chặn thao tác trái phép trực tiếp. **Cao:** bảo mật, mất tính đúng đắn hoặc lỗi hạ tầng ảnh hưởng chức năng. **Hoàn thiện:** hợp đồng API, UX, hiệu năng, tài liệu. **Buổi 8:** phần triển khai/nghiệm thu đã có trong lộ trình.

Chỉ đánh dấu xong khi có: thay đổi code phù hợp SRS/quyết định, ca kiểm tra đạt và PR được review. Nếu đề xuất đổi yêu cầu, ghi rõ đề xuất để nhóm chốt; không tự ghi SRS đã thay đổi.

## 2. Phân công chính và cách tránh sửa trùng

| Người chịu trách nhiệm chính | Phạm vi chính | Người phối hợp |
| --- | --- | --- |
| **Tiến — 2312770** | R11, R13, R14, phần Recipe của R15/R17/R18; O01/O03; Q03; D01; P01; điều phối R07 | Tuấn cho ảnh/editor/jobs; Đức cho publish/auth; Toàn cho cache/query/lỗi |
| **Đức — 2314299** | R06, R08, R19, R20; Q01/Q02; U03; phần auth của R07 | Tuấn cho upload limiter; Tiến cho jobs/config và CI |
| **Toàn — 2312777** | R12, R16; phần Category/query chung của R15/R17; O02/C01; U04; D02; P02 | Tiến cho DTO Recipe/category detail; Đức cho cấu trúc lỗi auth |
| **Tuấn — 2312792** | R01–R05, R09/R10; phần storage của R18; U01/U02; P03; phần media của R07 | Tiến cho gallery/Jobs=false; Đức cho profile upload/rate limit |

Mục có nhiều người vẫn có **một người ghép và chịu trách nhiệm cuối**: R11/R13/R15/R17/R18 là Tiến; R20 là Đức; R07/D01 là Tiến. Người phối hợp bàn giao component/contract/test, không tự sửa cùng một file ở hai PR khi chưa thống nhất.

### Thứ tự ghép đề xuất

1. **Đợt 1:** Tuấn R01–R05 và Đức R06; Tiến điều phối R07. Chốt quyền, hợp đồng upload và nguồn ảnh trước các thay đổi UI dựa vào chúng.
2. **Đợt 2:** Đức R08/R19/R20; Tuấn R09/R10/R18; Tiến R11/R13/R14; Toàn R12/R15/R16. Sửa các file chung theo lượt.
3. **Đợt 3:** R17, C01, U01–U04, O01–O03, Q01–Q03, D01/D02; chạy lại luồng tích hợp trên code đã merge.
4. **Đợt 4:** P01–P03, kiểm thử production và tổng hợp nghiệm thu. Có thể chuẩn bị Docker/SEO song song, nhưng chỉ nghiệm thu public sau khi các lỗi khẩn/cao đã được xử lý.

Các file dễ conflict: `RecipesEndpoints.cs` (Tiến/Tuấn/Đức), `DependencyInjection.cs` và `Program.cs` (cả nhóm), `RecipeRepository.cs` (Tiến/Toàn), trang chi tiết và trang edit (Tiến/Tuấn/Đức). Migration phải lấy lại model mới nhất sau PR trước, không tạo lại InitialCreate hoặc xóa lịch sử migration.

### Bằng chứng nền để biết cần kiểm tra lại gì

Ở snapshot được rà: backend và frontend production build thành công; UI mock có **13/16 test qua**, ba ca lỗi ở CRUD Admin thiếu session. Probe không ghi DB xác nhận endpoint thiếu quyền, retry ảnh đang là 10, DI thiếu service khi Jobs tắt, slug đổi sau Archive và lỗi cache có thể thoát ra sau lưu. R19 refresh concurrency là rủi ro đọc từ code cần test thêm, chưa phải lỗi đã tái hiện. Không suy ra toàn bộ runtime/production đã đạt từ các kết quả này.

Nhóm có **36 mục** bên dưới: 20 mục R và 16 mục bổ sung O/C/Q/U/P/D. Một số mục bổ sung hoàn thiện cùng một chức năng (ví dụ R13 + U03), không có nghĩa là 36 lỗi độc lập. Xem mã mục trong file cá nhân để biết phần mình và người phối hợp.

## 3. Giai đoạn A — lỗi bảo mật cần sửa trước

Các đường dẫn bên dưới tính từ thư mục gốc repo. Với tên rút gọn: `API` = `src/Backend/CulinaryBlog.API`, `Application` = `src/Backend/CulinaryBlog.Application`, `Infrastructure` = `src/Backend/CulinaryBlog.Infrastructure`, `Domain` = `src/Backend/CulinaryBlog.Domain`, `Frontend` = `src/Frontend`.

### R01 — Quyền bước nấu, nguyên liệu và nội dung riêng tư

**Khẩn · Chính: Tuấn · Phối hợp: Tiến · Căn cứ: FR-RCP-009/010, SRS 2.3/8.5/8.6.**

**Hiện trạng:** POST/PUT/DELETE steps không có authorization metadata. Handler chỉ kiểm tra owner/Admin nếu đã đăng nhập, khiến Guest bỏ qua kiểm tra. GET steps/ingredients chỉ kiểm tra bài tồn tại, chưa xét bài riêng tư.

**File:** `API/Endpoints/RecipesEndpoints.cs`; `Application/Features/Recipes/Commands/ManageSteps/`; `ManageIngredients/` và query đọc steps/ingredients tương ứng.

1. Gắn policy Author/Admin cho thao tác ghi. Trong handler từ chối người chưa xác thực trước, sau đó luôn kiểm tra chủ sở hữu/Admin và quan hệ ID con–bài cha. **Vì sao:** ẩn nút trên UI không bảo vệ API; handler cũng có thể được gọi ngoài endpoint.
2. Cho Guest đọc nội dung con chỉ khi bài Published, chưa bị xóa; owner/Admin được đọc bài riêng theo contract nhóm chốt. Không trả nội dung trước rồi mới lọc ở frontend.
3. Giữ D9/D10/D13: title bước bắt buộc, renumber đúng, định lượng nullable, cập nhật phiên bản bài cha.

**Kiểm tra đạt:** Guest ghi nhận 401; Author khác nhận 403 hoặc 404 theo chính sách che tài nguyên; owner/Admin thao tác được; ID con sai bài bị từ chối. Kiểm tra GET trên Published, Draft, Archived và soft-deleted; request bị chặn không làm đổi dữ liệu.

### R02 — Quyền upload/xóa file và sở hữu object

**Khẩn · Chính: Tuấn · Phối hợp: Tiến · Căn cứ: FR-FILE, FR-RCP-008, NFR-SEC-004.**

**File:** `API/Endpoints/FilesEndpoints.cs`; `Infrastructure/Services/MinioFileStorageService.cs`; các interface/command file liên quan.

1. Bắt buộc xác thực cho presign/upload/delete; role phù hợp với mục đích: người dùng hợp lệ đổi avatar, Author/Admin quản lý ảnh bài.
2. Server xác định owner và bucket/key được phép; không dùng việc biết URL hoặc GUID làm bằng chứng sở hữu. Có thể dùng metadata upload do server lưu và liên kết user/recipe; chốt contract với Tiến trước khi đổi request.
3. Kiểm tra quyền cả khi file chưa gắn vào bài. Xóa ảnh đang được tham chiếu phải theo nghiệp vụ gallery/avatar, tránh raw delete phá dữ liệu của người khác hoặc xóa object vẫn đang dùng.

**Vì sao:** gallery có owner check nhưng raw file API công khai vẫn cho đi vòng. **Kiểm tra đạt:** Guest bị chặn; user A không cấp/xóa object của B; URL/bucket/key giả hoặc ngoài phạm vi không được dùng; upload avatar và gallery hợp lệ vẫn chạy.

### R03 — Kiểm tra file thực ở luồng presigned upload

**Cao · Chính: Tuấn · Căn cứ: FR-FILE-001, CONS-007, NFR-SEC-004.**

**Hiện trạng:** proxy upload kiểm tra bytes nhưng presign chỉ tin `ContentType`; không có finalize xác minh object. **File:** `FilesEndpoints.cs`, `MinioFileStorageService.cs`, `Frontend/lib/api/files.ts`, `Frontend/components/ui/ImageUploader.tsx`.

1. Chọn một luồng có thể hoàn thành trong đồ án: upload qua server đã validate; hoặc presign vào vùng tạm riêng rồi finalize server kiểm tra object. Không cần giữ cả hai nếu không dùng.
2. Server kiểm tra kích thước thực tối đa 5 MB, MIME và magic bytes/khả năng đọc ảnh; chỉ sau khi đạt mới công khai hoặc cho attach. File lỗi/hết hạn phải được dọn, không xuất hiện trong sitemap/gallery/job resize.
3. Trả định danh upload đã xác minh gắn owner; frontend không tự biến URL bất kỳ thành object hợp lệ. Đồng bộ progress, lỗi và retry UI với contract mới.

**Vì sao:** client có thể bỏ qua JavaScript và tự PUT dữ liệu. **Kiểm tra đạt:** file quá giới hạn, giả MIME, bytes hỏng bị từ chối ở server; không thể attach object chưa finalize hoặc của người khác; ảnh hợp lệ vẫn tải được.

### R04 — Bảo vệ API điều khiển resize

**Cao · Chính: Tuấn · Căn cứ: quyền owner/Admin, NFR-SEC.**

**File:** `API/Endpoints/JobsEndpoints.cs` và command/service resize.

1. `resize-all` và `stats` yêu cầu Admin; resize từng ảnh yêu cầu owner/Admin và kiểm tra `imageId` thuộc đúng `recipeId`.
2. Không trả URL/metadata ảnh riêng tư cho người không có quyền. Phối hợp Đức gắn giới hạn tần suất phù hợp cho thao tác tốn tài nguyên.
3. Kiểm tra request trước enqueue; request bị chặn không tạo job. Dashboard `/hangfire` vẫn giữ bảo vệ D14 ở mọi môi trường.

**Vì sao:** đăng ký queue hoặc bảo vệ dashboard không tự bảo vệ các endpoint khác. **Kiểm tra đạt:** Guest/Author khác bị chặn; ID sai bài không tạo job; chỉ Admin dùng batch/stats; owner resize ảnh của mình được.

### R05 — Không để worker tải URL tùy ý

**Cao · Chính: Tuấn · Phối hợp: Tiến · Căn cứ: NFR-SEC-004.**

**File:** `Application/Features/Recipes/Commands/ManageImages/AddRecipeImageCommand.cs`, `MinioFileStorageService.DownloadFileAsync`, `Infrastructure/Jobs/ImageResizeJob.cs`.

1. Ưu tiên nhận object ID/key đã xác minh ở R02/R03; worker chỉ đọc object trong bucket được server quản lý. Bỏ HTTP fallback tùy ý nếu dự án không có yêu cầu import ảnh ngoài.
2. Nếu giữ URL tương thích dữ liệu cũ, xác minh endpoint/bucket/key bằng quy tắc server; không tách key từ bất kỳ host nào. Nếu thật sự hỗ trợ nguồn ngoài, phải thiết kế allowlist, kiểm soát DNS/redirect/IP, timeout và giới hạn bytes trước khi bật.
3. Giới hạn tài nguyên decode (kích thước pixel/frame/bộ nhớ theo khả năng thư viện), xử lý ảnh hỏng; không chỉ dựa vào đuôi file hoặc kích thước file nén.

**Vì sao:** URL do người dùng cung cấp có thể khiến worker gọi dịch vụ nội bộ. **Kiểm tra đạt:** test HTTP giả lập xác nhận localhost/private host/host lạ/redirect không được tải; chỉ object hợp lệ được resize; nguồn quá lớn/hỏng thất bại có kiểm soát. Không thử payload vào mạng nội bộ thật.

### R06 — Xác minh Google ID token và liên kết tài khoản

**Cao · Chính: Đức · Căn cứ: FR-AUTH-003.**

**File:** `Application/Features/Auth/Commands/GoogleLogin/GoogleLoginCommandHandler.cs`, abstraction auth, dịch vụ xác minh và cấu hình Google liên quan.

1. Xác minh chữ ký, issuer, hạn dùng và **Audience đúng Client ID của nhóm** bằng cấu hình server. Thiếu cấu hình phải báo lỗi rõ, không chấp nhận mọi audience.
2. Lưu/liên kết Google bằng provider + subject ổn định; quy định rõ khi email trùng tài khoản local. Không tự đăng nhập tài khoản sẵn có chỉ vì email trùng; kiểm tra email verified và điều kiện liên kết theo hướng dẫn Google/luồng xác nhận của nhóm.
3. Nếu tách xác minh SDK ra Infrastructure, Application chỉ phụ thuộc abstraction; giữ hợp đồng frontend GIS đang dùng, không viết lại auth không cần thiết.

**Vì sao:** token hợp lệ do Google phát hành vẫn có thể dành cho ứng dụng khác. **Kiểm tra đạt:** token sai aud/issuer, hết hạn, email chưa xác minh hoặc liên kết không được phép bị từ chối; đăng nhập lặp đúng provider/sub không tạo user trùng. Test giả lập phải có ca âm tính; test thật cần cấu hình Google hợp lệ.

### R07 — Vá dependency có kiểm tra tương thích

**Cao · Chính điều phối: Tiến · Đức: frontend auth; Tuấn: ImageSharp/media/MailKit phối hợp Đức; Toàn: hồi quy UI/search.**

**Bằng chứng tại lần rà 27/10:** npm audit báo 10 mục dependency (3 critical, 6 high, 1 moderate); backend có cảnh báo package trực tiếp/transitive. Đây không phải số đường khai thác đã được chứng minh và có thể thay đổi theo cơ sở dữ liệu advisory.

1. Kiểm tra lại `Frontend/package.json`, lockfile và các `.csproj`; chạy audit/package vulnerability listing với SDK hiện dùng. Đọc advisory chính chủ và chọn phiên bản được vá tương thích tại lúc sửa, không ghim bản vá cũ từ tài liệu này.
2. Cập nhật có kiểm soát, commit manifest và lockfile tương ứng; không `audit fix --force` hàng loạt hoặc tắt cảnh báo để báo sạch.
3. Chạy build production và hồi quy auth/middleware/silent refresh/upload/resize/email. Ghi mục đã xử lý, cảnh báo còn lại và lý do trong PR.

**Kiểm tra đạt:** không còn advisory khẩn/cao áp dụng chưa được xử lý hoặc giải trình cụ thể; chức năng liên quan vẫn qua test. Không kết luận thư viện an toàn chỉ vì build thành công.

## 4. Giai đoạn A — sửa nghiệp vụ và tích hợp

### R08 — Nối đăng ký với welcome email job

**Cao · Chính: Đức · Phối hợp: Tiến · Căn cứ: FR-AUTH-001, FR-JOB-001.**

**File:** `RegisterCommandHandler.cs`, `GoogleLoginCommandHandler.cs` nếu tạo user mới; abstraction background job; `Infrastructure/Services/MailKitEmailService.cs`, `WelcomeEmailTemplate.cs`; job welcome mới nếu cần.

1. Sau khi lưu user thành công, lên lịch gửi template qua job; không gọi SMTP trực tiếp trong request đăng ký. Google chỉ gửi khi tạo user mới theo phạm vi nhóm chốt.
2. Đặt retry đúng **3 lần với khoảng chờ 1/5/30 phút** tại method/interface thực sự được enqueue; kiểm chứng filter giống R09. Chỉ truyền ID/tham số cần thiết, không đưa mật khẩu/token vào job/log.
3. Xử lý enqueue/storage lỗi sau khi đã tạo user: không biến tài khoản đã tạo thành lỗi đăng ký mơ hồ. Có cơ chế lưu ý định gửi bền vững/khôi phục, ví dụ outbox tối thiểu hoặc cách tương đương được giải thích và test; chống gửi lặp khi job chạy lại.

**Vì sao:** có SMTP service/template chưa chứng minh luồng welcome hoạt động. **Kiểm tra đạt:** đăng ký tạo job, MailHog nhận thư; SMTP lỗi không chặn tạo tài khoản, có retry; đăng nhập lại không gửi welcome mới; có ca enqueue lỗi và ca chạy lại.

### R09 — Retry và queue của job ảnh phải có hiệu lực thật

**Cao · Chính: Tuấn · Căn cứ: FR-JOB-002.**

**Hiện trạng:** enqueue qua `IImageResizeJob` nhận retry mặc định 10, dù implementation ghi 3; server nghe queue `images` không tự route job sang đó. **File:** `ImageResizeJob.cs`, interface job, `HangfireBackgroundJobService.cs`, DI Hangfire.

1. Đặt retry 3/queue tại vị trí Hangfire áp dụng cho job đã serialize hoặc dùng cấu hình filter/queue phù hợp.
2. Kiểm tra metadata/filter và job storage thật trên môi trường thử; cố ý dùng lỗi giả lập để quan sát retry. Không sửa báo cáo thành 3 khi runtime vẫn 10.

**Vì sao:** attribute trên class không đủ nếu scheduler nhìn method interface. **Kiểm tra đạt:** job ảnh vào queue đã chốt, server xử lý được, retry thực tế 3; sitemap vẫn retry 2 và đúng lịch UTC D14.

### R10 — Batch resize phản ánh lỗi và chạy lại không sinh rác

**Cao · Chính: Tuấn · Căn cứ: FR-JOB-002, NFR-REL.**

**File:** `ImageResizeJob.cs`, `MinioFileStorageService.UploadToBucketAsync` và logic batch.

1. Theo dõi từng ảnh, có thể enqueue từng job riêng; ảnh lỗi phải có trạng thái/retry quan sát được, không chỉ catch rồi để batch báo thành công toàn bộ.
2. Dùng object key ổn định theo image/version hoặc cơ chế thay thế có dọn bản cũ; không phát sinh GUID mới không được tham chiếu mỗi lần retry.
3. Chốt thứ tự upload–lưu DB–dọn file và xử lý lỗi giữa các bước; ảnh bị xóa trong lúc worker chạy không được hồi sinh.

**Vì sao:** worker có thể chạy lại hoặc hai worker cùng nhận tác vụ. **Kiểm tra đạt:** chạy hai lần không tăng object rác; batch có một ảnh hỏng không che lỗi; lỗi upload/SaveChanges và retry không làm mất bản đang dùng.

### R11 — Jobs tắt vẫn khởi tạo được ứng dụng

**Cao · Chính: Tiến · Phối hợp: Tuấn/Đức · Căn cứ: D14, NFR-REL.**

**File:** DI Infrastructure/API, `IBackgroundJobService`, `AddRecipeImageCommandHandler` và luồng enqueue email.

1. Chốt riêng ý nghĩa bật worker và bật enqueue nếu cần; nếu chỉ tắt worker thì vẫn đăng ký client/storage tương thích. Nếu tắt toàn bộ jobs, abstraction vẫn resolve và trả hành vi rõ.
2. Không dùng no-op im lặng rồi trả đã tạo thumbnail/email. UI/API phải cho biết phần chưa xử lý hoặc có phương án đồng bộ/durable pending đã chốt.
3. Validate DI cho cấu hình bật/tắt, không cần khởi chạy host Development có auto-migrate trên DB dùng chung.

**Kiểm tra đạt:** không còn thiếu `IBackgroundJobService`; startup, attach ảnh và đăng ký tài khoản hoạt động theo contract ở cả hai cấu hình; bật lại jobs có cách xử lý công việc chờ.

### R12 — Redis hỏng không làm sai kết quả lưu dữ liệu

**Cao · Chính: Toàn · Phối hợp: Tiến · Căn cứ: SRS 2.6, NFR-REL-002, D4.**

**File:** `RedisCacheService`, DI Redis, `Application/Common/Behaviors/CategoryCacheInvalidationBehavior.cs` và query cache.

1. Cho phép khởi tạo/kết nối lại hợp lý; cache read hỏng fallback DB, ghi log/counter và không biến lỗi Redis thành lỗi nghiệp vụ.
2. Sau DB commit, lỗi invalidation không được biến một lần lưu thành 500 khiến client thử tạo trùng. Đồng thời phải có cơ chế invalidation được thử lại/generation bền vững hoặc bypass cache sau outage đến khi đồng bộ; không chỉ nuốt exception.
3. Kiểm tra race query cache cũ–invalidation, cùng việc phục hồi Redis; giới hạn TTL chỉ là lớp bảo vệ bổ sung, không thay yêu cầu làm mới sau cập nhật.

**Kiểm tra đạt:** Redis tắt lúc startup/read/write và ngắt ngay sau DB save: đọc fallback, ghi báo đúng kết quả, DB không ghi lặp; khi Redis lên lại không phục vụ giá trị cũ trái cơ chế đã thiết kế. Thử trên Redis/DB riêng.

### R13 — Hoàn thiện luồng sửa Draft bằng các editor đã có

**Cao · Chính tích hợp: Tiến · Đức: publish; Tuấn: steps/ingredients; Căn cứ: FR-RCP-004/005/008/009/010, D11/D13.**

**File:** `Frontend/app/dashboard/recipes/[id]/edit/page.tsx`, preview/new/my-recipes; `RecipeGalleryEditor`, `IngredientListEditor`, `StepListEditor`, `PublishToggle` và API helpers.

1. Gắn editor hiện có vào trang quản lý thật; thống nhất prop/callback, quyền owner/Admin và tải dữ liệu riêng tư. Không yêu cầu người dùng chuyển sang các trang `*-test`.
2. Sau mỗi thay đổi nội dung con lấy phiên bản bài cha mới; đồng bộ dữ liệu form chưa lưu, tránh tự gây 409 hoặc âm thầm mất dữ liệu. Vẫn xử lý xung đột thật từ phiên khác.
3. Đưa publish/unpublish vào luồng quản lý; báo rõ điều kiện D11. Lưu bài thành công nhưng publish thất bại phải hiện trạng thái Draft và lỗi tương ứng.

**Kiểm tra đạt:** tạo Draft → rời trang → mở lại → thêm/sửa/xóa nguyên liệu, bước, ảnh → publish → xem public; Author khác bị chặn. Hai phiên cùng sửa vẫn có 409 đúng; không mất nội dung form do refresh phiên bản.

### R14 — Giữ slug sau lần xuất bản đầu

**Cao · Chính: Tiến · Căn cứ: NFR-SEO-004.**

**File:** `Domain/Entities/Recipe.cs`, handler update và dữ liệu `PublishedAt`.

1. Phân biệt chưa từng publish với đã publish rồi Archive/Unpublish; dùng dấu mốc bền vững phù hợp, không chỉ kiểm tra Status hiện tại.
2. Giữ slug khi đổi title sau lần publish đầu; nếu dữ liệu cũ thiếu dấu mốc, nêu cách bảo toàn URL/backfill trong PR. Không tạo redirect tùy ý hoặc đổi hàng loạt slug cũ.

**Vì sao:** link đã chia sẻ vẫn phải mở sau khi tác giả gỡ/xuất bản lại. **Kiểm tra đạt:** Publish → Archive/Unpublish → sửa title → publish lại giữ nguyên URL; Draft chưa publish vẫn theo chính sách sinh slug đã chốt.

### R15 — Unique index thống nhất với xóa mềm

**Cao · Chính ghép: Tiến (Recipe) · Toàn: Category · Căn cứ: D1, FR-CAT-003, FR-RCP-003.**

**File:** repository kiểm tra tên/slug; `RecipeConfiguration.cs`, `CategoryConfiguration.cs`; migration nếu đổi index; mapper lỗi unique.

1. Chốt chính sách: bảo lưu tên/slug đã xóa, hoặc cho tái sử dụng với index có điều kiện và quy tắc khôi phục rõ ràng. Đối với URL từng public phải cân nhắc nhầm nội dung khi tái sử dụng.
2. Đồng bộ precheck với index/global query filter; kể cả có precheck vẫn bắt unique violation đúng constraint vì có thể có hai request đồng thời.
3. Nếu đổi index, tạo migration tăng dần, thử trên DB có bản ghi active/deleted/trùng liên quan; không xóa migration cũ hoặc toàn bộ DB để vượt lỗi.

**Kiểm tra đạt:** tạo → soft delete → tạo lại có kết quả theo chính sách (thành công/409/hậu tố), không 500; hai request cạnh tranh không sinh trùng; D12 giữ slug Category khi đổi tên.

### R16 — Hoàn thiện full-text search và index thực dùng

**Hoàn thiện · Chính: Toàn · Căn cứ: FR-SRCH-001, SRS 7.2, NFR-PERF/SCALE.**

**File:** `Infrastructure/Persistence/Repositories/RecipeRepository.cs`, `RecipeConfiguration.cs`, migration search và query/DTO liên quan.

1. Tìm cả Title và Description, chuẩn hóa tiếng Việt/unaccent nhất quán; thiết kế vector/index GIN phù hợp. Chọn generated column/trigger/expression dựa trên khả năng thực tế của PostgreSQL, đặc biệt tính immutable của hàm; không sao chép expression không chạy được.
2. Dùng rank và thứ tự ổn định khi bằng điểm; giữ filter Published/soft-delete, lọc trước paging. Tránh nhân dòng khi Include đồng thời Images/Reviews; dùng projection/split query thích hợp.
3. Lưu EXPLAIN ANALYZE trước/sau với dữ liệu đủ đại diện. Bảng nhỏ có thể chọn sequential scan hợp lý; không tắt planner chỉ để chụp ảnh index scan.

**Kiểm tra đạt:** từ khóa có dấu/không dấu, chỉ xuất hiện trong Description, không có kết quả, nhiều trang, rating/ảnh đúng; không lộ Draft. Có migration và kế hoạch query chứng minh thiết kế được dùng phù hợp.

### R17 — Đồng bộ paging/filter/sort và DTO

**Hoàn thiện · Chính ghép: Tiến (category detail/consumer) · Toàn: query/paging chung · Căn cứ: FR-CAT-002, FR-SRCH-002..004, D8.**

**File:** `PagingParams.cs`, query GetCategoryBySlug/list/search, API binding/response; `Frontend/lib/api/categories.ts`, `recipes.ts` và trang danh mục/tìm kiếm.

1. Category detail nhận page/pageSize/sort và trả metadata, không tải toàn bộ bài. Chốt DTO phân trang trước, cập nhật server và consumer trong cùng đợt ghép để không vỡ UI.
2. Bổ sung `minServings`, sort `prepTime` theo SRS; mặc định pageSize 12, tối đa 50 hoặc ghi quyết định điều chỉnh được nhóm chấp thuận. Giữ cả hai cú pháp sort theo D8; xác định ưu tiên khi client gửi cả hai.
3. Truyền đầy đủ metadata đang bị mất như HasNext/HasPrevious; validate sort field/page, sort ổn định giữa các trang.

**Kiểm tra đạt:** mặc định/biên pageSize, trang rỗng/cuối, filter kết hợp và hai cú pháp sort có kết quả đúng; TypeScript consumer khớp DTO; không tải danh sách không giới hạn.

### R18 — Xóa ảnh gallery bằng job, giữ ảnh khi xóa mềm Recipe

**Cao · Chính nghiệp vụ: Tiến · Tuấn: storage/worker · Căn cứ: FR-RCP-008, FR-FILE-002, D1.**

**File:** `ManageImages/DeleteRecipeImageCommand.cs`, abstraction job, storage delete và job dọn ảnh.

1. Tách hai nghiệp vụ: soft-delete Recipe không xóa object theo D1; xóa riêng ảnh gallery có quyền sẽ lưu trạng thái rồi enqueue dọn original/medium/thumbnail theo yêu cầu file.
2. Kiểm tra object có được dùng chung ở nơi khác không; chỉ dọn object thuộc quyền quản lý, dựa trên key đã xác minh R02/R03. Lưu đủ thông tin cho job sau khi record bị query filter ẩn.
3. Job idempotent: object đã mất coi là đã dọn; lỗi MinIO có retry; kiểm soát race với resize và không bỏ rơi việc dọn nếu enqueue lỗi.

**Kiểm tra đạt:** xóa gallery dọn đúng các biến thể; xóa lặp không lỗi; lỗi storage thử lại được; xóa mềm cả bài vẫn giữ ảnh; không xóa ảnh bài/user khác.

### R19 — Kiểm tra và sửa cạnh tranh refresh token

**Cao · Chính: Đức · Căn cứ: FR-AUTH-004, NFR-SEC-002.**

**Hiện trạng:** code đọc/check/revoke chưa có bảo vệ cạnh tranh rõ ràng. Đây là **rủi ro từ code, chưa tái hiện hai response thành công** trong lần rà.

**File:** `RefreshTokenCommandHandler.cs`, repository/token entity/configuration và transaction liên quan; interceptor/Auth.js khi cần.

1. Viết integration test hai request dùng cùng refresh token trên DB riêng, đồng bộ thời điểm gửi để có cạnh tranh thật.
2. Tiêu thụ token cũ và tạo token mới bằng cơ chế nguyên tử: conditional update/concurrency/khóa giao dịch phù hợp. Có rollback đúng khi một phần lưu lỗi.
3. Giữ reuse detection/family revocation theo SRS; xác định request thua nhận gì và tác động lên token vừa phát hành. Đồng bộ single-flight refresh phía frontend, không bỏ reuse detection để che race.

**Kiểm tra đạt:** một token cũ chỉ được tiêu thụ thành công một lần; test chứng minh trạng thái token family sau cuộc đua, tái dùng và logout; silent refresh và cookie dashboard D14 không bị hỏng.

### R20 — Hoàn thiện rate limit theo nhóm endpoint

**Cao · Chính: Đức · Tuấn: upload/jobs · Tiến: proxy · Căn cứ: D7, NFR-SEC-003.**

**File:** `API/DependencyInjection.cs`, endpoint policies và middleware order; cấu hình forwarded headers production.

1. Giữ login **5/phút theo D7**; bổ sung/chốt auth khác 10/phút, API chung 100/phút, upload 5/phút theo NFR. Xác định rõ policy global và endpoint kết hợp ra sao, tránh áp nhầm một policy cho tất cả.
2. Dùng partition/IP phù hợp, chỉ tin proxy đã cấu hình; client không được tự giả `X-Forwarded-For` để vượt giới hạn. Chốt giới hạn cho batch/resize tốn tài nguyên.
3. Trả 429, `Retry-After` và headers theo D7; phối hợp P02 về ProblemDetails.

**Kiểm tra đạt:** từng nhóm đủ/vượt ngưỡng, reset window, nhiều user/IP, qua Nginx; các limiter không gây lỗi giả trong E2E/load test. Ghi cấu hình test nếu điều chỉnh, không tắt policy âm thầm trong production.

## 5. Bổ sung phần SRS còn thiếu để nghiệm thu

### O01 — Health checks (FR-OBS-001)

**Chính: Tiến · Phối hợp: Toàn/Tuấn cho Redis/MinIO.**

Đăng ký và map `/health` (DB/Redis/MinIO), `/health/live` (tiến trình), `/health/ready` (PostgreSQL/Redis) theo SRS. Dùng tags/predicate để liveness không chết theo dịch vụ ngoài; không trả connection string/stack trace ra public. Test độc lập từng dịch vụ lỗi, timeout và phục hồi; đối chiếu readiness với chính sách degrade R12, ghi rõ khác biệt giữa còn phục vụ được và đủ điều kiện nhận traffic.

**Vì sao:** có package healthcheck và URL trong SETUP chưa đồng nghĩa endpoint đã chạy. **Đạt khi:** URL/mã HTTP/nội dung phản ánh đúng từng trạng thái và Docker/Nginx dùng đúng probe.

### O02 — Correlation ID và thời gian xử lý (FR-OBS-002)

**Chính: Toàn · Tiến phối hợp middleware.**

Thêm/hoàn thiện middleware nhận hoặc sinh `X-Correlation-ID` an toàn (giới hạn/kiểm tra input), đưa vào response/log scope và chỗ ExceptionMiddleware đang đọc; đo elapsed trong `LoggingBehavior`, cảnh báo trên 500 ms. Hoàn thiện Console JSON/File rolling/Seq theo SRS và cấu hình môi trường. Không log mật khẩu, token, URL ký hoặc toàn bộ body nhạy cảm.

**Đạt khi:** theo dõi được cùng ID từ HTTP qua MediatR tới lỗi/log; request chậm giả lập có warning; request lỗi vẫn có duration và correlation; log production có rotation/quản lý dung lượng.

### O03 — Tracing và metrics (FR-OBS-003)

**Chính: Tiến · Toàn phối hợp EF/MediatR.**

Cấu hình OpenTelemetry HTTP, EF Core và activity MediatR; đo request count, duration histogram, error rate; exporter OTLP tới collector/backend thực sự hỗ trợ và có cấu hình bật/tắt. Không giả định Seq image dev hiện tại tự nhận mọi giao thức OTLP. Không đưa user/token/từ khóa tùy ý thành label có cardinality cao.

**Đạt khi:** mở được trace HTTP → handler → DB và metrics của request thành công/lỗi; exporter hỏng không làm hỏng nghiệp vụ; hướng dẫn cấu hình có thể chạy lại trên máy khác.

### C01 — Cache recipe/search và thống nhất D4

**Chính: Toàn · Tiến xác nhận phạm vi dữ liệu riêng tư.**

1. Bổ sung cache cho query public phù hợp: category 30–60 phút, recipe detail 5–15 phút, search 1–5 phút; list dùng TTL được chốt nếu cache. Key chứa đầy đủ filter/page/sort/version; không dùng chung cache public cho Draft/owner/Admin.
2. Invalidate khi create/update/delete/publish/unpublish/archive và thay đổi nội dung con/ảnh/review ảnh hưởng DTO. Kiểm tra cả public page có Next fetch/revalidation để tránh backend đã mới nhưng UI vẫn cũ.
3. Chọn cách thực hiện D4: hoàn thiện `ICacheable`/`ICacheInvalidator` và behaviors, hoặc nhóm chốt cập nhật D4 theo cách hiện có. Không duy trì hai tầng cache trùng nhau vô ý. Áp dụng resilience R12.

**Đạt khi:** dữ liệu riêng không lọt cache; thay đổi reflected đúng; test hit/miss/TTL/invalidation có đo lường; không suy ra hit rate ≥80% từ một lần gọi warm cache.

### Q01 — Sửa bộ UI test đang sai phiên đăng nhập

**Chính: Đức · Toàn cung cấp ca Category; Tiến cung cấp ca Jobs.**

Ba test CRUD Admin trong `Frontend/tests/lab05.spec.ts` thất bại do không có phiên Admin nên middleware chuyển về login. Tạo auth fixture/login hợp lệ cho test; API mock phải đi cùng session mà middleware nhận biết. **Không gỡ middleware để test xanh.** Tách suite UI mock, API integration, jobs và recipe management bằng cấu hình/testMatch/testIgnore rõ; jobs dùng `playwright.jobs.config.ts`, recipe dùng config tương ứng.

**Đạt khi:** discovery từng config không chạy nhầm suite/port; CRUD Admin chạy được với Admin, Guest/Author bị chặn; ghi số test chạy thực tế, không đánh dấu skipped thành passed.

### Q02 — Test nghiệp vụ, concurrency và độ phủ

**Chính điều phối: Đức · Mỗi người viết test phần mình.**

Tái sử dụng console checks/Playwright/API scripts hiện có nhưng bổ sung unit/integration test có thể đo coverage cho commands/queries/validators Application theo NFR-MAINT-002 (≥80% line coverage). Ưu tiên quyền, validation, publish, unique, slug, cache outage, retry và concurrency; không viết test chỉ lặp lại implementation. Dùng DB/Redis/MinIO thử riêng, không tự migrate/seed/xóa dữ liệu đang demo.

E2E tích hợp cuối: đăng ký → đăng nhập/refresh → tạo Draft → sửa đủ nội dung/ảnh → publish → search/category/detail → review → archive/soft-delete → logout; kiểm tra quyền bằng tài khoản thứ hai. Bổ sung mobile 320px/tablet/desktop, bàn phím/a11y, loading/progress/error theo NFR-USE. Phần UI mock qua không thay thế API integration.

**Đạt khi:** có lệnh chạy lặp được, fixture/dọn dữ liệu thử và báo cáo coverage đúng phạm vi; ghi rõ test thật/test mock và ca cần credentials Google. Không tuyên bố 80% khi chỉ có console checks.

### Q03 — CI, chất lượng và tải đồng thời

**Chính: Tiến · Đức hỗ trợ test; Toàn hỗ trợ số liệu.**

Thêm CI tối thiểu: restore/build backend, lint/type/build frontend, test và artifact kết quả; cấu hình test service/secrets không dùng DB demo. Thiết lập EditorConfig/analyzer/format theo NFR-MAINT, xử lý warning có căn cứ thay vì tắt toàn bộ; chọn Node/.NET đúng repo và cập nhật cùng R07.

Chạy bài tải ≥100 người dùng đồng thời trên môi trường thử có cấu hình gần tiêu chí SRS (ghi CPU/RAM/dataset/duration/warmup); đo p50/p95/p99, error rate và cache hit. Benchmark 200 request tuần tự không chứng minh concurrent users. Dữ liệu đọc/ghi và limiter phải được mô tả để không đọc nhầm 429 thành lỗi hiệu năng hay bỏ qua lỗi thật.

**Đạt khi:** clean checkout chạy CI được, có báo cáo coverage/test/build; load report đối chiếu p50≤150 ms GET cache, p95≤500 ms, p99≤1000 ms trong tải bình thường và giải thích giới hạn hạ tầng. Chỉ ghi đã đạt khi có số đo.

## 6. Các điểm UI/validation cần hoàn thiện

### U01 — Nguyên liệu, profile và độ dài dữ liệu

**Chính: Tuấn · Tiến phối hợp trang tạo bài.**

- Thay `parseFloat` bằng parser định lượng đúng D10, dùng chung cho editor và form tạo bài: `1/2` → 0.5, `1/4` → 0.25; chặn mẫu sai/chia 0, không âm; “vừa đủ” gửi null. Đơn vị phải tách rõ, không đoán chuỗi tùy ý thành số sai.
- Đồng bộ định dạng profile upload với backend (JPEG/PNG/WebP/AVIF theo contract đã chốt); không cho GIF trên UI khi server từ chối. Avatar phải qua ownership/finalize R02/R03.
- Đồng bộ AvatarUrl validator 1000/DB 500 và AltText validator 300/DB 200 bằng một giới hạn được chốt; test đúng ngưỡng và vượt một ký tự. Nếu đổi cột cần migration, không chỉ tăng validator.

**Đạt khi:** nhập phân số/null/hợp lệ/sai không lưu số nhầm; UI/API/DB cùng chấp nhận hoặc từ chối ở biên; không phát sinh 500 vì quá độ dài cột.

### U02 — Lỗi xóa file và tối ưu ảnh

**Chính: Tuấn · Tiến phối hợp trang detail/gallery.**

`ImageUploader` phải kiểm tra kết quả `deleteFile=false`/exception, giữ trạng thái và cho thử lại khi xóa lỗi; không báo đã xóa thành công. Trang detail ưu tiên medium phù hợp, card thumbnail, có fallback original/placeholder khi job chưa xong; đặt kích thước/aspect ratio và responsive để tránh CLS. Test lỗi mạng/MinIO, ảnh chưa resize và ảnh lỗi; không gọi raw delete thay nghiệp vụ gallery R18.

### U03 — Publish, lỗi API và route riêng tư

**Chính: Đức cho publish/error client · Tiến cho fetch/detail/preview.**

- Tạo bài thành công nhưng publish lỗi phải thông báo rõ “đã lưu Draft, chưa xuất bản” và hiển thị lỗi nghiệp vụ; `PublishToggle` đọc được ProblemDetails thống nhất với P02.
- Helper `getBySlug`/list không được biến mọi 500/lỗi mạng thành null/404/list rỗng. Chỉ 404 thật mới hiển thị not found; lỗi dịch vụ có error UI và retry phù hợp.
- Chốt vai trò public slug và preview owner/Admin theo SRS: nếu hỗ trợ slug riêng tư phải truyền auth an toàn ở server và không cache chung; nếu dùng preview riêng thì cập nhật contract/quyết định được nhóm chấp thuận. Không tạo thêm route trùng chỉ để khớp tên cũ.

**Đạt khi:** phân biệt 404/401/403/409/500/network; publish thất bại không báo đã public; dữ liệu riêng không xuất hiện ở Guest/cache.

### U04 — Dọn UI chỉ dành cho phát triển

**Chính: Toàn điều phối · Đức: login/footer CTA; Tiến/Tuấn: editor demo.**

Sau R13, loại khỏi production hoặc giới hạn rõ các trang `*-test` và thông báo tài khoản Admin mẫu; giữ công cụ dev cần thiết theo cấu hình. `/forgot-password` và newsletter chưa có xử lý: ẩn/đổi CTA hoặc ghi rõ chưa hỗ trợ; không tự mở rộng đồ án thành hệ thống email marketing/reset mật khẩu khi chưa chốt phạm vi. Kiểm tra menu/link không dẫn người dùng vào đường cụt.

## 7. Giai đoạn B — giữ nhiệm vụ buổi 8, bổ sung tiêu chí cụ thể

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

## 8. Đồng bộ tài liệu và phạm vi

### D01 — Hướng dẫn chạy, quyết định và báo cáo đúng code

**Chính: Tiến · Mỗi thành viên sửa tài liệu/báo cáo phần mình.**

- Cập nhật SETUP/HUONG_DAN/README từ clone sạch: URL repo `2312770-LeNhatTien`, dùng migration hiện có, bỏ hướng dẫn tạo lại InitialCreate/khẳng định API còn 501 không còn đúng; health URL chỉ ghi hoạt động sau O01.
- Đồng bộ nhánh một buổi từ tuần 4, SRS/API DTO/route thực tế, D13 RowVersion trigger (không tự chuyển xmin), D14 lịch sitemap **02:00 UTC = 09:00 Việt Nam**, retry 2 và nơi lưu file SEO.
- Cập nhật README_JOBS sau R08–R11/R18: service email khác job welcome; retry/queue phải theo bằng chứng runtime. Người viết báo cáo resize điều chỉnh tuyên bố 100%/retry 3/queue images/dashboard theo test thực tế.
- Tài liệu chỉ đường tới file có thật; ghi đủ env/config/lệnh và giới hạn test. Không sửa lùi báo cáo lịch sử thành “đã đạt” nếu chưa chạy lại; có thể bổ sung mục kết quả khắc phục và commit/PR đối chiếu.

### D02 — Rating/comment và những hợp đồng cần nhóm chốt

**Chính: Toàn · Tiến duyệt tích hợp với nhóm.**

SRS 1.2.3 ghi rating/comment ngoài scope, nhưng README/phân công buổi 7 đã giao FR-INT-001 và code đã merge. Giữ code hiện có, ghi rõ đề xuất/phạm vi mở rộng, endpoint, quyền và tiêu chí nghiệm thu để nhóm thống nhất bằng bổ sung quyết định/phụ lục; không tự xóa tính năng hoặc sửa yêu cầu như đã được thông qua. Chốt tương tự các thay đổi D4/paging/status/route nếu chọn khác SRS.

**Đạt khi:** người mới đọc SRS + DECISIONS + hướng dẫn hiểu một contract thống nhất; không có hai mô tả trái nhau mà đều tự nhận chính thức.

## 9. Cách thực hiện, kiểm thử và bàn giao PR

### 9.1. Chuẩn bị trên máy thành viên

Kiểm tra worktree sạch; lưu riêng thay đổi đang làm trước khi chuyển nhánh. Cập nhật `main`, tạo hoặc chuyển nhánh buổi 8 của mình theo quy ước hiện có, **không reset/ghi đè nhánh đã có**:

```powershell
git status --short
git switch main
git pull --ff-only origin main
# Ví dụ: chỉ chạy -c nếu nhánh chưa tồn tại
git switch -c 2312770-LeNhatTien-buoi8
```

Nhánh tương ứng: `2314299-LamVanDuc-buoi8`, `2312777-NguyenVietToan-buoi8`, `2312792-NguyenDinhTuan-buoi8`. Các việc A nằm trước mục buổi 8 trong file cá nhân nhưng có thể làm trên nhánh buổi 8, commit/PR ghi mã R/O/C/Q/U/D/P để phân biệt.

**Môi trường thử:** dùng DB/Redis/MinIO/bucket/port riêng cho ca ghi, migration, concurrency, outage và load. Khi chạy API Development phải biết rõ startup có tự migrate/seed hay không; cấu hình nhầm connection string có thể sửa DB đang demo. Không ghi/xóa dữ liệu thật chỉ để chứng minh lỗi.

### 9.2. Lệnh kiểm tra nền

Chạy từ repo root; đây là lệnh nền, chưa thay thế test đặc thù từng mục:

```powershell
dotnet build CulinaryBlog.slnx
Push-Location src/Frontend
npm ci
npx tsc --noEmit
npm run build
npx playwright test --list
npx playwright test --config playwright.jobs.config.ts --list
npx playwright test --config playwright.recipes.config.ts --list
Pop-Location
```

Sau Q01, chạy suite bằng config đúng và ghi lệnh/port/fixture cụ thể vào README test/PR. `--list` chỉ kiểm tra discovery, **không chạy test**. Các test cần dịch vụ/ghi dữ liệu chỉ chạy sau khi kiểm tra môi trường riêng. Backend unit/integration/coverage dùng lệnh đúng dự án được bổ sung ở Q02; không tuyên bố `dotnet test` đã bao phủ các console checks hiện có.

### 9.3. Checklist bàn giao cho từng mục

- [ ] Ghi mã mục và FR/D liên quan; mô tả trước/sau bằng một ví dụ dễ hiểu.
- [ ] Nêu file/contract/migration/config đổi và người phối hợp đã xác nhận consumer.
- [ ] Có ca đúng và ca sai quan trọng; ca bị từ chối không đổi DB/object/job queue.
- [ ] Ghi kết quả/lệnh/môi trường thật; test chưa chạy hoặc cần Google credentials được ghi rõ.
- [ ] Không commit `.env.local`, secrets, báo cáo/log sinh tự động hoặc kế hoạch local; review `git diff` và stage đúng file cần thiết.
- [ ] Tạo PR vào `main`; **trưởng nhóm Tiến review và merge** theo quy ước nhóm. Sau merge chạy lại test tích hợp liên quan trên commit đã ghép.

Mẫu nội dung PR (điền kết quả thực, không sao chép dấu đã đạt):

```text
Mục xử lý: Rxx / FR-... / D...
Trước: ...
Sau: ...
Contract/migration/config: ...
Kiểm tra: lệnh, môi trường, số ca đạt/lỗi, bằng chứng
Giới hạn/chưa hoàn thành: ...
Người phối hợp và phần cần ghép tiếp: ...
```

### 9.4. Điều kiện chốt đợt sửa

Tất cả **R01–R20, O01–O03, C01, Q01–Q03, U01–U04, D01–D02, P01–P03** phải được đối chiếu và có kết quả hoặc quyết định phạm vi rõ ràng. Không để mục chưa có test thành “xong” chỉ vì build thành công. Trưởng nhóm tổng hợp trạng thái bằng PR/commit và bằng chứng; tài liệu này là checklist chung, không cần thêm một file quản lý trùng lặp.
