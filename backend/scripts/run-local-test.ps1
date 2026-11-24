param([ValidateSet('migrate','api','integration','fixtures','clean')][string]$Action = 'integration')
$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:DATABASE_URL=''
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='55432'
$env:DB_USER='noctua_test'
$env:DB_PASSWORD=(Get-Content '../.local-test/postgres-password' -Raw).Trim()
$env:DB_NAME='postgres'
$env:JWT_SECRET='local-test-only-credential-not-for-production-123456'
$env:SMTP_HOST=''
$env:MAIL_FROM=''
$env:PUSH_WORKER_ENABLED='false'
if($Action -eq 'migrate') { node scripts/migrate.mjs }
elseif($Action -eq 'api') { node dist/main.js }
elseif($Action -eq 'fixtures') { node scripts/audit-fixtures.mjs }
elseif($Action -eq 'clean') { node scripts/audit-fixtures.mjs --clean }
else { node --test test/*.integration.mjs }
exit $LASTEXITCODE
