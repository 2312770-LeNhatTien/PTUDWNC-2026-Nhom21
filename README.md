# Culinary Blog

Đồ án môn Phát triển Ứng dụng Web Nâng cao — Nhóm 21

Web chia sẻ công thức nấu ăn chuẩn vị Việt Nam. Backend .NET 10 (Clean Architecture) và Frontend Next.js 15 (App Router) là hai ứng dụng tách rời, giao tiếp qua REST API. Toàn bộ yêu cầu và quyết định kỹ thuật lấy từ [SRS v1.0.0](./docs/SRS_Culinary_Blog_v1.0.0.md) và [DECISIONS.md](./docs/DECISIONS.md).

---

## 🏛️ MA TRẬN PHÂN CÔNG THEO TẦNG KỸ THUẬT VÀ THÀNH VIÊN

| Hạng mục Kỹ thuật | Lê Nhật Tiến (Trưởng nhóm - 2312770) | Lâm Văn Đức (2314299) | Nguyễn Viết Toàn (2312777) | Nguyễn Đình Tuấn (2312792) |
| :--- | :--- | :--- | :--- | :--- |
| **CSDL (PostgreSQL 16)** | • Bảng `Recipes`, `RecipeNutrition` (Owned Entity)<br>• Cấu hình Concurrency `RowVersion` / `xmin`<br>• Viết Seeder 23 danh mục, 100 recipes mẫu | • Cấu hình `AspNetUsers`, `RefreshTokens`<br>• Khóa ngoại User ↔ RefreshToken, Cascade delete<br>• Seeder 2 tài khoản mẫu (Admin, Author) | • Bảng `Categories`, Unique Index Slug<br>• Cấu hình `SearchVector` (`tsvector`)<br>• Kích hoạt PostgreSQL `unaccent` & `GIN Index` | • Bảng `RecipeSteps`, `RecipeIngredients`, `RecipeImages`<br>• CHECK Constraints định lượng số dương<br>• Cấu hình bảng lưu trữ Hangfire |
| **Backend (.NET 10 API)** | • Dựng Clean Architecture + CQRS MediatR Base<br>• Recipe Core Commands/Queries (`FR-RCP-002..008`)<br>• Global Exception Middleware RFC 7807 | • Auth Commands/Queries (`FR-AUTH-001..005`)<br>• Xác thực Google OAuth 2.0 Token<br>• Cấu hình Rate Limiting 5 req/phút | • Category Endpoints (`FR-CAT-001..005`)<br>• Full-Text Search unaccent Query<br>• Tự viết `RedisCacheService` & Cache Invalidation | • Steps & Ingredients CRUD (`FR-RCP-009/010`)<br>• Profile Endpoints (`FR-AUTH-006/007`)<br>• Thuật toán Renumber bước nấu liên tục (D9) |
| **Frontend (Next.js 15)** | • Trang Chi tiết công thức `/recipes/[slug]`<br>• Component `RecipeGalleryEditor.tsx`<br>• Lưới hiển thị `RecipeCard` dùng chung | • Trang Đăng ký `/register` & Đăng nhập `/login`<br>• Tích hợp Google Sign-In SDK<br>• Axios Interceptor Silent Refresh 401 | • Trang Danh mục `/categories` & Chi tiết `/categories/[slug]`<br>• Giao diện Tìm kiếm & Bộ lọc đa tiêu chí<br>• Quản trị danh mục `/admin/categories` | • Component `StepListEditor.tsx` (có hẹn giờ)<br>• Component `IngredientListEditor.tsx`<br>• Trang cá nhân `/profile` & Upload Avatar |
| **DevOps & Integration** | • Thiết lập Docker Compose 5 container<br>• Nginx Reverse Proxy & HTTPS SSL Production<br>• Hangfire Job tự động sinh `sitemap.xml` | • Cấu hình MailHog SMTP (:1025)<br>• Hangfire Job gửi Email chào mừng<br>• Kiểm thử bảo mật Brute-Force Rate Limit | • Khởi tạo Redis Container (:6379)<br>• Đo đạc thời gian Cache Hit / Miss qua Seq<br>• Tối ưu Slow Query Postgres | • Cấu hình MinIO S3 Bucket (:9000)<br>• Hangfire Job nén & resize ảnh thumbnail<br>• Kiểm tra dung lượng & tải Media S3 |

---

## 📌 LỘ TRÌNH TỔNG THỂ 8 TUẦN (CÂN BẰNG KHỐI LƯỢNG — 7 CHỨC NĂNG / THÀNH VIÊN)

