#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Interactive DevOps menu for the GEP stack.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot

$ComposeProd = 'docker-compose.prod.yml'

$Containers = [ordered]@{
    1 = @{ Name = 'IAM';            Container = 'gep-iam' }
    2 = @{ Name = 'Supplier';       Container = 'gep-supplier' }
    3 = @{ Name = 'Purchase Order'; Container = 'gep-po' }
    4 = @{ Name = 'Seed';           Container = 'gep-seed' }
    5 = @{ Name = 'Web UI';         Container = 'gep-web' }
    6 = @{ Name = 'Postgres';       Container = 'gep-postgres' }
    7 = @{ Name = 'MongoDB';        Container = 'gep-mongo' }
    8 = @{ Name = 'CloudBeaver';    Container = 'gep-cloudbeaver' }
    9 = @{ Name = 'Mongo Express';  Container = 'gep-mongo-express' }
}

$IacDir   = Join-Path $RepoRoot 'iac'
$TestsDir = Join-Path $RepoRoot 'tests'

function Show-Menu {
    Write-Host ""
    Write-Host "===== GEP DevOps Menu =====" -ForegroundColor Cyan
    Write-Host " a) Build and push images to Docker Hub"
    Write-Host " b) Run all containers"
    Write-Host " c) View container status"
    Write-Host " d) View container logs"
    Write-Host " e) Restart containers"
    Write-Host " f) Azure IaC deployment (Terraform)"
    Write-Host " g) Run tests (API / UI / Both)"
    Write-Host " h) Exit"
    Write-Host "==========================="
}

function Invoke-BuildAndPush {
    $username = Read-Host "Docker Hub username"
    $patSecure = Read-Host "Docker Hub PAT" -AsSecureString
    $pat = [System.Net.NetworkCredential]::new('', $patSecure).Password
    & (Join-Path $PSScriptRoot 'build-and-push.ps1') -Username $username -Pat $pat
}

function Invoke-Run {
    & (Join-Path $PSScriptRoot 'run.ps1')
}

function Show-Status {
    docker compose -f $ComposeProd ps
}

function Show-Logs {
    Write-Host ""
    Write-Host "Select a container:" -ForegroundColor Yellow
    foreach ($k in $Containers.Keys) {
        Write-Host (" {0}. {1}" -f $k, $Containers[$k].Name)
    }
    $sel = Read-Host "Enter number"
    $key = 0
    if (-not [int]::TryParse($sel, [ref]$key) -or -not $Containers.Contains($key)) {
        Write-Host "Invalid selection." -ForegroundColor Red
        return
    }
    $target = $Containers[$key].Container
    Write-Host "==> Last 100 lines of '$target'" -ForegroundColor Cyan
    docker logs --tail 100 $target
}

function Invoke-Restart {
    Write-Host "==> Restarting all containers..." -ForegroundColor Cyan
    docker compose -f $ComposeProd restart
}

function Test-IacPrereqs {
    if (-not (Test-Path $IacDir)) {
        Write-Host "IaC folder not found at $IacDir" -ForegroundColor Red
        return $false
    }
    if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
        Write-Host "Terraform CLI not found on PATH." -ForegroundColor Red
        return $false
    }
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        Write-Host "Azure CLI ('az') not found on PATH." -ForegroundColor Red
        return $false
    }
    $account = az account show 2>$null | ConvertFrom-Json
    if (-not $account) {
        Write-Host "Not logged into Azure. Run 'az login' first." -ForegroundColor Red
        return $false
    }
    Write-Host ("Azure subscription: {0} ({1})" -f $account.name, $account.id) -ForegroundColor DarkGray
    return $true
}

function Invoke-Terraform {
    param([Parameter(Mandatory)][string[]]$Args)
    Push-Location $IacDir
    try {
        & terraform @Args
    } finally {
        Pop-Location
    }
}

function Show-IacMenu {
    Write-Host ""
    Write-Host "--- Azure IaC (Terraform) ---" -ForegroundColor Cyan
    Write-Host "  1) terraform init"
    Write-Host "  2) terraform plan"
    Write-Host "  3) terraform apply"
    Write-Host "  4) terraform output (show SSH command + URLs)"
    Write-Host "  5) terraform destroy"
    Write-Host "  6) az login"
    Write-Host "  0) Back to main menu"
    Write-Host "-----------------------------"
}

