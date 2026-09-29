# Hướng Dẫn Chi Tiết & Phân Công Nhiệm Vụ
### Thành viên: Nguyễn Đình Tuấn (MSSV: 2312792)
### Vai trò: Storage, Recipe Details & Profile

---

## 1. Thông Tin Chung
- **Họ và tên**: Nguyễn Đình Tuấn
- **MSSV**: 2312792
- **Email**: 2312792@dlu.edu.vn
- **GitHub**: [https://github.com/2312792-debug](https://github.com/2312792-debug)
- **Tổng số chức năng phụ trách**: **7 chức năng**

---

## 2. Danh Sách 7 Chức Năng Phụ Trách

| STT | Mã FR | Tên chức năng | File Backend cần làm | File Frontend cần làm |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **FR-FILE-001** | Upload ảnh lên MinIO (S3) | `Infrastructure/Services/MinioFileStorageService.cs` | Component `ImageUploader.tsx` |
| 2 | **FR-FILE-002** | Xóa ảnh trên MinIO | `Infrastructure/Services/MinioFileStorageService.cs` | Xử lý nút xóa ảnh preview |
| 3 | **FR-RCP-010** | Quản lý các bước nấu (D9) | `Features/Recipes/Commands/ManageSteps/*` | Component `StepListEditor.tsx` |
| 4 | **FR-RCP-009** | Quản lý nguyên liệu công thức (D10) | `Features/Recipes/Commands/ManageIngredients/*` | Component `IngredientListEditor.tsx` |
| 5 | **FR-AUTH-006** | Xem thông tin hồ sơ cá nhân | `Features/Auth/Queries/GetProfile/*` | Trang cá nhân `/profile` |
| 6 | **FR-AUTH-007** | Cập nhật hồ sơ & đổi Avatar MinIO | `Features/Auth/Commands/UpdateProfile/*` | Form chỉnh sửa hồ sơ & upload avatar |
| 7 | **FR-JOB-002** | Background job nén & resize ảnh | `Infrastructure/Jobs/ImageResizeJob.cs` | Lưu `thumbnailUrl` cho ảnh công thức |

---

## 3. Lộ Trình Thực Hiện (Tuần 2 → Tuần 8)

```
Tuần 2 (Đã hoàn thành & merge main):
  ✅ FR-FILE-001 — Upload ảnh lên MinIO S3 (Validate 5MB, JPG/PNG/WebP, Magic Bytes)
  ✅ FR-FILE-002 — Xóa ảnh trên MinIO (DeleteAsync & UI Uploader)

Tuần 3 (Đã hoàn thành & merge main):
  ✅ FR-RCP-010 — Quản lý các bước nấu (Tuân thủ quyết định D9: server tự sinh stepNumber liên tục)

Tuần 4 (Tuần tới):
  🔲 FR-RCP-009 — Quản lý nguyên liệu công thức (Tuân thủ quyết định D10: cho phép null unit nêm gia vị)
  🔲 FR-AUTH-006 — Xem thông tin hồ sơ cá nhân (Query Profile /auth/me & UI Profile)

Tuần 5:
  🔲 FR-AUTH-007 — Cập nhật hồ sơ & đổi Avatar (Tích hợp MinIO Avatar và cập nhật DisplayName, Bio)

Tuần 6:
  🔲 FR-JOB-002 — Hangfire background job tự động nén & tạo thumbnail cho ảnh MinIO ($300x300)

Tuần 7:
  🔲 Tối ưu hóa toàn diện Media MinIO, xử lý ảnh lỗi, tối ưu tốc độ tải ảnh S3

Tuần 8:
  🔲 Triển khai Production, Tối ưu hóa hiệu năng lưu trữ ảnh MinIO, Hoàn thiện báo cáo đồ án
```

---

## 4. HƯỚNG DẪN CHI TIẾT TUẦN 2 (ĐÃ HOÀN THÀNH)

> ⚠️ **Quy ước nhánh**: Mỗi chức năng làm trên **một nhánh riêng** tự tạo từ `main`, cú pháp: `2312792-NDTuan-<Ten-Chuc-Nang>`. **Không tự merge vào `main`** — báo trưởng nhóm Tiến để Tiến review và merge giúp.

---

### Chức năng 1: Tải ảnh lên MinIO (FR-FILE-001)

#### Bước 1: Tạo nhánh mới từ `main`
```powershell
git checkout main
git pull origin main
git checkout -b 2312792-NDTuan-Upload-Minio
```

#### Bước 2: Hiện thực Backend
1. Mở file `src/Backend/CulinaryBlog.Infrastructure/Services/MinioStorageService.cs`.
2. Hiện thực logic upload bằng AWS S3 SDK hoặc Minio Client:
   - Validate file dung lượng <= 5 MB.
   - Kiểm tra Content-Type hợp lệ: `image/jpeg`, `image/png`, `image/webp`.
   - Sinh tên file duy nhất: `Guid.NewGuid() + extension`.
   - Upload vào bucket `culinary-blog` trong MinIO (`localhost:9000`).
   - Trả về URL ảnh công khai.
3. Mở endpoint upload ảnh tại `src/Backend/CulinaryBlog.API/Endpoints/RecipesEndpoints.cs`.

#### Bước 3: Hiện thực Frontend
1. Xây dựng component upload ảnh dùng chung: `src/Frontend/components/ui/ImageUploader.tsx`.
2. Có khung kéo thả ảnh (drag & drop), hiển thị preview ảnh sau khi upload thành công, hiển thị URL ảnh đã upload.

#### Bước 4: Kiểm tra và đẩy nhánh lên GitHub
```powershell
dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
cd src\Frontend; npm run lint; cd ..\..

git add .
git commit -m "file: hien thuc FR-FILE-001 upload anh len minio"
git push -u origin 2312792-NDTuan-Upload-Minio
```

---

### Chức năng 2: Xóa ảnh trên MinIO (FR-FILE-002)

#### Bước 1: Tạo nhánh mới từ `main`
```powershell
git checkout main
git pull origin main
git checkout -b 2312792-NDTuan-Xoa-Anh-Minio
```

#### Bước 2: Hiện thực Backend
1. Mở file `src/Backend/CulinaryBlog.Infrastructure/Services/MinioFileStorageService.cs`.
2. Hiện thực hàm `DeleteAsync(string fileUrl, CancellationToken ct)`:
   - Phân tích tên object key từ đường dẫn URL.
   - Gọi phương thức xóa đối tượng `RemoveObjectAsync` của MinIO Client.

#### Bước 3: Hiện thực Frontend
1. Cập nhật component `ImageUploader.tsx`:
   - Thêm nút xóa (icon thùng rác hoặc nút hủy) trên ảnh đã tải lên.
   - Khi bấm, gọi API DELETE `/api/v1/files` và xóa preview trên giao diện.

#### Bước 4: Kiểm tra và đẩy nhánh lên GitHub
```powershell
dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
cd src\Frontend; npm run lint; cd ..\..

git add .
git commit -m "file: hien thuc FR-FILE-002 xoa anh tren minio"
git push -u origin 2312792-NDTuan-Xoa-Anh-Minio
```

---

## 5. HƯỚNG DẪN CHI TIẾT TUẦN 3 (ĐÃ HOÀN THÀNH)

> ⚠️ **Quy ước nhánh**: Mỗi chức năng làm trên **một nhánh riêng** tự tạo từ `main`, cú pháp: `2312792-NDTuan-<Ten-Chuc-Nang>`. Sau khi code xong và test build không lỗi, gửi PR để trưởng nhóm Tiến review và merge.

---

### Chức năng: Quản lý các bước nấu (FR-RCP-010)

#### Bước 1: Tạo nhánh mới từ `main`
```powershell
git checkout main
git pull origin main
git checkout -b 2312792-NDTuan-Cac-Buoc-Nau
```

#### Bước 2: Hiện thực Backend
1. Tạo thư mục `src/Backend/CulinaryBlog.Application/Features/Recipes/Commands/ManageSteps/`:
   - `AddRecipeStepCommand`: Thêm bước nấu.
   - `UpdateRecipeStepCommand`: Cập nhật bước.
   - `DeleteRecipeStepCommand`: Xóa bước nấu.
2. **Tuân thủ Quyết định Kiến trúc D9**:
   - `Title` là bắt buộc.
   - `StepNumber` là tùy chọn (`int?`): nếu client không truyền, server tự động lấy số bước hiện tại lớn nhất + 1.
   - Tự động renumber thứ tự khi xóa bước nấu.
   - Kiểm tra người sửa/xóa bước nấu phải là tác giả của công thức đó hoặc Admin.
3. Đăng ký endpoints trong `RecipesEndpoints.cs`: `POST/PUT/DELETE /api/v1/recipes/{id}/steps`.

#### Bước 3: Hiện thực Frontend
1. Xây dựng component `src/Frontend/components/recipes/StepListEditor.tsx`:
   - Danh sách các bước nấu có đánh số thứ tự 1, 2, 3...
   - Nút "Thêm bước", Form nhập tiêu đề, hướng dẫn chi tiết, thời gian đếm ngược (phút) và nút upload ảnh minh họa.
   - Nút sửa và xóa từng bước với hộp thoại xác nhận.

#### Bước 4: Kiểm tra và đẩy nhánh lên GitHub
```powershell
dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
cd src\Frontend; npx tsc --noEmit; cd ..\..

git add .
git commit -m "recipe: hien thuc FR-RCP-010 quan ly cac buoc nau"
git push -u origin 2312792-NDTuan-Cac-Buoc-Nau
```

---

## 6. HƯỚNG DẪN CHI TIẾT TUẦN 4: NHÁNH BUỔI 4 & GIẢI TRÌNH KỸ THUẬT

> ⚠️ **QUY ƯỚC NHÁNH MỚI TỪ TUẦN 4**:
> - Tạo **1 nhánh duy nhất cho cả buổi 4**: `2312792-NguyenDinhTuan-buoi4`.
> - Mọi chức năng đều commit trực tiếp trên nhánh này với tiền tố `feat/`.
> - Khi hoàn thành từng tính năng, tạo Pull Request vào `main` để trưởng nhóm Tiến review và gộp code.

```powershell
# Tạo nhánh duy nhất cho Buổi 4:
git checkout main
git pull origin main
git checkout -b 2312792-NguyenDinhTuan-buoi4
```

---

### Task 1 (Giai đoạn 1 - Song song): Quản lý nguyên liệu (FR-RCP-009)
* **Tiến trình trong nhóm**: Thực hiện ở nửa đầu buổi, làm độc lập song song.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Tạo Commands trong `ManageIngredients/*`: Khai báo `decimal? Quantity` và `string? Unit` (cho phép `null`)*:
     - 👉 **Tại sao?**: **Tuân thủ Quyết định D10**. Trong văn hóa ẩm thực Việt, rất nhiều gia vị nêm nếm không thể cân đo chính xác bằng số (ví dụ: "tiêu xay: một chút", "nước mắm: vừa ăn"). Nếu bắt buộc nhập số sẽ khiến người dùng không thể viết công thức chuẩn vị.
  2. *Thêm Validator kiểm tra tên nguyên liệu không được để trống và độ dài $\le 100$ ký tự*:
     - 👉 **Tại sao?**: Tránh rác dữ liệu và chống tràn bố cục bảng nguyên liệu ngoài giao diện web.
  3. *Đăng ký endpoints trong `RecipesEndpoints.cs`: `POST/PUT/DELETE /api/v1/recipes/{id}/ingredients`*:
     - 👉 **Tại sao?**: Cung cấp đầy đủ các thao tác REST API để Client thêm, sửa định lượng và xóa nguyên liệu.
  4. *Frontend tạo component `src/Frontend/components/recipes/IngredientListEditor.tsx` dạng bảng nhập liên tiếp*:
     - 👉 **Tại sao?**: Tác giả có thể nhập một loạt 10–15 nguyên liệu nhanh chóng bằng phím Enter mà không bị load lại trang.
  5. *Kiểm tra biên dịch & Commit trên nhánh buổi 4*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     cd src/Frontend; npx tsc --noEmit; cd ../..
     git add .
     git commit -m "feat/recipe: hien thuc FR-RCP-009 quan ly nguyen lieu cong thuc ho tro gia vi null unit D10"
     ```

---

### Task 2 (Giai đoạn 2 - Sau Task 1): Xem thông tin hồ sơ cá nhân (FR-AUTH-006)
* **Tiến trình trong nhóm**: Thực hiện ở nửa sau buổi, sau khi hoàn thành Task 1.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Backend viết `GetProfileQueryHandler.cs`, lấy UserId từ `ICurrentUser`*:
     - 👉 **Tại sao?**: Lấy UserId trực tiếp từ Token đã xác thực của người dùng đang gửi request, tuyệt đối không nhận `userId` từ query string để chống lộ thông tin riêng tư của người khác.
  2. *Chỉ chọn các trường an toàn `{ id, email, displayName, bio, avatarUrl, roles }`, không map `PasswordHash`*:
     - 👉 **Tại sao?**: Nguyên tắc bảo mật thông tin tài khoản (NFR-SEC). Không bao giờ trả chuỗi băm mật khẩu về client dưới mọi hình thức.
  3. *Đăng ký endpoint `GET /api/v1/auth/me` trong `AuthEndpoints.cs` (`RequireAuthorization`)*:
     - 👉 **Tại sao?**: Đảm bảo bắt buộc phải đăng nhập thì mới gọi được API lấy hồ sơ chính mình.
  4. *Frontend tạo trang `/profile` hiển thị Avatar lớn, Tên, Tiểu sử và Roles*:
     - 👉 **Tại sao?**: Cung cấp giao diện trung tâm để người dùng kiểm tra thông tin tài khoản trước khi thực hiện đổi avatar và bio ở Tuần 5.
  5. *Kiểm tra biên dịch, Commit & Đẩy nhánh lên GitHub*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     cd src/Frontend; npx tsc --noEmit; cd ../..
     git add .
     git commit -m "feat/auth: hien thuc FR-AUTH-006 xem thong tin ho so ca nhan tai auth me va UI profile"
     git push -u origin 2312792-NguyenDinhTuan-buoi4
     ```
  6. *Tạo Pull Request trên GitHub ứng với từng chức năng vào `main` để trưởng nhóm Tiến review & gộp code*.

---

## 7. Tiêu Chí Nghiệm Thu (Definition of Done)
- [ ] Upload & Xóa ảnh MinIO hoạt động trơn tru.
- [ ] Quản lý các bước nấu và nguyên liệu hoạt động đúng theo D9 và D10.
- [ ] Xem hồ sơ cá nhân `/profile` trả về đúng thông tin user hiện tại.
- [ ] Nhánh buổi 4 `2312792-NguyenDinhTuan-buoi4` đã được đẩy lên GitHub và tạo PR gộp vào `main`.