| Tuần | Trọng tâm công việc | Lê Nhật Tiến (2312770) | Lâm Văn Đức (2314299) | Nguyễn Viết Toàn (2312777) | Nguyễn Đình Tuấn (2312792) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **Tuần 2** | Khởi tạo hạ tầng, Base & Core | Hạ tầng Docker & Seeder, `FR-RCP-003` (Tạo món Draft) | `FR-AUTH-001` (Đăng ký tài khoản) | `FR-CAT-001` (Danh sách danh mục) | `FR-FILE-001`, `FR-FILE-002` (Upload & Xóa ảnh MinIO) |
| **Tuần 3** | Xác thực, Chi tiết Danh mục & Steps | `FR-CAT-002` (Chi tiết danh mục + recipes) | `FR-AUTH-002` (Đăng nhập Email + Rate Limiter) | `FR-CAT-003` (Admin tạo danh mục mới) | `FR-RCP-010` (Quản lý các bước nấu D9) |
| **Tuần 4** | Core Recipe Detail, Media, Auth & Ingredients | `FR-RCP-002` (Chi tiết công thức), `FR-RCP-008` (Gallery ảnh) | `FR-AUTH-005` (Đăng xuất), `FR-AUTH-004` (Refresh token rotation) | Tự viết `RedisCacheService`, `FR-CAT-004` (Sửa danh mục D12) | `FR-RCP-009` (Quản lý nguyên liệu D10), `FR-AUTH-006` (Xem Profile) |
| **Tuần 5** | Cập nhật, Lưu trữ món, Google OAuth & Avatar | `FR-RCP-004` (Sửa công thức), `FR-RCP-006` (Lưu trữ Archive) | `FR-AUTH-003` (Đăng nhập Google OAuth 2.0) | `FR-CAT-005` (Xóa mềm danh mục D1) | `FR-AUTH-007` (Sửa hồ sơ & đổi Avatar MinIO) |
| **Tuần 6** | Tìm kiếm unaccent, Bộ lọc D8 & Thumbnail Job | `FR-RCP-007` (Xóa mềm công thức D1) | `FR-RCP-005` (Xuất bản công thức - điều kiện D11) | `FR-SRCH-001` (Full-Text Search unaccent), `FR-SRCH-002..004` (Lọc & Sắp xếp D8) | `FR-JOB-002` (Hangfire job resize ảnh thumbnail) |
| **Tuần 7** | Đánh giá sao, Background Jobs (Email & Sitemap) | `FR-JOB-003` (Hangfire sinh Sitemap XML SEO) | `FR-JOB-001` (Hangfire gửi Email chào mừng) | `FR-INT-001` (Đánh giá sao công thức 1-5 sao) | Tối ưu hóa toàn diện Media MinIO & Kiểm thử tải |
| **Tuần 8** | Triển khai Production & Nghiệm thu | Cấu hình Docker Production, Nginx SSL HTTPS, Kiểm thử tích hợp E2E, Tổng kết báo cáo & Slide vấn đáp |

---

## 🛠️ QUY TẮC NHÁNH THEO BUỔI & QUY TRÌNH PULL REQUEST (TỪ TUẦN 4)

> ⚠️ **QUY ƯỚC QUAN TRỌNG TỪ TUẦN 4**:
> 1. **Tạo nhánh theo buổi**: Thành viên **không tạo nhánh theo từng chức năng con nữa**, mà tạo **1 nhánh duy nhất cho cả buổi làm việc** theo chuẩn:
>    👉 `<MSSV>-<HoTenKhongDau>-buoi<SoTuan>` (Ví dụ: `2312770-LeNhatTien-buoi4`, `2314299-LamVanDuc-buoi4`, `2312777-NguyenVietToan-buoi4`, `2312792-NguyenDinhTuan-buoi4`).
> 2. **Commit trên nhánh của mình**: Mỗi khi xong một chức năng, commit ngay trên nhánh buổi đó với tiền tố:
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

### 3. HƯỚNG DẪN CHI TIẾT TUẦN 4: TIẾN TRÌNH PHỐI HỢP NHÓM & GIẢI TRÌNH KỸ THUẬT

