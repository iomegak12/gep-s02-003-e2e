#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build all GEP container images and push them to Docker Hub.
.PARAMETER Username
    Docker Hub username (image namespace).
.PARAMETER Pat
    Docker Hub Personal Access Token.
.EXAMPLE
    ./build-and-push.ps1 -Username iomega -Pat dckr_pat_xxx
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Username,

    [Parameter(Mandatory = $true)]
    [string]$Pat
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot

Write-Host "==> Logging in to Docker Hub as '$Username'..." -ForegroundColor Cyan
$Pat | docker login --username $Username --password-stdin
if ($LASTEXITCODE -ne 0) { throw "docker login failed" }

Write-Host "==> Building images via docker-compose.yml..." -ForegroundColor Cyan
docker compose -f docker-compose.yml build
if ($LASTEXITCODE -ne 0) { throw "docker compose build failed" }

$Images = @(
    'iomega/gep-iam:latest',
    'iomega/gep-supplier:latest',
    'iomega/gep-po:latest',
    'iomega/gep-seed:latest',
    'iomega/gep-web:latest'
)

foreach ($img in $Images) {
    Write-Host "==> Pushing $img" -ForegroundColor Cyan
    docker push $img
    if ($LASTEXITCODE -ne 0) { throw "docker push failed for $img" }
}

Write-Host "==> Logging out..." -ForegroundColor Cyan
docker logout | Out-Null

Write-Host "`nAll images built and pushed successfully." -ForegroundColor Green
