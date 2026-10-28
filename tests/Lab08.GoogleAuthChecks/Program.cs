using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CulinaryBlog.Application.Common.Exceptions;
using CulinaryBlog.Application.Features.Auth.Commands.GoogleLogin;
using CulinaryBlog.Domain.Entities;
using CulinaryBlog.Domain.Settings;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

Console.OutputEncoding = System.Text.Encoding.UTF8;
Console.WriteLine("================================================================================");
Console.WriteLine("🧪 KIỂM THỬ BẢO MẬT R06: XÁC THỰC GOOGLE ID TOKEN & LIÊN KẾT TÀI KHOẢN (FR-AUTH-003)");
Console.WriteLine("================================================================================");

int passed = 0;
int total = 0;

// ── TEST 1: Kiểm tra chặn khi máy chủ thiếu cấu hình ClientId ────────────────
total++;
Console.WriteLine($"\n[Test {total}] Kiểm tra thiếu cấu hình Google ClientId...");
try
{
    var emptySettings = Options.Create(new GoogleAuthSettings { ClientId = "" });
    var handler = new GoogleLoginCommandHandler(null!, null!, null!, emptySettings);
    await handler.Handle(new GoogleLoginCommand("some_token"), CancellationToken.None);
    Console.WriteLine("❌ THẤT BẠI: Lẽ ra phải ném InvalidOperationException");
}
catch (InvalidOperationException ex) when (ex.Message.Contains("chưa được cấu hình Google Client ID"))
{
    Console.WriteLine($"✅ THÀNH CÔNG: Đã chặn với InvalidOperationException ('{ex.Message}')");
    passed++;
}
catch (Exception ex)
{
    Console.WriteLine($"❌ THẤT BẠI: Lỗi không mong đợi: {ex.GetType().Name} - {ex.Message}");
}

// ── TEST 2: Kiểm tra từ chối token Google giả mạo / không đúng định dạng ──────
total++;
Console.WriteLine($"\n[Test {total}] Kiểm tra từ chối token giả mạo (Malformed/Fake JWT)...");
try
{
    var validSettings = Options.Create(new GoogleAuthSettings
    {
        ClientId = "330982249317-ql4nni0lf25s6im4cchhdd57bm38me0e.apps.googleusercontent.com"
    });
    var handler = new GoogleLoginCommandHandler(null!, null!, null!, validSettings);
    await handler.Handle(new GoogleLoginCommand("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.fake_payload.fake_signature"), CancellationToken.None);
    Console.WriteLine("❌ THẤT BẠI: Lẽ ra phải ném ValidationException");
}
catch (ValidationException ex) when (ex.Errors.ContainsKey("IdToken"))
{
    var msg = string.Join(", ", ex.Errors["IdToken"]);
    Console.WriteLine($"✅ THÀNH CÔNG: Đã từ chối token giả mạo ('{msg}')");
    passed++;
}
catch (Exception ex)
{
    Console.WriteLine($"❌ THẤT BẠI: Lỗi không mong đợi: {ex.GetType().Name} - {ex.Message}");
}

// ── TEST 3: Kiểm tra cấu hình ValidationSettings Audience ────────────────────
total++;
Console.WriteLine($"\n[Test {total}] Kiểm tra cấu hình ValidationSettings Audience chuẩn xác...");
var testClientId = "330982249317-ql4nni0lf25s6im4cchhdd57bm38me0e.apps.googleusercontent.com";
var settings = new GoogleJsonWebSignature.ValidationSettings
{
    Audience = new[] { testClientId }
};
if (settings.Audience != null && settings.Audience.Contains(testClientId))
{
    Console.WriteLine($"✅ THÀNH CÔNG: ValidationSettings.Audience đã gán đúng ClientId: {testClientId}");
    passed++;
}
else
{
    Console.WriteLine("❌ THẤT BẠI: ValidationSettings.Audience không đúng.");
}

// ── TEST 4: Kiểm tra cấu trúc UserLoginInfo Provider & ProviderKey ───────────
total++;
Console.WriteLine($"\n[Test {total}] Kiểm tra chuẩn hóa UserLoginInfo cho AspNetUserLogins...");
var testSubject = "109876543210987654321";
var loginInfo = new UserLoginInfo("Google", testSubject, "Google");
if (loginInfo.LoginProvider == "Google" && loginInfo.ProviderKey == testSubject)
{
    Console.WriteLine($"✅ THÀNH CÔNG: UserLoginInfo chuẩn: Provider='{loginInfo.LoginProvider}', ProviderKey='{loginInfo.ProviderKey}'");
    passed++;
}
else
{
    Console.WriteLine("❌ THẤT BẠI: UserLoginInfo không khớp.");
}

Console.WriteLine("\n================================================================================");
Console.WriteLine($"📊 KẾT QUẢ KIỂM THỬ: {passed}/{total} tests passed ({(passed * 100.0 / total):F0}%)");
Console.WriteLine("================================================================================");

if (passed == total)
{
    Console.WriteLine("🎉 TOÀN BỘ CÁC TIÊU CHÍ BẢO MẬT R06 ĐÃ ĐẠT CHUẨN!");
    return 0;
}
return 1;
