# Hướng Dẫn Quản Lý Cơ Sở Dữ Liệu & Nạp Dữ Liệu Công Thức (Database Guide)
### Dự án: Culinary Blog — Nhóm 21 (PTUDWNC-2026)

Tài liệu này hướng dẫn chi tiết về cấu trúc cơ sở dữ liệu PostgreSQL, các lệnh EF Core Migration, cơ chế tự động nạp bộ 30 công thức đã biên soạn và cách kiểm tra dữ liệu trong hệ thống.

---

## 1. Tổng Quan Kiến Trúc Cơ Sở Dữ Liệu

Hệ thống sử dụng **PostgreSQL 16** kết hợp **EF Core 10** theo mô hình Code-First:
- **Tự động áp dụng Migration**: Khi chạy ứng dụng Backend ở môi trường `Development`, `Program.cs` sẽ tự động thực thi `db.Database.MigrateAsync()`.
- **Global Query Filter (Soft Delete)**: Mọi bảng kế thừa `BaseEntity` (`Recipes`, `Categories`, v.v.) tự động áp dụng bộ lọc `WHERE "IsDeleted" = false`. Khi xóa mềm, dữ liệu không bị mất khỏi CSDL.
- **Optimistic Concurrency Control**: Cột `RowVersion` (kiểu `bytea`) ngăn chặn xung đột khi nhiều người cùng chỉnh sửa một bản ghi.

### Các bảng chính trong CSDL:
| Tên Bảng | Thực thể tương ứng | Mô tả |
| :--- | :--- | :--- |
| `AspNetUsers`, `AspNetRoles`... | `ApplicationUser` | Quản lý người dùng, vai trò phân quyền (ASP.NET Core Identity). |
| `Categories` | `Category` | Danh mục ẩm thực (Món chính, Món nước, Món nướng BBQ, v.v.). |
| `Recipes` | `Recipe` | Công thức nấu ăn (Aggregate Root), nhúng kèm cột dinh dưỡng `Nutrition_*`. |
| `RecipeIngredients` | `RecipeIngredient` | Danh sách nguyên liệu chi tiết cho từng công thức. |
| `RecipeSteps` | `RecipeStep` | Các bước chế biến (kèm hẹn giờ và ảnh minh họa). |
| `RecipeImages` | `RecipeImage` | Gallery ảnh công thức (lưu đường dẫn MinIO S3). |
| `RefreshTokens` | `RefreshToken` | Quản lý phiên đăng nhập JWT, chống tấn công replay token. |

---

## 2. Bộ công thức đi kèm ứng dụng

`DatabaseSeeder.cs` ở tầng Infrastructure đọc dữ liệu cố định từ `Persistence/Data/vietnamese-recipes.json` (embedded resource). Nạp 22 danh mục chuẩn, 30 công thức của Lê Nhật Tiến, 295 nguyên liệu, 95 bước nấu, 30 ảnh bìa và 27 ảnh bước nấu. Ảnh nằm trong `src/Frontend/public/recipe-images/`, được Git theo dõi và Docker frontend đóng gói.

Không còn Bogus hay tài khoản tác giả giả. Số nguyên liệu/bước nấu phụ thuộc từng món; dinh dưỡng chưa xác minh để trống. Nguồn Hungry Huy được ghi trong nội dung công thức. Tài khoản Admin Development vẫn dùng `admin@culinary.local` / `Admin@123`; hồ sơ Tiến trên máy mới không có mật khẩu, không sao chép tài khoản cá nhân. Xem [SETUP.md](SETUP.md).

Seeder chạy trong một transaction, nhận diện và xóa bài mẫu cũ bằng email tác giả demo cùng nội dung mẫu đã biết. Không xóa bài thật của thành viên; xóa tác giả giả chỉ khi không còn bài/đánh giá. Đây là dọn dữ liệu kiểm thử theo D20, không thay đổi soft-delete của nghiệp vụ. Chạy lại không nhân bản bài và giữ nội dung/ảnh đã chỉnh sửa.

---

## 3. Các Bước Khởi Chạy & Nạp Dữ Liệu Mới

