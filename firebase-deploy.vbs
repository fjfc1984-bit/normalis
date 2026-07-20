
' firebase-deploy.vbs v2 — Usa firebase global instalado en npm
' Escribe resultado en firebase-deploy.log

Dim oShell, oFSO, sLog, oFile, cmd, ret
Dim sFire, sRepo

Set oShell = CreateObject("WScript.Shell")
Set oFSO   = CreateObject("Scripting.FileSystemObject")

sLog  = "C:\Users\fjfc1\OneDrive\Documentos\GitHub\normalis\firebase-deploy.log"
sRepo = "C:\Users\fjfc1\OneDrive\Documentos\GitHub\normalis\functions"

' Firebase global path (instalado con npm install -g)
sFire = "%APPDATA%\npm\firebase.cmd"

Set oFile = oFSO.CreateTextFile(sLog, True)
oFile.WriteLine "=== NormaLis Firebase Deploy v2 ==="
oFile.WriteLine "Fecha: " & Now()
oFile.Close

' Paso 1: Set config Gemini API key
' SEGURIDAD: API key removida del script. Configura manualmente antes de deploy:
' firebase functions:config:set gemini.api_key="TU_CLAVE_AQUI" --project normalis-5587d
Set oFile = oFSO.OpenTextFile(sLog, 8)
oFile.WriteLine "NOTA: gemini.api_key debe configurarse manualmente (removida por seguridad)"
oFile.Close
ret = 0

' Paso 2: Deploy
cmd = "cmd /c cd /d """ & sRepo & """ && " & _
      sFire & " deploy --only functions " & _
      "--project normalis-5587d >> """ & sLog & """ 2>&1"

ret = oShell.Run(cmd, 0, True)

Set oFile = oFSO.OpenTextFile(sLog, 8)
oFile.WriteLine "Deploy: exit " & ret
oFile.WriteLine IIf(ret=0, "=== EXITO ===", "=== ERROR code " & ret & " ===")
oFile.Close

MsgBox "Deploy terminado (exit " & ret & "). Ver firebase-deploy.log", _
       vbInformation, "NormaLis"
