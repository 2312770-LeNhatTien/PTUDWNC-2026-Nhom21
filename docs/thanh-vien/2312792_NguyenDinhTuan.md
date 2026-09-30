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

Tuần 4 (Lab 4 - Hoàn thành 100% Backend API Endpoints):
  🔲 FR-RCP-009 — POST/PUT/DELETE /recipes/{id}/ingredients (CRUD nguyên liệu hỗ trợ null unit theo D10)
  🔲 FR-AUTH-006 — GET /auth/me (Xem thông tin hồ sơ cá nhân bảo mật không lộ hash mật khẩu)
  🔲 FR-AUTH-007 — PATCH /auth/me (Cập nhật hồ sơ DisplayName, Bio, AvatarUrl liên kết MinIO)

Tuần 5 (Lab 5 - Frontend Integration & Profile / Editor UI):
  🔲 Giao diện Hồ sơ cá nhân /profile (Avatar lớn, Tên, Bio, Role, form chỉnh sửa)
  🔲 Tính năng đổi Avatar: upload trực tiếp MinIO qua Presigned URL
  🔲 Component IngredientListEditor.tsx (nhập liên tục bằng phím Enter, null unit D10)
  🔲 Hoàn thiện component StepListEditor.tsx phục vụ trang tạo/sửa món ăn

Tuần 6 (Lab 6 - Tối ưu hóa Media MinIO & Xử lý ảnh):
  🔲 Sinh Presigned URL an toàn không lộ secret key từ Client
  🔲 Xử lý Preview ảnh trực tiếp bằng Blob URL trước khi upload, Fallback ảnh lỗi
  🔲 Kiểm thử tải đa định dạng file ảnh (JPG, PNG, WebP <= 5MB) có thanh tiến trình upload

Tuần 7 (Lab 7 - Hangfire Background Job nén ảnh Thumbnail):
  🔲 FR-JOB-002 — Hangfire background job tự động nén & resize ảnh thumbnail 300x300 (ImageSharp)
  🔲 Lưu ảnh thumbnail vào bucket recipe-thumbnails trên MinIO, giảm >70% dung lượng

Tuần 8 (Lab 8 - SEO Schema.org, Lighthouse Audit & Nghiệm thu):
  🔲 Tích hợp cấu trúc dữ liệu JSON-LD theo chuẩn Schema.org Recipe (Rich Snippets Google)
  🔲 Chạy Google Lighthouse Audit trên Chrome, tối ưu Core Web Vitals đạt Performance >= 90
  🔲 Cùng nhóm hoàn thiện hồ sơ nghiệm thu đồ án
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

