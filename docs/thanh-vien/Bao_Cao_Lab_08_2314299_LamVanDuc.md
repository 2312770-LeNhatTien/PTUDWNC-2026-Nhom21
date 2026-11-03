# BÁO CÁO LAB 8 — KIỂM THỬ TỰ ĐỘNG E2E, RFC 7807 VÀ NGHIỆM THU PHÂN HỆ AUTHENTICATION & SECURITY

**MSSV:** 2314299 — **Họ tên:** Lâm Văn Đức  
**Môn:** Phát triển ứng dụng web nâng cao  
**Nhóm:** 21 | **Nhánh Git:** `2314299-LamVanDuc-buoi8`  
**Vai trò:** Phụ trách Phân hệ Xác thực & An toàn Hệ thống (Authentication, Security & Background Jobs)

---

## 1. Tổng Quan Nhiệm Vụ Tuần 8 (Lab 8)

Căn cứ theo tài liệu phân công chính thức `docs/HUONG_DAN_KHAC_PHUC_SAU_RA_SOAT.md` (mục 5 - P02, Q01-Q03/U03) và lộ trình cá nhân `docs/thanh-vien/2314299_LamVanDuc.md`:

| # | Hạng mục nhiệm vụ | Chi tiết kỹ thuật | Trạng thái |
|---|---|---|---|
| **P02.1** | **Chuẩn hóa RFC 7807 ProblemDetails** | Thống nhất định dạng `application/problem+json` trên toàn bộ endpoint Auth: 400 (Validation), 401 (Unauthorized), 403 (Forbidden), 409 (Conflict), 429 (Rate Limit). Bổ sung `errorCode`, `correlationId`, không để lộ SQL/stack trace. | ✅ Hoàn thành |
| **P02.2** | **Security Headers & Reverse Proxy** | Kiểm tra `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS, tương thích CSP với Google Sign-In SDK. Rà soát `ForwardedHeadersOptions` qua Nginx Docker. | ✅ Hoàn thành |
| **Q02.1** | **Bộ kiểm thử tự động xUnit Backend E2E** | Xây dựng suite `AuthE2EIntegrationTests.cs` kiểm thử luồng vòng đời đầy đủ, kiểm tra lưu trữ hash bảo mật trong DB, kiểm tra `PendingJob.Welcome` (R08), kiểm thử cơ chế Rate Limiting chống Brute-Force (D7/R20). | ✅ Hoàn thành (4/4 passed) |
| **Q02.2** | **Kiểm thử tấn công Token Reuse Detection** | Mô phỏng tấn công gửi lại Refresh Token cũ đã bị xoay vòng (Token Rotation) $\rightarrow$ Hệ thống kích hoạt Reuse Detection thu hồi toàn bộ token family (fail-closed, 401). | ✅ Hoàn thành |
| **Q01.1** | **Bộ kiểm thử tự động giao diện Playwright E2E** | Xây dựng suite `src/Frontend/tests/auth-e2e.spec.ts` kiểm thử 5 kịch bản UI (Validation form, RFC 7807 409/401/429 alerts, trạng thái Authenticated trên Navbar và luồng Đăng xuất thu hồi phiên). | ✅ Hoàn thành (5/5 passed) |
| **Q03.1** | **Bộ kịch bản Postman Collection & Environment** | Tạo file `CulinaryBlog_Auth_Security_E2E.postman_collection.json` và `CulinaryBlog_Local.postman_environment.json` phục vụ chạy kiểm thử tích hợp độc lập qua Postman hoặc Newman CLI. | ✅ Hoàn thành |
| **P01.2** | **Nghiệm thu phân hệ trên môi trường Deployment** | Đối chiếu cookie phiên Hangfire Dashboard (`/hangfire`) có đầy đủ cờ `Secure`, `SameSite=Lax`, path chuẩn theo Quyết định D14; CSP không chặn Google Sign-In và ảnh MinIO. | ✅ Hoàn thành |

---

## 2. Các Thay Đổi & Hiện Thực Kỹ Thuật Chi Tiết

### 2.1 Chuẩn hóa Định dạng Lỗi RFC 7807 ProblemDetails và Security Headers (P02)
- **ProblemDetails RFC 7807**: Toàn bộ phản hồi lỗi từ phân hệ Auth được định dạng đồng nhất qua `GlobalExceptionMiddleware.cs` và `DependencyInjection.cs`:
  - `400 Bad Request`: `errorCode = "VALIDATION_FAILED"`, kèm từ điển `errors` chi tiết từng trường nhập liệu.
  - `401 Unauthorized`: `errorCode = "HTTP_401"`, thông báo rõ ràng cho người dùng nhưng không tiết lộ chi tiết tài khoản tồn tại hay không.
  - `403 Forbidden`: `errorCode = "HTTP_403"`, bảo vệ tài nguyên riêng tư và route quản trị.
  - `409 Conflict`: `errorCode = "RESOURCE_CONFLICT"` hoặc `"GOOGLE_ACCOUNT_LINK_REQUIRED"`.
  - `429 Too Many Requests`: `errorCode = "RATE_LIMIT_EXCEEDED"`, kèm đầy đủ các headers điều tiết: `Retry-After: 60`, `X-RateLimit-Limit: 5`, `X-RateLimit-Remaining: 0`.
- **Security Headers chuẩn OWASP**:
  ```http
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains (trên HTTPS/Production)
  ```

---

### 2.2 Bộ Kiểm Thử Tự Động xUnit Backend E2E (`tests/Backend.Tests/AuthE2EIntegrationTests.cs`)
File kiểm thử mới được tích hợp vào bộ test runner của dự án, sử dụng PostgreSQL và InMemory configuration mô phỏng môi trường thật:

1. **`E2E_Full_User_Lifecycle_And_Pending_Jobs_Flow`**:
   - Khởi tạo người dùng ngẫu nhiên qua `POST /api/v1/auth/register` (HTTP 201 Created).
   - Kiểm tra Database PostgreSQL: Bản ghi `PendingJobs` loại `"welcome"` được tạo thành công ngay trong cùng giao dịch tạo người dùng (R08 & FR-JOB-001).
   - Kiểm tra bảng `RefreshTokens`: Token gốc được băm bằng SHA-256 (`TokenHash`), bảo vệ tuyệt đối không lưu plain text token theo SRS 7.8.
   - Gọi `GET /api/v1/auth/me` kiểm tra hồ sơ tác giả, xác nhận không để lộ trường nhạy cảm `passwordHash`.
   - Cập nhật hồ sơ qua `PATCH /api/v1/auth/me` thành công.
   - Xoay vòng Refresh Token Rotation qua `POST /api/v1/auth/refresh` (HTTP 200 OK), cấp token mới và đánh dấu thu hồi token cũ.
   - Đăng xuất qua `POST /api/v1/auth/logout` (HTTP 204 No Content), thu hồi token trên Database.
   - Kiểm tra dùng lại token sau khi đăng xuất $\rightarrow$ Bị từ chối HTTP 401 Unauthorized.

2. **`Token_Reuse_Attack_Triggers_Reuse_Detection_And_Invalidates_Entire_Token_Family`**:
   - Thực hiện refresh token hợp lệ: $T_1 \rightarrow T_2$.
   - Kẻ tấn công giả lập gửi lại $T_1$ cũ đã bị xoay vòng.
   - Hệ thống phát hiện xâm phạm an ninh $\rightarrow$ Trả về HTTP 401 Unauthorized theo RFC 7807.
   - **Reuse Detection kích hoạt**: Toàn bộ chuỗi token family của phiên (bao gồm cả $T_2$) bị đánh dấu `IsRevoked = true` trong CSDL, vô hiệu hóa toàn diện phiên làm việc để bảo vệ người dùng.

3. **`RFC7807_ProblemDetails_And_Security_Headers_On_Auth_Endpoints`**:
   - Kiểm tra mã lỗi 400, 401, 409 đều trả `Content-Type: application/problem+json`, có `errorCode` và headers `nosniff`, `DENY`.

4. **`Rate_Limiting_On_Login_Endpoint_Enforces_D7_Policy`**:
   - Kiểm tra endpoint `/api/v1/auth/login` khi gửi quá ngưỡng giới hạn tần suất $\rightarrow$ Nhận HTTP 429 Too Many Requests kèm `Retry-After`.

---

### 2.3 Bộ Kiểm Thử Tự Động Giao Diện Playwright E2E (`src/Frontend/tests/auth-e2e.spec.ts`)
Bao phủ 5 kịch bản giao diện người dùng trực quan:
- **TC01**: Validate dữ liệu phía Client trên trang `/register` (kiểm tra định dạng email, độ dài mật khẩu $\ge 8$ ký tự, khớp mật khẩu xác nhận).
- **TC02**: Hiển thị cảnh báo lỗi RFC 7807 khi đăng ký trùng email (`role="alert"`, mã 409 Conflict).
- **TC03**: Hiển thị cảnh báo lỗi RFC 7807 khi đăng nhập sai thông tin (mã 401 Unauthorized).
- **TC04**: Hiển thị cảnh báo Rate Limiting khi đăng nhập liên tiếp vượt ngưỡng (mã 429 Too Many Requests).
- **TC05**: Trạng thái Xác thực trên Navbar (Avatar, Tên tác giả "Lâm Văn Đức", Huy hiệu "Tác giả", Menu liên kết cá nhân) và thực hiện Đăng xuất an toàn thu hồi phiên trên server rồi chuyển về trạng thái Khách vãng lai (`/login`).

---

### 2.4 Bộ Kịch Bản Postman Collection & Environment
- **File Collection:** `tests/postman/CulinaryBlog_Auth_Security_E2E.postman_collection.json`
- **File Environment:** `tests/postman/CulinaryBlog_Local.postman_environment.json`
- Gồm **13 Requests** tuần tự có kịch bản Pre-request Script tự động sinh email ngẫu nhiên, tự động trích xuất và gán biến `accessToken`, `refreshToken`, `oldRotatedRefreshToken`, kèm mã Test Assertions kiểm tra chặt chẽ Status Code, định dạng RFC 7807 ProblemDetails và Headers bảo mật.

---

## 3. Bằng Chứng Kiểm Chứng & Kết Quả Chạy Thực Tế

### 3.1 Kết quả kiểm thử Backend (`dotnet test`)
Chạy kiểm thử toàn bộ giải pháp Backend trên môi trường local với PostgreSQL container:

```powershell
dotnet test C:\Users\ASUS\source\repos\PTUDWNC-2026-Nhom21\tests\Backend.Tests\Backend.Tests.csproj -c Release
```

**Kết quả ghi nhận:**
```
Test run for Backend.Tests.dll (.NETCoreApp,Version=v10.0)
A total of 1 test files matched the specified pattern.

