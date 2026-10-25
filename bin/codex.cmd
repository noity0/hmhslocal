@ECHO off
SETLOCAL
CALL :find_dp0
node "%dp0%\localai.js" %*
EXIT /b %ERRORLEVEL%

:find_dp0
SET dp0=%~dp0
EXIT /b
