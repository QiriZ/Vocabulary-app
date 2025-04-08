@echo off
echo Creating Complete Portable Version of Vocabulary Learning System...
echo This may take a few minutes...

set OUTPUT_DIR=.\Complete-Portable-VocabSystem
set ELECTRON_PATH=.\electron-v34.4.1-win32-x64
set NODE_MODULES=.\node_modules

:: Clean output directory if exists
if exist "%OUTPUT_DIR%" (
    echo Cleaning existing output directory...
    rd /s /q "%OUTPUT_DIR%"
)

:: Create output directory
mkdir "%OUTPUT_DIR%"

:: Copy application files
echo Copying application files...
xcopy "*.html" "%OUTPUT_DIR%\" /y
xcopy "*.js" "%OUTPUT_DIR%\" /y
xcopy "*.svg" "%OUTPUT_DIR%\" /y

:: Copy assets folder
if exist "assets" (
    echo Copying assets...
    xcopy "assets" "%OUTPUT_DIR%\assets\" /e /i /y
)

:: Create cache folder
mkdir "%OUTPUT_DIR%\cache"

:: Copy Electron runtime
echo Copying Electron runtime...
xcopy "%ELECTRON_PATH%" "%OUTPUT_DIR%\electron\" /e /i /y

:: Clean up language packs - keep only what's needed
echo Optimizing language packs...
for %%f in (%OUTPUT_DIR%\electron\locales\*.pak) do (
    if /i not "%%~nf"=="zh-CN" if /i not "%%~nf"=="en-US" if /i not "%%~nf"=="zh-TW" del "%%f"
)

:: Delete large unnecessary files
echo Removing unnecessary files...
if exist "%OUTPUT_DIR%\electron\LICENSES.chromium.html" del "%OUTPUT_DIR%\electron\LICENSES.chromium.html"

:: Create node_modules directory and add necessary modules
echo Creating node_modules with essential dependencies...
mkdir "%OUTPUT_DIR%\node_modules"

:: Copy electron-store module
if exist "%NODE_MODULES%\electron-store" (
    echo Copying electron-store module...
    xcopy "%NODE_MODULES%\electron-store" "%OUTPUT_DIR%\node_modules\electron-store\" /e /i /y
)

:: Copy other necessary dependencies
echo Copying other essential dependencies...
mkdir "%OUTPUT_DIR%\node_modules\conf"
mkdir "%OUTPUT_DIR%\node_modules\axios"
mkdir "%OUTPUT_DIR%\node_modules\csv-writer"

if exist "%NODE_MODULES%\conf" (
    xcopy "%NODE_MODULES%\conf" "%OUTPUT_DIR%\node_modules\conf\" /e /i /y
)

if exist "%NODE_MODULES%\axios" (
    xcopy "%NODE_MODULES%\axios" "%OUTPUT_DIR%\node_modules\axios\" /e /i /y
)

if exist "%NODE_MODULES%\csv-writer" (
    xcopy "%NODE_MODULES%\csv-writer" "%OUTPUT_DIR%\node_modules\csv-writer\" /e /i /y
)

:: Copy subdependencies of electron-store
echo Copying subdependencies...
for %%i in (
    ajv
    atomically
    dot-prop
    env-paths
    json-schema-traverse
    lodash.clonedeep
    json-schema-typed
    mimic-fn
    onetime
    type-fest
) do (
    if exist "%NODE_MODULES%\%%i" (
        echo Copying %%i...
        mkdir "%OUTPUT_DIR%\node_modules\%%i"
        xcopy "%NODE_MODULES%\%%i" "%OUTPUT_DIR%\node_modules\%%i\" /e /i /y
    )
)

:: Create startup script
echo Creating startup script...
(
echo @echo off
echo cd /d %%~dp0
echo .\electron\electron.exe --no-sandbox no-tray-main.js
) > "%OUTPUT_DIR%\start-app.bat"

:: Create README
echo Creating README...
(
echo # 生词学习系统便携版 - 完整依赖版
echo.
echo ## 使用方法
echo 1. 双击 start-app.bat 启动应用
echo 2. 在任何应用中选中文本后按 Alt+Space 快捷键
echo 3. 如果默认快捷键被占用，可使用 Alt+Shift+S
echo.
echo ## 特点
echo * 完全便携版 - 包含所有必要依赖
echo * 无需安装 - 双击即可运行
echo * 可在任何Windows电脑上使用，无需额外安装
) > "%OUTPUT_DIR%\README.txt"

echo.
echo Complete portable version has been created successfully!
echo Location: %OUTPUT_DIR%
echo.
echo To use on another computer, copy the entire %OUTPUT_DIR% folder.
echo.
pause
