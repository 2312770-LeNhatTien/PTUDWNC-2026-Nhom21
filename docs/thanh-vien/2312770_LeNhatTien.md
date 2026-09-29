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

Tuần 4 (Tuần tới):
  🔲 FR-RCP-002 — Xem chi tiết công thức nấu ăn (Backend GetRecipeBySlugQueryHandler & Frontend /recipes/[slug])
  🔲 FR-RCP-008 — Quản lý gallery ảnh công thức (Upload/Xóa ảnh, chọn ảnh chính IsPrimary)

Tuần 5:
  🔲 FR-RCP-004 — Cập nhật thông tin công thức (Kiểm tra Concurrency RowVersion)
  🔲 FR-RCP-006 — Lưu trữ công thức (ArchiveRecipe)

Tuần 6:
  🔲 FR-RCP-007 — Xóa mềm công thức (Soft Delete theo D1)

Tuần 7:
  🔲 FR-JOB-003 — Hangfire job tự động sinh sitemap.xml SEO

Tuần 8:
  🔲 Triển khai Production (Docker Compose + Nginx HTTPS), Kiểm thử tích hợp toàn hệ thống, Hoàn thiện báo cáo đồ án
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

### Task 1 (Giai đoạn 1 - Song song): Xem chi tiết công thức nấu ăn (FR-RCP-002)
* **Tiến trình trong nhóm**: Thực hiện ở nửa đầu buổi, làm song song độc lập với các bạn khác.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Mở `GetRecipeBySlugQueryHandler.cs`, dùng EF Core `.Include()` nạp Category, Author, Steps, Ingredients, Images, Nutrition*:
     - 👉 **Tại sao?**: Nếu không dùng `.Include()`, EF Core sẽ sinh ra lỗi N+1 Query hoặc dữ liệu liên kết trả về `null`, khiến trang chi tiết công thức bị thiếu nguyên liệu, các bước và hình ảnh.
  2. *Kiểm tra trạng thái Draft/Archived, nếu không phải tác giả (`AuthorId != currentUser.UserId`) và không phải Admin thì ném `ForbiddenException`*:
     - 👉 **Tại sao?**: Đảm bảo an toàn thông tin và quyền riêng tư (SRS 3.3). Công thức đang viết nháp chưa được xuất bản thì người ngoài không được phép xem trộm.
  3. *Đăng ký route `GET /api/v1/recipes/{slug}` trong `RecipesEndpoints.cs`*:
     - 👉 **Tại sao?**: Cung cấp RESTful API endpoint chuẩn cho Frontend gọi dữ liệu.
  4. *Frontend tạo trang `src/Frontend/app/(public)/recipes/[slug]/page.tsx` (Hero Banner, tác giả, bảng Calories/Protein/Carb/Fat, checklist nguyên liệu, timeline các bước nấu)*:
     - 👉 **Tại sao?**: Hiển thị bảng dinh dưỡng để người đọc tính calo; checklist nguyên liệu có thể tick chọn để thuận tiện khi vào bếp; timeline các bước kèm ảnh trực quan.
  5. *Kiểm tra biên dịch & Commit trên nhánh buổi 4*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     cd src/Frontend; npx tsc --noEmit; cd ../..
     git add .
     git commit -m "feat/recipe: hien thuc FR-RCP-002 xem chi tiet cong thuc kem dinh duong va nguyen lieu"
     ```

---

### Task 2 (Giai đoạn 2 - Sau Task 1): Quản lý gallery ảnh công thức (FR-RCP-008)
* **Tiến trình trong nhóm**: Thực hiện ở nửa sau buổi, sau khi hoàn thành Task 1.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Tạo các Command `AddRecipeImageCommand`, `DeleteRecipeImageCommand`, `SetPrimaryImageCommand` trong `Features/Recipes/Commands/ManageImages/`*:
     - 👉 **Tại sao?**: Tách nhỏ từng thao tác theo mô hình CQRS giúp code rõ ràng, dễ bảo trì và phân quyền chính xác.
  2. *Trong `SetPrimaryImageCommandHandler`: Tìm ảnh cũ có `IsPrimary == true` đổi thành `false`, rồi mới gán ảnh mới được chọn thành `true`*:
     - 👉 **Tại sao?**: Mỗi món ăn chỉ được có **duy nhất 1 ảnh đại diện chính** hiển thị ngoài trang chủ và thẻ `RecipeCard`. Nếu không bỏ cờ ảnh cũ thì database sẽ bị mâu thuẫn dữ liệu.
  3. *Đăng ký endpoints trong `RecipesEndpoints.cs`: `POST/DELETE/PUT /api/v1/recipes/{id}/images`*:
     - 👉 **Tại sao?**: Tạo API giao tiếp chuẩn cho Frontend thao tác bộ sưu tập ảnh.
  4. *Frontend xây dựng component `RecipeGalleryEditor.tsx` dạng thumbnail grid kèm nút gắn sao ⭐ ảnh đại diện*:
     - 👉 **Tại sao?**: Giúp tác giả nhìn thấy trực quan tất cả ảnh đã tải lên và dễ dàng chọn ảnh đẹp nhất làm ảnh bìa.
  5. *Kiểm tra biên dịch, Commit & Đẩy nhánh lên GitHub*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     cd src/Frontend; npx tsc --noEmit; cd ../..
     git add .
     git commit -m "feat/recipe: hien thuc FR-RCP-008 quan ly gallery anh va chon anh dai dien chinh"
     git push -u origin 2312770-LeNhatTien-buoi4
     ```

---

## 7. Tiêu Chí Nghiệm Thu (Definition of Done)
- [ ] Backend biên dịch không lỗi (`dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj`).
- [ ] Frontend không lỗi TypeScript (`npx tsc --noEmit`).
- [ ] Test trực tiếp API trên Scalar: `http://localhost:5000/scalar/v1` hoạt động chính xác.
- [ ] Nhánh buổi 4 `2312770-LeNhatTien-buoi4` đã được đẩy lên GitHub và tạo PR gộp vào `main`.
