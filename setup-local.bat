@echo off
echo Setting up local development environment...

REM Check if .env file exists
if not exist ".env" (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo ✅ .env file created. Please update the values as needed.
) else (
    echo ✅ .env file already exists.
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)

echo ✅ Docker is running.

REM Build and start services
echo Building and starting Docker services...
docker-compose -f docker-compose.dev.yml up --build -d

echo ✅ Development environment is ready!
echo.
echo Services available at:
echo   🗄️  Database: localhost:5432
echo   📊 Jaeger UI: http://localhost:16686
echo   📈 OTEL Collector: localhost:4317 (gRPC), localhost:4318 (HTTP)
echo.
echo To view logs: docker-compose -f docker-compose.dev.yml logs -f
echo To stop services: docker-compose -f docker-compose.dev.yml down
pause