#### 🚦 MA TRẬN TIẾN TRÌNH CHUNG TUẦN 4 (AI LÀM TRƯỚC / AI LÀM SAU ĐỂ TRÁNH XUNG ĐỘT)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: CÁC TASK ĐỘC LẬP (LÀM SONG SONG ĐẦU BUỔI - KHÔNG XUNG ĐỘT)               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • TIẾN (nhánh 2312770-LeNhatTien-buoi4): FR-RCP-002 (Xem chi tiết công thức nấu ăn)   │
│ • ĐỨC  (nhánh 2314299-LamVanDuc-buoi4):  FR-AUTH-005 (Đăng xuất & Thu hồi token DB)    │
│ • TOÀN (nhánh 2312777-NguyenVietToan-buoi4): Viết hạ tầng RedisCacheService.cs         │
│ • TUẤN (nhánh 2312792-NguyenDinhTuan-buoi4): FR-RCP-009 (Quản lý nguyên liệu null D10)│
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           ▼ (Tạo PR theo chức năng -> Tiến review & merge)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 2: CÁC TASK PHỤ THUỘC (LÀM SAU KHI GIAI ĐOẠN 1 XONG)                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • TIẾN: FR-RCP-008 (Quản lý Gallery ảnh - gắn sao ảnh chính IsPrimary)                 │
│ • ĐỨC:  FR-AUTH-004 (Làm mới token: Gọi Logout thu hồi cũ -> cấp mới + Interceptor)    │
│         👉 Phụ thuộc: Cần logic thu hồi token ở Task 1 để xử lý Reuse Detection.      │
│ • TOÀN: FR-CAT-004 (Sửa danh mục D12 & Invalidation xóa cache Redis)                  │
│         👉 Phụ thuộc: Cần RedisCacheService ở Task 1 viết xong mới gọi xóa cache được. │
│ • TUẤN: FR-AUTH-006 (Xem thông tin hồ sơ cá nhân /auth/me & UI Profile)                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

#### 3.1. Lê Nhật Tiến (MSSV: 2312770) — Trưởng nhóm
* **Tên nhánh duy nhất của buổi 4**:
  ```powershell
  git checkout main; git pull origin main
  git checkout -b 2312770-LeNhatTien-buoi4
  ```

##### Task 1 (Giai đoạn 1 - Song song): Xem chi tiết công thức nấu ăn (FR-RCP-002)
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Mở `GetRecipeBySlugQueryHandler.cs`, dùng EF Core `.Include()` nạp Category, Author, Steps, Ingredients, Images, Nutrition*:
     - 👉 **Tại sao?**: Nếu không dùng `.Include()`, EF Core sẽ bị lỗi N+1 Query hoặc dữ liệu liên kết trả về `null`, khiến trang chi tiết công thức bị thiếu nguyên liệu và các bước.
  2. *Kiểm tra trạng thái Draft/Archived, nếu không phải tác giả (`AuthorId != currentUser.UserId`) và không phải Admin thì ném `ForbiddenException`*:
     - 👉 **Tại sao?**: Bảo vệ tính bảo mật và quyền riêng tư (SRS 3.3). Công thức đang viết nháp chưa được xuất bản thì người ngoài không được phép xem trộm.
  3. *Frontend: Tạo trang `src/Frontend/app/(public)/recipes/[slug]/page.tsx`*:
     - 👉 **Tại sao?**: Hiển thị bảng dinh dưỡng để người đọc tính calo; checklist nguyên liệu có thể tick chọn khi chuẩn bị nấu; timeline các bước kèm ảnh trực quan.
* **Thông điệp Commit**:
  ```powershell
  git add .
  git commit -m "feat/recipe: hien thuc FR-RCP-002 xem chi tiet cong thuc kem dinh duong va nguyen lieu"
  ```

##### Task 2 (Giai đoạn 2 - Sau Task 1): Quản lý gallery ảnh công thức (FR-RCP-008)
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Tạo các Command `AddRecipeImageCommand`, `DeleteRecipeImageCommand`, `SetPrimaryImageCommand` trong `Features/Recipes/Commands/ManageImages/`*:
  2. *Trong `SetPrimaryImageCommandHandler`: Tìm ảnh cũ có `IsPrimary == true` đổi thành `false`, rồi mới gán ảnh mới được chọn thành `true`*:
     - 👉 **Tại sao?**: Mỗi món ăn chỉ được có **duy nhất 1 ảnh đại diện chính** hiển thị ngoài trang chủ và thẻ `RecipeCard`. Nếu không bỏ cờ ảnh cũ thì database sẽ bị mâu thuẫn dữ liệu.
  3. *Frontend: Tạo component `RecipeGalleryEditor.tsx` dạng thumbnail grid kèm nút gắn sao ⭐*:
     - 👉 **Tại sao?**: Giúp tác giả nhìn thấy trực quan tất cả ảnh đã tải lên và dễ dàng chọn ảnh đẹp nhất làm ảnh bìa.
