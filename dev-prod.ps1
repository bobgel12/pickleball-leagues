# PowerShell script equivalent to `make dev-prod`
# Usage: .\dev-prod.ps1
# Or with custom production URL: .\dev-prod.ps1 -ProdApiUrl "https://custom-url.vercel.app"
# Or with Supabase: .\dev-prod.ps1 -SupabaseUrl "https://xxx.supabase.co" -SupabaseAnonKey "xxx"

param(
    [string]$ProdApiUrl = "https://pickleball-leagues.vercel.app",
    [string]$SupabaseUrl = "",
    [string]$SupabaseAnonKey = ""
)

$EnvFile = "pickleball-react\.env.local"

Write-Host "Setting up environment file..." -ForegroundColor Cyan

# Ensure .env.local exists
if (-not (Test-Path $EnvFile)) {
    New-Item -Path $EnvFile -ItemType File -Force | Out-Null
}

# Add VITE_API_BASE_URL if not present
$envContent = Get-Content $EnvFile -Raw
if ($envContent -notmatch "VITE_API_BASE_URL") {
    Add-Content -Path $EnvFile -Value "VITE_API_BASE_URL=$ProdApiUrl"
    Write-Host "Added VITE_API_BASE_URL to $EnvFile" -ForegroundColor Green
} else {
    Write-Host "VITE_API_BASE_URL already configured in $EnvFile" -ForegroundColor Yellow
}

# Add Supabase URL if provided and not present
if ($SupabaseUrl -and $envContent -notmatch "VITE_SUPABASE_URL") {
    Add-Content -Path $EnvFile -Value "VITE_SUPABASE_URL=$SupabaseUrl"
    Write-Host "Added VITE_SUPABASE_URL to $EnvFile" -ForegroundColor Green
}

# Add Supabase Anon Key if provided and not present
if ($SupabaseAnonKey -and $envContent -notmatch "VITE_SUPABASE_ANON_KEY") {
    Add-Content -Path $EnvFile -Value "VITE_SUPABASE_ANON_KEY=$SupabaseAnonKey"
    Write-Host "Added VITE_SUPABASE_ANON_KEY to $EnvFile" -ForegroundColor Green
}

# Check if Supabase is configured
$envContent = Get-Content $EnvFile -Raw
if ($envContent -notmatch "VITE_SUPABASE_URL") {
    Write-Host ""
    Write-Host "⚠️  Warning: Supabase configuration missing!" -ForegroundColor Yellow
    Write-Host "   Add your Supabase credentials to $EnvFile:" -ForegroundColor Yellow
    Write-Host "   VITE_SUPABASE_URL=https://your-project-id.supabase.co" -ForegroundColor Yellow
    Write-Host "   VITE_SUPABASE_ANON_KEY=your-anon-key-here" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Installing dependencies..." -ForegroundColor Cyan
Set-Location pickleball-react
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting development server with production API..." -ForegroundColor Green
Write-Host "Server will be available at: http://localhost:5173/" -ForegroundColor Green
Write-Host ""

npm run dev
