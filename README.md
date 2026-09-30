# Culinary Blog

Đồ án môn Phát triển Ứng dụng Web Nâng cao — Nhóm 21

Web chia sẻ công thức nấu ăn chuẩn vị Việt Nam. Backend .NET 10 (Clean Architecture) và Frontend Next.js 15 (App Router) là hai ứng dụng tách rời, giao tiếp qua REST API. Toàn bộ yêu cầu và quyết định kỹ thuật lấy từ [SRS v1.0.0](./docs/SRS_Culinary_Blog_v1.0.0.md) và [DECISIONS.md](./docs/DECISIONS.md).

---

## 🏛️ MA TRẬN PHÂN CÔNG THEO TẦNG KỸ THUẬT VÀ THÀNH VIÊN

| Hạng mục Kỹ thuật | Lê Nhật Tiến (Trưởng nhóm - 2312770) | Lâm Văn Đức (2314299) | Nguyễn Viết Toàn (2312777) | Nguyễn Đình Tuấn (2312792) |
| :--- | :--- | :--- | :--- | :--- |
| **CSDL (PostgreSQL 16)** | • Bảng `Recipes`, `RecipeNutrition` (Owned Entity)<br>• Cấu hình Concurrency `RowVersion` / `xmin`<br>• Viết Seeder 23 danh mục, 100 recipes mẫu | • Cấu hình `AspNetUsers`, `RefreshTokens`<br>• Khóa ngoại User ↔ RefreshToken, Cascade delete<br>• Seeder 2 tài khoản mẫu (Admin, Author) | • Bảng `Categories`, Unique Index Slug<br>• Cấu hình `SearchVector` (`tsvector`)<br>• Kích hoạt PostgreSQL `unaccent` & `GIN Index` | • Bảng `RecipeSteps`, `RecipeIngredients`, `RecipeImages`<br>• CHECK Constraints định lượng số dương<br>• Cấu hình bảng lưu trữ Hangfire |
| **Backend (.NET 10 API)** | • Dựng Clean Architecture + CQRS MediatR Base<br>• Recipe Core Endpoints (`FR-RCP-002..008`)<br>• Global Exception Middleware RFC 7807 | • Auth & Publish Endpoints (`FR-AUTH-001..005`, `FR-RCP-005`)<br>• Google OAuth 2.0 Token Validation<br>• ASP.NET Core Rate Limiting | • Category & Search Endpoints (`FR-CAT-001..005`, `FR-SRCH-001..004`)<br>• Full-Text Search unaccent Query<br>• Tự viết `RedisCacheService` & Invalidation | • Steps & Ingredients Endpoints (`FR-RCP-009/010`)<br>• Profile Endpoints (`FR-AUTH-006/007`)<br>• Thuật toán Renumber bước nấu liên tục (D9) |
| **Frontend (Next.js 15)** | • Trang Chi tiết công thức `/recipes/[slug]`<br>• Component `RecipeGalleryEditor.tsx`<br>• Lưới hiển thị `RecipeCard` dùng chung | • Trang Đăng ký `/register` & Đăng nhập `/login`<br>• Tích hợp Google Sign-In SDK<br>• Axios Interceptor Silent Refresh 401 | • Trang Danh mục `/categories` & Chi tiết `/categories/[slug]`<br>• Giao diện Tìm kiếm & Bộ lọc đa tiêu chí<br>• Quản trị danh mục `/admin/categories` | • Component `StepListEditor.tsx` (có hẹn giờ)<br>• Component `IngredientListEditor.tsx`<br>• Trang cá nhân `/profile` & Upload Avatar |
| **DevOps & Integration** | • Thiết lập Docker Compose 5 container<br>• Nginx Reverse Proxy & HTTPS SSL Production<br>• Hangfire Job tự động sinh `sitemap.xml` | • Cấu hình MailHog SMTP (:1025)<br>• Hangfire Job gửi Email chào mừng<br>• Kiểm thử bảo mật Brute-Force Rate Limit | • Khởi tạo Redis Container (:6379)<br>• Đo đạc thời gian Cache Hit / Miss qua Seq<br>• Tối ưu Slow Query Postgres | • Cấu hình MinIO S3 Bucket (:9000)<br>• Hangfire Job nén & resize ảnh thumbnail<br>• Kiểm tra dung lượng & tải Media S3 |

---

## 📌 LỘ TRÌNH TỔNG THỂ 8 TUẦN (BACKEND-FIRST CHO LAB 4 — ĐẠT 100% TIÊU CHÍ)