* **Thông điệp Commit**:
  ```powershell
  git add .
  git commit -m "feat/recipe: hien thuc FR-RCP-008 quan ly gallery anh va chon anh dai dien chinh"
  git push -u origin 2312770-LeNhatTien-buoi4
  ```

---

#### 3.2. Lâm Văn Đức (MSSV: 2314299) — Security & Auth
* **Tên nhánh duy nhất của buổi 4**:
  ```powershell
  git checkout main; git pull origin main
  git checkout -b 2314299-LamVanDuc-buoi4
  ```

##### Task 1 (Giai đoạn 1 - Song song): Đăng xuất & Thu hồi phiên làm việc (FR-AUTH-005)
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Băm SHA-256 chuỗi refresh token nhận từ Client trước khi tìm kiếm trong bảng `RefreshTokens`*:
     - 👉 **Tại sao?**: Database chỉ lưu `TokenHash` chứ không bao giờ lưu token gốc (SRS 7.8). Bắt buộc phải hash trước thì mới so khớp được với CSDL.
  2. *Gọi `refreshToken.Revoke()` và `SaveChangesAsync(ct)`*:
     - 👉 **Tại sao?**: Khi người dùng đăng xuất, refresh token phải bị hủy ngay lập tức trong database để nếu kẻ xấu nhặt được token cũng không thể dùng lại được.
  3. *Frontend: Xóa `accessToken` trong localStorage/Cookie và cập nhật Navbar*:
     - 👉 **Tại sao?**: Để giao diện lập tức chuyển về trạng thái Guest, không lưu vết phiên đăng nhập cũ trên trình duyệt.
* **Thông điệp Commit**:
  ```powershell
  git add .
  git commit -m "feat/auth: hien thuc FR-AUTH-005 dang xuat va thu hoi refresh token trong csdl"
  ```

##### Task 2 (Giai đoạn 2 - Phụ thuộc Task 1): Refresh Token Rotation & Silent Refresh (FR-AUTH-004)
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Kiểm tra: Nếu token gửi lên đã có `IsRevoked == true` thì lập tức thu hồi toàn bộ token family của user đó và ném lỗi*:
     - 👉 **Tại sao?**: Đây là kỹ thuật **Reuse Detection (Phát hiện tấn công)**. Một token đã thu hồi mà lại được gửi lên chứng tỏ token đó đã bị kẻ gian đánh cắp. Việc thu hồi toàn bộ phiên buộc user phải đăng nhập lại để bảo vệ tài khoản.
  2. *Nếu hợp lệ: Đánh dấu thu hồi token cũ `Revoke(newTokenHash)`, cấp cặp token mới và lưu vào DB*:
     - 👉 **Tại sao?**: Đây là nguyên tắc **Rotation (Xoay vòng token)**: Mỗi refresh token chỉ được dùng đúng 1 lần. Cấp mới liên tục giúp hạn chế tối đa nguy cơ lộ token.
  3. *Frontend: Viết Axios Interceptor trong `client.ts` bắt mã 401*:
     - 👉 **Tại sao?**: Khi access token 15 phút hết hạn, interceptor sẽ tự động gọi refresh token ngầm và gửi lại request cũ giúp người dùng không bị văng ra trang login khi đang xem dở công thức.
* **Thông điệp Commit**:
  ```powershell
  git add .
  git commit -m "feat/auth: hien thuc FR-AUTH-004 refresh token rotation kem reuse detection"
  git push -u origin 2314299-LamVanDuc-buoi4
  ```
  *(Sau đó tạo Pull Request trên GitHub ứng với từng chức năng vào `main` để Tiến review & gộp code)*.

---

#### 3.3. Nguyễn Viết Toàn (MSSV: 2312777) — Cache & Category
* **Tên nhánh duy nhất của buổi 4**:
  ```powershell
  git checkout main; git pull origin main
  git checkout -b 2312777-NguyenVietToan-buoi4
  ```

