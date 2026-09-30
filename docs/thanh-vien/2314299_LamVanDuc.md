# Hướng Dẫn Chi Tiết & Phân Công Nhiệm Vụ
### Thành viên: Lâm Văn Đức (MSSV: 2314299)
### Vai trò: Authentication & Security

---

## 1. Thông Tin Chung
- **Họ và tên**: Lâm Văn Đức
- **MSSV**: 2314299
- **Email**: 2314299@dlu.edu.vn
- **GitHub**: [https://github.com/2314299-debug](https://github.com/2314299-debug)
- **Tổng số chức năng phụ trách**: **7 chức năng**

---

## 2. Danh Sách 7 Chức Năng Phụ Trách

| STT | Mã FR | Tên chức năng | File Backend cần làm | File Frontend cần làm |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **FR-AUTH-001** | Đăng ký tài khoản mới | `Features/Auth/Commands/Register/*` | `app/(auth)/register/page.tsx` |
| 2 | **FR-AUTH-002** | Đăng nhập Email/Mật khẩu + Rate Limiting | `Features/Auth/Commands/Login/*` | `app/(auth)/login/page.tsx` |
| 3 | **FR-AUTH-005** | Đăng xuất & Thu hồi phiên làm việc | `Features/Auth/Commands/Logout/*` | Nút Đăng xuất trên Navbar |
| 4 | **FR-AUTH-004** | Làm mới Access Token (Rotation) | `Features/Auth/Commands/RefreshToken/*` | `lib/api/client.ts` (Interceptor refresh ngầm) |
| 5 | **FR-AUTH-003** | Đăng nhập Google OAuth 2.0 | `Features/Auth/Commands/GoogleLogin/*` | Nút Google Sign-In trong form Login |
| 6 | **FR-RCP-005** | Xuất bản / Hủy xuất bản (D11) | `Features/Recipes/Commands/PublishRecipe/*` | Nút Xuất bản trong trang quản lý bài |
| 7 | **FR-JOB-001** | Gửi email chào mừng thành viên mới | `Infrastructure/Jobs/WelcomeEmailJob.cs` | Xem email gửi đến tại MailHog (:8025) |

---

## 3. Lộ Trình Thực Hiện (Tuần 2 → Tuần 8)

```
Tuần 2 (Đã hoàn thành & merge main):
  ✅ FR-AUTH-001 — Đăng ký tài khoản mới (Backend Identity + JWT & Frontend Form Register)

Tuần 3 (Đã hoàn thành & merge main):
  ✅ FR-AUTH-002 — Đăng nhập Email/Mật khẩu + Cấu hình Rate Limiting 5 req/phút chống Brute-Force

Tuần 4 (Tuần tới):
  🔲 FR-AUTH-005 — Đăng xuất tài khoản & Thu hồi Refresh Token trong CSDL (Backend + Frontend Navbar)
  🔲 FR-AUTH-004 — Làm mới Access Token (Refresh Token Rotation + Reuse Detection ngầm)

Tuần 5:
  🔲 FR-AUTH-003 — Đăng nhập bên thứ ba Google OAuth 2.0

Tuần 6:
  🔲 FR-RCP-005 — Xuất bản / Hủy xuất bản công thức (Tuân thủ điều kiện D11: >= 1 bước & >= 1 nguyên liệu)

Tuần 7:
  🔲 FR-JOB-001 — Hangfire background job tự động gửi email chào mừng qua MailHog

Tuần 8:
  🔲 Triển khai Production, Tinh chỉnh bảo mật luồng Auth, Guard Route Next.js, Hoàn thiện báo cáo
```

---

## 4. HƯỚNG DẪN CHI TIẾT TUẦN 2 (ĐÃ HOÀN THÀNH)

> ⚠️ **Quy ước nhánh**: Mỗi chức năng làm trên **một nhánh riêng** tự tạo từ `main`, cú pháp: `2314299-LVDuc-<Ten-Chuc-Nang>`. **Không tự merge vào `main`** — báo trưởng nhóm Tiến để Tiến review và merge giúp.

---

### Chức năng: Đăng ký tài khoản (FR-AUTH-001)

#### Bước 1: Tạo nhánh mới từ `main`
```powershell
git checkout main
git pull origin main
git checkout -b 2314299-LVDuc-Dang-Ky
```

#### Bước 2: Hiện thực Backend
1. Mở file `src/Backend/CulinaryBlog.Application/Features/Auth/Commands/Register/RegisterCommandHandler.cs`.
2. Thay thế dòng ném `NotImplementedException`:
   - Kiểm tra email đã tồn tại chưa: `await _userManager.FindByEmailAsync(request.Email)`. Nếu có ném `ConflictException("Email đã được sử dụng.")`.
   - Tạo user: `var user = ApplicationUser.Create(request.Email, request.DisplayName, request.UserName)`.
   - Lưu qua Identity: `var result = await _userManager.CreateAsync(user, request.Password)`.
   - Gán role "Author": `await _userManager.AddToRoleAsync(user, "Author")`.
   - Tạo Access Token và Refresh Token qua `_jwtTokenGenerator` và lưu refresh token vào database.
   - Trả về `AuthResponseDto`.
3. Kiểm tra validation trong `RegisterCommandValidator.cs` (Email hợp lệ, Mật khẩu >= 8 ký tự).

#### Bước 3: Hiện thực Frontend
1. Mở file `src/Frontend/app/(auth)/register/page.tsx`.
2. Dựng form đăng ký: Email, Tên hiển thị, Tên đăng nhập (tùy chọn), Mật khẩu, Xác nhận mật khẩu.
3. Khi submit, gọi `POST /api/v1/auth/register`, nếu thành công lưu token và chuyển hướng về trang chủ.

#### Bước 4: Kiểm tra và đẩy nhánh lên GitHub
```powershell
dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
cd src\Frontend; npm run lint; cd ..\..

git add .
git commit -m "auth: hien thuc FR-AUTH-001 dang ky tai khoan"
git push -u origin 2314299-LVDuc-Dang-Ky
```

---

## 5. HƯỚNG DẪN CHI TIẾT TUẦN 3 (ĐÃ HOÀN THÀNH)

> ⚠️ **Quy ước nhánh**: Mỗi chức năng làm trên **một nhánh riêng** tự tạo từ `main`, cú pháp: `2314299-LVDuc-<Ten-Chuc-Nang>`. Sau khi code xong và test build không lỗi, gửi PR để trưởng nhóm Tiến review và merge.

---

### Chức năng: Đăng nhập Email/Mật khẩu + Rate Limiting (FR-AUTH-002)

#### Bước 1: Tạo nhánh mới từ `main`
```powershell
git checkout main
git pull origin main
git checkout -b 2314299-LVDuc-Dang-Nhap
```

#### Bước 2: Hiện thực Backend
1. Tạo thư mục `src/Backend/CulinaryBlog.Application/Features/Auth/Commands/Login/`:
   - `LoginCommand(string Email, string Password)` : `IRequest<AuthResponseDto>`
   - `LoginCommandValidator`: Email hợp lệ, Password không được để trống.
   - `LoginCommandHandler`:
     - Tìm user theo email: `await _userManager.FindByEmailAsync(request.Email)`. Nếu không có, ném `UnauthorizedException("Email hoặc mật khẩu không chính xác.")`.
     - Kiểm tra tài khoản có bị khóa không: `await _userManager.IsLockedOutAsync(user)`.
     - Kiểm tra mật khẩu: `await _userManager.CheckPasswordAsync(user, request.Password)`. Nếu sai, tăng số lần đăng nhập hỏng (`AccessFailedAsync`), nếu đủ 5 lần thì tự động khóa tạm thời 15 phút.
     - Nếu đúng, reset số lần sai (`ResetAccessFailedCountAsync`), sinh JWT Access Token + Refresh Token (lưu vào bảng `RefreshTokens`), trả về `AuthResponseDto`.
2. **Kỹ thuật Rate Limiting**:
   - Mở `src/Backend/CulinaryBlog.API/DependencyInjection.cs`, cấu hình Rate Limiting bằng ASP.NET Core `AddRateLimiter` (giới hạn 5 request/phút cho endpoint login).
   - Đăng ký route `POST /api/v1/auth/login` trong `AuthEndpoints.cs`.

#### Bước 3: Hiện thực Frontend
1. Tạo trang `src/Frontend/app/(auth)/login/page.tsx`:
   - Form nhập Email và Mật khẩu.
   - Xử lý gọi API POST `/api/v1/auth/login`.
   - Khi thành công: Lưu token vào Cookie/LocalStorage, cập nhật trạng thái User trên Navbar và chuyển hướng về trang chủ `/`.
   - Hiển thị thông báo lỗi rõ ràng nếu đăng nhập thất bại hoặc tài khoản bị khóa tạm thời.

#### Bước 4: Kiểm tra và đẩy nhánh lên GitHub
```powershell
dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
cd src\Frontend; npx tsc --noEmit; cd ..\..

git add .
git commit -m "auth: hien thuc FR-AUTH-002 dang nhap email rate limiting"
git push -u origin 2314299-LVDuc-Dang-Nhap
```

---

## 6. HƯỚNG DẪN CHI TIẾT TUẦN 4: NHÁNH BUỔI 4 & GIẢI TRÌNH KỸ THUẬT

> ⚠️ **QUY ƯỚC NHÁNH MỚI TỪ TUẦN 4**:
> - Tạo **1 nhánh duy nhất cho cả buổi 4**: `2314299-LamVanDuc-buoi4`.
> - Mọi chức năng đều commit trực tiếp trên nhánh này với tiền tố `feat/`.
> - Khi hoàn thành từng tính năng, tạo Pull Request vào `main` để trưởng nhóm Tiến review và gộp code.

```powershell
# Tạo nhánh duy nhất cho Buổi 4:
git checkout main
git pull origin main
git checkout -b 2314299-LamVanDuc-buoi4
```

---

### Task 1 (Giai đoạn 1 - Song song): Đăng xuất `POST /api/v1/auth/logout` (FR-AUTH-005)
* **Tiến trình trong nhóm**: Thực hiện ở đầu buổi, làm độc lập song song với các bạn khác.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Tạo `LogoutCommand(string RefreshToken)` và `LogoutCommandHandler` trong `Features/Auth/Commands/Logout/`*:
  2. *Băm SHA-256 chuỗi refresh token nhận từ Client trước khi tìm kiếm trong bảng `RefreshTokens`*:
     - 👉 **Tại sao?**: Database chỉ lưu `TokenHash` chứ không bao giờ lưu token gốc (SRS 7.8). Bắt buộc phải hash trước thì mới so khớp được với CSDL.
  3. *Gọi `refreshToken.Revoke()` và `await _context.SaveChangesAsync(ct)`*:
     - 👉 **Tại sao?**: Khi người dùng đăng xuất, refresh token phải bị hủy ngay lập tức trong database để nếu kẻ xấu nhặt được token cũng không thể dùng lại được.
  4. *Đăng ký endpoint `POST /api/v1/auth/logout` trong `AuthEndpoints.cs` (`RequireAuthorization`)*:
     - 👉 **Tại sao?**: Đảm bảo chỉ những ai có Access Token hợp lệ mới được thực hiện quyền thu hồi phiên của chính mình.
  5. *Kiểm tra biên dịch & Commit trên nhánh buổi 4*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     git add .
     git commit -m "feat/auth: cai dat endpoint POST auth logout thu hoi refresh token"
     ```

---

### Task 2 (Giai đoạn 2 - Phụ thuộc Task 1): Refresh Token Rotation `POST /api/v1/auth/refresh` (FR-AUTH-004)
* **Tiến trình trong nhóm**: Thực hiện tiếp theo sau Task 1.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Viết `RefreshTokenCommandHandler.cs`, băm SHA-256 token và tìm trong CSDL*:
  2. *Kiểm tra: Nếu token gửi lên đã có `IsRevoked == true` thì lập tức thu hồi toàn bộ token family của user đó và ném `UnauthorizedException`*:
     - 👉 **Tại sao?**: Đây là kỹ thuật **Reuse Detection (Phát hiện tấn công)**. Một token đã thu hồi mà lại được gửi lên chứng tỏ token đó đã bị kẻ gian đánh cắp. Việc thu hồi toàn bộ phiên buộc user phải đăng nhập lại để bảo vệ tài khoản.
  3. *Nếu hợp lệ: Đánh dấu thu hồi token cũ `Revoke(newTokenHash)`, cấp cặp token mới và lưu vào DB*:
     - 👉 **Tại sao?**: Đây là nguyên tắc **Rotation (Xoay vòng token)**: Mỗi refresh token chỉ được dùng đúng 1 lần. Cấp mới liên tục giúp hạn chế tối đa nguy cơ lộ token.
  4. *Đăng ký endpoint `POST /api/v1/auth/refresh` trong `AuthEndpoints.cs`*:
  5. *Kiểm tra biên dịch & Commit trên nhánh buổi 4*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     git add .
     git commit -m "feat/auth: cai dat endpoint POST auth refresh token rotation kem reuse detection"
     ```

---

### Task 3 (Giai đoạn 3 - Sau Task 1 & 2): Google Login & Xuất bản công thức D11 (FR-AUTH-003 & FR-RCP-005)
* **Tiến trình trong nhóm**: Hoàn thiện đăng nhập Google và quản lý trạng thái xuất bản bài viết.
* **Cách làm chi tiết & Tại sao bước đó lại làm như vậy**:
  1. *Hiện thực `GoogleLoginCommand(string IdToken)` và `GoogleLoginCommandHandler`*:
     - 👉 **Tại sao?**: Sử dụng thư viện `Google.Apis.Auth` để giải mã và xác thực token JWT do Google cấp. Nếu email chưa tồn tại trong hệ thống, tự động tạo mới tài khoản với Role `Author`.
  2. *Hiện thực `PublishRecipeCommand` và `UnpublishRecipeCommand` trong `Features/Recipes/Commands/PublishRecipe/`*:
     - 👉 **Tại sao?**: Tuân thủ nghiêm ngặt **Quyết định D11**. Khi xuất bản, hệ thống kiểm tra công thức phải có ít nhất 1 nguyên liệu (`Ingredients.Count >= 1`) và ít nhất 1 bước hướng dẫn (`Steps.Count >= 1`). Nếu không đủ điều kiện, ném `ValidationException("RECIPE_PUBLISH_INCOMPLETE")`.
  3. *Đăng ký route `POST /api/v1/auth/google`, `PATCH /api/v1/recipes/{id}/publish` và `PATCH /api/v1/recipes/{id}/unpublish`*:
  4. *Kiểm tra biên dịch toàn hệ thống, Commit & Đẩy nhánh lên GitHub*:
     ```powershell
     dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj
     git add .
     git commit -m "feat/auth: cai dat endpoint POST google login va PATCH publish unpublish kiem tra D11"
     git push -u origin 2314299-LamVanDuc-buoi4
     ```
  5. *Tạo Pull Request trên GitHub ứng với từng chức năng vào `main` để trưởng nhóm Tiến review & gộp code*.

---

## 7. Tiêu Chí Nghiệm Thu (Definition of Done)
- [ ] 100% các API endpoints được phân công đã được đăng ký và hoạt động chính xác trên Scalar (`http://localhost:5000/scalar/v1`):
  - `POST /api/v1/auth/logout`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/google`
  - `PATCH /api/v1/recipes/{id}/publish`
  - `PATCH /api/v1/recipes/{id}/unpublish`
- [ ] Backend biên dịch đạt 0 lỗi (`dotnet build src/Backend/CulinaryBlog.API/CulinaryBlog.API.csproj`).
- [ ] Đăng xuất thu hồi token trong DB thành công; Reuse Detection phát hiện token cũ và hủy toàn bộ phiên.
- [ ] Kiểm tra điều kiện D11: chặn xuất bản nếu công thức thiếu bước nấu hoặc nguyên liệu.
- [ ] Nhánh buổi 4 `2314299-LamVanDuc-buoi4` đã được đẩy lên GitHub và tạo PR gộp vào `main`.

---

## 8. LỘ TRÌNH CHI TIẾT CÁC TUẦN TIẾP THEO (TUẦN 5 → TUẦN 8)

### 📅 Tuần 5 (Lab 5): Giao diện Xác thực, Google OAuth 2.0 & Silent Refresh
* **Nhánh làm việc**: `2314299-LamVanDuc-buoi5`
* **Nhiệm vụ trọng tâm**:
  1. Xây dựng giao diện Đăng nhập và Đăng ký trên Next.js 15:
     - Form đăng nhập chuẩn UX, validation email và mật khẩu với thông báo lỗi rõ ràng.
     - Nút đăng nhập một chạm Google OAuth 2.0 tích hợp Google Identity Services SDK.
  2. Cấu hình Axios Interceptor trong `src/Frontend/lib/api/client.ts`:
     - Bắt mã lỗi HTTP 401 khi Access Token hết hạn, tự động gọi endpoint `POST /api/v1/auth/refresh` ngầm để lấy token mới mà không làm gián đoạn trải nghiệm người dùng.
  3. Hoàn thiện dropdown Menu cá nhân trên Navbar kèm nút Đăng xuất (xóa token và chuyển trạng thái về Guest).

### 📅 Tuần 6 (Lab 6): Luồng Xuất bản công thức & Phân quyền Middleware Next.js
* **Nhánh làm việc**: `2314299-LamVanDuc-buoi6`
* **Nhiệm vụ trọng tâm**:
  1. Xây dựng UI thao tác Xuất bản / Gỡ xuất bản (Publish / Unpublish):
     - Công tắc (toggle switch) Publish trên trang soạn thảo công thức.
     - Kiểm tra điều kiện **Quyết định D11**: nếu chưa có đủ $\ge 1$ bước nấu và $\ge 1$ nguyên liệu thì hiển thị Modal cảnh báo chi tiết và không cho xuất bản.
  2. Thiết lập Next.js `middleware.ts`:
     - Phân quyền truy cập các đường dẫn bảo mật (`/admin/*`, `/dashboard/*`, `/profile`) theo Role JWT.
     - Chuyển hướng người dùng về trang `/login` nếu chưa đăng nhập hoặc hiển thị trang `403 Forbidden` nếu không đủ quyền.

### 📅 Tuần 7 (Lab 7): Hangfire Background Job gửi Email Chào mừng thành viên
* **Nhánh làm việc**: `2314299-LamVanDuc-buoi7`
* **Nhiệm vụ trọng tâm**:
  1. Hiện thực `FR-JOB-001`: Tích hợp thư viện `MailKit` gửi email qua container Docker `MailHog` (SMTP cổng 1025).
  2. Thiết lập Hangfire Background Job `SendWelcomeEmailJob`:
     - Kích hoạt bất đồng bộ ngay sau khi người dùng đăng ký tài khoản thành công (`RegisterCommandHandler` hoặc `GoogleLoginCommandHandler`).
     - Tự động thử lại (retry) tối đa 3 lần nếu gặp sự cố mạng.
  3. Thiết kế Template Email HTML chào mừng chuyên nghiệp với thương hiệu Culinary Blog.

### 📅 Tuần 8 (Lab 8): Kiểm thử tự động E2E toàn bộ luồng Auth & Nghiệm thu
* **Nhánh làm việc**: `2314299-LamVanDuc-buoi8`
* **Nhiệm vụ trọng tâm**:
  1. Xây dựng bộ kịch bản kiểm thử tích hợp tự động E2E (End-to-End Testing) bằng Postman Collection / Newman:
     - Luồng 1: Đăng ký -> Đăng nhập -> Lấy Me -> Refresh Token -> Đăng xuất.
     - Luồng 2: Tấn công tái sử dụng Refresh Token cũ và kiểm tra xem hệ thống có tự động thu hồi toàn bộ token family (Reuse Detection) hay không.
  2. Cùng cả nhóm rà soát toàn bộ chức năng, kiểm thử chéo và chuẩn bị tài liệu báo cáo nghiệm thu.

