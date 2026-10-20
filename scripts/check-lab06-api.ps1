param([string]$BaseUrl='http://localhost:5000')
$ErrorActionPreference='Stop'
$api="$BaseUrl/api/v1"
function Check($condition, $label) { if (!$condition) { throw $label }; Write-Output "PASS: $label" }
$auth=Invoke-RestMethod "$api/auth/login" -Method Post -ContentType 'application/json' -Body (@{email='admin@culinary.local';password='Admin@123'} | ConvertTo-Json)
$headers=@{Authorization="Bearer $($auth.data.accessToken)"}
$id=$null
try {
    $before=(Invoke-RestMethod "$api/categories").data
    $name='Lab06-'+[Guid]::NewGuid().ToString('N')
    $body=@{name=$name;description='Cache integration check';imageUrl=$null;orderIndex=99}
    $created=(Invoke-RestMethod "$api/categories" -Method Post -Headers $headers -ContentType 'application/json' -Body ($body | ConvertTo-Json)).data
    $id=$created.id
    $after=(Invoke-RestMethod "$api/categories").data
    Check (@($after | Where-Object id -eq $id).Count -eq 1) 'create invalidates warm list'
    $body.name=$name+'-updated'
    $updated=(Invoke-RestMethod "$api/categories/$id" -Method Put -Headers $headers -ContentType 'application/json' -Body ($body | ConvertTo-Json)).data
    $after=(Invoke-RestMethod "$api/categories").data
    Check (($after | Where-Object id -eq $id).name -eq $body.name) 'update invalidates warm list'
    Check ($updated.slug -eq $created.slug) 'D12 preserves slug'
    Invoke-RestMethod "$api/categories/$id" -Method Delete -Headers $headers | Out-Null
    $after=(Invoke-RestMethod "$api/categories").data
    Check (@($after | Where-Object id -eq $id).Count -eq 0) 'delete invalidates warm list'
    $id=$null
} finally { if ($id) { Invoke-RestMethod "$api/categories/$id" -Method Delete -Headers $headers | Out-Null } }
