const axios = require('axios');
const { searchOnlineFixDirectly } = require('./onlineFixManager');

const ULTRAPLUS_API_KEY = 'ooG+KLCM4832FUdOM1XaMiMwNJmmQ9fLT+W1HtLnOn2+tHLxrLA=--o5aAYxE5dmsaPQ25--9DJHVNxI8cJDbxdMbpVoig==';
const NEXUS_API_KEY = 'nN29xfhZAIW2a5u/C1x8clZvf3EDcl3tt7C9GZ28NcfKZ3aaEgc=--qvFZ+UiDBIOka1RE--cyo1NhBENoRt7J3xt+mXGA==';

function getGameDomain(gameName) {
    if (!gameName) return 'skyrimspecialedition';
    const name = gameName.toLowerCase().trim();
    if (name.includes('witcher 3') || name.includes('witcher3')) return 'witcher3';
    if (name.includes('cyberpunk')) return 'cyberpunk2077';
    if (name.includes('fallout 4') || name.includes('fallout4')) return 'fallout4';
    if (name.includes('skyrim')) return 'skyrimspecialedition';
    if (name.includes('gta') || name.includes('grand theft auto')) return 'gta5';
    if (name.includes('resident evil')) return 'residentevil4';
    if (name.includes('elden ring')) return 'eldenring';
    if (name.includes('stardew')) return 'stardewvalley';
    if (name.includes('rust')) return 'rust';
    if (name.includes('black ops') || name.includes('cod')) return 'blackops3';
    if (name.includes('minecraft') || name.includes('ماينكرافت')) return 'minecraft';

    return name.replace(/[^a-z0-9]/g, '');
}

async function getNexusMods(gameQuery) {
    try {
        const gameDomain = getGameDomain(gameQuery);
        const url = `https://api.nexusmods.com/v1/games/${gameDomain}/mods/trending.json`;
        const response = await axios.get(url, { headers: { 'apikey': NEXUS_API_KEY, 'accept': 'application/json' } });
        if (response.data && Array.isArray(response.data)) {
            return response.data.slice(0, 15).map(mod => ({
                id: mod.mod_id,
                name: mod.name,
                author: mod.author || mod.uploaded_by || 'Nexus Modder',
                downloads: mod.downloads || mod.unique_downloads || 0,
                summary: mod.summary || 'لا يوجد وصف مختصر متوفر.',
                image: mod.picture_url || '',
                version: mod.version || '1.0',
                link: `https://www.nexusmods.com/${gameDomain}/mods/${mod.mod_id}`
            }));
        }
        return [];
    } catch (error) { return []; }
}

async function getUltraPlusMods(gameQuery) {
    try {
        const gameDomain = getGameDomain(gameQuery);
        const url = `https://api.nexusmods.com/v1/games/${gameDomain}/mods/latest.json`;
        const response = await axios.get(url, { headers: { 'apikey': ULTRAPLUS_API_KEY, 'accept': 'application/json' } });
        if (response.data && Array.isArray(response.data)) {
            return response.data.slice(0, 15).map(mod => ({
                id: mod.mod_id,
                name: `⚡ ${mod.name}`,
                author: mod.author || 'UltraPlus Optimizer',
                downloads: mod.downloads || 0,
                summary: mod.summary || 'تعديلات وتحسينات أداء ورسوميات متقدمة.',
                image: mod.picture_url || '',
                version: mod.version || 'Ultra+',
                link: `https://www.nexusmods.com/${gameDomain}/mods/${mod.mod_id}`
            }));
        }
        return [];
    } catch (error) { return []; }
}

async function getModrinthMods(gameQuery) {
    try {
        let query = gameQuery ? gameQuery.toLowerCase() : '';
        if (query.includes('minecraft') || query.includes('ماينكرافت')) query = '';
        const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=15&facets=[["project_type:mod"]]`;
        const response = await axios.get(url, { headers: { 'User-Agent': 'HubSteamManager/1.0.0' } });
        if (response.data && Array.isArray(response.data.hits)) {
            return response.data.hits.map(mod => ({
                id: mod.project_id,
                name: mod.title,
                author: mod.author || 'Modrinth Creator',
                downloads: mod.downloads || 0,
                summary: mod.description || 'لا يوجد وصف مختصر متوفر.',
                image: mod.icon_url || '',
                version: 'Latest',
                link: `https://modrinth.com/mod/${mod.slug}`
            }));
        }
        return [];
    } catch (error) { return []; }
}

async function getGameMods(source, gameQuery) {
    if (source === 'onlinefix') return await searchOnlineFixDirectly(gameQuery);
    if (source === 'modrinth') return await getModrinthMods(gameQuery);
    if (source === 'ultra') return await getUltraPlusMods(gameQuery);
    return await getNexusMods(gameQuery);
}

async function getGameAchievements(appId) {
    try {
        if (!appId || appId === 'Manual') return [];
        const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=arabic`);
        if (response.data && response.data[appId] && response.data[appId].data) {
            const gameData = response.data[appId].data;
            const achievements = gameData.achievements && gameData.achievements.highlighted ? gameData.achievements.highlighted : [];
            return achievements.map(ach => ({
                id: ach.name,
                title: ach.name,
                icon: ach.path || '🏆',
                hint: 'إنجاز رسمي خاص باللعبة على منصة Steam.'
            }));
        }
        return [];
    } catch (error) { return []; }
}

module.exports = { getGameMods, getGameAchievements };