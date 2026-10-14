# BÁO CÁO LAB - MÔN PHÁT TRIỂN ỨNG DỤNG WEB NÂNG CAO

**Lab**: 01  
**Từ ngày**: 09/09/2026 &nbsp;&nbsp;&nbsp;&nbsp; **Đến ngày**: 17/09/2026  
**MSSV**: 2312792 &nbsp;&nbsp;&nbsp;&nbsp; **Họ và tên**: Nguyễn Đình Tuấn  
**Nhóm**: 21  

---

### Bảng Tiến Độ Công Việc

| STT | Công việc được giao | Liên kết đến GitHub branch | Tiến độ % |
| :---: | :--- | :--- | :---: |
| **1** | **Cài đặt các API endpoints và dịch vụ lưu trữ cho việc tải file ảnh (FR-FILE-001 Upload File to MinIO)**<br><br>**Đã hoàn thành:**<br>- Tích hợp package AWSSDK.S3 (v3.7.400) và đăng ký dịch vụ IAmazonS3 vào DI container trong `Infrastructure/DependencyInjection.cs`.<br>- Định nghĩa interface `IFileStorageService` trong tầng Application với phương thức `UploadAsync(...)`.<br>- Cài đặt lớp `MinioFileStorageService` trong Infrastructure: kiểm tra định dạng MIME hợp lệ (chỉ cho phép `image/jpeg`, `image/png`, `image/webp`); kiểm tra Magic Bytes đầu luồng byte (stream) để chống giả mạo định dạng file; giới hạn kích thước file <= 5MB; sinh tên file ngẫu nhiên theo GUID để tránh xung đột tên file.<br>- Tự động kiểm tra và khởi tạo bucket "culinary-blog" kèm chính sách truy cập công khai (Anonymous Public-Read Bucket Policy) nếu bucket chưa tồn tại trên MinIO.<br>- Xây dựng API endpoint `POST /api/v1/files/upload` trong `FilesEndpoints.cs`, sử dụng `IFormFile`, ánh xạ vào `Program.cs` và kiểm thử thành công qua Scalar API Docs.<br>- Xây dựng component giao diện `ImageUploader.tsx` (Next.js 15 App Router) hỗ trợ tải file thông qua chọn file từ máy hoặc kéo - thả (Drag & Drop), hiển thị loading indicator, hiển thị ảnh preview sắc nét và nút sao chép đường link URL.<br>- Tạo trang thử nghiệm tải ảnh `/upload-test` và liên kết vào thanh điều hướng Navbar của hệ thống.<br><br>**Chưa hoàn thành:**<br>- Không có (Đã hoàn thành 100%). | https://github.com/2312770-coder/PTUDWNC-2026-Nhom21/tree/2312792-ndtuan-upload-minio | **100%** |
| **2** | **Cài đặt các API endpoints và dịch vụ xóa file ảnh trên MinIO (FR-FILE-002 Delete File from MinIO)**<br><br>**Đã hoàn thành:**<br>- Bổ sung phương thức `DeleteAsync(...)` vào interface `IFileStorageService` và cài đặt trong `MinioFileStorageService`.<br>- Xây dựng giải thuật trích xuất `objectKey` từ đường dẫn `fileUrl` công khai.<br>- Thực thi lệnh `DeleteObjectAsync` của AWS S3 Client để xóa đối tượng tương ứng khỏi bucket "culinary-blog".<br>- Hiện thực cơ chế Idempotent: bắt ngoại lệ `AmazonS3Exception` với mã trạng thái `HttpStatusCode.NotFound` để bỏ qua êm dịu nếu file không còn tồn tại trên bucket (tuân thủ đặc tả SRS mục 3.5).<br>- Cài đặt API endpoint `DELETE /api/v1/files?fileUrl=...` trong `FilesEndpoints.cs` tiếp nhận yêu cầu xóa file từ client.<br>- Tích hợp nút bấm xóa ảnh (biểu tượng thùng rác màu đỏ) trên khối ảnh preview của component `ImageUploader.tsx`.<br>- Xây dựng hộp thoại xác nhận trước khi xóa (Confirm dialog), gọi API xóa file trên MinIO và tự động reset trạng thái trên giao diện khi xóa thành công.<br><br>**Chưa hoàn thành:**<br>- Không có (Đã hoàn thành 100%). | https://github.com/2312770-coder/PTUDWNC-2026-Nhom21/tree/2312792-ndtuan-delete-minio | **100%** |

---

### Lưu ý:
- **Công việc được giao**: Liệt kê mỗi tính năng/chức năng/công việc được giao trên một dòng. Trong mỗi dòng, ghi cụ thể các bước/công đoạn đã thực hiện để hoàn thành công việc đó và những việc chưa hoàn thành.
- **Tiến độ %**: Tự đánh giá mức độ hoàn thành và ghi vào cột Tiến độ %.