param(
    [switch]$Local,
    [ValidatePattern('^[a-zA-Z0-9.-]+$')][string]$PublicHost = 'localhost',
    [string]$EnvFile = '.env.production.local'
)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (Test-Path -LiteralPath $EnvFile) { throw "$EnvFile đã tồn tại; không tự đổi secrets của deployment đang dùng." }
if (!$Local -and $PublicHost -eq 'localhost') { throw 'Production cần PublicHost thật và certificate hợp lệ.' }
$secretDirectory = Join-Path (Get-Location) '.secrets'
$tlsDirectory = Join-Path $secretDirectory 'tls'
New-Item -ItemType Directory -Path $tlsDirectory -Force | Out-Null
function New-Secret([string]$Name, [int]$Bytes = 32, [string]$Value = '') {
    $path = Join-Path $secretDirectory $Name
    if (!(Test-Path -LiteralPath $path)) {
        if (!$Value) { $Value = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes($Bytes)) }
        [IO.File]::WriteAllText($path, $Value, [Text.UTF8Encoding]::new($false))
    }
    return [IO.File]::ReadAllText($path)
}
$pgPassword = New-Secret 'postgres-password'
$redisPassword = New-Secret 'redis-password'
New-Secret 'jwt-key' | Out-Null
New-Secret 'auth-secret' | Out-Null
New-Secret 'minio-user' -Value 'culinary' | Out-Null
New-Secret 'minio-password' -Bytes 20 | Out-Null
New-Secret 'database-connection' -Value "Host=postgres;Port=5432;Database=culinary_blog;Username=culinary;Password=$pgPassword;Maximum Pool Size=40" | Out-Null
New-Secret 'redis-connection' -Value "redis:6379,password=$redisPassword,abortConnect=false" | Out-Null
if ($Local) {
    # Tạo cert trong bộ nhớ rồi ghi PEM; không cài CA hay thay certificate store của máy.
    $rsa = [Security.Cryptography.RSA]::Create(3072)
    $request = [Security.Cryptography.X509Certificates.CertificateRequest]::new("CN=$PublicHost", $rsa,
        [Security.Cryptography.HashAlgorithmName]::SHA256, [Security.Cryptography.RSASignaturePadding]::Pkcs1)
    $names = [Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
    $names.AddDnsName($PublicHost)
    $names.AddIpAddress([Net.IPAddress]::Loopback)
    $request.CertificateExtensions.Add($names.Build())
    $request.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false, $false, 0, $true))
    $certificate = $request.CreateSelfSigned([DateTimeOffset]::UtcNow.AddMinutes(-5), [DateTimeOffset]::UtcNow.AddDays(30))
    [IO.File]::WriteAllText((Join-Path $tlsDirectory 'tls.crt'), $certificate.ExportCertificatePem())
    [IO.File]::WriteAllText((Join-Path $tlsDirectory 'tls.key'), $rsa.ExportPkcs8PrivateKeyPem())
    $certificate.Dispose(); $rsa.Dispose()
}
if (!$IsWindows) {
    # Compose bind-mount secret cần quyền đọc cho UID runtime; thư mục host vẫn chỉ owner truy cập.
    [IO.File]::SetUnixFileMode($secretDirectory, [IO.UnixFileMode]::UserRead -bor [IO.UnixFileMode]::UserWrite -bor [IO.UnixFileMode]::UserExecute)
    Get-ChildItem -LiteralPath $secretDirectory -File | ForEach-Object {
        [IO.File]::SetUnixFileMode($_.FullName, [IO.UnixFileMode]::UserRead -bor [IO.UnixFileMode]::GroupRead -bor [IO.UnixFileMode]::OtherRead)
    }
    if (Test-Path -LiteralPath (Join-Path $tlsDirectory 'tls.key')) {
        [IO.File]::SetUnixFileMode((Join-Path $tlsDirectory 'tls.key'), [IO.UnixFileMode]::UserRead -bor [IO.UnixFileMode]::UserWrite)
    }
}
$httpsPort = if ($Local) { 8443 } else { 443 }
$httpPort = if ($Local) { 8088 } else { 80 }
$origin = if ($httpsPort -eq 443) { "https://$PublicHost" } else { "https://${PublicHost}:$httpsPort" }
$project = if ($Local) { 'culinary-lab8-tien' } else { 'culinary-production' }
$hsts = if ($Local) { 0 } else { 31536000 }
$envText = @"
COMPOSE_PROJECT_NAME=$project
APP_TAG=lab8
PUBLIC_HOST=$PublicHost
PUBLIC_BIND_ADDRESS=$(if ($Local) { '127.0.0.1' } else { '0.0.0.0' })
PUBLIC_ORIGIN=$origin
MEDIA_PUBLIC_ORIGIN=https://${PublicHost}:9443
HTTP_PORT=$httpPort
HTTPS_PORT=$httpsPort
MEDIA_HTTPS_PORT=9443
HSTS_MAX_AGE=$hsts
SECRETS_DIR=./.secrets
TLS_DIR=./.secrets/tls
BACKUP_DIR=./artifacts/lab8/backups
RESTORE_DIR=./artifacts/lab8/restored
POSTGRES_USER=culinary
POSTGRES_DB=culinary_blog
PROXY_IP=172.31.88.10
PRODUCTION_SUBNET=172.31.88.0/24
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_FROM=no-reply@$PublicHost
NEXT_IMAGE_UNOPTIMIZED=$($Local.ToString().ToLowerInvariant())
"@
[IO.File]::WriteAllText((Join-Path (Get-Location) $EnvFile), $envText)
Write-Output "Đã tạo cấu hình $EnvFile và secrets ngoài Git. Không in giá trị secret."
if (!$Local) { Write-Output 'Đặt tls.crt/tls.key hợp lệ vào .secrets/tls và cấu hình SMTP relay phù hợp trước khi chạy.' }
