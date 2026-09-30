# Hướng Dẫn Chi Tiết & Phân Công Nhiệm Vụ
### Thành viên: Lê Nhật Tiến (MSSV: 2312770)
### Vai trò: Trưởng nhóm — Core Recipe & Author Experience

---

## 1. Thông Tin Chung
- **Họ và tên**: Lê Nhật Tiến
- **MSSV**: 2312770
- **Email**: 2312770@dlu.edu.vn
- **GitHub**: [https://github.com/2312770-coder](https://github.com/2312770-coder)
- **Tổng số chức năng phụ trách**: **7 chức năng**

---

## 2. Danh Sách 7 Chức Năng Phụ Trách

| STT | Mã FR | Tên chức năng | File Backend cần làm | File Frontend cần làm |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **FR-RCP-003** | Tạo công thức mới (trạng thái Draft) | `Features/Recipes/Commands/CreateRecipe/*` | `app/dashboard/recipes/new/page.tsx` |
| 2 | **FR-CAT-002** | Xem chi tiết danh mục + bài viết | `Features/Categories/Queries/GetCategoryBySlug/*` | `app/(public)/categories/[slug]/page.tsx` |
| 3 | **FR-RCP-002** | Xem chi tiết công thức nấu ăn | `Features/Recipes/Queries/GetRecipeBySlug/*` | `app/(public)/recipes/[slug]/page.tsx` |
| 4 | **FR-RCP-008** | Quản lý gallery ảnh công thức | `Features/Recipes/Commands/ManageImages/*` | `components/recipes/RecipeGalleryEditor.tsx` |
| 5 | **FR-RCP-004**<br>**FR-RCP-006** | Cập nhật Concurrency & Lưu trữ | `Features/Recipes/Commands/UpdateRecipe/*`<br>`Features/Recipes/Commands/ArchiveRecipe/*` | `app/dashboard/recipes/[id]/edit/page.tsx` |
| 6 | **FR-RCP-007** | Xóa mềm công thức (D1 Soft Delete) | `Features/Recipes/Commands/DeleteRecipe/*` | Nút xóa trong danh sách bài của tôi |
| 7 | **FR-JOB-003** | Tự động sinh file `sitemap.xml` | `Infrastructure/Jobs/SitemapJob.cs` | Route `/sitemap.xml` SEO |

---

## 3. Lộ Trình Thực Hiện (Tuần 2 → Tuần 8)

```
Tuần 2 (Đã hoàn thành & merge main):
  ✅ Dựng hạ tầng — Docker 5 container, Database Seeder (2 users, 23 danh mục, 100 công thức mẫu)
  ✅ Layout chung — Navbar, Footer, RecipeCard, Layout.tsx, Home Page
  ✅ FR-RCP-003 — Tạo công thức mới trạng thái Draft (Backend & Frontend /dashboard/recipes/new)

Tuần 3 (Đã hoàn thành & merge main):
  ✅ FR-CAT-002 — Xem chi tiết danh mục kèm danh sách bài viết (Backend + Frontend /categories/[slug])

Tuần 4 (Lab 4 - Hoàn thành 100% Backend API Endpoints):
  🔲 FR-RCP-002 — GET /recipes/{slug} (Chi tiết công thức kèm nạp đầy đủ nguyên liệu, bước nấu, dinh dưỡng)
  🔲 FR-RCP-008 — POST/PATCH/DELETE /recipes/{id}/images (Quản lý gallery ảnh, chọn ảnh đại diện chính IsPrimary)
  🔲 FR-RCP-004 — PUT /recipes/{id} (Cập nhật công thức kiểm soát tương tranh lạc quan RowVersion)
  🔲 FR-RCP-006 — PATCH /recipes/{id}/archive (Lưu trữ công thức)
  🔲 FR-RCP-007 — DELETE /recipes/{id} (Xóa mềm công thức Soft Delete theo chuẩn Quyết định D1)

Tuần 5 (Lab 5 - Frontend Integration):
  🔲 Giao diện Chi tiết món ăn /recipes/[slug] (Hero banner, Bảng Nutrition Facts, Checklist nguyên liệu, Timeline các bước)
  🔲 Component RecipeGalleryEditor.tsx xem bộ sưu tập và chọn ảnh bìa chính

Tuần 6 (Lab 6 - Author Dashboard & Quản trị bài viết):
  🔲 Giao diện Quản trị bài viết cá nhân /dashboard/recipes (Lọc theo trạng thái, thao tác Archive, Xóa mềm D1)
  🔲 Xử lý UI xung đột tương tranh Optimistic Concurrency Control (bắt lỗi HTTP 409 Conflict)

Tuần 7 (Lab 7 - Hangfire Jobs & SEO):
  🔲 Cấu hình bảo mật Hangfire Dashboard tại /hangfire (Authorization filter quyền Admin)
  🔲 FR-JOB-003 — Hangfire recurring job tự động quét CSDL và sinh file sitemap.xml SEO lúc 2:00 sáng

Tuần 8 (Lab 8 - Triển khai Production & Nghiệm thu):
  🔲 Viết Dockerfile multi-stage build cho Backend và Next.js Frontend
  🔲 Cấu hình docker-compose.prod.yml + Nginx Reverse Proxy (kèm chứng chỉ SSL HTTPS)
  🔲 Kiểm thử tích hợp toàn diện E2E và hoàn thiện báo cáo đồ án, slide bảo vệ
```

---

## 4. HƯỚNG DẪN CHI TIẾT TUẦN 2 (ĐÃ HOÀN THÀNH)

> ⚠️ **Quy ước nhánh**: Mỗi chức năng làm trên **một nhánh riêng** tách từ `main`, định dạng: `2312770-LNTien-<Ten-Chuc-Nang>`. Sau khi code xong và test không lỗi, bạn tạo Pull Request hoặc merge nhánh đó vào `main`.

---

### Chức năng 1: Tạo công thức mới (FR-RCP-003)

#### Bước 1: Tạo nhánh mới từ `main`
```powershell
git checkout main
git pull origin main
git checkout -b 2312770-LNTien-Tao-Cong-Thuc-Moi
```

#### Bước 2: Hiện thực Backend
1. Mở file `src/Backend/CulinaryBlog.Application/Features/Recipes/Commands/CreateRecipe/CreateRecipeCommandHandler.cs`.
2. Hiện thực logic tạo Recipe:
   - Lấy `AuthorId` từ `_currentUser.UserId`.
   - Tạo Recipe: `Recipe.Create(...)`.
   - Xử lý trùng lặp slug (thêm hậu tố `-2`, `-3`...).
   - Bổ sung thông tin dinh dưỡng, nguyên liệu và các bước nếu client gửi kèm.
   - Lưu vào database qua `_recipeRepository.AddAsync(recipe, ct)` và `_recipeRepository.SaveChangesAsync(ct)`.
   - Trả về `RecipeDetailDto`.
3. Kiểm tra validation trong `CreateRecipeCommandValidator.cs`.

#### Bước 3: Hiện thực Frontend
1. Tạo giao diện trang tạo bài viết: `src/Frontend/app/dashboard/recipes/new/page.tsx` theo SRS mục 5.1.
2. Form gồm: Tiêu đề, Mô tả, Hướng dẫn chung, Danh mục (dropdown), Thời gian chuẩn bị, Thời gian nấu, Khẩu phần, Độ khó, Dinh dưỡng, Nguyên liệu và Các bước chế biến (kèm ImageUploader MinIO).
3. Nút bấm "Lưu bản nháp" gửi request `POST /api/v1/recipes`.

#### Bước 4: Kiểm tra và đẩy nhánh lên GitHub
```powershell
dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
cd src\Frontend; npm run lint; cd ..\..

git add .
git commit -m "recipe: hien thuc FR-RCP-003 tao cong thuc moi"
git push -u origin 2312770-LNTien-Tao-Cong-Thuc-Moi
```

---

## 5. HƯỚNG DẪN CHI TIẾT TUẦN 3 (ĐÃ HOÀN THÀNH)

> ⚠️ **Quy ước nhánh**: Mỗi chức năng làm trên **một nhánh riêng** tách từ `main`, định dạng: `2312770-LNTien-<Ten-Chuc-Nang>`.

---

### Chức năng: Xem chi tiết danh mục kèm danh sách bài viết (FR-CAT-002)

#### Bước 1: Tạo nhánh mới từ `main`
```powershell
git checkout main
git pull origin main
git checkout -b 2312770-LNTien-Chi-Tiet-Danh-Muc
```

#### Bước 2: Hiện thực Backend
1. Tạo Query `GetCategoryBySlugQuery(string Slug)` trong `Features/Categories/Queries/GetCategoryBySlug/`.
2. Tạo Handler `GetCategoryBySlugQueryHandler`:
   - Truy vấn CSDL theo `Slug` và `!IsDeleted`.
   - Nạp thông tin Category và danh sách Recipes có `Status == RecipeStatus.Published && !IsDeleted`.
   - Nếu không tìm thấy, ném `NotFoundException("Không tìm thấy danh mục.")`.
   - Trả về `CategoryDetailDto` chứa thông tin danh mục kèm danh sách bài viết tóm tắt.
3. Đăng ký route GET `/api/v1/categories/{slug}` trong `CategoriesEndpoints.cs`.

#### Bước 3: Hiện thực Frontend
1. Thêm hàm `getBySlug(slug: string)` vào `src/Frontend/lib/api/categories.ts`.
2. Tạo trang `src/Frontend/app/(public)/categories/[slug]/page.tsx`:
   - Banner hiển thị tiêu đề danh mục, mô tả, ảnh bìa và số lượng món ăn.
   - Lưới danh sách bài viết (tái sử dụng component `RecipeCard`).
   - Xử lý trạng thái Loading (Skeleton) và Not Found nếu slug không hợp lệ.

#### Bước 4: Kiểm tra và đẩy nhánh lên GitHub
```powershell
dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
cd src\Frontend; npx tsc --noEmit; cd ..\..

git add .
git commit -m "category: hien thuc FR-CAT-002 xem chi tiet danh muc"
git push -u origin 2312770-LNTien-Chi-Tiet-Danh-Muc
```

---

## 6. HƯỚNG DẪN CHI TIẾT TUẦN 4: NHÁNH BUỔI 4 & GIẢI TRÌNH KỸ THUẬT

> ⚠️ **QUY ƯỚC NHÁNH MỚI TỪ TUẦN 4**:
> - Tạo **1 nhánh duy nhất cho cả buổi 4**: `2312770-LeNhatTien-buoi4`.
> - Mọi chức năng đều commit trực tiếp trên nhánh này với tiền tố `feat/`.
> - Khi hoàn thành từng tính năng, tạo Pull Request vào `main` để review và gộp code.

```powershell
# Tạo nhánh duy nhất cho Buổi 4:
git checkout main
git pull origin main
git checkout -b 2312770-LeNhatTien-buoi4
```

---

### Task 1 (Giai đoạn 1 - Song song): Chi tiết công thức `GET /api/v1/recipes/{slug}` (FR-RCP-002)
* **Tiến trình trong nhóm**: Thực hiện đầu tiên trong buổi, cung cấp endpoint xem chi tiết bài viết hoàn chỉnh.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Cập nhật `GetRecipeBySlugQueryHandler.cs`, sử dụng EF Core `.Include()` nạp Category, Author, Steps (sắp theo StepNumber), Ingredients, Images, Nutrition*:
     - 👉 **Tại sao?**: Nếu không dùng `.Include()`, EF Core sẽ sinh ra lỗi N+1 Query hoặc dữ liệu liên kết trả về `null`, khiến thông tin chi tiết công thức bị thiếu nguyên liệu, các bước nấu và thư viện hình ảnh.
  2. *Kiểm tra trạng thái bài viết: nếu là Draft hoặc Archived và người gọi không phải tác giả (`AuthorId != currentUser.UserId`) cũng không phải Admin thì ném `ForbiddenException`*:
     - 👉 **Tại sao?**: Đảm bảo an toàn thông tin và quyền riêng tư (SRS 3.3). Công thức đang viết nháp chưa được xuất bản thì người ngoài không được phép xem trộm.
  3. *Ánh xạ route `GET /api/v1/recipes/{slug}` trong `RecipesEndpoints.cs` trả về `RecipeDetailDto`*:
     - 👉 **Tại sao?**: Cung cấp RESTful API endpoint chuẩn mực theo slug thân thiện SEO.
  4. *Kiểm tra biên dịch & Commit trên nhánh buổi 4*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     git add .
     git commit -m "feat/FR-RCP-002: cai dat endpoint GET recipes slug chi tiet cong thuc kem nutrition"
     ```

---

### Task 2 (Giai đoạn 2 - Song song): Quản lý Gallery ảnh `POST / PATCH / DELETE /api/v1/recipes/{id}/images` (FR-RCP-008)
* **Tiến trình trong nhóm**: Thực hiện tiếp theo, cho phép quản lý thư viện ảnh và thiết lập ảnh bìa chính.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Tạo các Command `AddRecipeImageCommand`, `DeleteRecipeImageCommand`, `SetPrimaryImageCommand` trong thư mục `Features/Recipes/Commands/ManageImages/`*:
     - 👉 **Tại sao?**: Tách nhỏ từng thao tác theo mô hình CQRS giúp mã nguồn rõ ràng, dễ bảo trì và phân quyền chính xác cho từng hành động.
  2. *Trong `SetPrimaryImageCommandHandler`: Tìm ảnh cũ đang có `IsPrimary == true` chuyển thành `false`, sau đó mới gán ảnh được chọn thành `true`*:
     - 👉 **Tại sao?**: Mỗi món ăn chỉ được có **duy nhất 1 ảnh đại diện chính** hiển thị ngoài trang chủ và thẻ danh sách. Nếu không bỏ cờ ảnh cũ thì cơ sở dữ liệu sẽ bị xung đột logic.
  3. *Đăng ký endpoints trong `RecipesEndpoints.cs`: `POST/DELETE /api/v1/recipes/{id}/images` và `PATCH /api/v1/recipes/{id}/images/{imageId}/primary` (`RequireAuthorization`)*:
     - 👉 **Tại sao?**: Chuẩn hóa REST API cho phép tác giả tải nhiều ảnh phụ và chọn ảnh bìa đẹp nhất.
  4. *Kiểm tra biên dịch & Commit trên nhánh buổi 4*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     git add .
     git commit -m "feat/FR-RCP-008: cai dat cac endpoints quan ly gallery anh recipe images"
     ```

---

### Task 3 (Giai đoạn 3 - Sau Task 1 & 2): Cập nhật, Lưu trữ & Xóa mềm công thức (FR-RCP-004, 006, 007)
* **Tiến trình trong nhóm**: Hoàn thiện các endpoint quản lý vòng đời công thức, khép lại 100% API công thức của Tiến.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Hiện thực `UpdateRecipeCommand` nhận `byte[] RowVersion` để kiểm soát tương tranh lạc quan (Optimistic Concurrency Control)*:
     - 👉 **Tại sao?**: Nếu hai người cùng mở một công thức và sửa đồng thời, EF Core sẽ ném `DbUpdateConcurrencyException`, API trả về mã lỗi `409 Conflict` kèm thông báo dữ liệu đã bị thay đổi bởi người khác, ngăn chặn việc ghi đè mất mát dữ liệu.
  2. *Hiện thực `ArchiveRecipeCommand` (`PATCH /api/v1/recipes/{id}/archive`)*:
     - 👉 **Tại sao?**: Chuyển trạng thái công thức sang `Archived`, bài viết sẽ không còn hiển thị công khai trên trang chủ nhưng tác giả vẫn giữ lại được dữ liệu trong kho lưu trữ cá nhân.
  3. *Hiện thực `DeleteRecipeCommand` (`DELETE /api/v1/recipes/{id}`) tuân thủ **Quyết định D1** (Soft Delete)*:
     - 👉 **Tại sao?**: Không bao giờ thực hiện `DELETE` vật lý khỏi PostgreSQL. Chỉ đánh dấu `IsDeleted = true` và `DeletedAt = DateTime.UtcNow`. Điều này giúp bảo toàn tính toàn vẹn dữ liệu, các liên kết lịch sử và có thể phục hồi nếu xóa nhầm.
  4. *Đăng ký các route tương ứng trong `RecipesEndpoints.cs`*:
  5. *Kiểm tra biên dịch toàn hệ thống, Commit & Đẩy nhánh lên GitHub*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     git add .
     git commit -m "feat/FR-RCP-004-006-007: cai dat PUT recipes id kem concurrency va PATCH archive DELETE soft delete"
     git push -u origin 2312770-LeNhatTien-buoi4
     ```
  6. *Tạo Pull Request trên GitHub ứng với từng chức năng vào `main` để review và gộp code*.

---

## 7. Tiêu Chí Nghiệm Thu (Definition of Done)
- [ ] 100% các API endpoints được phân công đã được đăng ký và hoạt động chính xác trên Scalar (`http://localhost:5000/scalar/v1`):
  - `GET /api/v1/recipes/{slug}`
  - `POST /api/v1/recipes/{id}/images`
  - `DELETE /api/v1/recipes/{id}/images/{imageId}`
  - `PATCH /api/v1/recipes/{id}/images/{imageId}/primary`
  - `PUT /api/v1/recipes/{id}`
  - `PATCH /api/v1/recipes/{id}/archive`
  - `DELETE /api/v1/recipes/{id}`
- [ ] Backend biên dịch đạt 0 lỗi (`dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj`).
- [ ] Kiểm tra phân quyền: chỉ tác giả hoặc Admin mới có quyền cập nhật, lưu trữ, xóa hoặc xem bản nháp.
- [ ] Nhánh buổi 4 `2312770-LeNhatTien-buoi4` đã được đẩy lên GitHub và tạo PR gộp vào `main`.

---

## 8. LỘ TRÌNH CHI TIẾT CÁC TUẦN TIẾP THEO (TUẦN 5 → TUẦN 8)

### 📅 Tuần 5 (Lab 5): Tích hợp giao diện Chi tiết công thức nấu ăn
* **Nhánh làm việc**: `2312770-LeNhatTien-buoi5`
* **Nhiệm vụ trọng tâm**:
  1. Xây dựng trang Next.js `src/Frontend/app/(public)/recipes/[slug]/page.tsx`:
     - Hero banner hiển thị tiêu đề, tác giả, ngày đăng, thời gian nấu, độ khó và ảnh đại diện chính.
     - Bảng Nutritional Facts hiển thị trực quan thông số dinh dưỡng (Calories, Fat, Carb, Protein).
     - Checklist nguyên liệu tương tác: cho phép người dùng click tick chọn nguyên liệu khi chuẩn bị nấu ăn.
     - Timeline các bước thực hiện có số thứ tự, thời gian đếm ngược và ảnh minh họa từng bước.
  2. Xây dựng component `RecipeGalleryEditor.tsx` cho phép tác giả xem bộ sưu tập ảnh và chọn ảnh đại diện chính (Primary image).

### 📅 Tuần 6 (Lab 6): Quản trị bài viết cá nhân & Xử lý xung đột tương tranh
* **Nhánh làm việc**: `2312770-LeNhatTien-buoi6`
* **Nhiệm vụ trọng tâm**:
  1. Xây dựng trang Quản trị bài viết cá nhân của Tác giả `/dashboard/recipes`:
     - Bảng danh sách bài viết theo các trạng thái: Draft, Published, Archived.
     - Nút thao tác nhanh: Xem trước, Sửa, Lưu trữ (Archive) và Xóa mềm (Soft delete).
  2. Xử lý UI xung đột tương tranh lạc quan (Optimistic Concurrency Control):
     - Khi nhận mã lỗi HTTP 409 Conflict từ API cập nhật công thức, hiển thị Modal cảnh báo dữ liệu đã bị sửa đổi bởi phiên khác kèm tùy chọn "Tải lại dữ liệu mới nhất".

### 📅 Tuần 7 (Lab 7): Cấu hình Hangfire Dashboard & Tự động sinh Sitemap SEO
* **Nhánh làm việc**: `2312770-LeNhatTien-buoi7`
* **Nhiệm vụ trọng tâm**:
  1. Cấu hình bảo mật Hangfire Dashboard tại route `/hangfire` với bộ lọc ủy quyền `HangfireAuthorizationFilter` (chỉ tài khoản có quyền Admin mới được truy cập).
  2. Hiện thực `FR-JOB-003`: Hangfire Recurring Job chạy định kỳ lúc 2:00 sáng mỗi ngày:
     - Quét toàn bộ công thức và danh mục đang hoạt động (`IsDeleted == false` và `Status == Published`).
     - Tự động sinh file `sitemap.xml` và `robots.txt` chuẩn SEO vào thư mục public của hệ thống.

### 📅 Tuần 8 (Lab 8): Đóng gói Docker Production, Nginx SSL & Tổng kết đồ án
* **Nhánh làm việc**: `2312770-LeNhatTien-buoi8`
* **Nhiệm vụ trọng tâm**:
  1. Viết `Dockerfile` đa tầng (multi-stage build) tối ưu kích thước image cho Backend .NET API và Frontend Next.js.
  2. Cấu hình `docker-compose.prod.yml` chạy hoàn chỉnh 5 dịch vụ hạ tầng Docker + Backend + Frontend + Nginx Reverse Proxy (kèm cấu hình chứng chỉ HTTPS SSL).
  3. Cùng cả nhóm tổng hợp báo cáo đồ án, rà soát slide trình chiếu vấn đáp với Hội đồng Giảng viên.

