@echo off
rem ============================================================
rem  PR Box - liga todo o sistema em desenvolvimento (Windows)
rem  Duplo-clique neste arquivo ou rode "iniciar-windows.cmd".
rem  Para desligar: feche esta janela (ou Ctrl+C).
rem ============================================================
setlocal
cd /d "%~dp0"
title PR Box - desenvolvimento

rem Usa o Node 24 do nvm (Laravel Herd) se existir, mesmo que o padrao do Windows seja outro
set "NODE24=%USERPROFILE%\.config\herd\bin\nvm\v24.21.0"
if exist "%NODE24%\node.exe" set "PATH=%NODE24%;%PATH%"

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)" 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] E necessario o Node.js 22.12 ou mais novo. Versao atual:
  node -v
  echo Instale o Node 24 ^(nvm install 24^) e tente de novo.
  pause
  exit /b 1
)
echo [1/5] Node.js:
node -v

docker info >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ERRO] O Docker Desktop nao esta rodando. Abra o Docker Desktop, espere "Engine running" e tente de novo.
  pause
  exit /b 1
)
echo [2/5] Subindo o banco de dados ^(Docker^)...
call docker compose up -d --wait || goto erro

if not exist node_modules (
  echo [3/5] Instalando dependencias ^(so na primeira vez^)...
  call npm install || goto erro
) else (
  echo [3/5] Dependencias ja instaladas.
)

if not exist api\.env (
  echo        Criando api\.env a partir do api\.env.example
  copy api\.env.example api\.env >nul
)

echo [4/5] Atualizando o banco ^(migrations e dados iniciais^)...
call npm run db:generate >nul || goto erro
call npm run db:deploy -w api || goto erro
call npm run db:seed || goto erro

echo [5/5] Iniciando API ^(porta 3333^) e site ^(http://localhost:5173^)...
echo        O navegador vai abrir em alguns segundos. Para desligar, feche esta janela.
start "" /min cmd /c "timeout /t 8 >nul & start http://localhost:5173"
call npm run dev
exit /b 0

:erro
echo.
echo [ERRO] Algo deu errado no passo acima. Veja a mensagem e tente de novo.
pause
exit /b 1
