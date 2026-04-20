@echo off

echo [EduCollab] Starting services...

:: Check and start MySQL
sc query MySQL80 | find "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [EduCollab] Starting MySQL...
    net start MySQL80 >nul 2>&1
    if %errorlevel% neq 0 (
        start "" /B "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.4\my.ini" --console >nul 2>&1
        timeout /t 5 /nobreak >nul
    )
)

:: Create directories
if not exist "%~dp0..\.local-run" mkdir "%~dp0..\.local-run"
if not exist "%~dp0..\backend\data\uploads" mkdir "%~dp0..\backend\data\uploads"
if not exist "%~dp0..\backend\data\repos" mkdir "%~dp0..\backend\data\repos"

:: Start collab-server
netstat -ano | find ":1234" | find "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [EduCollab] Starting collab-server...
    cd /d "%~dp0..\collab-server"
    start "" npm run dev
    cd /d "%~dp0"
)

:: Start backend
netstat -ano | find ":8080" | find "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [EduCollab] Starting backend...
    cd /d "%~dp0..\backend"
    start "" java -DB_URL="jdbc:mysql://localhost:3306/educollab?useSSL=false^&allowPublicKeyRetrieval=true^&serverTimezone=Asia/Shanghai^&characterEncoding=utf8" -DDB_USERNAME=educollab -DDB_PASSWORD=educollab -DJWT_SECRET=educollab-demo-jwt-secret-change-me-32-bytes-minimum -DFILE_STORAGE_ROOT="%~dp0..\backend\data\uploads" -DGIT_REPO_ROOT="%~dp0..\backend\data\repos" -jar target\educollab-backend-0.2.0.jar
    cd /d "%~dp0"
)

:: Start frontend
netstat -ano | find ":3000" | find "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [EduCollab] Starting frontend...
    cd /d "%~dp0..\frontend"
    start "" npm run dev
    cd /d "%~dp0"
)

echo.
echo [EduCollab] Done!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8080
echo   Collab:   ws://localhost:1234
echo.
pause
