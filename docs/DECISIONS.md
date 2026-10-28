# Quyết định xử lý các điểm mâu thuẫn trong SRS

Tài liệu SRS v1.0.0 có vài chỗ nói không khớp nhau giữa các chương. Đây là
cách cả nhóm thống nhất xử lý, code trong repo đã làm theo đúng các quyết định
này. Ai muốn đổi thì bàn với cả nhóm trước, vì đổi một mình sẽ gây lệch schema
với module của người khác.

---

## D1 - Xóa Recipe & Category: hard delete hay soft delete?

**SRS mâu thuẫn:**
- FR-RCP-007 (mục 3.3) nói rõ: *"Đây là hard delete (không dùng soft delete
  pattern cho recipe)"*.
- Mục 7.1 lại quy định MỌI entity kế thừa `BaseEntity` đều có `IsDeleted` và
  dùng Global Query Filter.
- Mục 8.3 (bảng API) ghi `DELETE /recipes/{id}` là *"soft delete"*.

**Quyết định CHÍNH THỨC:** Áp dụng **Soft Delete** cho cả Recipe và Category:
- Dùng `SoftDelete(entity)`: Đánh dấu `IsDeleted = true`, `UpdatedAt = DateTime.UtcNow`.
- Dữ liệu không bị xóa vĩnh viễn khỏi database, hỗ trợ khôi phục khi cần.
- Global Query Filter của EF Core (`.Where(x => !x.IsDeleted)`) tự động lọc các bản ghi này khỏi toàn bộ truy vấn đọc.
- **Không xóa file ảnh trên MinIO ngay lập tức** khi soft-delete để bảo toàn dữ liệu. Việc xóa file vật lý chỉ thực hiện nếu có job hard-delete dọn dẹp định kỳ sau này.

---

## D2 - Domain layer có được phụ thuộc NuGet không?

**SRS mâu thuẫn:** CONS-001 và mục 6.2 nói Domain *"không có NuGet
dependencies (chỉ .NET BCL)"*, nhưng mục 7.7 lại yêu cầu `ApplicationUser`
kế thừa `IdentityUser` — mà class này nằm trong gói NuGet của ASP.NET Core Identity.

**Quyết định:** Domain tham chiếu đúng MỘT gói
`Microsoft.Extensions.Identity.Stores` để có `IdentityUser`. Ngoài gói đó ra,
Domain không thêm NuGet nào khác (không EF Core, không MediatR).

---

## D3 - Tên field: TimerMinutes/DurationMinutes, OrderIndex/SortOrder

**SRS mâu thuẫn:** phần mô tả nghiệp vụ ở chương 3 dùng tên khác với bảng
dữ liệu ở chương 7.

**Quyết định:** lấy theo **chương 7** (chương đặc tả dữ liệu, chi tiết và có
kiểu dữ liệu rõ ràng nhất):
- `RecipeStep.TimerMinutes` (không phải DurationMinutes)
- `RecipeIngredient.OrderIndex`, `RecipeImage.OrderIndex`, `Category.OrderIndex`
  (không phải SortOrder)
- `ApplicationUser.DisplayName` (không phải FullName)

---

## D4 - Cache: Redis hay IMemoryCache?

**SRS mâu thuẫn:** một số chỗ nhắc IMemoryCache, nhưng NFR-SCALE yêu cầu
backend phải scale-out được nhiều instance.

**Quyết định:** dùng **Redis** qua `ICacheService`/`RedisCacheService` cho mọi
dữ liệu cache dùng chung. Lý do: IMemoryCache nằm trong RAM của từng instance,
chạy 2 instance trở lên sẽ mỗi máy một dữ liệu khác nhau.

Cách dùng: query công khai implement `ICacheableQuery`; `CachingBehavior` ghép loại
query, toàn bộ tham số và revision từ PostgreSQL vào key Redis. `CacheVersion` đổi
trong cùng transaction khi Recipe/Category/nội dung con/review/profile thay đổi.
Không cần quét/xóa prefix sau khi đã commit; key cũ tự hết TTL. Redis lỗi thì đọc DB,
không làm thao tác lưu đã thành công biến thành lỗi. Request đã đăng nhập bỏ qua
cache dùng chung để DTO riêng tư không lọt sang Guest.

TTL: Category 30 phút, Recipe detail 10 phút, danh sách 5 phút, search 2 phút.
Revision toàn cục ưu tiên tính đúng và triển khai đơn giản; đổi một bài có thể làm
cache bài khác lạnh lại. Chỉ tách revision theo tài nguyên khi số đo chứng minh cần.

