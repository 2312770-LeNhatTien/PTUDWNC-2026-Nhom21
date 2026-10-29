function Get-DeploymentSettings([string]$EnvFile) {
    $values = @{}
    foreach ($line in Get-Content -LiteralPath $EnvFile) {
        if ($line -match '^([A-Z0-9_]+)=(.*)$') { $values[$Matches[1]] = $Matches[2].Trim() }
    }
    return $values
}
function Invoke-DeploymentCompose([string[]]$CommandArgs) {
    & docker @script:DeploymentComposeArgs @CommandArgs
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose thất bại: $($CommandArgs[0])" }
}
function Set-DeploymentContext([string]$EnvFile, [bool]$Local) {
    $script:DeploymentComposeArgs = @('compose', '--env-file', $EnvFile, '-f', 'docker-compose.prod.yml')
    if ($Local) { $script:DeploymentComposeArgs += @('-f', 'docker-compose.lab8.yml') }
}