### Task 1 (Giai đoạn 1 - Song song): CRUD nguyên liệu công thức (FR-RCP-009)
* **Tiến trình trong nhóm**: Thực hiện ở nửa đầu buổi, làm độc lập song song với các bạn khác.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Tạo Commands trong `Features/Recipes/Commands/ManageIngredients/`: `AddRecipeIngredientCommand`, `UpdateRecipeIngredientCommand`, `DeleteRecipeIngredientCommand`*:
     - Khai báo `decimal? Quantity` và `string? Unit` (cho phép `null`).
     - 👉 **Tại sao?**: **Tuân thủ Quyết định D10**. Trong văn hóa ẩm thực Việt Nam, rất nhiều gia vị nêm nếm không thể cân đo chính xác bằng số (ví dụ: "tiêu xay: một chút", "nước mắm: vừa ăn"). Nếu bắt buộc nhập số sẽ khiến người dùng không thể viết công thức chuẩn vị.
  2. *Thêm FluentValidator kiểm tra tên nguyên liệu không được để trống và độ dài $\le 100$ ký tự*:
     - 👉 **Tại sao?**: Tránh rác dữ liệu và chống tràn bố cục bảng nguyên liệu.
  3. *Đăng ký endpoints trong `RecipesEndpoints.cs`: `POST/PUT/DELETE /api/v1/recipes/{id}/ingredients` (`RequireAuthorization`)*:
     - Kiểm tra quyền: chỉ tác giả của công thức hoặc Admin mới được phép thêm/sửa/xóa nguyên liệu.
     - 👉 **Tại sao?**: Cung cấp đầy đủ các thao tác REST API để quản lý danh sách nguyên liệu và phục vụ điều kiện xuất bản D11.
  4. *Kiểm tra biên dịch & Commit trên nhánh buổi 4*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     git add .
     git commit -m "feat/FR-RCP-009: cai dat day du cac endpoints CRUD nguyen lieu ho tro null unit D10"
     ```

---

### Task 2 (Giai đoạn 2 - Sau Task 1): Xem & Cập nhật hồ sơ cá nhân (FR-AUTH-006 & FR-AUTH-007)
* **Tiến trình trong nhóm**: Thực hiện ở nửa sau buổi, hoàn thiện bộ API quản lý Profile người dùng.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Hiện thực `GetProfileQuery` và `GetProfileQueryHandler` trong `Features/Auth/Queries/GetProfile/`*:
     - Lấy UserId từ `ICurrentUser` được phân giải từ JWT Claim `sub`.
     - 👉 **Tại sao?**: Lấy UserId trực tiếp từ Token đã xác thực của người dùng đang gửi request, tuyệt đối không nhận `userId` từ query string để chống lộ thông tin riêng tư của người khác.
  2. *Chỉ chọn các trường an toàn `{ id, email, displayName, bio, avatarUrl, roles }`, không map `PasswordHash`*:
     - 👉 **Tại sao?**: Nguyên tắc bảo mật thông tin tài khoản (NFR-SEC). Không bao giờ trả chuỗi băm mật khẩu về client dưới mọi hình thức.
  3. *Hiện thực `UpdateProfileCommand` và `UpdateProfileCommandHandler` trong `Features/Auth/Commands/UpdateProfile/`*:
     - Cho phép cập nhật `DisplayName`, `Bio`, `AvatarUrl` (URL ảnh upload từ MinIO).
     - Kiểm tra độ dài `DisplayName` $\le 50$, `Bio` $\le 500$ ký tự.
     - 👉 **Tại sao?**: Cung cấp API cập nhật hồ sơ cá nhân hoàn chỉnh, liên kết với hệ thống lưu trữ ảnh MinIO đã hoàn thiện ở Tuần 3.
  4. *Đăng ký route `GET /api/v1/auth/me` và `PATCH /api/v1/auth/me` trong `AuthEndpoints.cs` (`RequireAuthorization`)*:
  5. *Kiểm tra biên dịch toàn hệ thống, Commit & Đẩy nhánh lên GitHub*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     git add .
     git commit -m "feat/FR-AUTH-006-007: cai dat endpoints GET va PATCH auth me xem va cap nhat ho so"
     git push -u origin 2312792-NguyenDinhTuan-buoi4
     ```
  6. *Tạo Pull Request trên GitHub ứng với từng chức năng vào `main` để trưởng nhóm Tiến review & gộp code*.

---

## 7. Tiêu Chí Nghiệm Thu (Definition of Done)
- [ ] 100% các API endpoints được phân công đã được đăng ký và hoạt động chính xác trên Scalar (`http://localhost:5000/scalar/v1`):
  - `POST /api/v1/recipes/{id}/ingredients`
  - `PUT /api/v1/recipes/{id}/ingredients/{ingredientId}`
  - `DELETE /api/v1/recipes/{id}/ingredients/{ingredientId}`
  - `GET /api/v1/auth/me`
  - `PATCH /api/v1/auth/me`
- [ ] Backend biên dịch đạt 0 lỗi (`dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj`).
- [ ] Thêm và sửa nguyên liệu hỗ trợ `Quantity` và `Unit` dạng `null` theo chuẩn D10.
- [ ] Xem hồ sơ `GET /api/v1/auth/me` bảo mật tuyệt đối không lộ mật khẩu; cập nhật `PATCH /api/v1/auth/me` lưu thành công vào CSDL.
- [ ] Nhánh buổi 4 `2312792-NguyenDinhTuan-buoi4` đã được đẩy lên GitHub và tạo PR gộp vào `main`.

---

## 8. LỘ TRÌNH CHI TIẾT CÁC TUẦN TIẾP THEO (TUẦN 5 → TUẦN 8)

