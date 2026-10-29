param(
    [Parameter(Mandatory)][string]$BackupDirectory,
    [ValidatePattern('^[a-z][a-z0-9_]{0,62}$')][string]$TargetDatabase = ('culinary_restore_' + [Guid]::NewGuid().ToString('N').Substring(0, 12)),
    [string]$EnvFile = '.env.production.local', [switch]$Local
)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
. "$PSScriptRoot/Deployment.Common.ps1"
$settings = Get-DeploymentSettings $EnvFile
Set-DeploymentContext $EnvFile $Local.IsPresent
if ($TargetDatabase -eq $settings.POSTGRES_DB) { throw 'Chỉ restore sang database mới, không ghi đè database đang chạy.' }
$source = (Resolve-Path -LiteralPath $BackupDirectory).Path
$manifest = Get-Content (Join-Path $source 'manifest.json') -Raw | ConvertFrom-Json
if ((Get-FileHash (Join-Path $source 'database.dump')).Hash -ne $manifest.databaseSha256 -or
    (Get-FileHash (Join-Path $source 'assets.tar')).Hash -ne $manifest.assetsSha256) { throw 'Checksum backup không khớp.' }
$destination = Join-Path 'artifacts/lab8/restored' $TargetDatabase
if (Test-Path -LiteralPath $destination) { throw 'Thư mục restore đã tồn tại.' }
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$oldBackupDirectory = $env:BACKUP_DIR; $oldRestoreDirectory = $env:RESTORE_DIR
$env:BACKUP_DIR = $source; $env:RESTORE_DIR = (Resolve-Path -LiteralPath $destination).Path
try {
    # Khôi phục vào DB/thư mục mới; không drop DB hoặc chạm volume đang phục vụ website.
    Invoke-DeploymentCompose -CommandArgs @('exec', '-T', 'postgres', 'createdb', '-U', $settings.POSTGRES_USER, $TargetDatabase)
    Invoke-DeploymentCompose -CommandArgs @('cp', (Join-Path $source 'database.dump'), 'postgres:/tmp/culinary-restore.dump')
    Invoke-DeploymentCompose -CommandArgs @('exec', '-T', 'postgres', 'pg_restore', '--exit-on-error', '--no-owner', '-U', $settings.POSTGRES_USER, '-d', $TargetDatabase, '/tmp/culinary-restore.dump')
    $entries = @(Invoke-DeploymentCompose -CommandArgs @('run', '--rm', '--no-deps', 'backup-helper', 'tar', '-tf', '/backup/assets.tar'))
    foreach ($entry in $entries) {
        if ($entry -notmatch '^(minio|seo|keys)/' -or $entry -match '(^|/)\.\.(/|$)') { throw 'Archive có đường dẫn không hợp lệ.' }
    }
    Invoke-DeploymentCompose -CommandArgs @('run', '--rm', '--no-deps', 'backup-helper', 'tar', '--no-same-owner', '-xf', '/backup/assets.tar', '-C', '/restore')
    Write-Output "RESTORE_DATABASE=$TargetDatabase"
    Write-Output "RESTORE_ASSETS=$($env:RESTORE_DIR)"
    Invoke-DeploymentCompose -CommandArgs @('exec', '-T', 'postgres', 'psql', '-U', $settings.POSTGRES_USER, '-d', $TargetDatabase, '-c', 'SELECT COUNT(*) AS recipes FROM "Recipes";')
} finally {
    $env:BACKUP_DIR = $oldBackupDirectory; $env:RESTORE_DIR = $oldRestoreDirectory
}
