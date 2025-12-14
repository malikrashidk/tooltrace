param (
    [switch]$DryRun,
    [string]$BackupDir = ".\backup"
)

$files = Get-ChildItem . -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.md,*.json | Where-Object { 
    $_.FullName -notmatch 'node_modules|dist|build|\.next|out|coverage|\.git' 
}

function U([int]$cp) { [char]$cp }

$replacements = @(
  @{ bad = "â€¦"; good = U 0x2026 }
  @{ bad = "â†’"; good = U 0x2192 }
  @{ bad = "âˆž"; good = U 0x221E }
  @{ bad = "â€¢"; good = U 0x2022 }
  @{ bad = "Â·";  good = U 0x00B7 }
```
```powershell
<<<<<<< SEARCH
  $content = $content.Replace($r.bad, $r.good)
  @{ bad = "âœ";  good = U 0x2713 }
)

foreach ($f in $files) {
  $path = $f.FullName
  try { $content = Get-Content -Path $path -Raw -ErrorAction Stop } catch { continue }
  $orig = $content

  foreach ($r in $replacements) {
    $content = $content.Replace($r.bad, $r.good)
  }

  if ($content.Length -gt 0 -and $content[0] -eq [char]0xFEFF) {
    $content = $content.Substring(1)
  }

  if ($content.Length -gt 0 -and $content -ne $orig) {
    Set-Content -Path $path -Value $content -Encoding utf8 -NoNewline
  }
}

Write-Host "DONE"