### 📅 Tuần 5 (Lab 5): Giao diện Hồ sơ cá nhân & Editors Nguyên liệu / Bước nấu
* **Nhánh làm việc**: `2312792-NguyenDinhTuan-buoi5`
* **Nhiệm vụ trọng tâm**:
  1. Xây dựng trang Hồ sơ cá nhân `/profile` trên Next.js 15:
     - Hiển thị Avatar lớn, Tên hiển thị, Tiểu sử và Vai trò tài khoản.
     - Form chỉnh sửa thông tin cá nhân (đổi tên hiển thị, cập nhật bio giới thiệu).
     - Tích hợp tính năng đổi Avatar: chọn ảnh từ máy tính -> xin Presigned URL từ MinIO -> upload trực tiếp từ trình duyệt -> lưu link ảnh vào hồ sơ.
  2. Hoàn thiện bộ components soạn thảo công thức:
     - `IngredientListEditor.tsx`: Bảng nhập danh sách nguyên liệu liên tục bằng phím Enter, hỗ trợ định lượng không bắt buộc (null unit theo **Quyết định D10**).
     - `StepListEditor.tsx`: Giao diện thêm các bước thực hiện có số thứ tự tự động tăng, nút xóa, nút sắp xếp lại và khung upload ảnh từng bước.

### 📅 Tuần 6 (Lab 6): Tối ưu hóa Media MinIO & Xử lý ảnh nâng cao
* **Nhánh làm việc**: `2312792-NguyenDinhTuan-buoi6`
* **Nhiệm vụ trọng tâm**:
  1. Nâng cấp và bảo mật luồng tải ảnh với MinIO Storage:
     - Sinh Presigned URL với thời hạn sống ngắn (15 phút), chống rò rỉ Access Key/Secret Key ra client.
     - Xử lý Preview ảnh trực tiếp bằng Blob URL trước khi upload.
     - Xử lý ảnh lỗi (Fallback Image) ngoài giao diện khi đường dẫn ảnh bị hỏng.
  2. Kiểm thử tải file với nhiều định dạng hình ảnh (JPEG, PNG, WebP) và chặn các file vượt quá giới hạn $\le 5$MB kèm thanh tiến trình upload trực quan.

### 📅 Tuần 7 (Lab 7): Hangfire Background Job nén và resize ảnh Thumbnail
* **Nhánh làm việc**: `2312792-NguyenDinhTuan-buoi7`
* **Nhiệm vụ trọng tâm**:
  1. Hiện thực `FR-JOB-002`: Hangfire Background Job tự động nén & resize ảnh đại diện:
     - Sử dụng thư viện `SixLabors.ImageSharp` để resize ảnh gốc xuống kích thước $300 \times 300$ pixel chuẩn WebP.
     - Tự động kích hoạt job ngay sau khi ảnh đại diện chính của công thức được lưu.
     - Lưu ảnh thumbnail vào bucket `recipe-thumbnails` trên MinIO.
  2. Đo lường kích thước ảnh thumbnail giảm hơn 70% so với ảnh gốc, giúp trang chủ Next.js tải siêu mượt.

### 📅 Tuần 8 (Lab 8): Tối ưu hóa SEO Frontend (Schema.org) & Kiểm thử hiệu năng
* **Nhánh làm việc**: `2312792-NguyenDinhTuan-buoi8`
* **Nhiệm vụ trọng tâm**:
  1. Cấu hình thẻ Meta SEO toàn diện cho từng bài viết: OpenGraph, Twitter Cards, Canonical URL.
  2. Tích hợp cấu trúc dữ liệu JSON-LD theo chuẩn **Schema.org Recipe**:
     - Cung cấp dữ liệu vi mô (Microdata) cho Google Search hiển thị Rich Snippets (ảnh món ăn, thời gian nấu, calo, đánh giá sao) trên trang kết quả tìm kiếm.
  3. Chạy công cụ Google Lighthouse Audit trên trình duyệt Chrome, tối ưu hóa các chỉ số Core Web Vitals (LCP, FID, CLS) đạt điểm Performance $\ge 90$.
  4. Cùng cả nhóm hoàn thiện hồ sơ nghiệm thu đồ án.

