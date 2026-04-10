@echo off
REM Deploy ObschiySbor to server
REM Usage: deploy.bat [all|backend|frontend]

set SERVER=89.111.154.208
set PROJECT_DIR=/root/obschiysbor

echo === Building frontend ===
cd frontend && call npm run build && cd ..
if errorlevel 1 (
    echo Frontend build FAILED
    exit /b 1
)

echo === Syncing files to server ===
scp -r backend/ deploy/ docker-compose.yml root@%SERVER%:%PROJECT_DIR%/
scp -r frontend/dist/ root@%SERVER%:%PROJECT_DIR%/frontend-dist/

echo === Deploying on server ===
ssh root@%SERVER% "cd %PROJECT_DIR% && cp -r frontend-dist/* frontend_dist_tmp/ 2>/dev/null; mkdir -p frontend_dist_tmp && cp -r frontend-dist/* frontend_dist_tmp/"

echo === Done! ===
echo Now SSH into server and run: cd /root/obschiysbor && docker compose up -d --build
