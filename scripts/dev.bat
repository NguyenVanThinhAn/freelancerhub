@echo off
rem -------------------------------------------------------------------------
rem scripts/dev.bat — chay CA frontend (Vite) + backend (FastAPI) tren Windows.
rem
rem Cu phap:
rem   dev.bat            chay ca 2
rem   dev.bat web        chi frontend
rem   dev.bat api        chi backend
rem   dev.bat install    cai npm dependencies
rem   dev.bat -h         huong dan
rem -------------------------------------------------------------------------

setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0.."
set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "BACKEND_DIR=%ROOT_DIR%\backend"

rem Load env tu file (khong bat buoc)
if exist "%ROOT_DIR%\scripts\dev-stack.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%ROOT_DIR%\scripts\dev-stack.env") do (
        set "%%A=%%B"
    )
)

set "PORT_API=%PORT_API:-=8000%"
set "PORT_WEB=%PORT_WEB:-=8080%"
set "API_DEBUG=%API_DEBUG:-=0%"

rem ----- helpers -----------------------------------------------------------
goto :main

:log
    echo [dev-stack] %~1
    exit /b 0

:warn
    echo [dev-stack] %~1 >&2
    exit /b 0

:die
    echo [dev-stack] %~1 >&2
    exit /b 1

:check_frontend_deps
    if not exist "%FRONTEND_DIR%\node_modules" (
        call :log Dang cai dependencies frontend...
        cd /d "%FRONTEND_DIR%"
        call npm install
        if errorlevel 1 (
            call :die Loi npm install
        )
    )
    exit /b 0

:check_backend_deps
    if not exist "%BACKEND_DIR%\.venv\Scripts\uvicorn.exe" (
        call :die Khong thay .venv. Tao truoc: cd backend ^&^& python -m venv .venv ^&^& .venv\Scripts\pip install -r requirements.txt
    )
    exit /b 0

:run_all
    call :check_frontend_deps
    call :check_backend_deps
    call :log API=http://localhost:%PORT_API%  WEB=http://localhost:%PORT_WEB%
    call :log Nhan Ctrl+C de dung ca 2.
    cd /d "%ROOT_DIR%"
    start "freelancerhub-api" cmd /c "cd /d "%BACKEND_DIR%" ^&^& .venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port %PORT_API%"
    cd /d "%FRONTEND_DIR%"
    npm run dev -- --host 0.0.0.0 --port %PORT_WEB%
    exit /b 0

:run_web
    call :check_frontend_deps
    cd /d "%FRONTEND_DIR%"
    npm run dev -- --host 0.0.0.0 --port %PORT_WEB%
    exit /b 0

:run_api
    call :check_backend_deps
    cd /d "%BACKEND_DIR%"
    set DB_TYPE=%DB_TYPE%
    set DB_URL_MYSQL=%DB_URL_MYSQL%
    set API_DEBUG=%API_DEBUG%
    .venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port %PORT_API%
    exit /b 0

:run_install
    call :check_frontend_deps
    call :log Xong.
    exit /b 0

:show_help
    echo.
    echo Cu phap: dev.bat [web^|api^|install]
    echo.
    echo   (khong doi so)  chay ca frontend + backend
    echo   web             chi frontend (Vite)
    echo   api             chi backend  (FastAPI)
    echo   install         cai npm dependencies
    echo   -h              huong dan nay
    echo.
    echo Cau hinh: scripts\dev-stack.env
    echo   PORT_API  port FastAPI  (mac dinh 8000)
    echo   PORT_WEB  port Vite     (mac dinh 8080)
    echo.
    exit /b 0

:main
    set "CMD=%~1"
    if "%CMD%"=="" goto :run_all
    if "%CMD%"=="all"    goto :run_all
    if "%CMD%"=="web"    goto :run_web
    if "%CMD%"=="api"    goto :run_api
    if "%CMD%"=="install" goto :run_install
    if "%CMD%"=="-h"     goto :show_help
    if "%CMD%"=="/h"     goto :show_help
    if "%CMD%"=="help"   goto :show_help
    call :die Lenh khong hop le: %CMD%  (dung: all^|web^|api^|install^|-h)
