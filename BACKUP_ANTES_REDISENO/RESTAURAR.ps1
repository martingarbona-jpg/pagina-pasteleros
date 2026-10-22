$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$originales = Join-Path $PSScriptRoot 'originales'
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'manifest-originales.json') -Raw | ConvertFrom-Json
$archivos = @('index.html', 'style.css')
# Verificar todos los originales antes de restaurar el primer archivo.
foreach ($archivo in $archivos) {
    $registro = $manifest | Where-Object { $_.ruta -eq $archivo }
    if (!$registro -or (Get-FileHash -LiteralPath (Join-Path $originales $archivo) -Algorithm SHA256).Hash -ne $registro.sha256) {
        throw "El respaldo de $archivo no supera la verificacion. No se restauro ningun archivo."
    }
}
foreach ($archivo in $archivos) {
    Copy-Item -LiteralPath (Join-Path $originales $archivo) -Destination (Join-Path $root $archivo) -Force
    $registro = $manifest | Where-Object { $_.ruta -eq $archivo }
    if ((Get-FileHash -LiteralPath (Join-Path $root $archivo) -Algorithm SHA256).Hash -ne $registro.sha256) {
        throw "No se pudo verificar la restauracion de $archivo."
    }
}
Write-Host 'Restauracion verificada: index.html y style.css coinciden exactamente con los originales anteriores al rediseno.'
Write-Host 'El respaldo se conserva. Git y los demas archivos no se modificaron. Recarga el navegador con Ctrl+F5.'
