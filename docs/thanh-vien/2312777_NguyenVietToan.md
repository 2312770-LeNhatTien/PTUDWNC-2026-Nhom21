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

Tuần 4 (Tuần tới):
  🔲 Tự tay viết RedisCacheService (IDistributedCache, serialize UTF-8, TTL 30 phút & Invalidation)
  🔲 FR-CAT-004 — Admin cập nhật danh mục (Tuân thủ D12: giữ nguyên slug SEO, xóa cache Redis)

Tuần 5:
  🔲 FR-CAT-005 — Admin xóa mềm danh mục (Tuân thủ D1: kiểm tra không có recipes mới cho xóa)

Tuần 6:
  🔲 FR-SRCH-001 — Tìm kiếm toàn văn Full-Text Search PostgreSQL (tsvector + unaccent)
  🔲 FR-SRCH-002..004 — Lọc đa tiêu chí, sắp xếp dual-syntax D8, phân trang

Tuần 7:
  🔲 FR-INT-001 — Đánh giá sao công thức (Rating 1-5 sao, tính điểm trung bình và số lượt đánh giá)

Tuần 8:
  🔲 Triển khai Production, Tối ưu hóa truy vấn CSDL PostgreSQL & Redis Cache, Hoàn thiện báo cáo
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

### Task 1 (Giai đoạn 1 - Song song): Tự tay hiện thực `RedisCacheService.cs`
* **Tiến trình trong nhóm**: Thực hiện ở nửa đầu buổi, làm độc lập song song.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Mở file `src/Backend/CulinaryBlog.Infrastructure/Caching/RedisCacheService.cs` (đã được để sẵn khung Stub)*:
  2. *Trong `SetAsync`: Dùng `JsonSerializer.SerializeToUtf8Bytes(value)` thay vì `Serialize` chuỗi string thông thường*:
     - 👉 **Tại sao?**: Lưu trực tiếp dạng mảng `byte[]` UTF-8 giúp tối ưu bộ nhớ đệm Redis và tiết kiệm CPU khi không phải encode/decode chuỗi trung gian qua lại.
  3. *Cấu hình `DistributedCacheEntryOptions` với `AbsoluteExpirationRelativeToNow = ttl` (30 phút)*:
     - 👉 **Tại sao?**: Tránh rác bộ nhớ Redis. Dữ liệu danh mục sau 30 phút tự động hết hạn và giải phóng RAM cho server.
  4. *Hiện thực hàm `RemoveByPrefixAsync("categories:")`*:
     - 👉 **Tại sao?**: `IDistributedCache` mặc định không hỗ trợ xóa theo ký tự đại diện (wildcard). Cần hàm này để xóa sạch các cache danh mục liên quan khi Admin thay đổi dữ liệu.
  5. *Inject `ICacheService` vào `GetCategoriesQueryHandler.cs` để cache kết quả truy vấn*:
     - 👉 **Tại sao?**: Giảm 80% tải CSDL PostgreSQL và giúp tốc độ phản hồi API danh mục $\le 5$ms.
  6. *Kiểm tra biên dịch & Commit trên nhánh buổi 4*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     cd src/Frontend; npx tsc --noEmit; cd ../..
     git add .
     git commit -m "feat/cache: tu tay hien thuc RedisCacheService voi IDistributedCache va TTL 30 phut"
     ```

---

### Task 2 (Giai đoạn 2 - Phụ thuộc Task 1): Admin cập nhật danh mục & Invalidation (FR-CAT-004)
* **Tiến trình trong nhóm**: Thực hiện ở nửa sau buổi, sau khi Task 1 đã hoàn thành `RedisCacheService`.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Viết `UpdateCategoryCommandHandler.cs`: Cập nhật Tên, Mô tả, Ảnh, Thứ tự nhưng **GIỮ NGUYÊN SLUG** ban đầu*:
     - 👉 **Tại sao?**: **Tuân thủ tuyệt đối Quyết định D12**. Nếu đổi tên danh mục mà đổi luôn Slug thì toàn bộ các liên kết URL cũ đã được Google lập chỉ mục SEO hoặc người dùng lưu bookmark sẽ bị lỗi 404 Not Found.
  2. *Sau khi lưu DB thành công, gọi `await _cacheService.RemoveAsync("categories:all", ct)`*:
     - 👉 **Tại sao?**: Kỹ thuật **Cache Invalidation**. Nếu không xóa cache cũ, người dùng truy cập trang chủ vẫn sẽ thấy dữ liệu cũ trong suốt 30 phút TTL tiếp theo.
  3. *Đăng ký endpoint `PUT /api/v1/categories/{id}` trong `CategoriesEndpoints.cs` (`RequireAuthorization("AdminOnly")`)*:
     - 👉 **Tại sao?**: Phân quyền nghiêm ngặt, chỉ có quản trị viên hệ thống mới có quyền sửa danh mục.
  4. *Frontend tạo Modal Sửa trong trang quản trị `/admin/categories`*:
     - 👉 **Tại sao?**: Giúp Admin sửa nhanh thông tin danh mục ngay trên giao diện bảng mà không phải chuyển trang.
  5. *Kiểm tra biên dịch, Commit & Đẩy nhánh lên GitHub*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     cd src/Frontend; npx tsc --noEmit; cd ../..
     git add .
     git commit -m "feat/category: hien thuc FR-CAT-004 cap nhat danh muc bao toan slug D12 va xoa cache"
     git push -u origin 2312777-NguyenVietToan-buoi4
     ```
  6. *Tạo Pull Request trên GitHub ứng với từng chức năng vào `main` để trưởng nhóm Tiến review & gộp code*.

---

## 7. Tiêu Chí Nghiệm Thu (Definition of Done)
- [ ] Endpoint `GET /api/v1/categories` trả về đúng danh sách và cache Redis hoạt động mượt mà.
- [ ] Endpoint `POST /api/v1/categories` tạo được danh mục mới kèm slug tự động chuẩn SEO.
- [ ] Endpoint `PUT /api/v1/categories/{id}` cập nhật thông tin thành công và bảo toàn slug D12.
- [ ] Trang `/categories` và `/admin/categories` hiển thị trực quan và hoạt động chính xác.
- [ ] Nhánh buổi 4 `2312777-NguyenVietToan-buoi4` đã được đẩy lên GitHub và tạo PR gộp vào `main`.