> 🎯 **Chiến lược trọng tâm**:
> - **Tuần 2 & 3 (Lab 2 & 3)**: Đã hoàn thành nền tảng hạ tầng, Exception Domain, Repository/UoW, ProblemDetails Middleware và các API đầu tiên.
> - **Tuần 4 (Lab 4 - BACKEND COMPLETE)**: **Tập trung hoàn thành 100% TẤT CẢ các REST API Endpoints còn lại của hệ thống**. Khi nộp Lab 4, Scalar API Docs (`http://localhost:5000/scalar/v1`) sẽ chạy đầy đủ 100% chức năng.
> - **Tuần 5 & 6 (Lab 5 & 6 - FRONTEND INTEGRATION)**: Tích hợp toàn diện giao diện Next.js 15, kết nối trọn vẹn vào các API đã hoàn tất từ Tuần 4.
> - **Tuần 7 (Lab 7 - CACHE & BACKGROUND JOBS)**: Tối ưu Redis Cache, cấu hình Hangfire background jobs (Email chào mừng, resize thumbnail, sitemap SEO).
> - **Tuần 8 (Triển khai & Bảo vệ)**: Docker Compose Production, Nginx SSL HTTPS, kiểm thử E2E và hoàn thiện báo cáo đồ án.

| Tuần | Trọng tâm công việc | Lê Nhật Tiến (2312770) | Lâm Văn Đức (2314299) | Nguyễn Viết Toàn (2312777) | Nguyễn Đình Tuấn (2312792) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **Tuần 2** | Khởi tạo hạ tầng, Base & Core | Hạ tầng Docker & Seeder, `FR-RCP-003` (Tạo món Draft) | `FR-AUTH-001` (Đăng ký tài khoản) | `FR-CAT-001` (Danh sách danh mục) | `FR-FILE-001`, `FR-FILE-002` (Upload & Xóa ảnh MinIO) |
| **Tuần 3** | Xác thực, Chi tiết Danh mục & Steps | `FR-CAT-002` (Chi tiết danh mục + recipes) | `FR-AUTH-002` (Đăng nhập Email + Rate Limiter) | `FR-CAT-003` (Admin tạo danh mục mới) | `FR-RCP-010` (Quản lý các bước nấu D9) |
| **Tuần 4 (Lab 4)** | **HOÀN THÀNH 100% TẤT CẢ REST API ENDPOINTS** | API Recipe Core: Chi tiết món, Gallery ảnh, Sửa RowVersion, Archive, Xóa mềm D1 | API Auth & Publish: Logout thu hồi, Refresh token rotation, Google Login, Publish/Unpublish D11 | API Category & Search: Sửa/Xóa danh mục D12/D1, Search unaccent `tsvector`, Lọc & Sắp xếp D8 | API Ingredients & Profile: CRUD nguyên liệu null unit D10, Get & Update Profile cá nhân |
| **Tuần 5** | Frontend Phase 1: Auth & Core Views | Giao diện Chi tiết món ăn `/recipes/[slug]` & Component Gallery Editor | Giao diện Đăng nhập `/login`, Đăng ký `/register` & Google SDK | Giao diện Quản trị danh mục `/admin/categories` & Trang `/categories` | Component `IngredientListEditor.tsx` & Trang cá nhân `/profile` |
| **Tuần 6** | Frontend Phase 2: Form & Search UI | Giao diện Sửa công thức `/dashboard/recipes/[id]/edit` | Giao diện Quản lý bài viết của tôi & Nút Publish | Giao diện Tìm kiếm toàn văn `/recipes?q=...` & Sidebar Bộ lọc | Component `StepListEditor.tsx` & Upload Avatar |
| **Tuần 7** | Cache, Background Jobs & Ratings | Hangfire Job sinh `sitemap.xml` SEO | Hangfire Job gửi Email chào mừng MailHog | Tự viết `RedisCacheService` TTL 30p & Đánh giá sao 1-5 | Hangfire Job nén ảnh Thumbnail & Tối ưu Media MinIO |
| **Tuần 8** | Triển khai Production & Nghiệm thu | Cấu hình Docker Production, Nginx SSL HTTPS, Kiểm thử tích hợp E2E, Tổng kết báo cáo & Slide vấn đáp |

---

## 🛠️ QUY TẮC NHÁNH THEO BUỔI & QUY TRÌNH PULL REQUEST (TỪ TUẦN 4)

> ⚠️ **QUY ƯỚC QUAN TRỌNG TỪ TUẦN 4**:
> 1. **Tạo nhánh theo buổi**: Thành viên **không tạo nhánh theo từng chức năng con nữa**, mà tạo **1 nhánh duy nhất cho cả buổi làm việc** theo chuẩn:
>    👉 `<MSSV>-<HoTenKhongDau>-buoi<SoTuan>` (Ví dụ: `2312770-LeNhatTien-buoi4`, `2314299-LamVanDuc-buoi4`, `2312777-NguyenVietToan-buoi4`, `2312792-NguyenDinhTuan-buoi4`).
> 2. **Commit trên nhánh của mình**: Mỗi khi hoàn thành một API endpoint/chức năng, commit ngay trên nhánh buổi đó với tiền tố:
>    👉 `git commit -m "feat/<module>: <mô tả chi tiết>"`
> 3. **Tạo Pull Request (PR) theo từng chức năng vào `main`**: Khi cần gộp code vào `main`, thành viên tạo Pull Request trên GitHub ứng với từng chức năng để trưởng nhóm **Lê Nhật Tiến (2312770)** review code, kiểm tra xung đột và bấm merge vào `main`.

