@echo off
echo [EduCollab] Stopping all services...

:: Stop frontend and collab-server (Node.js)
taskkill /F /IM node.exe >nul 2>&1
echo [EduCollab] Node.js services stopped

:: Stop backend (Java)
taskkill /F /IM java.exe >nul 2>&1
echo [EduCollab] Java services stopped

:: Stop MySQL
net stop MySQL80 >nul 2>&1
echo [EduCollab] MySQL stopped

echo [EduCollab] All services stopped
pause
