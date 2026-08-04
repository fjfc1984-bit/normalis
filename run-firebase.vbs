Dim oShell, oExec, sOutput, sLine
Set oShell = CreateObject("WScript.Shell")

' Correr firebase deploy y capturar output
Set oExec = oShell.Exec("cmd.exe /c cd /d C:\dev\normalis\functions && firebase deploy --only functions:nuevoLead 2>&1")

sOutput = ""
Do While Not oExec.StdOut.AtEndOfStream
    sLine = oExec.StdOut.ReadLine()
    sOutput = sOutput & sLine & vbCrLf
Loop

' Guardar en log
Dim oFile
Set oFile = CreateObject("Scripting.FileSystemObject").OpenTextFile("C:\dev\normalis\deploy-output.log", 2, True)
oFile.Write "EXIT CODE: " & oExec.ExitCode & vbCrLf & vbCrLf & sOutput
oFile.Close

MsgBox "Deploy terminado. Exit code: " & oExec.ExitCode & vbCrLf & vbCrLf & Left(sOutput, 500), 64, "NormaLis Deploy"
