<#
PowerShell helper to safely update composer.lock for mpdf and install dependencies.
Usage: Open PowerShell in the php-backend folder and run:
    .\update_composer.ps1

This script will:
  - verify composer is available
  - backup composer.lock to composer.lock.bak
  - run `composer update mpdf/mpdf --with-dependencies` (narrow update)
  - run `composer install`
  - print helpful next steps and exit codes
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$ts] $msg"
}

# Ensure we are in script directory (php-backend)
$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
if (-not $scriptDir) { $scriptDir = Get-Location }
Set-Location $scriptDir

Write-Log "Working directory: $(Get-Location)"

# Check for composer
try {
    $composerVersion = & composer --version 2>&1
} catch {
    Write-Log "Composer not found in PATH. Please install Composer (https://getcomposer.org/download/) or run this script from a system with composer available."
    exit 2
}

Write-Log "Composer found: $composerVersion"

# Backup composer.lock if it exists
if (Test-Path composer.lock) {
    $bak = "composer.lock.bak"
    try {
        Copy-Item -Path composer.lock -Destination $bak -Force
        Write-Log "Backed up composer.lock -> $bak"
    } catch {
        Write-Log "Failed to backup composer.lock: $_"
        exit 3
    }
} else {
    Write-Log "No composer.lock found. Proceeding to run composer update will generate a new lock file."
}

# Run targeted composer update for mpdf (narrow update)
Write-Log "Running: composer update mpdf/mpdf --with-dependencies"
$updateArgs = @('update','mpdf/mpdf','--with-dependencies')
$updateProc = Start-Process -FilePath composer -ArgumentList $updateArgs -NoNewWindow -PassThru -Wait -RedirectStandardOutput update_output.txt -RedirectStandardError update_error.txt
$updateExit = $updateProc.ExitCode

Write-Log "composer update exit code: $updateExit"

if ($updateExit -ne 0) {
    Write-Log "composer update failed. See update_error.txt and update_output.txt for details."

    # If the failure is due to a missing ext (common: ext-gd for mpdf), offer an automatic retry using --ignore-platform-req
    $errText = ''
    if (Test-Path update_error.txt) { $errText = Get-Content update_error.txt -Raw }

    if ($errText -match 'ext-[a-z0-9_-]+' -or $errText -match 'missing from your system') {
        Write-Log "Detected platform requirement error in composer output."
        Write-Log "Common cause: missing PHP extension (e.g., ext-gd)."
        Write-Log "You can enable the extension in PHP (edit php.ini and enable php_gd2) for a proper fix."
        Write-Log "Attempting a fallback: re-running composer update with --ignore-platform-req=ext-gd to regenerate composer.lock (temporary)."

        $fallbackArgs = @('update','mpdf/mpdf','--with-dependencies','--ignore-platform-req=ext-gd')
        Write-Log "Running: composer $($fallbackArgs -join ' ')"
        $fbProc = Start-Process -FilePath composer -ArgumentList $fallbackArgs -NoNewWindow -PassThru -Wait -RedirectStandardOutput update_fallback_output.txt -RedirectStandardError update_fallback_error.txt
        $fbExit = $fbProc.ExitCode
        Write-Log "Fallback composer update exit code: $fbExit"

        if ($fbExit -ne 0) {
            Write-Log "Fallback update failed. See update_fallback_error.txt for details."
            Write-Log "Please enable the required PHP extensions (e.g., ext-gd) and run the script again, or run 'composer update' interactively."
            if (Test-Path composer.lock.bak) { Copy-Item -Path composer.lock.bak -Destination composer.lock -Force; Write-Log "composer.lock restored from backup." }
            exit 4
        } else {
            Write-Log "Fallback update succeeded (composer.lock regenerated ignoring ext-gd)."
        }

    } else {
        Write-Log "composer update failed for reasons other than missing platform req. Consider running 'composer update' manually."
        if (Test-Path composer.lock.bak) { Copy-Item -Path composer.lock.bak -Destination composer.lock -Force; Write-Log "composer.lock restored from backup." }
        exit 4
    }

}

Write-Log "composer update succeeded. Now running: composer install"
$installArgs = @('install')
$installProc = Start-Process -FilePath composer -ArgumentList $installArgs -NoNewWindow -PassThru -Wait -RedirectStandardOutput install_output.txt -RedirectStandardError install_error.txt
$installExit = $installProc.ExitCode
Write-Log "composer install exit code: $installExit"

if ($installExit -ne 0) {
    Write-Log "composer install failed. See install_error.txt and install_output.txt for details."
    Write-Log "You can try running 'composer install' manually or examine the error files."
    exit 5
}

Write-Log "composer install completed successfully."

# Show git diff guidance
if (Test-Path .git) {
    Write-Log "Git repository detected. You likely need to commit composer.lock."
    Write-Log "Suggested commands:"
    Write-Host "    git add composer.lock"
    Write-Host "    git commit -m \"chore: update composer.lock (mpdf)\""
} else {
    Write-Log "No .git directory detected. If you use source control, remember to commit composer.lock changes."
}

Write-Log "Done. Files created: update_output.txt, update_error.txt, install_output.txt, install_error.txt"

exit 0