Passed!  - Failed:     0, Passed:    64, Skipped:     0, Total:    64, Duration: 22 s
```
- **Bộ test E2E mới (`AuthE2EIntegrationTests.cs`)**: **4/4 passed (100%)**
- **Toàn bộ suite Backend (`Backend.Tests`)**: **64/64 passed (100%)**, không có bất kỳ hồi quy (regression) nào.

---

### 3.2 Kết quả kiểm thử Giao diện Playwright (`playwright test`)
Chạy kiểm thử tự động giao diện người dùng:

```powershell
node src/Frontend/node_modules/@playwright/test/cli.js test --config src/Frontend/playwright.config.ts auth-e2e
```

**Kết quả ghi nhận:**
```
Running 5 tests using 1 worker

  ok 1 tests/auth-e2e.spec.ts:25:7 › TC01: Form Đăng ký validate Client-side chính xác (3.4s)
  ok 2 tests/auth-e2e.spec.ts:50:7 › TC02: Đăng ký trùng email hiển thị RFC 7807 (409 Conflict) (1.6s)
  ok 3 tests/auth-e2e.spec.ts:85:7 › TC03: Đăng nhập sai thông tin hiển thị RFC 7807 (401 Unauthorized) (3.3s)
  ok 4 tests/auth-e2e.spec.ts:115:7 › TC04: Đăng nhập vượt tần suất hiển thị Rate Limiting (429) (1.7s)
  ok 5 tests/auth-e2e.spec.ts:149:7 › TC05: Trạng thái Authenticated Navbar & Đăng xuất an toàn (5.4s)

  5 passed (31.0s)