---

## D5 - Hai image Docker phải đổi so với SRS mục 6.5

- **MinIO**: SRS ghi `minio/minio:latest`, nhưng Docker Hub đã chặn pull image
  này (*"pull access denied"*). Dùng
  `quay.io/minio/minio:RELEASE.2024-01-16T16-07-38Z` — cùng phần mềm, lấy từ
  registry chính chủ của MinIO.
- **Seq**: SRS ghi `datalust/seq:latest`, nhưng bản mới crash liên tục trên
  Docker Desktop Windows (lỗi `NativeDocumentStore.Migrate` do LMDB hỏng khi
  tắt máy đột ngột). Ghim `datalust/seq:2023.4` kèm `stop_grace_period: 30s`.
  Seq chỉ dùng cho dev, không deploy production nên không ảnh hưởng kiến trúc.

---

## D6 - Dev chạy HTTP cổng 5000, không dùng HTTPS

Theo SRS mục 5.2, Base URL môi trường dev là `http://localhost:5000/api/v1`.
HTTPS chỉ áp dụng ở production và do **Nginx** làm SSL termination (mục 6.5),
backend không tự chạy HTTPS. Vì vậy `app.UseHttpsRedirection()` được bọc trong
`if (!app.Environment.IsDevelopment())`.

---

## D7 - Rate Limiting đặt ở tầng API

Rate Limiting là middleware của tầng Presentation nên khai báo trong
`CulinaryBlog.API` (file `DependencyInjection.cs`, method `AddPresentation`),
không đặt ở Infrastructure. Chính sách giữ đúng SRS: `/auth/login` giới hạn
5 request/phút, vượt quá trả HTTP 429 kèm header `Retry-After` và `X-RateLimit-*`.

---

## D8 - Tham số Sắp xếp (Sorting: `sortBy` & `sortOrder` vs `sort`)

**SRS mâu thuẫn:** Chương 3 dùng `sort=-createdAt`, Chương 8 dùng `sortBy=createdAt&sortOrder=desc`.

**Quyết định:** Chuẩn chính thức trên REST API là `sortBy={field}&sortOrder={asc|desc}` (mặc định: `desc`).
Đồng thời, `PagingParams` ở backend hỗ trợ tự động bóc tách từ tham số `sort` (`sort=-createdAt` / `sort=title`) để tương thích với cả 2 cách gọi từ frontend.

---

## D9 - RecipeStep: StepNumber và Title

**SRS mâu thuẫn:** FR-RCP-010 bảo server tự tăng `StepNumber`, nhưng API 8.5 lại đưa vào request body; đồng thời body thiếu trường `Title` trong khi DB để `NOT NULL`.

**Quyết định:**
- `AddStepCommand.StepNumber` là tùy chọn (`int? StepNumber = null`). Nếu client không truyền, server tự động gán `Max(StepNumber) + 1` (hoặc 1 nếu chưa có bước nào). Nếu client truyền (chèn bước vào giữa), server sẽ chèn và renumber lại các bước phía sau.
- Bắt buộc phải có trường `Title` (`string Title`) trong DTO tạo/cập nhật bước.

---

## D10 - RecipeIngredient: Định lượng Nullable và xử lý phân số ("1/2")

**SRS mâu thuẫn:** FR-RCP-009 yêu cầu `Quantity > 0, Unit không rỗng`, nhưng DB 7.4 và API 8.6 lại cho phép `Quantity` và `Unit` là NULL cho trường hợp "vừa đủ".

**Quyết định:**
- Cho phép `Quantity` (`decimal(10,3)?`) và `Unit` (`varchar(50)?`) là **Nullable**.
- Trường hợp người dùng nhập phân số như "1/2", "1/4 muỗng" trên giao diện: Frontend Next.js chịu trách nhiệm chuyển đổi sang số thực (`0.5`, `0.25`) trước khi gửi lên API để lưu vào database dạng `decimal`. Nếu người dùng chọn "vừa đủ", gửi `quantity = null`.

---

## D11 - Điều kiện Xuất bản Recipe (Publish)

**SRS mâu thuẫn:** FR-RCP-005 chỉ kiểm tra `Steps.Count > 0`, trong khi Phụ lục B (`RECIPE_PUBLISH_INCOMPLETE`) bắt buộc phải có ít nhất 1 step VÀ 1 ingredient.