##### Task 1 (Giai đoạn 1 - Song song): Tự tay hiện thực `RedisCacheService.cs`
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Mở file `src/Backend/CulinaryBlog.Infrastructure/Caching/RedisCacheService.cs`*:
  2. *Trong `SetAsync`: Dùng `JsonSerializer.SerializeToUtf8Bytes(value)` thay vì `Serialize` chuỗi string thông thường*:
     - 👉 **Tại sao?**: Lưu trực tiếp dạng mảng `byte[]` UTF-8 giúp tối ưu bộ nhớ đệm Redis và tiết kiệm CPU khi không phải encode/decode chuỗi trung gian qua lại.
  3. *Cấu hình `DistributedCacheEntryOptions` với `AbsoluteExpirationRelativeToNow = ttl` (30 phút)*:
     - 👉 **Tại sao?**: Tránh rác bộ nhớ Redis. Dữ liệu sau 30 phút tự động hết hạn và giải phóng RAM cho server.
  4. *Hiện thực hàm `RemoveByPrefixAsync("categories:")`*:
     - 👉 **Tại sao?**: `IDistributedCache` mặc định không hỗ trợ xóa theo ký tự đại diện (wildcard). Cần hàm này để xóa sạch các cache danh mục liên quan khi Admin thay đổi dữ liệu.
* **Thông điệp Commit**:
  ```powershell
  git add .
  git commit -m "feat/cache: tu tay hien thuc RedisCacheService voi IDistributedCache va TTL 30 phut"
  ```

##### Task 2 (Giai đoạn 2 - Phụ thuộc Task 1): Admin cập nhật danh mục & Invalidation (FR-CAT-004)
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Viết `UpdateCategoryCommandHandler.cs`: Cập nhật Tên, Mô tả, Ảnh, Thứ tự nhưng **GIỮ NGUYÊN SLUG** ban đầu*:
     - 👉 **Tại sao?**: **Tuân thủ tuyệt đối Quyết định D12**. Nếu đổi tên danh mục mà đổi luôn Slug thì toàn bộ các liên kết URL cũ đã được Google lập chỉ mục SEO hoặc người dùng lưu bookmark sẽ bị lỗi 404 Not Found.
  2. *Sau khi lưu DB thành công, gọi `await _cacheService.RemoveAsync("categories:all", ct)`*:
     - 👉 **Tại sao?**: Kỹ thuật **Cache Invalidation**. Nếu không xóa cache cũ, người dùng truy cập trang chủ vẫn sẽ thấy dữ liệu cũ trong suốt 30 phút TTL tiếp theo.
  3. *Frontend: Tạo Modal Sửa trong trang quản trị `/admin/categories`*:
     - 👉 **Tại sao?**: Giúp Admin sửa nhanh thông tin danh mục ngay trên giao diện bảng mà không phải chuyển trang.
* **Thông điệp Commit**:
  ```powershell
  git add .
  git commit -m "feat/category: hien thuc FR-CAT-004 cap nhat danh muc bao toan slug D12 va xoa cache"
  git push -u origin 2312777-NguyenVietToan-buoi4
  ```
  *(Sau đó tạo Pull Request trên GitHub ứng với từng chức năng vào `main` để Tiến review & gộp code)*.

---

#### 3.4. Nguyễn Đình Tuấn (MSSV: 2312792) — Storage & Recipe Details
* **Tên nhánh duy nhất của buổi 4**:
  ```powershell
  git checkout main; git pull origin main
  git checkout -b 2312792-NguyenDinhTuan-buoi4
  ```

##### Task 1 (Giai đoạn 1 - Song song): Quản lý nguyên liệu công thức (FR-RCP-009)
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Tạo Commands trong `ManageIngredients/*`: Khai báo `decimal? Quantity` và `string? Unit` (cho phép `null`)*:
     - 👉 **Tại sao?**: **Tuân thủ Quyết định D10**. Trong ẩm thực Việt, rất nhiều gia vị nêm nếm không thể cân đo chính xác bằng số (ví dụ: "tiêu xay: một chút", "nước mắm: vừa ăn"). Nếu bắt buộc nhập số sẽ khiến người dùng không thể viết công thức chuẩn vị.
  2. *Thêm Validator kiểm tra tên nguyên liệu không được để trống và độ dài $\le 100$ ký tự*:
     - 👉 **Tại sao?**: Tránh rác dữ liệu và chống tràn bố cục bảng nguyên liệu ngoài giao diện.
  3. *Frontend: Tạo component `IngredientListEditor.tsx` dạng bảng nhập liên tiếp*:
     - 👉 **Tại sao?**: Tác giả có thể nhập một loạt 10–15 nguyên liệu nhanh chóng bằng phím Enter mà không bị load lại trang.