---

## 📖 HƯỚNG DẪN CHI TIẾT THEO TỪNG TUẦN

---

### 1. HƯỚNG DẪN CHI TIẾT TUẦN 2 (ĐÃ HOÀN THÀNH & MERGE MAIN)

#### 1.1. Lê Nhật Tiến (MSSV: 2312770)
- **Chức năng 1: Dựng hạ tầng & Database Seeder** (Nhánh: `2312770-LNTien-Database` - Đã merge)
  - Cấu hình 5 container Docker Compose: PostgreSQL 16 (5432), Redis 7 (6379), MinIO (9000/9001), Seq (5341), MailHog (8025).
  - Thiết kế Entity Framework Core 10, cấu hình Migration và DatabaseSeeder sinh 2 role (Admin, Author), 2 tài khoản mẫu, 23 categories và 100 recipes chuẩn văn hóa ẩm thực Việt.
  - Viết tài liệu hướng dẫn CSDL chi tiết tại `docs/DATABASE.md`.
- **Chức năng 2: Tạo công thức mới trạng thái Draft (FR-RCP-003)** (Nhánh: `2312770-LNTien-Tao-Cong-Thuc-Moi` - Đã merge)
  - Backend: `CreateRecipeCommandHandler` xác thực `CurrentUser`, kiểm tra danh mục, tự sinh slug duy nhất (chống trùng lặp URL), nạp nutrition, nguyên liệu và các bước. Đăng ký `POST /api/v1/recipes` với quyền `AuthorOrAdmin`.
  - Frontend: Trang `/dashboard/recipes/new/page.tsx` (816 dòng code) với Form thông tin chung, danh mục, bảng dinh dưỡng, danh sách nguyên liệu và các bước thực hiện.

#### 1.2. Lâm Văn Đức (MSSV: 2314299)
- **Chức năng: Đăng ký tài khoản mới (FR-AUTH-001)** (Nhánh: `2314299-LVDuc-Dang-Ky` - Đã merge)
  - Backend: `RegisterCommandHandler` kiểm tra email trùng, tạo user qua ASP.NET Core Identity (hash PBKDF2), gán role "Author", sinh JWT Access Token và Refresh Token lưu database. `RegisterCommandValidator` kiểm tra email và mật khẩu $\ge 8$ ký tự.
  - Frontend: Trang `/register` (`app/(auth)/register/page.tsx`): Form Email, DisplayName, Password, Confirm Password, validate trực quan và liên kết chuyển trang đăng nhập.

#### 1.3. Nguyễn Viết Toàn (MSSV: 2312777)
- **Chức năng: Xem danh sách danh mục (FR-CAT-001)** (Nhánh: `2312777-NVToan-Danh-Sach-Danh-Muc` - Đã merge)
  - Backend: `GetCategoriesQueryHandler` truy vấn danh mục theo `OrderIndex`, đếm số lượng công thức Published (`Status == RecipeStatus.Published && !IsDeleted`). Đăng ký `GET /api/v1/categories`.
  - Frontend: Module `src/Frontend/lib/api/categories.ts` hàm `getAll()` và hiển thị danh mục tại trang chủ, trang `/categories`.

#### 1.4. Nguyễn Đình Tuấn (MSSV: 2312792)
- **Chức năng: Upload & Xóa ảnh trên MinIO (FR-FILE-001 & FR-FILE-002)** (Nhánh: `2312792-ndtuan-upload-minio` & `2312792-ndtuan-delete-minio` - Đã merge)
  - Backend: `MinioFileStorageService` kiểm tra Magic Bytes file, giới hạn $\le 5$MB, định dạng JPG/PNG/WebP/AVIF, upload vào bucket `culinary-blog` và hàm xóa file `DeleteAsync`. Endpoints `POST /api/v1/files/upload` và `DELETE /api/v1/files`.
  - Frontend: Component dùng chung `src/Frontend/components/ui/ImageUploader.tsx`: kéo thả ảnh, preview ảnh, hiển thị link sau upload và nút xóa ảnh có xác nhận.

---

### 2. HƯỚNG DẪN CHI TIẾT TUẦN 3 (ĐÃ HOÀN THÀNH & MERGE MAIN)

#### 2.1. Lê Nhật Tiến (MSSV: 2312770)
- **Chức năng: Xem chi tiết danh mục kèm bài viết (FR-CAT-002)** (Nhánh: `2312770-LNTien-Chi-Tiet-Danh-Muc` - Đã merge)
  - Backend: Tạo DTO `CategoryDetailDto` kèm danh sách `IReadOnlyList<RecipeListItemDto> Recipes`. Query `GetCategoryBySlugQuery` và Handler nạp các bài viết có `Status == RecipeStatus.Published && !IsDeleted`, sắp xếp giảm dần theo ngày xuất bản. Endpoint `GET /api/v1/categories/{slug}`.
  - Frontend: Cập nhật `categoriesApi.getBySlug(slug)`. Tạo trang `app/(public)/categories/[slug]/page.tsx` gồm Breadcrumb, Banner danh mục, Lưới `RecipeCard`, xử lý Empty state và Not Found 404.

