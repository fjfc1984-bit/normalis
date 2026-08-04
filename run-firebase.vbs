Dim oShell, oExec, sOutput, sLine
Set oShell = CreateObject("WScript.Shell")

' npm install primero (necesario al cambiar version de firebase-functions)
Set oExec = oShell.Exec("cmd.exe /c cd /d C:\dev\normalis\functions && npm install 2>&1")
sOutput = "=== npm install ===" & vbCrLf
Do While Not oExec.StdOut.AtEndOfStream
    sLine = oExec.StdOut.ReadLine()
    sOutput = sOutput & sLine & vbCrLf
Loop
sOutput = sOutput & "npm exit: " & oExec.ExitCode & vbCrLf & vbCrLf

' Firebase deploy
Set oExec = oShell.Exec("cmd.exe /c cd /d C:\dev\normalis\functions && firebase deploy --only functions:nuevoLead 2>&1")
sOutput = sOutput & "=== firebase deploy ===" & vbCrLf
Do While Not oExec.StdOut.AtEndOfStream
    sLine = oExec.StdOut.ReadLine()
    sOutput = sOutput & sLine & vbCrLf
Loop
Dim deployExit : deployExit = oExec.ExitCode
sOutput = sOutput & "deploy exit: " & deployExit

' Guardar en log
Dim oFile
Set oFile = CreateObject("Scripting.FileSystemObject").OpenTextFile("C:\dev\normalis\deploy-output.log", 2, True)
oFile.Write "EXIT CODE: " & deployExit & vbCrLf & vbCrLf & sOutput
oFile.Close

MsgBox "Deploy terminado. Exit code: " & deployExit & vbCrLf & vbCrLf & Left(sOutput, 600), 64, "NormaLis Deploy"
