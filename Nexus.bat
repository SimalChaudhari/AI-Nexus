@echo off

cd D:\AI-Nexus\AI-Nexus-backend
start cmd /k npm run start:prod

cd D:\AI-Nexus\AI-Nexus-flowise
start cmd /k npm run start

cd D:\AI-Nexus\AI-Nexus-flowise
start cmd /k pnpm run start:prod