#### 2.2. Lâm Văn Đức (MSSV: 2314299)
- **Chức năng: Đăng nhập Email/Mật khẩu + Rate Limiting (FR-AUTH-002)** (Nhánh: `2314299-LVDuc-Dang-Nhap` - Đã merge)
  - Backend: `LoginCommandHandler` kiểm tra tài khoản khóa (`IsLockedOutAsync`), kiểm tra mật khẩu, đếm số lần sai và tự động khóa 15 phút sau 5 lần thất bại. Sinh cặp token mới. Cấu hình ASP.NET Core `AddRateLimiter` 5 req/phút chống Brute-Force tại `API/DependencyInjection.cs`.
  - Frontend: Trang `app/(auth)/login/page.tsx` form đăng nhập, lưu token, cập nhật trạng thái User trên Navbar.

#### 2.3. Nguyễn Viết Toàn (MSSV: 2312777)
- **Chức năng: Admin tạo danh mục mới (FR-CAT-003)** (Nhánh: `2312777-NVToan-Tao-Danh-Muc` - Đã merge)
  - Backend: `CreateCategoryCommandHandler` kiểm tra tên trùng lặp, tự sinh slug chuẩn SEO (bỏ dấu tiếng Việt, nối bằng gạch ngang), lưu CSDL. Endpoint `POST /api/v1/categories` phân quyền `AdminOnly`.
  - Frontend: Trang quản trị `app/(admin)/admin/categories/page.tsx` gồm bảng danh mục, Form nhập tên, mô tả, thứ tự hiển thị và upload ảnh.

#### 2.4. Nguyễn Đình Tuấn (MSSV: 2312792)
- **Chức năng: Quản lý các bước nấu ăn (FR-RCP-010)** (Nhánh: `2312792-NDTuan-Cac-Buoc-Nau` - Đã merge)
  - Backend: Thêm, sửa, xóa bước nấu trong `Features/Recipes/Commands/ManageSteps/*`. Tuân thủ **Quyết định D9**: `Title` bắt buộc, `StepNumber` tùy chọn (`int?`) — nếu client không truyền thì server tự động lấy số lớn nhất + 1. Tự động renumber thứ tự khi xóa bước. Endpoints `POST/PUT/DELETE /api/v1/recipes/{id}/steps`.
  - Frontend: Component `StepListEditor.tsx` hiển thị danh sách các bước có hẹn giờ, hướng dẫn và tích hợp upload ảnh MinIO.

---

### 3. HƯỚNG DẪN CHI TIẾT TUẦN 4 (LAB 4): HOÀN THÀNH 100% TẤT CẢ API ENDPOINTS

> 🎯 **Mục tiêu tối thiểu Lab 4**: Cài đặt hoàn chỉnh 100% tất cả API Endpoints trong SRS Chương 8.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TIẾN TRÌNH THỰC HIỆN LAB 4 TRONG NHÓM (BACKEND FOCUS)                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • TIẾN (nhánh 2312770-LeNhatTien-buoi4):                                               │
│   1. GET /api/v1/recipes/{slug} (Chi tiết món ăn FR-RCP-002)                           │
│   2. POST/PATCH/DELETE /api/v1/recipes/{id}/images (Gallery ảnh FR-RCP-008)            │
│   3. PUT /api/v1/recipes/{id} (Cập nhật món kiểm tra RowVersion FR-RCP-004)            │
│   4. PATCH /api/v1/recipes/{id}/archive & DELETE /recipes/{id} (Archive & Xóa mềm D1)  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • ĐỨC  (nhánh 2314299-LamVanDuc-buoi4):                                                │
│   1. POST /api/v1/auth/logout (Đăng xuất thu hồi token FR-AUTH-005)                    │
│   2. POST /api/v1/auth/refresh (Làm mới token rotation & reuse detection FR-AUTH-004)  │
│   3. POST /api/v1/auth/google (Đăng nhập Google OAuth 2.0 FR-AUTH-003)                 │
│   4. PATCH /api/v1/recipes/{id}/publish & /unpublish (Xuất bản kiểm tra D11)           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • TOÀN (nhánh 2312777-NguyenVietToan-buoi4):                                           │
│   1. PUT /api/v1/categories/{id} (Sửa danh mục giữ slug D12 FR-CAT-004)               │
│   2. DELETE /api/v1/categories/{id} (Xóa mềm danh mục kiểm tra D1 FR-CAT-005)          │
│   3. GET /api/v1/recipes/search (Tìm kiếm toàn văn unaccent tsvector FR-SRCH-001)      │
│   4. Nâng cấp GET /api/v1/recipes (Lọc đa tiêu chí & Sắp xếp D8 FR-SRCH-002..004)      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • TUẤN (nhánh 2312792-NguyenDinhTuan-buoi4):                                           │
│   1. POST/PUT/DELETE /api/v1/recipes/{id}/ingredients (CRUD nguyên liệu D10)           │
│   2. GET /api/v1/auth/me (Xem hồ sơ cá nhân FR-AUTH-006)                               │
│   3. PATCH /api/v1/auth/me (Cập nhật hồ sơ & đổi Avatar MinIO FR-AUTH-007)             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

