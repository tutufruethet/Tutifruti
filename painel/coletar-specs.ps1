# Painel do PC: coleta as specs do Windows e copia um JSON para colar no painel.
# So le informacoes; nao muda nada no sistema.
# Rode: clique com o botao direito > "Executar com o PowerShell"
#   ou: powershell -ExecutionPolicy Bypass -File .\coletar-specs.ps1

$ErrorActionPreference = 'SilentlyContinue'
function GB($b) { [math]::Round($b / 1GB, 1) }

$os  = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$mem = @(Get-CimInstance Win32_PhysicalMemory)

$gpus = @(Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notmatch 'Basic|Remote|Virtual|Parsec|Meta' } | ForEach-Object {
  [ordered]@{
    nome       = $_.Name
    driver     = $_.DriverVersion
    driverData = if ($_.DriverDate) { $_.DriverDate.ToString('yyyy-MM-dd') } else { '' }
    hz         = $_.CurrentRefreshRate
    res        = "$($_.CurrentHorizontalResolution)x$($_.CurrentVerticalResolution)"
  }
})

$discos = @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
  $letra = $_.DeviceID.TrimEnd(':')
  $tipo = ''
  $part = Get-Partition -DriveLetter $letra
  if ($part) {
    $pd = Get-PhysicalDisk | Where-Object { $_.DeviceId -eq [string]$part.DiskNumber } | Select-Object -First 1
    if ($pd) { $tipo = if ($pd.BusType -eq 'NVMe') { 'NVMe' } else { [string]$pd.MediaType } }
  }
  [ordered]@{ nome = $_.DeviceID; rotulo = $_.VolumeName; totalGB = GB $_.Size; livreGB = GB $_.FreeSpace; tipo = $tipo }
})

$procs = @(Get-Process | Group-Object ProcessName | ForEach-Object {
  [ordered]@{ nome = $_.Name; mb = [math]::Round((($_.Group | Measure-Object WorkingSet64 -Sum).Sum) / 1MB) }
} | Sort-Object { $_.mb } -Descending | Select-Object -First 8)

$inicio = @(Get-CimInstance Win32_StartupCommand | Select-Object -ExpandProperty Name -Unique)
$temp = (Get-ChildItem $env:TEMP -Recurse -File -Force | Measure-Object Length -Sum).Sum

$dados = [ordered]@{
  geradoEm = (Get-Date).ToString('yyyy-MM-dd HH:mm')
  os  = [ordered]@{ nome = $os.Caption; versao = $os.Version; ligadoHaDias = [math]::Round(((Get-Date) - $os.LastBootUpTime).TotalDays, 1) }
  cpu = [ordered]@{ nome = $cpu.Name.Trim(); nucleos = $cpu.NumberOfCores; threads = $cpu.NumberOfLogicalProcessors; mhz = $cpu.MaxClockSpeed; uso = $cpu.LoadPercentage }
  gpu = $gpus
  ram = [ordered]@{ totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1); livreGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1); modulos = $mem.Count; mhz = ($mem | Select-Object -First 1).Speed }
  discos = $discos
  inicializacao = $inicio
  processos = $procs
  tempGB = GB $temp
}

$json = $dados | ConvertTo-Json -Depth 5
$arquivo = Join-Path ([Environment]::GetFolderPath('Desktop')) 'painel-pc.json'
[IO.File]::WriteAllText($arquivo, $json, [Text.Encoding]::UTF8)
$json | Set-Clipboard

Write-Host ''
Write-Host 'Pronto! O JSON foi copiado e salvo em:' -ForegroundColor Green
Write-Host "  $arquivo"
Write-Host 'Abra o Painel do PC > Desempenho > cole (Ctrl+V) e clique em Importar.'
Write-Host ''
Read-Host 'Enter para fechar'
