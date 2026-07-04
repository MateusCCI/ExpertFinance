@echo off
title Minhas Finanças - Build
cd /d "C:\VSCODE\PROJETOS\expertFinance"
echo.
echo 🏗️  Compilando projeto...
echo 📁 Diretório: %CD%
echo.
call npm run build
echo.
echo ✅ Build concluído!
pause