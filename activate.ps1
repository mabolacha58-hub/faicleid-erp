# ==========================================
# FAICLEID ERP — GERADOR DE CHAVES
# ==========================================
param(
    [Parameter(Mandatory=$true)][string]$School,
    [Parameter(Mandatory=$false)][string]$Tipo = "trial"
)

$SERVICE_KEY = $env:FAICLEID_SERVICE_KEY
if (-not $SERVICE_KEY) {
    Write-Host "ERRO: define a variavel de ambiente FAICLEID_SERVICE_KEY antes de correr este script." -ForegroundColor Red
    Write-Host 'Ex.: $env:FAICLEID_SERVICE_KEY = "<a tua chave>"' -ForegroundColor Yellow
    exit 1
}
$BASE_URL = "https://tsznvdytuzvbfcnujgbg.supabase.co/functions/v1/make-server-513143ac"

Write-Host ""
Write-Host "A gerar chave para: $School ($Tipo)..." -ForegroundColor Yellow

# Gerar chave
$output = node generate-key.cjs $School $Tipo 2>&1 | Out-String

# Extrair JSON
$lines = $output -split "`n"
$inJson = $false
$jsonLines = @()
foreach ($line in $lines) {
    if ($line.Trim() -eq "{") { $inJson = $true }
    if ($inJson) { $jsonLines += $line }
    if ($inJson -and $line.Trim() -eq "}") { $inJson = $false; break }
}

$jsonStr = $jsonLines -join "`n"
try {
    $json = $jsonStr | ConvertFrom-Json
} catch {
    Write-Host "ERRO ao processar JSON!" -ForegroundColor Red
    exit 1
}

$key = $json.key.Trim()
$expiresAt = $json.expiresAt.Trim()

if (-not $key) {
    Write-Host "ERRO: Chave nao encontrada!" -ForegroundColor Red
    exit 1
}

# Gerar hash
$hash = node -e "const c=require('crypto');process.stdout.write(c.createHash('sha256').update('$key'.trim().toUpperCase()).digest('hex'));"

Write-Host "Chave gerada: $key" -ForegroundColor Green

# Registar hash no backend
Write-Host "A registar no backend..." -ForegroundColor Yellow
$body = "{`"keyHash`":`"$hash`",`"school`":`"$School`",`"tipo`":`"$Tipo`",`"expiresAt`":`"$expiresAt`"}"

try {
    $reg = Invoke-RestMethod -Uri "$BASE_URL/activation-keys" -Method POST `
        -Headers @{"X-Service-Key"=$SERVICE_KEY; "Content-Type"="application/json"} `
        -Body $body
    Write-Host "Chave registada com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "ERRO ao registar: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  FAICLEID ERP - CHAVE PRONTA PARA ENTREGA" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Escola : $School" -ForegroundColor White
Write-Host "  Tipo   : $Tipo" -ForegroundColor White
Write-Host "  Chave  : $key" -ForegroundColor Yellow
Write-Host "  Link   : https://faicleid-erp.vercel.app/activate" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "MENSAGEM WHATSAPP:" -ForegroundColor Green
Write-Host "-------------------------------------------"
Write-Host "Ola! Aqui esta o seu acesso ao FaiCleid ERP."
Write-Host ""
Write-Host "Chave: $key"
Write-Host "Link : https://faicleid-erp.vercel.app/activate"
Write-Host "Expira: $expiresAt"
Write-Host ""
Write-Host "Apos o trial:"
Write-Host "  Trimestral: 7.500 MT"
Write-Host "  Anual     : 25.000 MT"
Write-Host "-------------------------------------------"
Write-Host ""

# Copiar chave para clipboard
$key | Set-Clipboard
Write-Host "Chave copiada para o clipboard!" -ForegroundColor Green
Write-Host ""