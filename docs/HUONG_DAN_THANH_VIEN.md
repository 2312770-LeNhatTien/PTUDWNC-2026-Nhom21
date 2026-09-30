# Hướng Dẫn Dành Cho Thành Viên Nhóm (Developer Guide)
### Dự án: Culinary Blog — Nhóm 21 (PTUDWNC-2026)

Tài liệu này hướng dẫn chi tiết từng bước giúp các thành viên nhóm tải dự án, cài đặt môi trường, làm quen với kiến trúc, viết code đúng chuẩn và phối hợp qua Git mà **không bị xung đột (conflict)**.

---

## 1. Yêu Cầu Môi Trường (Cài Đặt Trước)

Trước khi bắt đầu, đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
1. **.NET 10 SDK**: Kiểm tra bằng lệnh `dotnet --version` (phải ra bản `10.x`).
2. **Node.js 20+** & **npm 10+**: Kiểm tra bằng `node -v` và `npm -v`.
3. **Docker Desktop**: Phải đang bật và chạy (chạy nền trên máy).
4. **Git**: Kiểm tra bằng `git --version`.
5. **IDE khuyên dùng**: Visual Studio 2026 / Visual Studio Code (cài thêm C# Dev Kit extension) hoặc JetBrains Rider.

> **Lưu ý đặc biệt về PostgreSQL:**
> Nếu máy bạn đã cài PostgreSQL desktop từ trước, dịch vụ đó có thể đang chiếm cổng `5432`. Hãy vào **Services (services.msc)** trên Windows và **Stop** dịch vụ PostgreSQL đó để Docker container có thể sử dụng cổng `5432`.

---

## 2. Các Bước Tải Về & Khởi Chạy Lần Đầu

Mở **PowerShell** và chạy lần lượt các lệnh sau:

### Bước 2.1: Clone repository và chuyển vào thư mục dự án
```powershell
git clone https://github.com/2312770-coder/PTUDWNC-2026-Nhom21.git
cd PTUDWNC-2026-Nhom21
```

### Bước 2.2: Khởi động các dịch vụ hạ tầng với Docker
Đảm bảo **Docker Desktop đang chạy**, sau đó thực thi:
```powershell
docker compose up -d
docker compose ps
```
Kiểm tra thấy đủ 5 container ở trạng thái `Up`:
- `culinaryblog-postgres` (PostgreSQL 16 - cổng 5432)
- `culinaryblog-redis` (Redis 7 - cổng 6379)
- `culinaryblog-minio` (MinIO S3 - cổng 9000 API, cổng 9001 Console: user `minioadmin` / pass `minioadmin`)
- `culinaryblog-seq` (Seq Log Viewer - cổng 5341: http://localhost:5341)
- `culinaryblog-mailhog` (MailHog Test Mail - cổng 8025: http://localhost:8025)

### Bước 2.3: Build Backend
Dự án đã có sẵn file solution `CulinaryBlog.slnx` ở thư mục gốc:
```powershell
dotnet restore CulinaryBlog.slnx
dotnet build CulinaryBlog.slnx
```

### Bước 2.4: Thiết lập JWT Secret Key (User Secrets)
Để bảo mật, khóa bí mật JWT không được commit lên Git mà lưu ở máy cá nhân:
```powershell
cd src\Backend\CulinaryBlog.API
dotnet user-secrets init
dotnet user-secrets set "JwtSettings:Key" "chuoi-khoa-bi-mat-jwt-cua-ban-it-nhat-32-ky-tu-tro-len"
cd ..\..\..
```

### Bước 2.5: Cập nhật Database (EF Core Migrations)
Cài đặt tool EF nếu máy bạn chưa có:
```powershell
dotnet tool install --global dotnet-ef
```
Áp dụng database migrations vào PostgreSQL trong Docker:
```powershell
dotnet ef database update --project src\Backend\CulinaryBlog.Infrastructure --startup-project src\Backend\CulinaryBlog.API
```

### Bước 2.6: Chạy thử Backend
```powershell
dotnet run --project src\Backend\CulinaryBlog.API
```
- Mở trình duyệt vào xem tài liệu API (Scalar): http://localhost:5000/scalar/v1
- Kiểm tra Health check: http://localhost:5000/health

### Bước 2.7: Cài đặt và Chạy thử Frontend
Mở một cửa sổ PowerShell **mới**:
```powershell
cd src\Frontend
copy .env.example .env.local
npm install
npm run dev
```
Mở trình duyệt: http://localhost:3000

---

## 3. Quy Ước Nhánh Git & Quy Trình Làm Việc

> ⚠️ **Quan trọng**: Thành viên **KHÔNG tự merge vào `main`**. Chỉ có trưởng nhóm **Lê Nhật Tiến (2312770)** mới được merge sau khi review Pull Request trên GitHub và xác nhận không có xung đột.

### 3.1. Quy ước đặt tên nhánh theo từng buổi (Áp dụng từ Tuần 4)

Từ Tuần 4 trở đi, nhóm áp dụng cơ chế **1 nhánh làm việc duy nhất cho cả buổi** để thuận tiện quản lý tiến trình:

```
<MSSV>-<HoTenKhongDau>-buoi<X>
```

| Thành viên | Tên nhánh Buổi 4 | Tên nhánh Buổi 5 |
| :--- | :--- | :--- |
| Lê Nhật Tiến (Trưởng nhóm) | `2312770-LeNhatTien-buoi4` | `2312770-LeNhatTien-buoi5` |
| Lâm Văn Đức | `2314299-LamVanDuc-buoi4` | `2314299-LamVanDuc-buoi5` |
| Nguyễn Viết Toàn | `2312777-NguyenVietToan-buoi4` | `2312777-NguyenVietToan-buoi5` |
| Nguyễn Đình Tuấn | `2312792-NguyenDinhTuan-buoi4` | `2312792-NguyenDinhTuan-buoi5` |

### 3.2. Quy trình làm việc chi tiết cho từng buổi

#### Bước 1: Luôn cập nhật code mới nhất từ nhánh `main`
Trước khi tạo nhánh làm việc cho buổi mới, luôn lấy code mới nhất:
```powershell
git checkout main
git pull origin main
```

#### Bước 2: Tạo nhánh buổi làm việc của bạn
```powershell
# Cú pháp: git checkout -b <MSSV>-<HoTenKhongDau>-buoi<X>
# Ví dụ Tiến tạo nhánh buổi 4:
git checkout -b 2312770-LeNhatTien-buoi4

# Ví dụ Đức tạo nhánh buổi 4:
git checkout -b 2314299-LamVanDuc-buoi4
```

#### Bước 3: Code và kiểm tra cẩn thận trên máy cá nhân
- **BẮT BUỘC ĐỌC**: Tài liệu [DECISIONS.md](./DECISIONS.md), [SRS_Culinary_Blog_v1.0.0.md](./SRS_Culinary_Blog_v1.0.0.md) và file hướng dẫn riêng trong thư mục `docs/thanh-vien/`.
- Chạy `dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj` (Backend đạt 0 error).
- Chạy `cd src/Frontend; npx tsc --noEmit; cd ../..` (Frontend đạt 0 error TypeScript).

#### Bước 4: Commit theo chuẩn gắn mã FR trực tiếp
Quy ước thông điệp commit: `feat/<Mã-FR>: <mô tả chi tiết>`
```powershell
git add .
git commit -m "feat/FR-RCP-002: cai dat endpoint GET recipes slug chi tiet cong thuc kem nutrition"
```

*Ví dụ commit chuẩn theo từng chức năng trong buổi 4:*
- Tiến: `git commit -m "feat/FR-RCP-002: cai dat endpoint GET recipes slug chi tiet cong thuc kem nutrition"`
- Đức: `git commit -m "feat/FR-AUTH-005: cai dat endpoint POST auth logout thu hoi refresh token"`
- Toàn: `git commit -m "feat/FR-CAT-004-005: cai dat endpoints PUT va DELETE categories kiem tra D12 va D1"`
- Tuấn: `git commit -m "feat/FR-RCP-009: cai dat day du cac endpoints CRUD nguyen lieu ho tro null unit D10"`

#### Bước 5: Đẩy nhánh lên GitHub
```powershell
git push -u origin 2312770-LeNhatTien-buoi4    # Thay bằng tên nhánh buổi của bạn
```

#### Bước 6: Tạo Pull Request (PR) theo từng chức năng và Báo trưởng nhóm review
1. Mở trang repository trên GitHub: [PTUDWNC-2026-Nhom21](https://github.com/2312770-coder/PTUDWNC-2026-Nhom21).
2. Tạo **Pull Request** từ nhánh buổi của bạn vào nhánh `main` ứng với chức năng vừa hoàn tất (Tiêu đề PR: `feat: [Mã-FR] <Tên chức năng>`).
3. Nhắn vào nhóm Zalo/Discord: *"Mình vừa tạo PR cho [Mã-FR] từ nhánh `...-buoi4`, Tiến review giúp nhé."*
4. Trưởng nhóm **Lê Nhật Tiến** vào GitHub, kiểm tra diff, review code và gộp (merge) PR vào `main`.
5. Khi bắt đầu buổi tiếp theo hoặc cần lấy code mới của đồng đội:
```powershell
git checkout main
git pull origin main
```

---


## 4. Hướng Dẫn Code Chuẩn Kiến Trúc (Backend)

Dự án áp dụng **Clean Architecture** kết hợp **CQRS (MediatR)**:
```
API (Endpoints)  -->  Application (Commands/Queries + Handlers + Validators)  -->  Domain (Entities)
                                 ^
                                 |
                     Infrastructure (EF Core, Repositories, MinIO, Redis)
```

### Cách triển khai một chức năng:
1. Mở thư mục `src/Backend/CulinaryBlog.Application/Features/<TênFeature>/`.
2. Khung file đã được sinh sẵn (Command/Query, Validator, Handler):
   - **Command / Query**: Chứa dữ liệu đầu vào (DTO request).
   - **Validator**: Dùng `FluentValidation` để kiểm tra tính hợp lệ dữ liệu.
   - **Handler**: Chứa nghiệp vụ chính. Hiện tại đang ném `throw new NotImplementedException(...)` kèm các bước gợi ý bằng comment.
3. Thay thế dòng ném exception bằng logic thực tế:
   - Gọi repository để lấy hoặc lưu Entity.
   - Trả về `Result<T>` hoặc DTO.
4. Mở `src/Backend/CulinaryBlog.API/Endpoints/<TênEndpoint>.cs` để kiểm tra route binding và quyền hạn (`.RequireAuthorization()`).
5. Kiểm tra trực tiếp trên trình duyệt bằng giao diện Scalar tại `http://localhost:5000/scalar/v1`.

---

## 5. Những Nguyên Tắc Cốt Lõi Cần Nhớ (Trích Từ DECISIONS.md)

1. **Xóa mềm (Soft Delete - D1)**: Mọi thao tác xóa Recipe hoặc Category đều dùng hàm `SoftDelete()` (đặt `IsDeleted = true`). Tuyệt đối không xóa vật lý bản ghi trong DB và không xóa ảnh trên MinIO khi xóa công thức.
2. **Sắp xếp (Sorting - D8)**: Hỗ trợ cả 2 dạng tham số `sort=-createdAt` và `sortBy=createdAt&sortOrder=desc`.
3. **Bước nấu (Steps - D9)**: `Title` là bắt buộc. `StepNumber` là tùy chọn (`int?`), nếu client không truyền thì server tự lấy số lớn nhất + 1.
4. **Nguyên liệu (Ingredients - D10)**: `Quantity` và `Unit` có thể `null` (cho các loại nguyên liệu "nêm vừa miệng").
5. **Xuất bản công thức (Publish - D11)**: Chỉ được phép chuyển sang `Published` khi bài có ít nhất 1 bước VÀ 1 nguyên liệu.
6. **Slug Danh mục (Category Slug - D12)**: Khi sửa tên danh mục, giữ nguyên slug ban đầu, không được tự động sinh lại để tránh làm hỏng link SEO.

---

## 6. Hỗ Trợ & Khắc Phục Lỗi Thường Gặp

- **Lỗi `port 5432 is already in use`**: Mở Services trên Windows, tìm `postgresql-x64-...`, bấm Stop.
- **Lỗi `Connection refused (Redis / MinIO / PostgreSQL)`**: Đảm bảo Docker Desktop đã bật và chạy `docker compose up -d`.
- **Lỗi Frontend `Invalid API URL`**: Kiểm tra file `src/Frontend/.env.local` đã có `NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1`.
- **Thắc mắc nghiệp vụ**: Đọc file [docs/SRS_Culinary_Blog_v1.0.0.md](./SRS_Culinary_Blog_v1.0.0.md) hoặc nhắn trực tiếp trên nhóm chat đồ án!
