param([string]$msg = "feat: actualizaciones NormaLis")
Set-Location "C:\dev\normalis"
Remove-Item ".git\index.lock" -Force -ErrorAction SilentlyContinue
Remove-Item ".git\HEAD.lock" -Force -ErrorAction SilentlyContinue
Remove-Item ".git\refs\remotes\origin\main.lock" -Force -ErrorAction SilentlyContinue
git add -A
git commit -m $msg
git push origin main
Write-Host "Push completado." -ForegroundColor Green