```
- **Tỷ lệ đạt**: **5/5 passed (100%)**.

---

### 3.3 Kiểm tra Biên dịch & Type Checking
- **Backend Build (`dotnet build`)**: 0 Error(s), 0 Warning(s).
- **Frontend Typecheck (`tsc --noEmit`)**: 0 Error(s).

---

## 4. Quản Lý Nhánh & Commit Git

- **Nhánh làm việc**: `2314299-LamVanDuc-buoi8`
- **Các file thêm mới và hoàn thiện trong đợt này**:
  1. `tests/Backend.Tests/AuthE2EIntegrationTests.cs`: Bộ test tích hợp xUnit E2E cho phân hệ Auth.
  2. `src/Frontend/tests/auth-e2e.spec.ts`: Bộ test Playwright E2E UI cho phân hệ Auth.
  3. `tests/postman/CulinaryBlog_Auth_Security_E2E.postman_collection.json`: Bộ Postman Collection E2E.
  4. `tests/postman/CulinaryBlog_Local.postman_environment.json`: Postman Environment cấu hình biến môi trường.
  5. `docs/thanh-vien/Bao_Cao_Lab_08_2314299_LamVanDuc.md`: Báo cáo nghiệm thu cá nhân Lab 08.

---

## 5. Kết Luận & Tự Đánh Giá

| Hạng mục tiêu chí | Kết quả nghiệm thu | Đánh giá |
|---|---|:---:|
| Chuẩn hóa RFC 7807 ProblemDetails phân hệ Auth | Đạt chuẩn `application/problem+json` trên 400, 401, 403, 409, 429 | ✅ Đạt 100% |
| Security Headers chuẩn OWASP | Có đầy đủ `nosniff`, `DENY`, `strict-origin-when-cross-origin` | ✅ Đạt 100% |
| Cơ chế Token Rotation & Reuse Detection | Phát hiện tấn công và vô hiệu hóa toàn bộ token family ngay lập tức | ✅ Đạt 100% |
| Rate Limiting bảo vệ Endpoint nhạy cảm | Giới hạn 5 req/phút endpoint login, có Retry-After và X-RateLimit-* | ✅ Đạt 100% |
| Bộ kiểm thử tự động xUnit Backend E2E | 4/4 test cases passed (tổng suite Backend đạt 64/64 passed) | ✅ Đạt 100% |
| Bộ kiểm thử tự động giao diện Playwright E2E | 5/5 test cases passed | ✅ Đạt 100% |
| Postman Collection & Environment E2E | Đầy đủ 13 requests tích hợp assertions tự động | ✅ Đạt 100% |
| Tự đánh giá mức độ hoàn thành nhiệm vụ Lab 8 | **Hoàn thành xuất sắc 100% khối lượng công việc** | **100%** |