#### 3.1. Lê Nhật Tiến (MSSV: 2312770) — Recipe Core Endpoints
* **Tên nhánh duy nhất của buổi 4**:
  ```powershell
  git checkout main; git pull origin main
  git checkout -b 2312770-LeNhatTien-buoi4
  ```

##### 1. GET `/api/v1/recipes/{slug}` (FR-RCP-002)
* **Cách làm**: Mở `GetRecipeBySlugQueryHandler.cs`, dùng EF Core `.Include()` nạp Category, Author, Steps, Ingredients, Images, Nutrition. Kiểm tra Draft/Archived ném `ForbiddenException` nếu không phải tác giả/Admin.
* **Tại sao?**: Tránh N+1 query và bảo mật công thức nháp (SRS 3.3).
* **Commit**: `git commit -m "feat/recipe: cai dat endpoint GET recipes slug chi tiet cong thuc"`

##### 2. POST / PATCH / DELETE `/api/v1/recipes/{id}/images` (FR-RCP-008)
* **Cách làm**: Tạo `AddRecipeImageCommand`, `DeleteRecipeImageCommand`, `SetPrimaryImageCommand`. Trong `SetPrimaryImageCommandHandler`: đổi ảnh cũ `IsPrimary = false` rồi mới gán ảnh mới `IsPrimary = true`.
* **Tại sao?**: Đảm bảo mỗi công thức chỉ có duy nhất 1 ảnh đại diện chính.
* **Commit**: `git commit -m "feat/recipe: cai dat cac endpoints quan ly gallery anh recipe images"`

##### 3. PUT `/api/v1/recipes/{id}` (FR-RCP-004) & Archive / Delete (FR-RCP-006 & FR-RCP-007)
* **Cách làm**:
  - Tạo `UpdateRecipeCommand` nhận `RowVersion`. Nếu xảy ra xung đột đồng thời, EF Core bắt `DbUpdateConcurrencyException` trả về HTTP 409 Conflict.
  - Tạo `ArchiveRecipeCommand` đổi status sang `Archived`.
  - Tạo `DeleteRecipeCommand` đánh dấu `IsDeleted = true` theo **Quyết định D1**.
* **Tại sao?**: Bảo vệ tính toàn vẹn dữ liệu khi 2 tác giả cùng sửa, và bảo tồn dữ liệu bằng Soft Delete.
* **Commit**: `git commit -m "feat/recipe: cai dat PUT recipes id kem concurrency va PATCH archive DELETE soft delete"`

---

#### 3.2. Lâm Văn Đức (MSSV: 2314299) — Auth & Publish Endpoints
* **Tên nhánh duy nhất của buổi 4**:
  ```powershell
  git checkout main; git pull origin main
  git checkout -b 2314299-LamVanDuc-buoi4
  ```

##### 1. POST `/api/v1/auth/logout` (FR-AUTH-005)
* **Cách làm**: Băm SHA-256 chuỗi token nhận được, tìm trong bảng `RefreshTokens`, gọi `refreshToken.Revoke()` và `SaveChangesAsync`. Endpoint yêu cầu `RequireAuthorization`.
* **Tại sao?**: Database chỉ lưu token hash. Thu hồi ngay trong DB để vô hiệu hóa token cũ.
* **Commit**: `git commit -m "feat/auth: cai dat endpoint POST auth logout thu hoi refresh token"`

##### 2. POST `/api/v1/auth/refresh` (FR-AUTH-004)
* **Cách làm**: Tạo `RefreshTokenCommand`. Nếu token đã bị `IsRevoked`, phát hiện tấn công tái sử dụng (Reuse Detection) ➜ thu hồi cả token family. Nếu hợp lệ, cấp cặp token mới (Rotation).
* **Tại sao?**: Xoay vòng token giúp bảo mật tối đa và tự động cấp lại token ngầm cho client.
* **Commit**: `git commit -m "feat/auth: cai dat endpoint POST auth refresh token rotation kem reuse detection"`

##### 3. POST `/api/v1/auth/google` (FR-AUTH-003) & PATCH Publish/Unpublish (FR-RCP-005)
* **Cách làm**:
  - Tạo `GoogleLoginCommand`: xác thực Google JWT ID Token qua Google API Client. Nếu chưa có user thì tự động tạo tài khoản mới.
  - Tạo `PublishRecipeCommand`: Kiểm tra điều kiện **Quyết định D11** (`Ingredients.Count >= 1 && Steps.Count >= 1`). Nếu thiếu ném `ValidationException("RECIPE_PUBLISH_INCOMPLETE")`.
