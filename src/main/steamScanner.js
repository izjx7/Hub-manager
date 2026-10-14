const fs = require('fs');
const path = require('path');

function scanSteamGames() {
    let installedGames = [];
    
    // قائمة الأقراص الشائعة للفحص الشامل
    const drives = ['C:', 'D:', 'E:', 'F:'];
    const commonSteamFolders = [
        'Program Files (x86)\\Steam',
        'Program Files\\Steam',
        'Steam',
        'SteamLibrary',
        'Games\\Steam'
    ];

    let steamPaths = [];

    drives.forEach(drive => {
        commonSteamFolders.forEach(folder => {
            steamPaths.push(path.join(drive + '\\', folder));
        });
    });

    steamPaths.forEach(steamPath => {
        try {
            const appsPath = path.join(steamPath, 'steamapps');
            if (fs.existsSync(appsPath)) {
                const files = fs.readdirSync(appsPath);

                files.forEach(file => {
                    if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
                        const content = fs.readFileSync(path.join(appsPath, file), 'utf8');
                        const appIdMatch = content.match(/"appid"\s+"(\d+)"/);
                        const nameMatch = content.match(/"name"\s+"([^"]+)"/);
                        const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/);

                        if (appIdMatch && nameMatch && installDirMatch) {
                            const appId = appIdMatch[1];
                            const gameName = nameMatch[1];
                            const folderName = installDirMatch[1];
                            const gameFolderPath = path.join(appsPath, 'common', folderName);

                            let exePath = '';
                            if (fs.existsSync(gameFolderPath)) {
                                const findExeRecursive = (dir) => {
                                    try {
                                        const entries = fs.readdirSync(dir, { withFileTypes: true });
                                        for (const entry of entries) {
                                            const fullPath = path.join(dir, entry.name);
                                            if (entry.isDirectory() && entry.name !== 'Support') {
                                                const found = findExeRecursive(fullPath);
                                                if (found) return found;
                                            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
                                                if (!entry.name.toLowerCase().includes('unins') && !entry.name.toLowerCase().includes('crash')) {
                                                    return fullPath;
                                                }
                                            }
                                        }
                                    } catch (e) {}
                                    return '';
                                };

                                exePath = findExeRecursive(gameFolderPath);
                            }

                            if (!installedGames.some(g => g.appId === appId)) {
                                installedGames.push({
                                    appId: appId,
                                    name: gameName,
                                    executablePath: exePath || gameFolderPath
                                });
                            }
                        }
                    }
                });
            }
        } catch (e) {}
    });

    return installedGames;
}

module.exports = { scanSteamGames };