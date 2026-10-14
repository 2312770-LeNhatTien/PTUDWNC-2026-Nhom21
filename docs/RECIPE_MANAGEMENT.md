# Quản lý công thức cá nhân

## Phạm vi

- `/dashboard/recipes`: danh sách của người đăng nhập, phân trang và lọc Draft/Published/Archived; xác nhận lưu trữ và xóa mềm.
- `/dashboard/recipes/[id]/preview`: xem trước riêng, kể cả Draft/Archived.
- `/dashboard/recipes/[id]/edit`: sửa thông tin chính và dinh dưỡng, bảo toàn nguyên liệu/bước/ảnh; cảnh báo thay đổi chưa lưu.
- Xung đột 409 giữ nội dung đang nhập, cho quay lại sao chép hoặc tải phiên bản mới nhất. Tải lại sẽ thay nội dung chưa lưu.
- Cảnh báo khi rời form qua link trong trang/Navbar/Footer, form tìm kiếm hoặc đóng/tải lại tab. Back/Forward dùng Navigation API trên trình duyệt hỗ trợ; trình duyệt không có API này chưa chặn được điều hướng lịch sử trong SPA.

Publish và trình sửa nâng cao nguyên liệu/bước/ảnh tiếp tục theo phân công các thành viên; trang sửa này không thay các trình sửa đó.

## Hợp đồng API

Các endpoint dưới đây yêu cầu Author/Admin. Đọc/sửa một bài yêu cầu chủ sở hữu hoặc Admin. `/mine` luôn chỉ trả bài thuộc người đăng nhập, kể cả tài khoản Admin.

| Endpoint | Kết quả |
| --- | --- |
| `GET /api/v1/recipes/mine?page=1&pageSize=12&status=Draft` | `{data: MyRecipeDto[], meta: ...}`; status tùy chọn; hỗ trợ sortBy/sortOrder và sort theo D8 |
| `GET /api/v1/recipes/{id}/edit` | `{data: {recipe: RecipeDetailDto, rowVersion, createdAt, updatedAt}}` |
| `PUT /api/v1/recipes/{id}` | Gửi đầy đủ thông tin chính/dinh dưỡng và rowVersion; giữ response RecipeDetailDto phẳng, thêm rowVersion/createdAt/updatedAt |
| `PATCH /api/v1/recipes/{id}/archive` | HTTP 200, trả cùng cấu trúc như GET edit (thay cho 204 trước đây) |
| `DELETE /api/v1/recipes/{id}` | HTTP 204, xóa mềm |

`rowVersion` là chuỗi base64 của 16 byte, bắt buộc khi PUT. Phiên bản cũ trả ProblemDetails HTTP 409 có `errorCode: RECIPE_CONCURRENCY_CONFLICT`. Thiếu/sai chiều dài trả 400. Không tìm thấy/đã xóa trả 404; sai chủ sở hữu trả 403.

## Vì sao dùng trigger PostgreSQL?

Mapping hiện có `.IsRowVersion()` yêu cầu database sinh giá trị. PostgreSQL không tự sinh bytea giống SQL Server rowversion, nên chỉ so sánh token ở frontend không đủ chống hai request cùng lưu.

Migration `20261014120000_RecipeConcurrency` bổ sung trigger sinh token cho mọi INSERT/UPDATE Recipes, backfill token cũ và ràng buộc 16 byte. EF đưa token vào điều kiện UPDATE; database chỉ chấp nhận một trong hai lần ghi cùng phiên bản. Handler kiểm tra token từ client, đồng thời bắt `DbUpdateConcurrencyException` để trả 409 khi có cuộc đua thực tế.

Trigger trên nguyên liệu/bước/ảnh cập nhật phiên bản bài cha vì chúng cũng là một phần nội dung công thức. Migration không xóa bản ghi hay ảnh. Dữ liệu cũ thiếu CreatedAt không được gán một ngày sáng tác giả định; giao diện hiển thị “Chưa có thông tin”.

## Phiên đăng nhập

Form đăng nhập/đăng ký/Google hiện có tạo thêm cookie danh tính Auth.js qua provider `backend-token`. Provider kiểm tra access token với backend `/auth/me` trước khi tin id/vai trò. Middleware dùng cookie để chặn trang; API vẫn kiểm tra JWT và quyền owner/admin độc lập.

API client tiếp tục dùng kho token localStorage và refresh rotation hiện có. Không đọc token cũ từ cookie để ghi đè token đã refresh. Đăng xuất hoặc refresh thất bại luôn dọn token local và gọi Auth.js để kết thúc cookie phiên; lỗi mạng ở Auth.js không được ngăn việc dọn local/chuyển về login. Nếu Auth.js không truy cập được thì chưa thể xác nhận cookie HttpOnly đã được xóa. Đây là cầu nối cho luồng auth hiện tại; chưa chuyển toàn bộ token sang cookie.

## Kiểm thử

Chạy API Development ở cổng 5106 với **database thử nghiệm riêng**, cho phép CORS `http://localhost:3106`. Trong `src/Frontend`:

```powershell
npm ci
npx tsc --noEmit
$env:RECIPES_TEST_API_URL='http://localhost:5106/api/v1'
npm run test:recipes:api
$env:PLAYWRIGHT_CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:recipes
```

Playwright tự mở frontend 3106 và đặt API_URL, NEXT_PUBLIC_API_URL, AUTH_URL/NEXTAUTH_URL phù hợp để không redirect nhầm cổng 3000 từ `.env.local`. Có thể bỏ PLAYWRIGHT_CHROME_PATH nếu đã cài Chromium của Playwright.

API test xác minh token, quyền của tác giả khác, danh sách riêng/lọc, giữ dinh dưỡng và nội dung con, phiên cũ, hai request đồng thời, thay đổi nguyên liệu, lưu trữ và xóa mềm. Browser test dùng API thật, đăng nhập thật, hai tab sửa cùng bài, reload sau 409, lưu trữ và xóa từ dashboard. Các test tạo bài tạm và xóa mềm khi kết thúc; chỉ chạy trên database test.