* **Tại sao?**: Hỗ trợ đăng nhập tiện lợi một chạm và đảm bảo chất lượng bài viết khi xuất bản.
* **Commit**: `git commit -m "feat/auth: cai dat endpoint POST google login va PATCH publish unpublish kiem tra D11"`

---

#### 3.3. Nguyễn Viết Toàn (MSSV: 2312777) — Category & Search Endpoints
* **Tên nhánh duy nhất của buổi 4**:
  ```powershell
  git checkout main; git pull origin main
  git checkout -b 2312777-NguyenVietToan-buoi4
  ```

##### 1. PUT `/api/v1/categories/{id}` & DELETE `/api/v1/categories/{id}` (FR-CAT-004 & FR-CAT-005)
* **Cách làm**:
  - `UpdateCategoryCommand`: Cho phép sửa Name, Description, ImageUrl nhưng **bảo toàn nguyên vẹn Slug theo Quyết định D12**.
  - `DeleteCategoryCommand`: Kiểm tra nếu danh mục còn recipes chưa xóa thì ném `ConflictException`. Nếu rỗng, đánh dấu `IsDeleted = true` theo **D1**.
* **Tại sao?**: Giữ nguyên URL SEO của Google và chống mồ côi dữ liệu khi xóa danh mục.
* **Commit**: `git commit -m "feat/category: cai dat endpoints PUT va DELETE categories kiem tra D12 va D1"`

##### 2. GET `/api/v1/recipes/search` (FR-SRCH-001) & Nâng cấp GET `/api/v1/recipes` (FR-SRCH-002..004)
* **Cách làm**:
  - Tạo `SearchRecipesQuery`: Dùng PostgreSQL Full-Text Search `to_tsvector('simple', unaccent(title))` để tìm kiếm không dấu tiếng Việt cực nhanh.
  - Cập nhật `GetRecipesQueryHandler`: Bổ sung lọc theo `maxCookTime`, lọc theo danh mục, và sắp xếp linh hoạt theo chuẩn **Quyết định D8** (`sortBy` & `sortOrder`).
* **Tại sao?**: Cho phép người dùng tìm kiếm món ăn chính xác dù gõ có dấu hay không dấu và lọc theo thời gian rảnh.
* **Commit**: `git commit -m "feat/search: cai dat endpoint search unaccent tsvector va nang cap bo loc D8"`

---

#### 3.4. Nguyễn Đình Tuấn (MSSV: 2312792) — Ingredients & Profile Endpoints
* **Tên nhánh duy nhất của buổi 4**:
  ```powershell
  git checkout main; git pull origin main
  git checkout -b 2312792-NguyenDinhTuan-buoi4
  ```

##### 1. POST / PUT / DELETE `/api/v1/recipes/{id}/ingredients` (FR-RCP-009)
* **Cách làm**: Tạo `AddRecipeIngredientCommand`, `UpdateRecipeIngredientCommand`, `DeleteRecipeIngredientCommand`. Tuân thủ **Quyết định D10**: Cho phép `Quantity` và `Unit` nhận giá trị `null` (gia vị nêm nếm).
* **Tại sao?**: Hỗ trợ đúng thực tế nấu ăn Việt Nam và phục vụ điều kiện xuất bản D11.
* **Commit**: `git commit -m "feat/recipe: cai dat day du cac endpoints CRUD nguyen lieu ho tro null unit D10"`

##### 2. GET `/api/v1/auth/me` (FR-AUTH-006) & PATCH `/api/v1/auth/me` (FR-AUTH-007)
* **Cách làm**:
  - `GetProfileQuery`: Lấy UserId từ `ICurrentUser`, truy vấn thông tin user, không trả về hash mật khẩu.
  - `UpdateProfileCommand`: Cho phép cập nhật `DisplayName`, `Bio`, `AvatarUrl` (URL ảnh upload từ MinIO).
* **Tại sao?**: Cung cấp API quản lý hồ sơ cá nhân an toàn cho tác giả.
* **Commit**: `git commit -m "feat/auth: cai dat endpoints GET va PATCH auth me xem va cap nhat ho so"`

---

## 7. TIÊU CHÍ NGHIỆM THU LAB 4 (DEFINITION OF DONE)
- [ ] **100% API Endpoints trong SRS Chương 8 đã được cài đặt và ánh xạ trong API Router**.
- [ ] Truy cập giao diện tài liệu API Scalar `http://localhost:5000/scalar/v1` hiển thị đầy đủ và gửi request thành công.
- [ ] Backend biên dịch đạt 0 lỗi (`dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj`).
- [ ] Tất cả các nhánh buổi 4 của 4 thành viên đã được tạo PR và merge vào `main`.

---

