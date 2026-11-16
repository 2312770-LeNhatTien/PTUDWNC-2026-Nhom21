// ============================================================================
// KIỂM THỬ TỰ ĐỘNG GIAO DIỆN (UI E2E): PHÂN HỆ AUTHENTICATION & SECURITY (LAB 8)
// Thành viên: Lâm Văn Đức (MSSV: 2314299)
// Nhóm 21 - PTUDWNC-2026
// Các kịch bản:
// 1. Client-side Form Validation trên trang Đăng ký và Đăng nhập.
// 2. Hiển thị thông báo lỗi chuẩn RFC 7807 ProblemDetails (401 Unauthorized, 409 Conflict, 429 Rate Limit).
// 3. Hiển thị trạng thái Xác thực (Authenticated Navbar & Dropdown Menu).
// 4. Luồng Đăng xuất an toàn -> Thu hồi phiên trên Backend và đưa Navbar về trạng thái Khách.
// ============================================================================

import { test, expect } from '@playwright/test';
import { encode } from 'next-auth/jwt';

test.describe('Phân Hệ Authentication & Security - Kiểm Thử E2E Giao Diện (Lab 8)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock các endpoint dữ liệu cơ bản để trang hoạt động ổn định và cách ly
    await page.route('**/api/auth/session', (route) => route.fulfill({ json: {} }));
    await page.route('**/api/v1/categories', (route) => route.fulfill({ json: { data: [] } }));
    await page.route('**/api/v1/recipes**', (route) =>
      route.fulfill({ json: { data: [], meta: { total: 0 } } })
    );
  });

  test('TC01: Form Đăng ký thực hiện validate dữ liệu nhập phía Client chính xác', async ({ page }) => {
    await page.goto('/register');

    // Kiểm tra tiêu đề form đăng ký
    await expect(page.getByRole('heading', { name: /Đăng ký tài khoản mới/i })).toBeVisible();

    // Nhập email sai định dạng và blur ra ngoài
    const emailInput = page.getByPlaceholder('vidu@email.com');
    await emailInput.fill('invalid-email-format');
    await emailInput.blur();
    await expect(page.getByText('Định dạng email không hợp lệ')).toBeVisible();

    // Nhập mật khẩu quá ngắn (< 8 ký tự) và blur
    const passwordInput = page.getByPlaceholder('Tối thiểu 8 ký tự');
    await passwordInput.fill('12345');
    await passwordInput.blur();
    await expect(page.getByText('Mật khẩu phải có ít nhất 8 ký tự.')).toBeVisible();

    // Nhập mật khẩu xác nhận không khớp
    const confirmInput = page.getByPlaceholder('Nhập lại mật khẩu');
    await confirmInput.fill('mismatch-pass');
    await confirmInput.blur();
    await expect(page.getByText('Mật khẩu xác nhận không khớp.')).toBeVisible();
  });

  test('TC02: Đăng ký trùng email hiển thị cảnh báo lỗi RFC 7807 (409 Conflict)', async ({ page }) => {
    // Giả lập Backend trả về lỗi 409 Conflict theo chuẩn RFC 7807
    await page.route('**/api/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/problem+json',
        json: {
          type: 'about:blank',
          title: 'Xung đột dữ liệu.',
          status: 409,
          detail: 'Email đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.',
          instance: '/api/v1/auth/register',
          errorCode: 'RESOURCE_CONFLICT'
        }
      });
    });

    await page.goto('/register');
    await page.getByPlaceholder('vidu@email.com').fill('duplicate@example.com');
    await page.getByPlaceholder('Bếp Trưởng An').fill('Đức Thử Nghiệm');
    await page.getByPlaceholder('Tối thiểu 8 ký tự').fill('P@ssword123!');
    await page.getByPlaceholder('Nhập lại mật khẩu').fill('P@ssword123!');

    // Đồng ý điều khoản
    await page.getByRole('checkbox').check();

    // Submit form đăng ký
    await page.getByRole('button', { name: /Tạo tài khoản/i }).click();

    // Xác nhận thông báo lỗi RFC 7807 hiển thị trong thẻ alert loại trừ route announcer
    const alert = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Email đã được sử dụng');
  });

  test('TC03: Đăng nhập sai thông tin hiển thị lỗi RFC 7807 (401 Unauthorized)', async ({ page }) => {
    // Giả lập Backend trả về 401 Unauthorized theo RFC 7807
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        json: {
          type: 'about:blank',
          title: 'Chưa xác thực.',
          status: 401,
          detail: 'Email hoặc mật khẩu không chính xác.',
          instance: '/api/v1/auth/login',
          errorCode: 'HTTP_401'
        }
      });
    });

    await page.goto('/login');
    await page.getByPlaceholder('vidu@email.com').fill('wrong@example.com');
    await page.getByPlaceholder('Nhập mật khẩu của bạn').fill('WrongPassword@123');

    // Bấm nút đăng nhập chính xác (loại trừ nút Google)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

    // Kiểm tra banner lỗi
    const alert = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Email hoặc mật khẩu không chính xác');
  });

  test('TC04: Đăng nhập vượt ngưỡng tần suất hiển thị cảnh báo Rate Limiting (429 Too Many Requests)', async ({ page }) => {
    // Giả lập Backend trả về lỗi 429 Too Many Requests kèm Retry-After theo D7 & R20
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/problem+json',
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0'
        },
        json: {
          type: 'about:blank',
          title: 'Quá nhiều yêu cầu.',
          status: 429,
          detail: 'Bạn đã gửi quá nhiều yêu cầu đăng nhập. Vui lòng thử lại theo Retry-After.',
          instance: '/api/v1/auth/login',
          errorCode: 'RATE_LIMIT_EXCEEDED'
        }
      });
    });

    await page.goto('/login');
    await page.getByPlaceholder('vidu@email.com').fill('brute-force@example.com');
    await page.getByPlaceholder('Nhập mật khẩu của bạn').fill('Test1234@');

    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

    // Kiểm tra thông báo lỗi rate limit hiển thị
    const alert = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('quá nhiều yêu cầu');
  });

  test('TC05: Trạng thái Xác thực trên Navbar và Luồng Đăng xuất an toàn thu hồi phiên', async ({ page, context }) => {
    let logoutApiCalled = false;

    // Thiết lập cookie phiên NextAuth và LocalStorage cho tác giả Lâm Văn Đức
    const sessionToken = await encode({
      secret: 'lab05-local-browser-test-secret-only',
      salt: 'authjs.session-token',
      token: {
        userId: 'user-duc-2314299',
        roles: ['Author'],
        name: 'Lâm Văn Đức',
        email: 'duc.author@culinaryblog.test'
      }
    });

    await context.addCookies([{
      name: 'authjs.session-token',
      value: sessionToken,
      url: 'http://localhost:3105',
      httpOnly: true,
      sameSite: 'Lax'
    }]);

    await context.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'user-duc-2314299',
        roles: ['Author'],
        displayName: 'Lâm Văn Đức',
        email: 'duc.author@culinaryblog.test'
      }));
      localStorage.setItem('accessToken', 'jwt-mock-token-duc-lab8');
      localStorage.setItem('refreshToken', 'refresh-mock-token-duc-lab8');
    });

    // Giả lập API Đăng xuất thu hồi token (204 No Content)
    await page.route('**/api/v1/auth/logout', async (route) => {
      logoutApiCalled = true;
      await route.fulfill({ status: 204 });
    });

    // Truy cập trang chủ với phiên đã đăng nhập
    await page.goto('/');

    // 1. Kiểm tra Navbar hiển thị tên Tác giả "Lâm Văn Đức" và huy hiệu vai trò "Tác giả"
    await expect(page.getByText('Lâm Văn Đức').first()).toBeVisible();
    await expect(page.getByText('Tác giả').first()).toBeVisible();

    // 2. Mở User Dropdown Menu trên Navbar
    await page.getByText('Lâm Văn Đức').first().click();

    // Kiểm tra các chức năng trong menu cá nhân
    await expect(page.getByRole('link', { name: /Hồ sơ cá nhân/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Viết công thức mới/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Công thức của tôi/i })).toBeVisible();

    // 3. Kiểm tra nút Đăng xuất an toàn (FR-AUTH-005)
    const logoutBtn = page.getByRole('button', { name: /Đăng xuất an toàn/i });
    await expect(logoutBtn).toBeVisible();

    // 4. Thực hiện Đăng xuất
    await logoutBtn.click();

    // Xác nhận đã được chuyển hướng về trang /login
    await expect(page).toHaveURL(/\/login/);

    // Kiểm tra Backend API /auth/logout đã được gọi đúng chuẩn để thu hồi token
    expect(logoutApiCalled).toBe(true);

    // Navbar quay lại trạng thái Khách vãng lai với nút Đăng nhập
    await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true }).first()).toBeVisible();
  });
});
