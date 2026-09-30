[CmdletBinding()]
param([switch]$SkipInstall)

$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm is required.' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker Desktop is required.' }
docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Start Docker Desktop before running setup.' }

if (-not $SkipInstall) {
  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
}

if (-not (Test-Path -LiteralPath 'supabase/config.toml')) {
  npx --yes supabase init --yes
  if ($LASTEXITCODE -ne 0) { throw 'Supabase initialization failed.' }
}

npx --yes supabase start | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Supabase failed to start.' }

$ErrorActionPreference = 'Continue'
$supabaseStatusJson = npx --yes supabase status --output json 2>$null
$supabaseStatusExitCode = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($supabaseStatusExitCode -ne 0) { throw 'Supabase status failed.' }
$supabaseStatus = $supabaseStatusJson | ConvertFrom-Json
if (-not $supabaseStatus.API_URL -or -not $supabaseStatus.DB_URL -or
    -not $supabaseStatus.ANON_KEY -or -not $supabaseStatus.SERVICE_ROLE_KEY) {
  throw 'Supabase did not return the required local credentials.'
}

$envLines = @(
  "NEXT_PUBLIC_SUPABASE_URL=$($supabaseStatus.API_URL)",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=$($supabaseStatus.ANON_KEY)",
  "SUPABASE_SERVICE_ROLE_KEY=$($supabaseStatus.SERVICE_ROLE_KEY)",
  "DATABASE_URL=$($supabaseStatus.DB_URL)",
  "DIRECT_URL=$($supabaseStatus.DB_URL)",
  "VITE_SUPABASE_URL=$($supabaseStatus.API_URL)",
  "VITE_SUPABASE_ANON_KEY=$($supabaseStatus.ANON_KEY)",
  'VITE_API_URL=http://localhost:3000/api',
  'NEXT_PUBLIC_API_URL=http://localhost:3000',
  'NEXT_PUBLIC_APP_URL=http://localhost:5173',
  "JWT_SECRET=$($supabaseStatus.JWT_SECRET)",
  'NODE_ENV=development'
)

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines((Join-Path (Get-Location).Path '.env.local'), $envLines, $utf8WithoutBom)
[System.IO.File]::WriteAllLines(
  (Join-Path (Get-Location).Path 'packages/backend/.env.local'),
  ($envLines + 'NEXT_IGNORE_INCORRECT_LOCKFILE=1'),
  $utf8WithoutBom
)

npm run db:push
if ($LASTEXITCODE -ne 0) { throw 'Prisma schema synchronization failed.' }
npm run db:policies
if ($LASTEXITCODE -ne 0) { throw 'Realtime policies failed.' }

Write-Host 'Local setup complete. Run npm run dev and open http://localhost:5173.'