## 8. LỘ TRÌNH CHI TIẾT CÁC TUẦN TIẾP THEO (TUẦN 5 → TUẦN 8)

Sau khi hoàn thành **100% API Endpoints ở Tuần 4 (Backend-First)**, nhóm chuyển sang giai đoạn tích hợp giao diện người dùng, bộ nhớ đệm, tiến trình nền và triển khai Production theo tiến trình chuẩn:

### 📅 TUẦN 5 (LAB 5): TÍCH HỢP GIAO DIỆN FRONTEND & TRẢI NGHIỆM NGƯỜI DÙNG CỐT LÕI
*Mục tiêu*: Kết nối toàn bộ giao diện Next.js 15 với hệ thống API đã hoàn thiện ở Tuần 4.

* **Lê Nhật Tiến**: 
  - Xây dựng trang chi tiết công thức `src/Frontend/app/(public)/recipes/[slug]/page.tsx`.
  - Hiển thị Hero banner, bảng Nutritional Facts (Calories/Carb/Protein/Fat), Checklist nguyên liệu có thể tick chọn khi nấu ăn, và Timeline các bước nấu trực quan kèm ảnh minh họa.
  - Component hiển thị thư viện ảnh `RecipeGalleryEditor.tsx` cho phép xem phóng to và chọn ảnh đại diện.
* **Lâm Văn Đức**:
  - Xây dựng giao diện Đăng nhập và Đăng ký (Modal & Trang chuyên biệt).
  - Tích hợp nút Đăng nhập một chạm Google OAuth 2.0 bằng Google Identity Services SDK.
  - Cấu hình Axios Interceptor trong `src/Frontend/lib/api/client.ts` bắt mã lỗi HTTP 401 để tự động gọi `POST /api/v1/auth/refresh` ngầm (Silent Refresh).
  - Hoàn thiện dropdown Menu tài khoản trên Navbar với nút Đăng xuất an toàn.
* **Nguyễn Viết Toàn**:
  - Xây dựng trang duyệt danh mục `/categories` và trang bài viết theo danh mục `/categories/[slug]`.
  - Xây dựng Modal quản trị danh mục trong trang `/admin/categories` (sửa tên danh mục bảo toàn slug D12, xóa mềm D1).
  - Xây dựng thanh tìm kiếm trực tiếp (Live-search với kỹ thuật debounce 300ms) kết hợp Drawer bộ lọc đa tiêu chí theo **Quyết định D8** (`maxCookTime`, `difficulty`, `sortBy`).
* **Nguyễn Đình Tuấn**:
  - Xây dựng trang Hồ sơ cá nhân `/profile` hiển thị Avatar lớn, Tên hiển thị, Tiểu sử và Vai trò tài khoản.
  - Chức năng chỉnh sửa thông tin cá nhân và upload thay đổi Avatar trực tiếp lên MinIO qua Presigned URL.
  - Hoàn thiện component bảng nhập liệu nguyên liệu `IngredientListEditor.tsx` (nhập liên tục bằng phím Enter, hỗ trợ định lượng null theo D10) phục vụ trang tạo và sửa món ăn.

---

### 📅 TUẦN 6 (LAB 6): REDIS CACHING, QUẢN TRỊ TÁC GIẢ & TỐI ƯU HÓA HIỆU NĂNG
*Mục tiêu*: Tối ưu hóa tốc độ tải trang, hoàn thiện nghiệp vụ Tác giả/Admin và quản lý ảnh nâng cao.

* **Lê Nhật Tiến**:
  - Xây dựng trang Quản trị bài viết cá nhân của Tác giả (`/dashboard/recipes`).
  - Tích hợp tính năng Lưu trữ (Archive) và Xóa mềm (Soft Delete D1).
  - Xử lý giao diện cảnh báo xung đột dữ liệu Optimistic Concurrency Control (bắt lỗi HTTP 409 Conflict khi có hai người cùng chỉnh sửa một công thức).
* **Lâm Văn Đức**:
  - Xây dựng luồng Xuất bản công thức (Publish / Unpublish): Nút toggle xuất bản với kiểm tra điều kiện **Quyết định D11** ($\ge 1$ bước nấu, $\ge 1$ nguyên liệu).
  - Thiết lập Next.js `middleware.ts` bảo vệ các route riêng tư (`/admin/*`, `/dashboard/*`, `/profile`) dựa theo Roles của người dùng.
* **Nguyễn Viết Toàn**:
  - Tích hợp Redis Caching: Hoàn thiện `RedisCacheService.cs` dựa trên `IDistributedCache`, serialize UTF-8 byte[].
  - Áp dụng cache cho danh sách danh mục (TTL 30 phút), cơ chế Cache Invalidation tự động xóa sạch cache khi danh mục bị thay đổi (`RemoveByPrefixAsync`).
  - Đo lường benchmark thời gian phản hồi API đạt $\le 5$ms.