**Quyết định:** Khi Publish (`recipe.Publish()`), bắt buộc kiểm tra **CẢ HAI**:
- Phải có $\ge 1$ bước thực hiện (`Steps.Count > 0`).
- Phải có $\ge 1$ nguyên liệu (`Ingredients.Count > 0`).
Nếu không thỏa, ném `DomainException` / trả về `400 Bad Request` kèm mã lỗi `RECIPE_PUBLISH_INCOMPLETE`.

---

## D12 - Category Update: Giữ nguyên Slug

**SRS mâu thuẫn:** `Category.cs` lúc đầu sinh lại slug khi đổi tên, nhưng FR-CAT-004 yêu cầu rõ: *"Slug KHÔNG thay đổi khi đổi tên (để tránh broken links)"*.

**Quyết định:** Trong `Category.Update()`, chỉ cập nhật `Name`, `Description`, `ImageUrl`, `OrderIndex`. Tuyệt đối **không** tạo lại `Slug` để bảo vệ URL SEO đã được index.


---

## D13 - Sinh RowVersion của Recipe trên PostgreSQL

Bổ sung trong thay đổi quản lý công thức cá nhân; review cùng migration khi merge.

**Vấn đề:** Mapping EF hiện có `.IsRowVersion()` trên cột `bytea` yêu cầu database sinh token. PostgreSQL không tự sinh bytea rowversion như SQL Server. Khi token null hoặc không đổi, không thể phát hiện hai phiên ghi đè nhau.

**Cách triển khai:**
- Giữ tên/cột `Recipes.RowVersion` và mapping `.IsRowVersion()`, không chuyển sang `xmin` hay thêm dependency vào Domain.
- Migration `20261014120000_RecipeConcurrency` backfill token và thêm trigger PostgreSQL sinh 16 byte cho mỗi lần INSERT/UPDATE Recipe. Đây là token phiên bản opaque, không phải thời gian và không phải token xác thực.
- Thay đổi RecipeStep/RecipeIngredient/RecipeImage cũng làm đổi phiên bản bài cha để form đang mở nhận biết nội dung đã thay đổi. Không đổi schema hay API của các bảng con.
- PUT bắt buộc gửi rowVersion base64 lấy từ GET quản lý. Handler kiểm tra phiên bản client; EF tiếp tục kiểm tra phiên bản ở điều kiện UPDATE để xử lý cuộc đua giữa hai request. Xung đột trả 409 `RECIPE_CONCURRENCY_CONFLICT`.
- PUT giữ DTO công thức phẳng như trước, chỉ bổ sung rowVersion/createdAt/updatedAt. GET riêng phục vụ form có thể trả DTO quản lý; không thay response GET công khai.
- Trigger là chi tiết persistence ở Infrastructure. Không đặt SQL/PostgreSQL vào Domain hoặc API. Migration Down gỡ trigger/ràng buộc và giữ dữ liệu.

**Kiểm chứng:** Integration test gửi đồng thời hai PUT cùng phiên bản, chỉ một lần lưu thành công; lần còn lại trả 409. Thay đổi nguyên liệu làm token bài cha thay đổi. Kiểm thử dùng database riêng.

---

## D14 - Hangfire Dashboard và file SEO giữa API/Next.js

- Hangfire/PostgreSQL đặt ở Infrastructure, dùng schema `hangfire` cùng database; query URL
  qua MediatR ở Application. Domain/Application không phụ thuộc scheduler hay filesystem.
- Lịch sitemap theo SRS 3.6: `0 2 * * *`, UTC (09:00 Việt Nam), retry 2 lần.
- API quản lý thư mục `public/seo` cấu hình được và chỉ phục vụ hai URL gốc sitemap/robots.
  Next.js rewrite sang API vì hai ứng dụng deploy độc lập; không ghi vào source Frontend/public.
- Trình duyệt mở dashboard không tự gắn Bearer. Endpoint Admin cấp cookie chuyên biệt
  HttpOnly, Path `/hangfire`, tối đa 15 phút/không quá hạn JWT, Secure production.
  `HangfireAuthorizationFilter` kết hợp policy cookie; mỗi request xác minh lại Admin,
  tài khoản hoạt động và refresh token chưa thu hồi. Giữ JWT mặc định cho API;
  không đưa token lên URL. Logout và refresh rotation thu hồi phiên dashboard.
