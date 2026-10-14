# BÁO CÁO LAB - MÔN PHÁT TRIỂN ỨNG DỤNG WEB NÂNG CAO

**Lab**: 03  
**Từ ngày**: 18/09/2026 &nbsp;&nbsp;&nbsp;&nbsp; **Đến ngày**: 24/09/2026  
**MSSV**: 2312792 &nbsp;&nbsp;&nbsp;&nbsp; **Họ và tên**: Nguyễn Đình Tuấn  
**Nhóm**: 21  

---

### Bảng Tiến Độ Công Việc

| STT | Công việc được giao | Liên kết đến GitHub branch | Tiến độ % |
| :---: | :--- | :--- | :---: |
| **1** | **Cài đặt các API endpoints, xử lý nghiệp vụ và giao diện Quản lý các bước nấu ăn (FR-RCP-010 Quản lý các bước nấu ăn - Tuân thủ Quyết định Kiến trúc D9)**<br><br>**Đã hoàn thành:**<br>- Định nghĩa các DTO và Commands trong tầng Application (Features/Recipes/Commands/ManageSteps/*): AddRecipeStepCommand, UpdateRecipeStepCommand, DeleteRecipeStepCommand và ReorderRecipeStepsCommand kế thừa IRequest<Result<RecipeStepDto>>.<br>- Cài đặt AddRecipeStepCommandHandler và UpdateRecipeStepCommandHandler tuân thủ nghiêm ngặt Quyết định kiến trúc D9: trường Title bắt buộc (kiểm tra hợp lệ bằng FluentValidation); nếu client không truyền StepNumber (hoặc null), hệ thống tự động gán StepNumber = Max(CurrentSteps.StepNumber) + 1.<br>- Cài đặt xử lý hoán đổi/sắp xếp lại thứ tự các bước (ReorderRecipeStepsCommandHandler) áp dụng cơ chế Two-phase save (gán số thứ tự âm tạm thời rồi cập nhật lại) để tránh lỗi vi phạm ràng buộc duy nhất (Unique Constraint) của database PostgreSQL.<br>- Cài đặt DeleteRecipeStepCommandHandler: Tự động đánh số lại (re-index) các bước phía sau khi một bước ở giữa bị xóa, đảm bảo chuỗi StepNumber luôn liên tục từ 1..N.<br>- Kiểm tra phân quyền truy cập: Chỉ tác giả của công thức nấu ăn hoặc người dùng có vai trò Admin mới có quyền thêm/sửa/xóa/sắp xếp lại các bước nấu.<br>- Đăng ký và ánh xạ đầy đủ 4 RESTful API endpoints trong RecipesEndpoints.cs: POST /api/v1/recipes/{id}/steps, PUT /api/v1/recipes/{id}/steps/{stepId}, DELETE /api/v1/recipes/{id}/steps/{stepId}, PUT /api/v1/recipes/{id}/steps/reorder. Kiểm thử thành công 100% qua Scalar API Docs.<br>- Xây dựng component giao diện StepListEditor.tsx (Next.js 15 App Router): Thiết kế chuẩn ẩm thực, hiển thị danh sách các bước có đánh số thứ tự trực quan; hỗ trợ thêm bước mới, chỉnh sửa nội dung, thời gian đếm ngược (phút), tích hợp tải ảnh từng bước qua ImageUploader (MinIO) kèm nút xóa ảnh riêng biệt và cơ chế xử lý ảnh lỗi (fallback image).<br>- Toàn bộ mã nguồn backend và frontend được chú thích // chi tiết, rõ ràng, vượt qua toàn bộ kiểm tra dotnet build và 
pm run lint (0 errors, 0 warnings).<br><br>**Chưa hoàn thành:**<br>- Không có (Đã hoàn thành 100%). | https://github.com/2312770-coder/PTUDWNC-2026-Nhom21/tree/2312792-NDTuan-Cac-Buoc-Nau | **100%** |

---

### Lưu ý:
- **Công việc được giao**: Liệt kê mỗi tính năng/chức năng/công việc được giao trên một dòng. Trong mỗi dòng, ghi cụ thể các bước/công đoạn đã thực hiện để hoàn thành công việc đó và những việc chưa hoàn thành.
- **Tiến độ %**: Tự đánh giá mức độ hoàn thành và ghi vào cột Tiến độ %.