* **Nguyễn Đình Tuấn**:
  - Tối ưu hóa toàn diện MinIO Storage: Sinh Presigned URL an toàn không lộ secret key từ Client.
  - Xử lý Preview ảnh trực tiếp trước khi upload, hiển thị ảnh fallback mặc định khi link ảnh hỏng.
  - Kiểm thử tải các định dạng file ảnh (JPG, PNG, WebP kích thước $\le 5$MB) với thanh tiến trình tải lên (Upload Progress Bar).

---

### 📅 TUẦN 7 (LAB 7): HANGFIRE BACKGROUND JOBS & TƯƠNG TÁC NGƯỜI DÙNG
*Mục tiêu*: Cài đặt các tác vụ nền phi đồng bộ và hoàn thiện tính năng cộng đồng ẩm thực.

* **Lê Nhật Tiến**:
  - Cấu hình Hangfire Dashboard bảo mật tại `/hangfire` với bộ lọc phân quyền Admin Authorization.
  - Hiện thực `FR-JOB-003`: Hangfire Recurring Job tự động quét CSDL và sinh `sitemap.xml` và `robots.txt` chuẩn SEO lúc 2:00 sáng mỗi ngày.
* **Lâm Văn Đức**:
  - Hiện thực `FR-JOB-001`: Hangfire Background Job gửi email chào mừng (Welcome Email) qua SMTP MailKit + Docker MailHog khi có người dùng mới đăng ký.
  - Thiết kế template email HTML đẹp mắt và chuyên nghiệp.
* **Nguyễn Viết Toàn**:
  - Hiện thực `FR-INT-001`: Tính năng Đánh giá sao công thức (1–5 sao) và Bình luận (`POST/GET /api/v1/recipes/{id}/reviews`).
  - Tính điểm đánh giá trung bình và hiển thị dạng sao ⭐ trên thẻ công thức `RecipeCard` ngoài giao diện.
* **Nguyễn Đình Tuấn**:
  - Hiện thực `FR-JOB-002`: Hangfire Background Job tự động nén và resize ảnh đại diện thumbnail $300 \times 300$ bằng thư viện `SixLabors.ImageSharp` để tăng tốc độ tải trang.
  - Lưu thumbnail riêng biệt trên MinIO bucket `recipe-thumbnails`.

---

### 📅 TUẦN 8 (LAB 8): TRIỂN KHAI PRODUCTION DOCKER, KIỂM THỬ E2E & NGHIỆM THU ĐỒ ÁN
*Mục tiêu*: Đóng gói hoàn chỉnh hệ thống triển khai môi trường thực tế và bảo vệ đồ án.

* **Lê Nhật Tiến**:
  - Viết `Dockerfile` đa tầng (multi-stage build) tối ưu dung lượng cho Backend .NET API và Frontend Next.js 15.
  - Cấu hình file `docker-compose.prod.yml` chạy trọn bộ 5 dịch vụ hạ tầng + 2 service ứng dụng cùng Nginx Reverse Proxy và chứng chỉ SSL/TLS.
* **Lâm Văn Đức**:
  - Xây dựng kịch bản kiểm thử tích hợp tự động E2E (End-to-End Testing) bằng Postman Collection / Newman cho trọn vẹn luồng Auth -> Viết bài -> Xuất bản -> Tìm kiếm -> Đánh giá.
* **Nguyễn Viết Toàn**:
  - Tối ưu hóa chỉ mục cơ sở dữ liệu PostgreSQL (`EXPLAIN ANALYZE`), rà soát toàn bộ các lỗi bảo mật RFC 7807, CORS, cấu hình bảo mật Security Headers (CSP, HSTS).
* **Nguyễn Đình Tuấn**:
  - Tối ưu hóa SEO Frontend (OpenGraph meta tags, Twitter card, Schema.org Recipe JSON-LD), đo điểm Google Lighthouse Performance $\ge 90$ điểm.
* **Cả nhóm**:
  - Đóng gói báo cáo tổng kết đồ án môn học hoàn chỉnh.
  - Cập nhật toàn bộ tài liệu kỹ thuật, sơ đồ kiến trúc, tài liệu API.
  - Thiết kế Slide thuyết trình demo chuyên nghiệp phục vụ vấn đáp với Hội đồng Giảng viên.

---

## 💻 HƯỚNG DẪN CHẠY DỰ ÁN NHANH

```powershell
# 1. Khởi động 5 dịch vụ hạ tầng Docker:
docker compose up -d

# 2. Chạy Backend .NET 10 API:
dotnet run --project src\Backend\CulinaryBlog.API
# -> API Docs (Scalar): http://localhost:5000/scalar/v1

# 3. Chạy Frontend Next.js 15:
cd src\Frontend
npm install
npm run dev
# -> Website: http://localhost:3000
```

Tài khoản thử nghiệm có sẵn trong CSDL:
- **Admin**: `admin@culinary.local` / Mật khẩu: `Admin@123`
- **Author**: `bep_truong_an@culinary.local` / Mật khẩu: `Author@123`
