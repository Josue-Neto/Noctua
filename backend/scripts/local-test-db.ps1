$ErrorActionPreference = 'Stop'
$workspace = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$testRoot = Join-Path $workspace '.local-test'
$data = Join-Path $testRoot 'postgres'
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
New-Item -ItemType Directory -Force -Path $testRoot | Out-Null
$secretFile = Join-Path $testRoot 'postgres-password'
if (-not (Test-Path -LiteralPath $secretFile)) {
  $testSecret = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
  Set-Content -LiteralPath $secretFile -Value $testSecret
}
if (-not (Test-Path -LiteralPath (Join-Path $data 'PG_VERSION'))) {
  & (Join-Path $pgBin 'initdb.exe') -D $data -U noctua_test -A scram-sha-256 --pwfile=$secretFile --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw 'initdb falhou' }
}
& (Join-Path $pgBin 'pg_ctl.exe') -D $data status
if ($LASTEXITCODE -ne 0) {
  & (Join-Path $pgBin 'pg_ctl.exe') -D $data -l (Join-Path $testRoot 'postgres.log') -o '-h 127.0.0.1 -p 55432' start
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL de testes não iniciou' }
}
Write-Output 'PostgreSQL de testes em 127.0.0.1:55432; credenciais somente em .local-test.'
