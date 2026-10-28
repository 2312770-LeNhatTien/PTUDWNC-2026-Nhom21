# HƯỚNG DẪN TẠO PULL REQUEST VÀ MERGE VÀO NHÁNH CHÍNH (MAIN)
**Dự Án**: Phát Triển Ứng Dụng Web Nâng Cao — Nhóm 21  
**Thành viên thực hiện**: Lê Nhật Tiến  
**MSSV**: 2312770 — **Vai trò**: Trưởng nhóm  
**Thứ tự ưu tiên Merge PR**: **ĐỢT 1 / 4**  

---

## 1. THÔNG TIN PULL REQUEST CẦN ĐIỀN TRÊN GITHUB

### 📌 Tiêu đề PR (PR Title):
```text
fix(core): hoan thien kien truc nen tang, migration, health checks va recipe lifecycle (2312770)
```

### 📌 Tên nhánh Git đề xuất (Branch Name):
```text
2312770-LeNhatTien-khac-phuc
```

### 📌 Nội dung mô tả PR (PR Description)
*(Copy toàn bộ đoạn markdown dưới đây và dán vào ô mô tả của Pull Request trên GitHub)*:

```markdown
## 📋 Thông Tin Người Thực Hiện
- **Họ và tên**: Lê Nhật Tiến
- **MSSV**: 2312770
- **Vai trò**: Trưởng nhóm
- **Thứ tự Merge**: Đợt 1 / 4
- **Branch**: `2312770-LeNhatTien-khac-phuc`

---

## 🎯 Các Hạng Mục Khắc Phục Sau Rà Soát (Pre-Lab 8)
- [x] **R11**: Cấu hình chế độ DisabledBackgroundJobService khi Jobs:Enabled=false, không crash API.
- [x] **R13**: Chuẩn hóa vòng đời công thức: tách bạch Draft/Published/Preview, tối ưu RecipeGalleryEditor.
- [x] **R14**: Đồng bộ SEO slug, canonical URL và sitemap entries.
- [x] **R15/R17**: Chuẩn hóa Recipe aggregate, DesignTimeDbContextFactory và truy vấn con.
- [x] **R18**: Xử lý soft-delete Recipe giữ nguyên hình ảnh theo Quyết định D1.
- [x] **O01/O03**: Bổ sung HealthEndpoints (/health, /health/ready, /health/live), DatabaseDiagnosticsInterceptor, StorageHealthCheck.
- [x] **Q01/Q03**: Thiết lập CI workflow (.github/workflows/ci.yml), .editorconfig, Directory.Build.props và bộ test Backend.Tests (ApiFixture, DomainAndPipelineTests, ObservabilityTests, RecipeApiTests).
- [x] **D01**: Đồng bộ tài liệu DECISIONS.md, SETUP.md, HUONG_DAN_KHAC_PHUC_SAU_RA_SOAT.md, README.md.
- [x] **Migration**: 20261028035559_PreLab8Reliability (PendingJob, CacheVersion, SearchVector, GIN index).

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

## 3. CÁC LỆNH GIT THAO TÁC CỤ THỂ DÀNH CHO BẠN (Lê Nhật Tiến)

Mở terminal (PowerShell hoặc Git Bash) tại thư mục gốc của dự án trên máy bạn và chạy tuần tự các lệnh sau:

```powershell
# 1. Chuyển về nhánh main và kéo code mới nhất
git checkout main
git pull origin main

# 2. Tạo nhánh làm việc mới của bạn
git checkout -b 2312770-LeNhatTien-khac-phuc

# 3. Giải nén toàn bộ các file trong thư mục này và chép đè vào thư mục gốc của dự án
# (Đảm bảo cấu trúc thư mục src/, tests/, docs/ khớp với thư mục gốc dự án)

# 4. Kiểm tra trạng thái các file đã thay đổi
git status

# 5. Thêm tất cả file và commit
git add .
git commit -m "fix(core): hoan thien kien truc nen tang, migration, health checks va recipe lifecycle (2312770)"

# 6. Đẩy nhánh lên GitHub
git push -u origin 2312770-LeNhatTien-khac-phuc
```

Sau khi push thành công, bạn vào liên kết GitHub hiển thị trên màn hình để bấm **Create Pull Request**, điền Tiêu đề và Mô tả ở Mục 1, sau đó tiến hành Merge vào `main` theo đúng thứ tự!
