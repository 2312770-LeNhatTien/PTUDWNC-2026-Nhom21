# Hướng Dẫn Chi Tiết & Phân Công Nhiệm Vụ
### Thành viên: Nguyễn Viết Toàn (MSSV: 2312777)
### Vai trò: Category, Cache & Search Engine

---

## 1. Thông Tin Chung
- **Họ và tên**: Nguyễn Viết Toàn
- **MSSV**: 2312777
- **Email**: 2312777@dlu.edu.vn
- **GitHub**: [https://github.com/2312777-rgb](https://github.com/2312777-rgb)
- **Tổng số chức năng phụ trách**: **7 chức năng**

---

## 2. Danh Sách 7 Chức Năng Phụ Trách

| STT | Mã FR | Tên chức năng | File Backend cần làm | File Frontend cần làm |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **FR-CAT-001** | Xem danh sách danh mục ẩm thực | `Features/Categories/Queries/GetCategories/*` | Trang `/categories` & Menu Navbar |
| 2 | **FR-CAT-003** | Admin tạo danh mục mới | `Features/Categories/Commands/CreateCategory/*` | Trang Admin `/admin/categories` |
| 3 | **Kỹ thuật Cache** | Tự tay viết `RedisCacheService` | `Infrastructure/Caching/RedisCacheService.cs` | Đo lường thời gian phản hồi API qua Seq |
| 4 | **FR-CAT-004** | Admin cập nhật danh mục (D12) | `Features/Categories/Commands/UpdateCategory/*` | Form sửa danh mục trong Admin |
| 5 | **FR-CAT-005** | Admin xóa mềm danh mục (D1) | `Features/Categories/Commands/DeleteCategory/*` | Nút xóa có modal cảnh báo trong Admin |
| 6 | **FR-SRCH-001** | Tìm kiếm toàn văn (PostgreSQL unaccent) | `Features/Recipes/Queries/SearchRecipes/*` | Trang kết quả tìm kiếm `/recipes?q=...` |
| 7 | **FR-SRCH-002..004**<br>**FR-INT-001** | Lọc đa tiêu chí & Đánh giá sao | `Features/Recipes/Queries/GetRecipes/*`<br>`Features/Recipes/Commands/RateRecipe/*` | Sidebar bộ lọc `/recipes` & Component Rating |

---

## 3. Lộ Trình Thực Hiện (Tuần 2 → Tuần 8)

```
Tuần 2 (Đã hoàn thành & merge main):
  ✅ FR-CAT-001 — Xem danh sách danh mục (Truy vấn EF Core theo OrderIndex & đếm recipe)

Tuần 3 (Đã hoàn thành & merge main):
  ✅ FR-CAT-003 — Admin tạo danh mục mới (Sinh slug chuẩn SEO, RequireAuthorization AdminOnly & UI Admin)

Tuần 4 (Lab 4 - Hoàn thành 100% Backend API Endpoints):
  🔲 FR-CAT-004 — PUT /categories/{id} (Cập nhật danh mục bảo toàn nguyên vẹn Slug chuẩn SEO theo D12)
  🔲 FR-CAT-005 — DELETE /categories/{id} (Xóa mềm danh mục D1, kiểm tra không còn recipes mới cho xóa)
  🔲 FR-SRCH-001 — GET /recipes/search (Tìm kiếm toàn văn PostgreSQL unaccent tsvector tiếng Việt)
  🔲 FR-SRCH-002..004 — Nâng cấp GET /recipes (Bộ lọc maxCookTime, difficulty, category & sắp xếp dual-syntax D8)

Tuần 5 (Lab 5 - Frontend Integration & Category / Search UI):
  🔲 Giao diện Khám phá Danh mục /categories và trang món theo danh mục /categories/[slug]
  🔲 Modal quản trị danh mục trong /admin/categories (thêm/sửa danh mục bảo toàn slug D12, xóa mềm D1)
  🔲 Thanh tìm kiếm Live-search debounce 300ms kết hợp Drawer bộ lọc đa tiêu chí chuẩn D8

Tuần 6 (Lab 6 - Tích hợp Redis Caching & Tối ưu hiệu năng):
  🔲 Hoàn thiện RedisCacheService.cs (IDistributedCache, serialize UTF-8 byte[], TTL 30 phút)
  🔲 Tích hợp Cache Invalidation tự động xóa cache khi Admin sửa/xóa danh mục (RemoveByPrefixAsync)
  🔲 Đo lường benchmark thời gian phản hồi API danh mục đạt <= 5ms

Tuần 7 (Lab 7 - Đánh giá sao & Bình luận):
  🔲 FR-INT-001 — Đánh giá sao công thức (Rating 1-5 sao, tính điểm trung bình và số lượt đánh giá)
  🔲 Component gắn sao ⭐ tương tác tại trang chi tiết món và hiển thị rating trên RecipeCard

Tuần 8 (Lab 8 - Tối ưu hóa Database & Nghiệm thu):
  🔲 Tối ưu hóa chỉ mục CSDL PostgreSQL (EXPLAIN ANALYZE), rà soát chuẩn RFC 7807 ProblemDetails
  🔲 Kiểm tra cấu hình bảo mật Security Headers (CORS, CSP, HSTS) và cùng nhóm chuẩn bị nghiệm thu
```

---

## 4. HƯỚNG DẪN CHI TIẾT TUẦN 2 (ĐÃ HOÀN THÀNH)

> ⚠️ **Quy ước nhánh**: Mỗi chức năng làm trên **một nhánh riêng** tự tạo từ `main`, cú pháp: `2312777-NVToan-<Ten-Chuc-Nang>`. **Không tự merge vào `main`** — báo trưởng nhóm Tiến để Tiến review và merge giúp.

---

### Chức năng: Xem danh sách danh mục (FR-CAT-001)

#### Bước 1: Tạo nhánh mới từ `main`
```powershell
git checkout main
git pull origin main
git checkout -b 2312777-NVToan-Danh-Sach-Danh-Muc
```

#### Bước 2: Hiện thực Backend & Hoàn thiện Frontend
1. Backend: Xem file `src/Backend/CulinaryBlog.Application/Features/Categories/Queries/GetCategories/GetCategoriesQueryHandler.cs`. Bạn hiện thực truy vấn EF Core lấy danh sách danh mục theo `OrderIndex`, đếm số lượng công thức Published và ánh xạ sang `CategoryDto`. Đăng ký endpoint GET `/api/v1/categories` trong `CategoriesEndpoints.cs`.
2. Frontend: Hiện thực hàm `categoriesApi.getAll()` trong `src/Frontend/lib/api/categories.ts` để gọi API Backend. Tạo trang xem toàn bộ danh mục tại `src/Frontend/app/(public)/categories/page.tsx` hiển thị lưới các danh mục dạng card với hình ảnh đại diện, mô tả và số lượng công thức thực tế.

#### Bước 3: Kiểm tra và đẩy nhánh lên GitHub
```powershell
dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
cd src\Frontend; npm run lint; cd ..\..

git add .
git commit -m "category: hien thuc FR-CAT-001 danh sach danh muc"
git push -u origin 2312777-NVToan-Danh-Sach-Danh-Muc
```

---

## 5. HƯỚNG DẪN CHI TIẾT TUẦN 3 (ĐÃ HOÀN THÀNH)

> ⚠️ **Quy ước nhánh**: Mỗi chức năng làm trên **một nhánh riêng** tự tạo từ `main`, cú pháp: `2312777-NVToan-<Ten-Chuc-Nang>`. Sau khi code xong và test build không lỗi, gửi PR để trưởng nhóm Tiến review và merge.

---

### Chức năng: Admin tạo danh mục mới (FR-CAT-003)

#### Bước 1: Tạo nhánh mới từ `main`
```powershell
git checkout main
git pull origin main
git checkout -b 2312777-NVToan-Tao-Danh-Muc
```

#### Bước 2: Hiện thực Backend & Frontend
1. Backend: Mở file `src/Backend/CulinaryBlog.Application/Features/Categories/Commands/CreateCategory/CreateCategoryCommandHandler.cs`.
   - Kiểm tra tên danh mục không trùng lặp: `await _categoryRepository.Query().AnyAsync(c => c.Name == request.Name)`.
   - Tạo danh mục: `var category = Category.Create(request.Name, request.Description, request.ImageUrl, request.OrderIndex)`.
   - Lưu qua `_categoryRepository.AddAsync(category, ct)` và `SaveChangesAsync`.
   - Trả về `CategoryDto`.
2. Frontend: Tạo trang quản trị danh mục `src/Frontend/app/(admin)/categories/page.tsx` có bảng danh mục hiện có và form nhập tên danh mục, mô tả, ảnh đại diện và thứ tự hiển thị `OrderIndex`.

#### Bước 3: Kiểm tra và đẩy nhánh lên GitHub
```powershell
dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
cd src\Frontend; npx tsc --noEmit; cd ..\..

git add .
git commit -m "category: hien thuc FR-CAT-003 tao danh muc moi"
git push -u origin 2312777-NVToan-Tao-Danh-Muc
```

---

## 6. HƯỚNG DẪN CHI TIẾT TUẦN 4: NHÁNH BUỔI 4 & GIẢI TRÌNH KỸ THUẬT

> ⚠️ **QUY ƯỚC NHÁNH MỚI TỪ TUẦN 4**:
> - Tạo **1 nhánh duy nhất cho cả buổi 4**: `2312777-NguyenVietToan-buoi4`.
> - Mọi chức năng đều commit trực tiếp trên nhánh này với tiền tố `feat/`.
> - Khi hoàn thành từng tính năng, tạo Pull Request vào `main` để trưởng nhóm Tiến review và gộp code.

```powershell
# Tạo nhánh duy nhất cho Buổi 4:
git checkout main
git pull origin main
git checkout -b 2312777-NguyenVietToan-buoi4
```

---

### Task 1 (Giai đoạn 1 - Song song): Cập nhật & Xóa mềm danh mục (FR-CAT-004 & FR-CAT-005)
* **Tiến trình trong nhóm**: Thực hiện ở nửa đầu buổi, làm độc lập song song với các thành viên khác.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Hiện thực `UpdateCategoryCommand` và `UpdateCategoryCommandHandler` trong `Features/Categories/Commands/UpdateCategory/`*:
     - Cho phép cập nhật `Name`, `Description`, `ImageUrl`, `DisplayOrder`.
     - 👉 **Tại sao?**: **Tuân thủ tuyệt đối Quyết định D12 (Bảo toàn Slug)**. Khi đổi tên danh mục, hệ thống giữ nguyên slug cũ để không làm gãy các liên kết URL mà người dùng đã bookmark hoặc Google đã đánh chỉ mục SEO.
  2. *Hiện thực `DeleteCategoryCommand` và `DeleteCategoryCommandHandler` trong `Features/Categories/Commands/DeleteCategory/`*:
     - Kiểm tra nếu danh mục còn công thức liên kết (`await _context.Recipes.AnyAsync(r => r.CategoryId == id && !r.IsDeleted)`) thì ném `ConflictException("CATEGORY_NOT_EMPTY")`.
     - Nếu không còn công thức, đánh dấu `category.IsDeleted = true` theo **Quyết định D1 (Soft Delete)**.
     - 👉 **Tại sao?**: Ngăn chặn mồ côi dữ liệu bài viết và bảo toàn dữ liệu bằng kỹ thuật xóa mềm.
  3. *Đăng ký route `PUT /api/v1/categories/{id}` và `DELETE /api/v1/categories/{id}` trong `CategoriesEndpoints.cs` (`RequireAuthorization("AdminOnly")`)*:
     - 👉 **Tại sao?**: Phân quyền nghiêm ngặt, chỉ có quản trị viên hệ thống mới có quyền sửa đổi và xóa danh mục.
  4. *Kiểm tra biên dịch & Commit trên nhánh buổi 4*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     git add .
     git commit -m "feat/FR-CAT-004-005: cai dat endpoints PUT va DELETE categories kiem tra D12 va D1"
     ```

---

### Task 2 (Giai đoạn 2 - Sau Task 1): Tìm kiếm unaccent & Nâng cấp bộ lọc D8 (FR-SRCH-001..004)
* **Tiến trình trong nhóm**: Thực hiện ở nửa sau buổi, hoàn thiện module tìm kiếm và lọc danh sách món ăn.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Hiện thực `SearchRecipesQuery` và `SearchRecipesQueryHandler` trong `Features/Recipes/Queries/SearchRecipes/`*:
     - Sử dụng hàm PostgreSQL `to_tsvector('simple', unaccent(Title))` và `plainto_tsquery('simple', unaccent(@query))` kết hợp extension `unaccent`.
     - 👉 **Tại sao?**: Cho phép người dùng tìm kiếm món ăn bằng tiếng Việt không dấu (ví dụ: gõ "pho bo" vẫn tìm ra "Phở bò"), tốc độ truy vấn cực nhanh nhờ chỉ mục Full-Text Search.
  2. *Nâng cấp `GetRecipesQueryHandler.cs` theo chuẩn **Quyết định D8 (Dual-syntax sorting & filtering)**:
     - Bổ sung bộ lọc: `categoryId`, `maxCookTime` (thời gian nấu tối đa), `difficulty`.
     - Hỗ trợ sắp xếp đa cú pháp: `sortBy=createdAt&sortOrder=desc` hoặc `sort=-createdAt`.
     - 👉 **Tại sao?**: Tuân thủ chuẩn D8 giúp linh hoạt cho Frontend gọi API và đáp ứng các kịch bản lọc món ăn theo thời gian rảnh rỗi của người nấu.
  3. *Đăng ký route `GET /api/v1/recipes/search` trong `RecipesEndpoints.cs`*:
  4. *Kiểm tra biên dịch toàn hệ thống, Commit & Đẩy nhánh lên GitHub*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     git add .
     git commit -m "feat/FR-SRCH-001-004: cai dat endpoint search unaccent tsvector va nang cap bo loc D8"
     git push -u origin 2312777-NguyenVietToan-buoi4
     ```
  5. *Tạo Pull Request trên GitHub ứng với từng chức năng vào `main` để trưởng nhóm Tiến review & gộp code*.

---

## 7. Tiêu Chí Nghiệm Thu (Definition of Done)
- [ ] 100% các API endpoints được phân công đã được đăng ký và hoạt động chính xác trên Scalar (`http://localhost:5000/scalar/v1`):
  - `PUT /api/v1/categories/{id}`
  - `DELETE /api/v1/categories/{id}`
  - `GET /api/v1/recipes/search`
  - `GET /api/v1/recipes` (phiên bản nâng cấp bộ lọc và sắp xếp D8)
- [ ] Backend biên dịch đạt 0 lỗi (`dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj`).
- [ ] Endpoint `PUT /api/v1/categories/{id}` bảo toàn slug D12 thành công.
- [ ] Endpoint `DELETE /api/v1/categories/{id}` chặn xóa khi danh mục còn bài viết, và áp dụng xóa mềm D1 khi danh mục rỗng.
- [ ] Tìm kiếm không dấu tiếng Việt hoạt động chính xác với unaccent tsvector.
- [ ] Nhánh buổi 4 `2312777-NguyenVietToan-buoi4` đã được đẩy lên GitHub và tạo PR gộp vào `main`.

---

## 8. LỘ TRÌNH CHI TIẾT CÁC TUẦN TIẾP THEO (TUẦN 5 → TUẦN 8)

### 📅 Tuần 5 (Lab 5): Giao diện Khám phá Danh mục, Tìm kiếm Live & Bộ lọc D8
* **Nhánh làm việc**: `2312777-NguyenVietToan-buoi5`
* **Nhiệm vụ trọng tâm**:
  1. Xây dựng giao diện Khám phá Danh mục ẩm thực trên Next.js 15:
     - Trang `/categories` hiển thị dạng lưới các danh mục kèm số lượng món ăn và ảnh minh họa.
     - Trang chi tiết danh mục `/categories/[slug]` hiển thị danh sách bài viết thuộc danh mục đó.
  2. Xây dựng Modal quản trị danh mục trong trang `/admin/categories`:
     - Modal thêm/sửa danh mục nhanh chóng ngay trên giao diện bảng quản trị.
     - Đảm bảo khi Admin sửa tên, hệ thống không tự động thay đổi Slug đã sinh (tuân thủ **Quyết định D12**).
  3. Xây dựng giao diện Thanh tìm kiếm và Bộ lọc nâng cao:
     - Ô tìm kiếm live-search có debounce 300ms gọi endpoint `GET /recipes/search`.
     - Drawer/Dropdown lọc theo thời gian nấu tối đa (`maxCookTime`), mức độ khó và tùy chọn sắp xếp đa tiêu chí theo **Quyết định D8**.

### ✅ Ghi chú triển khai Tuần 5 (đã cập nhật giao diện)

**Các file đã chạm vào**
- `src/Frontend/app/(public)/categories/page.tsx` và `categories/[slug]/page.tsx`: đã có sẵn và tiếp tục dùng API danh mục để hiển thị lưới danh mục, số lượng công thức và danh sách món theo slug.
- `src/Frontend/app/(admin)/admin/categories/page.tsx`: bổ sung nút **Sửa/Xóa**, modal sửa và thông báo kết quả.
- `src/Frontend/lib/api/categories.ts`: thêm `update()` và `remove()` để gọi `PUT/DELETE /categories/{id}`.
- `src/Frontend/app/(public)/recipes/page.tsx` cùng `components/recipes/RecipeSearchAndFilters.tsx`: giao diện tìm kiếm live-search và bộ lọc.

**Luồng hoạt động để thuyết trình**
1. Người dùng gõ vào ô tìm kiếm. Giao diện đợi **300 ms** sau lần gõ cuối rồi gọi `GET /recipes/search?q=...`; vì backend dùng `unaccent`, "pho bo" vẫn tìm được "phở bò".
2. Khi không nhập từ khóa, danh sách gọi `GET /recipes` với `categoryId`, `difficulty`, `maxCookTime`, `sortBy`, `sortOrder`. Đây là đúng quy ước **D8**.
3. Admin bấm **Sửa** để mở modal. Request chỉ gửi `name`, `description`, `imageUrl`, `orderIndex`, tuyệt đối không gửi `slug`; backend vì vậy giữ URL cũ theo **D12**.
4. Admin bấm **Xóa** phải xác nhận trước. API thực hiện soft delete theo **D1**. Nếu danh mục vẫn có công thức, backend trả `409` và giao diện giải thích không thể xóa.

**Lưu ý kiểm thử**: cần đăng nhập bằng tài khoản Admin trước khi thử sửa/xóa; các endpoint đó yêu cầu policy `AdminOnly`. Frontend đã có API base `/api/v1`, vì vậy các lời gọi recipe được sửa về `/recipes/...` để tránh bị lặp `/api/v1/api/v1`.

### 📅 Tuần 6 (Lab 6): Tích hợp Redis Caching & Tối ưu thời gian phản hồi
* **Nhánh làm việc**: `2312777-NguyenVietToan-buoi6`
* **Nhiệm vụ trọng tâm**:
  1. Hoàn thiện dịch vụ `RedisCacheService.cs` trong `CulinaryBlog.Infrastructure`:
     - Cài đặt `IDistributedCache` với `System.Text.Json` chuyển đổi trực tiếp sang mảng byte UTF-8 để tiết kiệm CPU và bộ nhớ RAM.
     - Cấu hình thời gian sống bộ nhớ đệm (TTL 30 phút).
     - Hiện thực cơ chế xóa cache theo tiền tố `RemoveByPrefixAsync("categories:*")`.
  2. Tích hợp bộ nhớ đệm vào `GetCategoriesQueryHandler`:
     - Kiểm tra cache Redis trước khi truy vấn PostgreSQL.
     - Gọi cơ chế Invalidate Cache khi có bất kỳ thay đổi nào từ phía Admin (thêm mới, cập nhật, xóa danh mục).
  3. Đo lường benchmark thời gian phản hồi của API danh mục khi có cache đạt $\le 5$ms.

### 📅 Tuần 7 (Lab 7): Đánh giá công thức (Rating 1-5 sao) & Bình luận ẩm thực
* **Nhánh làm việc**: `2312777-NguyenVietToan-buoi7`
* **Nhiệm vụ trọng tâm**:
  1. Hiện thực `FR-INT-001`: Tính năng Đánh giá sao công thức và Bình luận:
     - Backend: Tạo entity `RecipeReview`, các lệnh `AddRecipeReviewCommand` và truy vấn `GetRecipeReviewsQuery`.
     - Tính điểm đánh giá trung bình (Average Rating) và tổng số lượt đánh giá của từng công thức.
  2. Frontend:
     - Component tương tác gắn sao ⭐ từ 1 đến 5 sao tại trang chi tiết món ăn.
     - Khu vực bình luận, cảm nhận và chia sẻ mẹo nấu nướng của độc giả.
     - Hiển thị huy hiệu số sao trung bình trên các thẻ `RecipeCard` ngoài trang chủ.

### 📅 Tuần 8 (Lab 8): Tối ưu hóa Database Indexing, Security Header & Nghiệm thu
* **Nhánh làm việc**: `2312777-NguyenVietToan-buoi8`
* **Nhiệm vụ trọng tâm**:
  1. Tối ưu hóa hiệu năng cơ sở dữ liệu PostgreSQL:
     - Chạy lệnh `EXPLAIN ANALYZE` trên các truy vấn tìm kiếm phức tạp và danh sách phân trang.
     - Đảm bảo các chỉ mục GIN trên cột `tsvector` và B-Tree trên các khóa ngoại hoạt động với chi phí thấp nhất.
  2. Rà soát chuẩn RFC 7807 ProblemDetails toàn diện cho tất cả các mã lỗi (400, 401, 403, 404, 409, 500).
  3. Kiểm tra các tiêu chuẩn bảo mật Security Headers (CORS, CSP, HSTS, X-Frame-Options) và cùng nhóm chuẩn bị nghiệm thu đồ án.

