param(
    [Parameter(Mandatory=$true)][string[]]$Modules,
    [Parameter(Mandatory=$true)][string]$Work
)
$ErrorActionPreference = 'Stop'
$catalog = Get-Content (Join-Path $PSScriptRoot 'launch-cases.json') -Raw | ConvertFrom-Json
$workRoot = (Resolve-Path -LiteralPath $Work).Path
foreach ($name in $Modules) {
    $case = @($catalog.cases | Where-Object module -eq $name)
    if ($case.Count -ne 1) { throw "Unknown or ambiguous player module: $name" }
    $rules = @(
        @('D for desk','D'), @('type it in now','G1 Launch Tester'), @('Y for yes or N','Y'),
        @('0=Male','0'), @('commit suicide','N'), @('R to read instructions','T'), @('Press any key',' '),
        @('^.X.: $',@('2','1')), @('B=Buy weapon',@('B','X')), @('5=Sword',@('5','X')),
        @('G=Good quality','G'), @('1=Leather','1'), @('Enter the selection',[string]$case[0].nativeFilesetUid),
        @('^> $','<stop>')
    )
    foreach ($answer in $case[0].extraAnswers) { $rules += ,@($answer[0],$answer[1]) }
    $script = @{max=80;rules=$rules;safeFinal=$true;expectInput='line';expectPhase=$case[0].phase}
    $file = Join-Path $workRoot ('launch-' + $name + '.json')
    $script | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $file
    Write-Output $file
}
