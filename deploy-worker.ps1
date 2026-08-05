# NormaLis — Deploy Cloudflare Worker
# Ejecutar desde C:\dev\normalis\cloudflare-worker\
# Requiere: wrangler instalado y autenticado

Set-Location "C:\dev\normalis\cloudflare-worker"
npx wrangler deploy worker.js --name normalis
Write-Host "Deploy completado." -ForegroundColor Green
