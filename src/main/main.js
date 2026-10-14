const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { scanSteamGames } = require('./steamScanner');
const { getGameMods, getGameAchievements } = require('./modsManager');
const { 
    checkOpenSteamToolInstalled, 
    installOpenSteamToolFiles, 
    applyOpenSteamToolIntegration, 
    checkForAppUpdates 
} = require('./openSteamManager');

const userDataPath = path.join(app.getPath('userData'), 'user_profile.json');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1300,
        height: 880,
        backgroundColor: '#0f0f11',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.exit();
});

ipcMain.handle('scan-steam-games', async () => {
    try { return scanSteamGames(); } catch (err) { return []; }
});

ipcMain.handle('fetch-game-mods', async (event, source, gameName) => getGameMods(source, gameName));
ipcMain.handle('fetch-game-achievements', async (event, appId) => getGameAchievements(appId));

// دوال IPC لـ OpenSteamTool والتحديثات
ipcMain.handle('check-opensteam-status', async () => {
    try { return checkOpenSteamToolInstalled(); } catch (err) { return { installed: false, message: err.message }; }
});

ipcMain.handle('install-opensteam-files', async () => {
    try { return installOpenSteamToolFiles(); } catch (err) { return { success: false, message: err.message }; }
});

ipcMain.handle('apply-opensteam-direct', async (event, appId) => {
    try { return applyOpenSteamToolIntegration(appId); } catch (err) { return { success: false, message: err.message }; }
});

ipcMain.handle('check-for-app-update', async () => {
    try { return await checkForAppUpdates(); } catch (err) { return { hasUpdate: false }; }
});

ipcMain.handle('open-onlinefix-in-app', (event, url, targetGameFolder) => {
    let fixModal = new BrowserWindow({
        width: 1100,
        height: 750,
        title: 'Online-Fix Direct Downloader',
        autoHideMenuBar: true,
        backgroundColor: '#0f0f11',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    fixModal.webContents.session.on('will-download', (downloadEvent, item) => {
        const fileName = item.getFilename();
        const saveDirectory = targetGameFolder || app.getPath('downloads');
        const savePath = path.join(saveDirectory, fileName);
        item.setSavePath(savePath);

        item.once('done', (event, state) => {
            if (state === 'completed') {
                dialog.showMessageBox(fixModal, {
                    type: 'info',
                    title: 'تم اكتمال التحميل',
                    message: `تم تحميل الباتش بنجاح إلى:\n${savePath}\n\n🔑 كلمة سر فك الضغط هي: online-fix.me`
                });
            }
        });
    });

    fixModal.loadURL(url);
});

ipcMain.handle('fetch-game-details', async (event, appId) => {
    try {
        const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=arabic`, { timeout: 5000 });
        if (response.data && response.data[appId] && response.data[appId].success) {
            return response.data[appId].data;
        }
        return null;
    } catch (error) { return null; }
});

ipcMain.handle('select-game-executable', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Executables', extensions: ['exe'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath, '.exe');
    return { filePath, fileName };
});

ipcMain.handle('save-user-profile', async (event, profileData) => {
    try {
        fs.writeFileSync(userDataPath, JSON.stringify(profileData, null, 2), 'utf8');
        return true;
    } catch (error) { return false; }
});

ipcMain.handle('load-user-profile', async () => {
    try {
        if (fs.existsSync(userDataPath)) return JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
        return null;
    } catch (error) { return null; }
});