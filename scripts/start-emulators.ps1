$ErrorActionPreference = "Stop"

$androidStudioJbr = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path -LiteralPath "$androidStudioJbr\bin\java.exe") {
  $env:JAVA_HOME = $androidStudioJbr
  $env:Path = "$androidStudioJbr\bin;$env:Path"
}

Write-Host "Firebase Emulator Suite Java surumu:"
& java.exe -version
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

& npm.cmd --prefix functions run build
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

& firebase.cmd emulators:start --only auth,functions,firestore,storage
exit $LASTEXITCODE
