# Backup do KV Store (kv_store_513143ac) para JSON local.
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\backup-kv.ps1
# Le SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY das variaveis de ambiente
# ou, em falta, do ficheiro .env na raiz do projeto.

param(
  [string]$EnvFile = (Join-Path $PSScriptRoot "..\.env"),
  [string]$OutDir  = (Join-Path $PSScriptRoot "..\backups")
)

$ErrorActionPreference = "Stop"

$vars = @{}
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      $vars[$Matches[1]] = $Matches[2].Trim().Trim('"')
    }
  }
}

$url = if ($vars['SUPABASE_URL']) { $vars['SUPABASE_URL'] } else { $env:SUPABASE_URL }
$key = if ($vars['SUPABASE_SERVICE_ROLE_KEY']) { $vars['SUPABASE_SERVICE_ROLE_KEY'] } else { $env:SUPABASE_SERVICE_ROLE_KEY }

if (-not $url -or -not $key) {
  throw "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY nao encontrados (variaveis de ambiente ou .env)."
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$ts  = Get-Date -Format "yyyyMMdd-HHmmss"
$out = Join-Path $OutDir "kv-$ts.json"

$headers = @{ apikey = $key; Authorization = "Bearer $key" }
$rows = Invoke-RestMethod -Uri "$url/rest/v1/kv_store_513143ac?select=key,value" -Headers $headers -TimeoutSec 60

# Serializa sempre como array JSON (PS 5.1 nao tem -AsArray)
if ($null -eq $rows) {
  $json = "[]"
} else {
  $json = $rows | ConvertTo-Json -Depth 50
  if (-not $json.TrimStart().StartsWith('[')) { $json = "[$json]" }
}
Set-Content -Path $out -Value $json -Encoding UTF8

Write-Output "Backup guardado: $out ($($rows.Count) registos)"
