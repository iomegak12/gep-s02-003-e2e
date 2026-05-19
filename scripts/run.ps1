#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run all GEP containers using the published Docker Hub images
    (docker-compose.prod.yml — image-only, no build).
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot

Write-Host "==> Pulling latest images..." -ForegroundColor Cyan
docker compose -f docker-compose.prod.yml pull
if ($LASTEXITCODE -ne 0) { throw "docker compose pull failed" }

Write-Host "==> Starting containers..." -ForegroundColor Cyan
docker compose -f docker-compose.prod.yml up -d
if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }

Write-Host "`nStack is up. Open http://localhost:8080" -ForegroundColor Green
docker compose -f docker-compose.prod.yml ps