* **Thông điệp Commit**:
  ```powershell
  git add .
  git commit -m "feat/recipe: hien thuc FR-RCP-009 quan ly nguyen lieu cong thuc ho tro gia vi null unit D10"
  ```

##### Task 2 (Giai đoạn 2 - Sau Task 1): Xem thông tin hồ sơ cá nhân (FR-AUTH-006)
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Backend: Viết `GetProfileQueryHandler.cs`, lấy UserId từ `ICurrentUser`*:
     - 👉 **Tại sao?**: Lấy UserId trực tiếp từ Token đã xác thực của người dùng đang gửi request, tuyệt đối không nhận `userId` từ query string để chống lộ thông tin riêng tư của người khác.
  2. *Chỉ chọn các trường an toàn `{ id, email, displayName, bio, avatarUrl, roles }`, không map `PasswordHash`*:
     - 👉 **Tại sao?**: Nguyên tắc bảo mật thông tin tài khoản (NFR-SEC). Không bao giờ trả chuỗi băm mật khẩu về client dưới mọi hình thức.
  3. *Frontend: Tạo trang `/profile` hiển thị Avatar lớn, Tên, Tiểu sử và Roles*:
     - 👉 **Tại sao?**: Cung cấp giao diện trung tâm để người dùng kiểm tra thông tin tài khoản trước khi thực hiện đổi avatar và bio ở Tuần 5.
* **Thông điệp Commit**:
  ```powershell
  git add .
  git commit -m "feat/auth: hien thuc FR-AUTH-006 xem thong tin ho so ca nhan tai auth me va UI profile"
  git push -u origin 2312792-NguyenDinhTuan-buoi4
  ```
  *(Sau đó tạo Pull Request trên GitHub ứng với từng chức năng vào `main` để Tiến review & gộp code)*.

---

### 4. KẾ HOẠCH TỔNG QUAN CÁC TUẦN TIẾP THEO (TUẦN 5 → TUẦN 8)

* **Tuần 5 (Cập nhật, Lưu trữ món, Google OAuth & Avatar)**:
  - **Tiến**: `FR-RCP-004` (Sửa công thức kiểm tra Concurrency RowVersion) & `FR-RCP-006` (Lưu trữ công thức Archive).
  - **Đức**: `FR-AUTH-003` (Đăng nhập Google OAuth 2.0).
  - **Toàn**: `FR-CAT-005` (Admin xóa mềm danh mục - kiểm tra không có recipes mới cho xóa theo D1).
  - **Tuấn**: `FR-AUTH-007` (Cập nhật hồ sơ cá nhân, đổi DisplayName, Bio và upload Avatar MinIO).

* **Tuần 6 (Tìm kiếm unaccent, Bộ lọc D8 & Thumbnail Job)**:
  - **Tiến**: `FR-RCP-007` (Xóa mềm công thức theo D1 Soft Delete).
  - **Đức**: `FR-RCP-005` (Xuất bản công thức - tuân thủ điều kiện D11: $\ge 1$ bước và $\ge 1$ nguyên liệu).
  - **Toàn**: `FR-SRCH-001` (Full-Text Search PostgreSQL `tsvector` + `unaccent`) & `FR-SRCH-002..004` (Lọc đa tiêu chí, sắp xếp dual-syntax D8).
  - **Tuấn**: `FR-JOB-002` (Hangfire background job nén & resize ảnh thumbnail $300 \times 300$).

* **Tuần 7 (Đánh giá sao, Background Jobs Email & Sitemap)**:
  - **Tiến**: `FR-JOB-003` (Hangfire recurring job tự động sinh `sitemap.xml` SEO lúc 2h sáng).
  - **Đức**: `FR-JOB-001` (Hangfire gửi Email chào mừng thành viên mới qua MailKit & MailHog).
  - **Toàn**: `FR-INT-001` (Đánh giá sao công thức 1-5 sao, tính rating trung bình).
  - **Tuấn**: Tối ưu hóa toàn diện Media MinIO, xử lý ảnh lỗi và kiểm thử tải S3.

* **Tuần 8 (Triển khai Production & Nghiệm thu đồ án)**:
  - Cấu hình môi trường Production hoàn chỉnh (Docker Compose + Nginx Reverse Proxy, cấu hình chứng chỉ HTTPS SSL).
  - Kiểm thử tích hợp toàn diện người dùng E2E (End-to-End Testing).
  - Đóng gói tài liệu báo cáo đồ án, thiết kế Slide trình chiếu vấn đáp với Hội đồng giảng viên.

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
