param([string]$EnvFile = '.env.production.local', [string]$OutputDirectory = 'artifacts/lab8/backups', [switch]$Local)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
. "$PSScriptRoot/Deployment.Common.ps1"
$settings = Get-DeploymentSettings $EnvFile
Set-DeploymentContext $EnvFile $Local.IsPresent
$destination = Join-Path $OutputDirectory ((Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 6))
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$destination = (Resolve-Path -LiteralPath $destination).Path
$previousBackupDirectory = $env:BACKUP_DIR
$env:BACKUP_DIR = $destination
try {
    # Quiesce ứng dụng và MinIO để archive object/keyring/SEO cùng một mốc dữ liệu.
    Invoke-DeploymentCompose -CommandArgs @('stop', 'nginx', 'frontend', 'api', 'minio')
    Invoke-DeploymentCompose -CommandArgs @('exec', '-T', 'postgres', 'pg_dump', '-U', $settings.POSTGRES_USER, '-d', $settings.POSTGRES_DB, '-Fc', '-f', '/tmp/culinary-backup.dump')
    Invoke-DeploymentCompose -CommandArgs @('cp', 'postgres:/tmp/culinary-backup.dump', (Join-Path $destination 'database.dump'))
    Invoke-DeploymentCompose -CommandArgs @('run', '--rm', '--no-deps', 'backup-helper', 'tar', '-cf', '/backup/assets.tar', '-C', '/source', 'minio', 'seo', 'keys')
    $manifest = @{
        createdAt = [DateTimeOffset]::UtcNow.ToString('o'); project = $settings.COMPOSE_PROJECT_NAME
        database = $settings.POSTGRES_DB; gitCommit = (git rev-parse HEAD)
        workingTreeDirty = (@(git status --porcelain).Count -gt 0)
        databaseSha256 = (Get-FileHash (Join-Path $destination 'database.dump')).Hash
        assetsSha256 = (Get-FileHash (Join-Path $destination 'assets.tar')).Hash
    }
    $manifest | ConvertTo-Json | Set-Content (Join-Path $destination 'manifest.json')
    Write-Output "BACKUP_PATH=$destination"
} finally {
    try { Invoke-DeploymentCompose -CommandArgs @('start', 'minio', 'api', 'frontend', 'nginx') }
    finally { $env:BACKUP_DIR = $previousBackupDirectory }
}
