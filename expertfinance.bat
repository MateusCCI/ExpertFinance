@echo off
title Minhas Finanças - Dev Server
cd /d "C:\VSCODE\PROJETOS\expertFinance"
echo.
echo 🚀 Iniciando servidor de desenvolvimento...
echo 📁 Diretório: %CD%
echo.
call npm run dev
pause