# Restauro do KV Store (kv_store_513143ac) a partir de um ficheiro JSON.
# Faz upsert (merge) por 'key', sem apagar registos que nao existam no backup.
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\restore-kv.ps1 -File backups\kv-20261011-120000.json

param(
  [Parameter(Mandatory = $true)][string]$File,
  [string]$EnvFile = (Join-Path $PSScriptRoot "..\.env")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $File)) { throw "Ficheiro de backup nao encontrado: $File" }

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

$rows = Get-Content $File -Raw | ConvertFrom-Json
if (-not $rows) { throw "Backup vazio: $File" }

$headers = @{
  apikey         = $key
  Authorization  = "Bearer $key"
  "Content-Type" = "application/json"
  Prefer         = "resolution=merge-duplicates,return=minimal"
}

$json = $rows | ConvertTo-Json -Depth 50
if (-not $json.TrimStart().StartsWith('[')) { $json = "[$json]" }
Invoke-RestMethod -Uri "$url/rest/v1/kv_store_513143ac" -Method Post -Headers $headers -Body $json -TimeoutSec 120

Write-Output "Restauro concluido: $($rows.Count) registos aplicados a partir de $File"
