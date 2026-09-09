param(
  [ValidateSet("full", "hybrid")]
  [string]$Mode = "full"
)

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

# Firebase CLI, ozellikle Windows'ta fonksiyon tanimlarini ilk acilista
# varsayilan 10 saniyeden daha gec kesfedebiliyor.
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "60"

$services = if ($Mode -eq "hybrid") {
  "functions,firestore,storage"
} else {
  "auth,functions,firestore,storage"
}

& firebase.cmd emulators:start --only $services
exit $LASTEXITCODE