### Bước 1: Khởi động container PostgreSQL
Đảm bảo **Docker Desktop đang chạy**, sau đó mở terminal tại thư mục gốc dự án:
```powershell
docker compose up -d postgres
```
Kiểm tra container `culinaryblog-postgres` đang ở trạng thái `Up` (cổng `5432`).

### Bước 2: Chạy Backend để tự động Migrate & Seed Data
Chỉ cần chạy lệnh sau từ thư mục gốc:
```powershell
dotnet run --project src/Backend/CulinaryBlog.API
```
> **Cơ chế hoạt động**:
> - Backend phát hiện môi trường `Development`.
> - Tự động gọi `db.Database.MigrateAsync()` để tạo các bảng nếu chưa có.
> - Tự động gọi `DatabaseSeeder.SeedAsync()` để nạp 22 danh mục và bộ 30 công thức cố định.
> - Bạn sẽ thấy log chi tiết:
>   `Tổng kết cơ sở dữ liệu hiện có: Đã dọn ... bài mẫu; hiện có 30 công thức.`

---

## 4. Các Lệnh Quản Lý EF Core Migration Thường Dùng

Nếu cần thay đổi cấu trúc bảng hoặc reset database:

### Tạo Migration mới:
```powershell
dotnet ef migrations add <TenMigration> `
  --project src/Backend/CulinaryBlog.Infrastructure `
  --startup-project src/Backend/CulinaryBlog.API `
  --output-dir Persistence/Migrations
```

### Cập nhật database theo Migration:
```powershell
dotnet ef database update `
  --project src/Backend/CulinaryBlog.Infrastructure `
  --startup-project src/Backend/CulinaryBlog.API
```

### Cập nhật bộ dữ liệu trên database đang dùng

Pull code mới và chạy backend Development như trên. Không dùng `docker compose down -v`: thao tác đó xóa cả dữ liệu thành viên và ảnh upload. Nếu đặt `Database__InitializeOnStartup=false`, chạy seeder thủ công sau migration theo [SETUP.md](SETUP.md).

---

## 5. Hướng Dẫn Kết Nối Trực Tiếp Kiểm Tra CSDL

Bạn có thể kết nối vào PostgreSQL bằng **DBeaver**, **pgAdmin**, hoặc extension **Database Client** trong VS Code:

- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `culinary_blog`
- **Username**: `postgres`
- **Password**: `postgres`

### Các câu lệnh SQL kiểm tra nhanh số lượng:
```sql
-- Kiểm tra tổng số danh mục (kết quả >= 20)
SELECT COUNT(*) AS total_categories FROM "Categories" WHERE "IsDeleted" = false;

-- Kiểm tra tổng số công thức (30 bài đi kèm, cộng bài thật thành viên tạo thêm)
SELECT COUNT(*) AS total_recipes FROM "Recipes" WHERE "IsDeleted" = false;

-- Kiểm tra số lượng nguyên liệu trong từng công thức (theo đúng từng món)
SELECT "RecipeId", COUNT(*) AS ingredient_count 
FROM "RecipeIngredients" 
GROUP BY "RecipeId" 
ORDER BY ingredient_count ASC;

-- Kiểm tra số lượng bước chế biến trong từng công thức (theo đúng từng món)
SELECT "RecipeId", COUNT(*) AS step_count 
FROM "RecipeSteps" 
GROUP BY "RecipeId" 
ORDER BY step_count ASC;
```

---

## 6. Kiểm Tra Qua Giao Diện API & Web

1. **Kiểm tra API trên Scalar**:
   - Truy cập: `http://localhost:5000/scalar/v1`
   - Gọi `GET /api/v1/categories` -> Trả về danh sách 22 danh mục.
   - Gọi `GET /api/v1/recipes?page=1&pageSize=12` -> Trả về danh sách phân trang công thức.
2. **Kiểm tra trên Giao diện Web Frontend**:
   - Truy cập: `http://localhost:3000` hoặc `http://localhost:3000/recipes`
   - Khám phá 30 công thức có nguồn và ảnh đã được nạp sẵn.