- Google đã bỏ ping không xác thực. Dùng Search Console `sitemaps.submit` qua ADC khi có
  domain public đã xác minh/quyền phù hợp; mặc định tắt, không gửi thật ở local.
  Lỗi submit được retry, không xóa sitemap hợp lệ. Robots luôn khai báo sitemap.

Cấu hình, cách chạy và kiểm thử nằm trong `Infrastructure/Jobs/README_JOBS.md`.

## D15 - Thư viện xử lý ảnh sau đợt vá bảo mật trước buổi 8

**Quyết định ngày 28/10/2026, theo xác nhận của trưởng nhóm:** thay ImageSharp bằng
`Magick.NET-Q8-AnyCPU`. Bản ImageSharp cũ có advisory; bản đã vá yêu cầu license khiến
build Release thất bại khi nhóm chưa có khóa. Trưởng nhóm chọn đổi thư viện và cập nhật quyết định.

- Giữ contract FR-JOB-002: thumbnail crop giữa 300×300, medium giữ tỉ lệ trong 800×600,
  WebP quality 75, lưu URL qua cùng storage/job abstraction; không đổi DTO của frontend.
- Native decoder chỉ nhận JPEG/PNG/WebP/AVIF; giới hạn bytes, pixel, RAM, disk và CPU,
  đọc một frame, không có HTTP fallback từ URL người dùng. Kiểm tra lại trên Linux khi làm Docker buổi 8.
- ImageMagick/Magick.NET chỉ nằm ở Infrastructure; Domain/Application không phụ thuộc thư viện ảnh.

## D16 - Pending jobs và giới hạn bảo đảm gửi email

- Ghi `PendingJob` cùng transaction tạo user/attach ảnh/xóa gallery. Dispatcher chuyển
  intent đã commit sang Hangfire; Jobs tắt vẫn giữ intent để xử lý khi bật lại.
- Enqueue có thể lặp sau crash: khóa phân tán theo intent, trạng thái hoàn tất và key
  thumbnail cố định giúp retry không tạo thêm biến thể. Resize/xóa dùng chung khóa ảnh.
- Welcome retry 3 lần, trễ 1/5/30 phút; ảnh và xóa retry 3 lần, queue `images`;
  worker count 2–4. Admin có thể xem lỗi và retry trên dashboard bảo vệ theo D14.
- SMTP bảo đảm **at-least-once**: crash sau SMTP chấp nhận nhưng trước khi ghi hoàn tất
  có thể gửi lại. Không tuyên bố exactly-once khi nhà cung cấp SMTP không có idempotency key.
- Xóa gallery mới dọn object; soft-delete Recipe giữ nguyên ảnh theo D1. Object còn
  được gallery khác/bước nấu/avatar tham chiếu sẽ được giữ lại.

## D17 - Phạm vi rating/comment đã tích hợp

Giữ `RecipeReview` và API/UI đánh giá đã merge trong buổi 7, coi là phần mở rộng của
FR-INT-001; không xóa code thành viên để thu hẹp scope. Một user chỉ đánh giá một lần
trên bài Published, rating 1–5, có comment; thống kê chỉ tính review chưa xóa.
Like/favorite, sửa/xóa review và moderation chưa được giao trong phần mở rộng này.

## D18 - Upload kiểm chứng và preview riêng tư

- Ảnh mới đi qua `POST /files/upload`: server kiểm tra tối đa 5 MB, magic bytes,
  decode/MIME rồi cấp key có owner. Endpoint presign cũ trả 410 để tránh bypass;
  không còn service/DTO presign không dùng. Attach/avatar/step kiểm tra quyền object.
- Google ID token phải đúng ClientId server, có email đã xác minh, định danh bằng
  Google `sub`. Email trùng tài khoản local trả `GOOGLE_ACCOUNT_LINK_REQUIRED`;
  chưa xây chức năng liên kết có xác thực nên không tự ghép tài khoản theo email.
- Web xem bài riêng ở `/dashboard/recipes/[id]/preview` bằng phiên Author/Admin.
  Trang `/recipes/[slug]` phục vụ bài public; API slug vẫn cho owner/Admin đọc khi
  có JWT hợp lệ. Không truyền localStorage token vào SSR hoặc cache chung dữ liệu riêng.
- Slug đã từng Published được giữ kể cả Archive/Unpublish; slug/tên Category đã
  soft-delete vẫn được giữ chỗ để unique index, validator và URL không mâu thuẫn.
