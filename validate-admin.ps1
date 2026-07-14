# validate-admin.ps1
# Validacion pre-commit para admin.html - NormaLis
# Uso: .\validate-admin.ps1
# Corre desde la raiz del repo antes de cada commit importante.

param(
    [string]$File = "$PSScriptRoot\admin.html"
)

$errors   = @()
$warnings = @()
$ok       = @()

if (-not (Test-Path $File)) {
    Write-Host "ERROR: No se encontro el archivo $File" -ForegroundColor Red
    exit 1
}

$content = Get-Content $File -Raw -Encoding UTF8
$lines   = Get-Content $File -Encoding UTF8

# 1. Bloques <script> propios - exactamente 2 (excluye CDN imports)
$openInline    = ($lines | Where-Object { $_ -match '^\s*<script>\s*$' }).Count
$closeStandard = ($lines | Where-Object { $_ -match '^\s*</script>\s*$' }).Count

if ($openInline -eq 2 -and $closeStandard -eq 2) {
    $ok += "Script blocks: 2 bloques inline propios, correctamente cerrados"
} else {
    $errors += "Script blocks: esperados 2/2 inline, encontrados $openInline abiertos / $closeStandard cerrados"
}

# 2. Toast div en HTML entre los dos bloques
$toastLine    = ($lines | Select-String 'id="toast"' | Select-Object -First 1).LineNumber
$script1End   = ($lines | Select-Object-Index | Where-Object { $_.Value -match '^\s*</script>\s*$' } | Select-Object -First 1).Index + 1
$script2Start = ($lines | Select-Object-Index | Where-Object { $_.Value -match '^\s*<script>\s*$' } | Select-Object -Last 1).Index + 1

# Simpler approach without Select-Object-Index
$allLines = $lines
$script1EndLine = 0
$script2StartLine = 0
for ($i = 0; $i -lt $allLines.Count; $i++) {
    if ($allLines[$i] -match '^\s*</script>\s*$' -and $script1EndLine -eq 0) {
        $script1EndLine = $i + 1
    }
    if ($allLines[$i] -match '^\s*<script>\s*$') {
        $script2StartLine = $i + 1
    }
}

if (-not $toastLine) {
    $errors += "Toast div: no encontrado - falta div id=toast"
} elseif ($script1EndLine -gt 0 -and $script2StartLine -gt 0) {
    if ($toastLine -gt $script1EndLine -and $toastLine -lt $script2StartLine) {
        $ok += "Toast div: posicion correcta entre bloques script (linea $toastLine)"
    } else {
        $errors += "Toast div: fuera del HTML entre scripts (linea $toastLine, script1 cierra $script1EndLine, script2 abre $script2StartLine)"
    }
} else {
    $warnings += "Toast div encontrado (linea $toastLine) pero no se pudo verificar posicion"
}

# 3. crearIPS: rol piloto, no admin_ips
if ($content -match "rol:\s*['\`"]admin_ips['\`"]") {
    $errors += "crearIPS: usa rol admin_ips - login.html no lo maneja, usuario quedara bloqueado"
} else {
    $ok += "crearIPS: no usa rol admin_ips"
}

if ($content -match "rol:\s*['\`"]piloto['\`"]") {
    $ok += "crearIPS: rol piloto presente"
} else {
    $warnings += "crearIPS: no se encontro rol piloto - verificar asignacion en crearIPS"
}

# 4. Sin Firebase Custom Claims
if ($content -match 'token\.claims') {
    $errors += "Custom Claims: token.claims encontrado - siempre falla, usar Firestore rol check"
} else {
    $ok += "Custom Claims: sin referencias a token.claims"
}

# 5. onAuthStateChanged - exactamente 1 llamada real (excluye comentarios)
$authListeners = ($lines | Where-Object { $_ -match 'onAuthStateChanged' -and $_ -notmatch '^\s*//' -and $_ -notmatch '// ' }).Count
if ($authListeners -eq 1) {
    $ok += "onAuthStateChanged: exactamente 1 listener activo"
} elseif ($authListeners -eq 0) {
    $errors += "onAuthStateChanged: no encontrado - auth guard no funciona"
} else {
    $errors += "onAuthStateChanged: $authListeners llamadas activas (debe ser 1)"
}

# 6. initApp - definida exactamente 1 vez
$initAppDefs = ([regex]::Matches($content, 'function initApp\s*\(')).Count
if ($initAppDefs -eq 1) {
    $ok += "initApp: definida exactamente 1 vez"
} elseif ($initAppDefs -eq 0) {
    $errors += "initApp: no encontrada - el panel admin no inicializa"
} else {
    $errors += "initApp: definida $initAppDefs veces (debe ser 1)"
}

# 7. Funciones criticas presentes
$criticalFunctions = @('doLogin', 'crearIPS', 'cargarSolicitudes', 'cargarLeads', 'showToast', 'escucharProspectos', 'cargarPilotos', 'cargarAnalytics')
foreach ($fn in $criticalFunctions) {
    if ($content -match "function $fn\s*\(") {
        $ok += "Funcion ${fn}: presente"
    } else {
        $errors += "Funcion ${fn}: NO encontrada"
    }
}

# 8. Cierre correcto del archivo (ultimas 10 lineas)
$lastLines = $lines | Select-Object -Last 10
$hasClosingBody = $lastLines | Where-Object { $_ -match '</body>' }
$hasClosingHtml = $lastLines | Where-Object { $_ -match '</html>' }

if ($hasClosingBody -and $hasClosingHtml) {
    $ok += "Cierre del archivo: /body y /html presentes"
} else {
    $errors += "Cierre del archivo: falta /body o /html - archivo puede estar truncado"
}

# 9. campo nombre en crearIPS = IPS name (no persona)
# Usa patron anclado para no falso-positivo con responsable_nombre
if ($content -match '(?m)^\s+nombre:\s*datos\.nombre_responsable') {
    $errors += "crearIPS campo nombre: usa datos.nombre_responsable (persona) - debe ser datos.nombre (IPS)"
} else {
    $ok += "crearIPS campo nombre: correcto (no usa datos.nombre_responsable)"
}

# RESULTADO
$lineWidth = 60
Write-Host ""
Write-Host ("=" * $lineWidth)
Write-Host "  VALIDACION admin.html - NormaLis"
Write-Host ("=" * $lineWidth)

if ($ok.Count -gt 0) {
    Write-Host ""
    Write-Host "PASARON ($($ok.Count)):" -ForegroundColor Green
    foreach ($msg in $ok) { Write-Host "  [OK] $msg" -ForegroundColor Green }
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "ADVERTENCIAS ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($msg in $warnings) { Write-Host "  [!!] $msg" -ForegroundColor Yellow }
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "ERRORES CRITICOS ($($errors.Count)):" -ForegroundColor Red
    foreach ($msg in $errors) { Write-Host "  [XX] $msg" -ForegroundColor Red }
}

Write-Host ""
Write-Host ("=" * $lineWidth)

if ($errors.Count -eq 0) {
    Write-Host "  RESULTADO: LISTO PARA COMMIT" -ForegroundColor Green
    Write-Host ("=" * $lineWidth)
    Write-Host ""
    exit 0
} else {
    Write-Host "  RESULTADO: NO COMMITEAR - $($errors.Count) error(es) critico(s)" -ForegroundColor Red
    Write-Host ("=" * $lineWidth)
    Write-Host ""
    exit 1
}