function Invoke-IacMenu {
    if (-not (Test-IacPrereqs)) { return }
    while ($true) {
        Show-IacMenu
        $sub = (Read-Host "Choose an IaC option")
        switch ($sub) {
            '1' { Invoke-Terraform -Args @('init') }
            '2' { Invoke-Terraform -Args @('plan') }
            '3' {
                $confirm = Read-Host "Apply will create Azure resources. Type 'yes' to continue"
                if ($confirm -eq 'yes') {
                    Invoke-Terraform -Args @('apply', '-auto-approve')
                } else {
                    Write-Host "Apply cancelled." -ForegroundColor Yellow
                }
            }
            '4' { Invoke-Terraform -Args @('output') }
            '5' {
                $confirm = Read-Host "Destroy will DELETE all Azure resources. Type 'destroy' to confirm"
                if ($confirm -eq 'destroy') {
                    Invoke-Terraform -Args @('destroy', '-auto-approve')
                } else {
                    Write-Host "Destroy cancelled." -ForegroundColor Yellow
                }
            }
            '6' { az login | Out-Null }
            '0' { return }
            default { Write-Host "Invalid choice." -ForegroundColor Red }
        }
    }
}

function Test-TestsPrereqs {
    if (-not (Test-Path $TestsDir)) {
        Write-Host "Tests folder not found at $TestsDir" -ForegroundColor Red
        return $false
    }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "npm not found on PATH. Install Node.js first." -ForegroundColor Red
        return $false
    }
    $apiNm = Join-Path $TestsDir 'api/node_modules'
    $uiNm  = Join-Path $TestsDir 'ui/node_modules'
    if (-not (Test-Path $apiNm) -or -not (Test-Path $uiNm)) {
        Write-Host "Test dependencies are not installed yet." -ForegroundColor Yellow
        $ans = Read-Host "Run 'npm run install:all' now? (y/N)"
        if ($ans -match '^(y|yes)$') {
            Push-Location $TestsDir
            try { npm run install:all } finally { Pop-Location }
        } else {
            return $false
        }
    }
    return $true
}

function Invoke-TestsCommand {
    param([Parameter(Mandatory)][string]$Script, [string]$Label)
    if ($Label) { Write-Host "==> Running $Label..." -ForegroundColor Cyan }
    Push-Location $TestsDir
    try {
        npm run $Script
        $code = $LASTEXITCODE
        if ($code -eq 0) {
            Write-Host "==> $Label completed successfully." -ForegroundColor Green
        } else {
            Write-Host "==> $Label exited with code $code." -ForegroundColor Red
        }
    } finally {
        Pop-Location
    }
}

function Show-TestsMenu {
    Write-Host ""
    Write-Host "--- Test Suites ---" -ForegroundColor Cyan
    Write-Host "  1) Run API tests (Jest + coverage)"
    Write-Host "  2) Run UI tests (Playwright, Chromium)"
    Write-Host "  3) Run BOTH (API then UI)"
    Write-Host "  4) Run UI tests (headed)"
    Write-Host "  5) Open last UI HTML report"
    Write-Host "  6) Open API coverage report"
    Write-Host "  7) (Re)install test dependencies"
    Write-Host "  0) Back to main menu"
    Write-Host "-------------------"
}

function Invoke-TestsMenu {
    if (-not (Test-TestsPrereqs)) { return }
    while ($true) {
        Show-TestsMenu
        $sub = (Read-Host "Choose a test option")
        switch ($sub) {
            '1' { Invoke-TestsCommand -Script 'test:api'       -Label 'API tests' }
            '2' { Invoke-TestsCommand -Script 'test:ui'        -Label 'UI tests' }
            '3' { Invoke-TestsCommand -Script 'test:all'       -Label 'API + UI tests' }
            '4' { Invoke-TestsCommand -Script 'test:ui:headed' -Label 'UI tests (headed)' }
            '5' { Invoke-TestsCommand -Script 'test:ui:report' -Label 'UI HTML report' }
            '6' { Invoke-TestsCommand -Script 'coverage:api:open' -Label 'API coverage report' }
            '7' {
                Push-Location $TestsDir
                try { npm run install:all } finally { Pop-Location }
            }
            '0' { return }
            default { Write-Host "Invalid choice." -ForegroundColor Red }
        }
    }
}

while ($true) {
    Show-Menu
    $choice = (Read-Host "Choose an option").ToLower()
    switch ($choice) {
        'a' { Invoke-BuildAndPush }
        'b' { Invoke-Run }
        'c' { Show-Status }
        'd' { Show-Logs }
        'e' { Invoke-Restart }
        'f' { Invoke-IacMenu }
        'g' { Invoke-TestsMenu }
        'h' { Write-Host "Goodbye." -ForegroundColor Green; return }
        default { Write-Host "Invalid choice." -ForegroundColor Red }
    }
}
