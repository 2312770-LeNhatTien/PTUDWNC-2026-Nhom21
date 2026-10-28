# HƯỚNG DẪN TẠO PULL REQUEST VÀ MERGE VÀO NHÁNH CHÍNH (MAIN)
**Dự Án**: Phát Triển Ứng Dụng Web Nâng Cao — Nhóm 21  
**Thành viên thực hiện**: Nguyễn Viết Toàn  
**MSSV**: 2312777 — **Vai trò**: Thành viên  
**Thứ tự ưu tiên Merge PR**: **ĐỢT 3 / 4**  

---

## 1. THÔNG TIN PULL REQUEST CẦN ĐIỀN TRÊN GITHUB

### 📌 Tiêu đề PR (PR Title):
```text
fix(categories): phan trang chuan hoa, tim kiem unaccent, redis cache version va review (2312777)
```

### 📌 Tên nhánh Git đề xuất (Branch Name):
```text
2312777-NguyenVietToan-khac-phuc
```

### 📌 Nội dung mô tả PR (PR Description)
*(Copy toàn bộ đoạn markdown dưới đây và dán vào ô mô tả của Pull Request trên GitHub)*:

```markdown
## 📋 Thông Tin Người Thực Hiện
- **Họ và tên**: Nguyễn Viết Toàn
- **MSSV**: 2312777
- **Vai trò**: Thành viên
- **Thứ tự Merge**: Đợt 3 / 4
- **Branch**: `2312777-NguyenVietToan-khac-phuc`

---

## 🎯 Các Hạng Mục Khắc Phục Sau Rà Soát (Pre-Lab 8)
- [x] **R12**: Chuẩn hóa phân trang Category và Recipe (PagingParams, TotalPages, HasNext/HasPrevious), Category CRUD an toàn.
- [x] **R15/R16**: Tối ưu hóa tìm kiếm Tiếng Việt không dấu (Unaccent Search, SearchVector, GIN index).
- [x] **C01**: Quản lý bộ nhớ đệm phân tán bền vững (ICacheVersionProvider, CacheVersionProvider, RedisCacheService, CachingBehavior).
- [x] **O02**: Triển khai RedisHealthCheck kiểm tra kết nối bộ đệm.
- [x] **D02**: Hợp đồng đánh giá công thức RecipeReview (AddRecipeReviewCommand, GetRecipeReviewsQuery, UI RecipeReviews.tsx).
- [x] **U04**: Dọn dẹp liên kết test cũ (*-test), tối ưu trang danh mục categories/[slug] và RecipeExplorer.
- [x] **Q02**: Bổ sung bộ test khám phá và đánh giá (tests/Backend.Tests/DiscoveryAndReviewTests.cs).

---

## 🧪 Kết Quả Kiểm Thử (Verification)
- [x] Backend build Release thành công 0 lỗi, 0 cảnh báo.
- [x] Chạy toàn bộ xUnit integration test trên PostgreSQL và Redis thật.
- [x] Frontend Next.js build production, lint và TypeScript check thành công.
- [x] Đáp ứng đầy đủ tiêu chí nghiệm thu của đề bài và tài liệu rà soát toàn dự án.
```

---

## 2. QUY TRÌNH THỰC HIỆN & THỨ TỰ MERGE TRÁNH CONFLICT

Để toàn bộ dự án merge mượt mà, **tuyệt đối không bị conflict**, 4 thành viên trong nhóm sẽ lần lượt tạo và merge PR theo đúng thứ tự sau:

### ⏱️ THỨ TỰ MERGE CỦA CẢ NHÓM:
1. **LƯỢT 1: Lê Nhật Tiến (2312770)** — Khởi tạo nền tảng, Migration `PreLab8Reliability`, DbContext, Health endpoints, CI/CD và Test Suite.
2. **LƯỢT 2: Lâm Văn Đức (2314299)** — Sau khi PR 1 của Tiến đã merge vào `main`, Đức kéo `main` về, tạo PR 2 (Auth, Google OAuth, Refresh Token, MailKit) và merge.
3. **LƯỢT 3: Nguyễn Viết Toàn (2312777)** — Sau khi PR 2 của Đức đã merge vào `main`, Toàn kéo `main` về, tạo PR 3 (Categories, SearchVector Unaccent, Redis Cache durable, Review) và merge.
4. **LƯỢT 4: Nguyễn Đình Tuấn (2312792)** — Sau khi PR 3 của Toàn đã merge vào `main`, Tuấn kéo `main` về, tạo PR 4 (MinIO Storage, Background Jobs Magick/WebP, Step & Ingredient Editors, D10 fraction parser) và merge.

---

## 3. CÁC LỆNH GIT THAO TÁC CỤ THỂ DÀNH CHO BẠN (Nguyễn Viết Toàn)

Mở terminal (PowerShell hoặc Git Bash) tại thư mục gốc của dự án trên máy bạn và chạy tuần tự các lệnh sau:

```powershell
# 1. Chuyển về nhánh main và kéo code mới nhất
git checkout main
git pull origin main

# 2. Tạo nhánh làm việc mới của bạn
git checkout -b 2312777-NguyenVietToan-khac-phuc

# 3. Giải nén toàn bộ các file trong thư mục này và chép đè vào thư mục gốc của dự án
# (Đảm bảo cấu trúc thư mục src/, tests/, docs/ khớp với thư mục gốc dự án)

# 4. Kiểm tra trạng thái các file đã thay đổi
git status

# 5. Thêm tất cả file và commit
git add .
git commit -m "fix(categories): phan trang chuan hoa, tim kiem unaccent, redis cache version va review (2312777)"

# 6. Đẩy nhánh lên GitHub
git push -u origin 2312777-NguyenVietToan-khac-phuc
```

Sau khi push thành công, bạn vào liên kết GitHub hiển thị trên màn hình để bấm **Create Pull Request**, điền Tiêu đề và Mô tả ở Mục 1, sau đó tiến hành Merge vào `main` theo đúng thứ tự!
