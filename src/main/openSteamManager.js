const fs = require('fs');
const path = require('path');
const axios = require('axios');

// إصدار التطبيق الحالي
const currentAppVersion = '1.0.0';
// رابط ملف الـ version.json على مستودع GitHub الخاص بك
const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/izjx7/HUB-Steam-Manager/main/version.json';

// البحث عن مسار ستيم في الجهاز
function getSteamPath() {
    const possibleSteamPaths = [
        'C:\\Program Files (x86)\\Steam',
        'C:\\Program Files\\Steam',
        'D:\\Steam',
        'E:\\Steam'
    ];
    return possibleSteamPaths.find(p => fs.existsSync(p)) || null;
}

// التحقق من وجود ملفات OpenSteamTool في مجلد ستيم
function checkOpenSteamToolInstalled() {
    const steamPath = getSteamPath();
    if (!steamPath) return { installed: false, message: 'لم يتم العثور على مسار ستيم.' };

    const coreFile = path.join(steamPath, 'OpenSteamTool.dll');
    const isInstalled = fs.existsSync(coreFile);

    return {
        installed: isInstalled,
        steamPath: steamPath,
        message: isInstalled ? 'ملفات OpenSteamTool مثبته وجاهزة.' : 'ملفات OpenSteamTool غير مثبته في مجلد ستيم.'
    };
}

// التثبيت الفعلي بنسخ الملفات من مجلد المشروع (src/tools) إلى مسار ستيم
function installOpenSteamToolFiles() {
    const steamPath = getSteamPath();
    if (!steamPath) return { success: false, message: 'تعذر العثور على مسار ستيم لتثبيت الملفات.' };

    try {
        const sourceToolsDir = path.join(__dirname, '../tools'); 

        if (!fs.existsSync(sourceToolsDir)) {
            return { 
                success: false, 
                message: 'مجلد الملفات (tools) غير موجود داخل المشروع. تأكد من وضعه في src/tools.' 
            };
        }

        const files = fs.readdirSync(sourceToolsDir);
        files.forEach(file => {
            const srcFile = path.join(sourceToolsDir, file);
            const destFile = path.join(steamPath, file);
            if (fs.lstatSync(srcFile).isFile()) {
                fs.copyFileSync(srcFile, destFile);
            }
        });

        const configLuaDir = path.join(steamPath, 'config', 'lua');
        if (!fs.existsSync(configLuaDir)) {
            fs.mkdirSync(configLuaDir, { recursive: true });
        }

        return { 
            success: true, 
            message: 'تم تثبيت ملفات OpenSteamTool ونسخها بنجاح إلى مجلد ستيم الرئيسي! يرجى إعادة تشغيل ستيم.' 
        };
    } catch (error) {
        return { 
            success: false, 
            message: 'فشل التثبيت (يُرجى تشغيل البرنامج كمسؤول): ' + error.message 
        };
    }
}

// دالة حقن الـ AppID المباشر لمكتبة ستيم
function applyOpenSteamToolIntegration(appId) {
    if (!appId || appId.trim() === '') {
        return { success: false, message: 'الرجاء إدخال رقم AppID صحيح للعبة.' };
    }

    const steamPath = getSteamPath();
    if (!steamPath) return { success: false, message: 'لم يتم العثور على مسار ستيم.' };

    const cleanAppId = appId.trim();
    const steamAppsPath = path.join(steamPath, 'steamapps');
    const luaConfigPath = path.join(steamPath, 'config', 'lua');

    try {
        if (!fs.existsSync(luaConfigPath)) {
            fs.mkdirSync(luaConfigPath, { recursive: true });
        }

        const manifestContent = `"AppState"
{
    "appid"      "${cleanAppId}"
    "Universe"   "1"
    "name"       "OpenSteamTool Game [${cleanAppId}]"
    "StateFlags" "4"
}`;

        fs.writeFileSync(path.join(steamAppsPath, `appmanifest_${cleanAppId}.acf`), manifestContent, 'utf8');

        const luaScriptPath = path.join(luaConfigPath, 'unlocked_games.lua');
        let luaContent = fs.existsSync(luaScriptPath) ? fs.readFileSync(luaScriptPath, 'utf8') : '';
        
        const unlockCommand = `addappid(${cleanAppId})\n`;
        if (!luaContent.includes(unlockCommand)) {
            luaContent += unlockCommand;
            fs.writeFileSync(luaScriptPath, luaContent, 'utf8');
        }

        return {
            success: true,
            message: `تم حقن الـ AppID (${cleanAppId}) وإضافته إلى مكتبة Steam بنجاح! أعد تشغيل ستيم.`
        };
    } catch (error) {
        return { success: false, message: 'فشل الحقن بسبب الصلاحيات: ' + error.message };
    }
}

// فحص التحديثات الإجبارية عبر الإنترنت
async function checkForAppUpdates() {
    try {
        const response = await axios.get(VERSION_CHECK_URL, { timeout: 4000 });
        const remoteData = response.data;

        if (remoteData && remoteData.latestVersion) {
            if (remoteData.latestVersion !== currentAppVersion) {
                return {
                    hasUpdate: true,
                    force: remoteData.forceUpdate,
                    latestVersion: remoteData.latestVersion,
                    downloadUrl: remoteData.downloadUrl,
                    notes: remoteData.releaseNotes
                };
            }
        }
        return { hasUpdate: false };
    } catch (e) {
        return { hasUpdate: false };
    }
}

module.exports = { 
    checkOpenSteamToolInstalled, 
    installOpenSteamToolFiles, 
    applyOpenSteamToolIntegration, 
    checkForAppUpdates 
};