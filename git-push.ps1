# Use este script no PowerShell para enviar o projeto ao GitHub.
# Substitua <URL_DO_REPO> pela URL do repositório remoto criado no GitHub.

param(
  [string]$RemoteUrl = "https://github.com/Viitiih/Calendario",
  [string]$Branch = "main"
)

if ([string]::IsNullOrWhiteSpace($RemoteUrl) -or $RemoteUrl -match '^<.+>$') {
  Write-Host "Por favor, edite este arquivo e substitua a URL pelo repositório GitHub correto." -ForegroundColor Yellow
  exit 1
}

Write-Host "Inicializando repositório Git..."
git init

Write-Host "Adicionando arquivos..."
git add .

Write-Host "Criando commit..."
git commit -m "Primeiro commit do projeto Calendario"

Write-Host "Definindo branch principal..."
git branch -M $Branch

Write-Host "Adicionando remote..."
git remote add origin $RemoteUrl

Write-Host "Enviando para o GitHub..."
git push -u origin $Branch

Write-Host "Concluído. Abra seu repositório no GitHub para confirmar o envio." -ForegroundColor Green
