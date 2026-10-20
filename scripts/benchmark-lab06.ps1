param([string]$BaseUrl = 'http://localhost:5000', [int]$Samples = 200, [string]$Output = 'docs/thanh-vien/lab06-benchmark-2312777.json')
$ErrorActionPreference = 'Stop'
if ($Samples -lt 20) { throw 'Use at least 20 samples.' }
$client = [System.Net.Http.HttpClient]::new()
$uri = "$($BaseUrl.TrimEnd('/'))/api/v1/categories"
try {
    # Warm the API, database connection and Redis. Cold timings are reported separately.
    $watch = [Diagnostics.Stopwatch]::StartNew()
    $response = $client.GetAsync($uri).GetAwaiter().GetResult()
    $response.EnsureSuccessStatusCode() | Out-Null
    $payload = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $watch.Stop(); $first = $watch.Elapsed.TotalMilliseconds
    $json = $payload | ConvertFrom-Json
    for ($i=0; $i -lt 20; $i++) {
        $r = $client.GetAsync($uri).GetAwaiter().GetResult(); $r.EnsureSuccessStatusCode() | Out-Null; $r.Dispose()
    }
    $times = for ($i=0; $i -lt $Samples; $i++) {
        $watch.Restart()
        $r = $client.GetAsync($uri).GetAwaiter().GetResult(); $r.EnsureSuccessStatusCode() | Out-Null
        $r.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult() | Out-Null
        $watch.Stop(); $r.Dispose(); $watch.Elapsed.TotalMilliseconds
    }
    $sorted = @($times | Sort-Object)
    $report = [ordered]@{
        measuredAt = [DateTimeOffset]::Now.ToString('o'); url = $uri; samples = $Samples
        firstRequestMs = $first; meanMs = ($times | Measure-Object -Average).Average
        medianMs = $sorted[[int][Math]::Floor($Samples / 2)]
        p95Ms = $sorted[[int][Math]::Ceiling($Samples * .95)-1]
        minMs = $sorted[0]; maxMs = $sorted[-1]
        targetMs = 5; p95TargetMet = ($sorted[[int][Math]::Ceiling($Samples * .95)-1] -le 5)
    }
    $report | ConvertTo-Json | Tee-Object -FilePath $Output
    if (!$report.p95TargetMet) { throw 'Measured p95 exceeds 5ms. See benchmark output.' }
} finally { $client.Dispose() }
