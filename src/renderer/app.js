const { ipcRenderer } = require('electron');

async function checkAndRenderToolStatus() {
    const statusText = document.getElementById('tool-install-text');
    const installBtn = document.getElementById('btn-install-tool');
    
    statusText.innerText = 'جاري فحص ملفات ستيم...';
    const status = await ipcRenderer.invoke('check-opensteam-status');

    if (status.installed) {
        statusText.style.color = '#10b981';
        statusText.innerText = `✅ ملفات OpenSteamTool مثبته بنجاح في: ${status.steamPath}`;
        installBtn.style.display = 'none';
    } else {
        statusText.style.color = '#ef4444';
        statusText.innerText = `⚠️ ملفات OpenSteamTool غير مثبته في مجلد ستيم.`;
        installBtn.style.display = 'inline-block';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    console.log("تم تحميل التطبيق بنجاح.");
    loadUserProfile();

    const scanBtn = document.getElementById('scan-btn');
    if (scanBtn) scanBtn.addEventListener('click', handleScanSteamGames);

    const addManualBtn = document.getElementById('add-manual-btn');
    if (addManualBtn) addManualBtn.addEventListener('click', handleAddManualGame);

    const saveProfileBtn = document.getElementById('save-profile-btn');
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', handleSaveProfile);

    const openToolBtn = document.getElementById('open-tool-btn');
    const toolModalView = document.getElementById('opensteam-modal-view');

    if (openToolBtn && toolModalView) {
        openToolBtn.addEventListener('click', () => {
            const isVisible = toolModalView.style.display === 'block';
            toolModalView.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                checkAndRenderToolStatus();
            }
        });
    }

    const installBtn = document.getElementById('btn-install-tool');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            installBtn.innerText = 'جاري التثبيت...';
            const res = await ipcRenderer.invoke('install-opensteam-files');
            alert(res.message);
            checkAndRenderToolStatus();
        });
    }

    const toolApplyDirectBtn = document.getElementById('tool-apply-direct-btn');
    if (toolApplyDirectBtn) {
        toolApplyDirectBtn.addEventListener('click', async () => {
            const appId = document.getElementById('tool-appid-input').value;
            const statusMsg = document.getElementById('tool-status-msg');

            if (!appId || appId.trim() === '') {
                alert('الرجاء إدخال رقم الـ AppID أولاً.');
                return;
            }

            statusMsg.style.color = '#a1a1aa';
            statusMsg.innerText = 'جاري حقن الـ AppID في مكتبة Steam...';

            const result = await ipcRenderer.invoke('apply-opensteam-direct', appId);
            
            if (result.success) {
                statusMsg.style.color = '#10b981';
                statusMsg.innerText = result.message;
            } else {
                statusMsg.style.color = '#ef4444';
                statusMsg.innerText = result.message;
            }
        });
    }

    const toolCloseBtn = document.getElementById('tool-close-btn');
    if (toolCloseBtn && toolModalView) {
        toolCloseBtn.addEventListener('click', () => {
            toolModalView.style.display = 'none';
        });
    }

    const backBtn = document.getElementById('back-to-library-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('game-details-view').style.display = 'none';
            document.getElementById('library-view').style.display = 'block';
            document.getElementById('main-toolbar').style.display = 'flex';
        });
    }
});

async function loadUserProfile() {
    try {
        const profile = await ipcRenderer.invoke('load-user-profile');
        if (profile && profile.username) {
            document.getElementById('username-input').value = profile.username;
            document.getElementById('welcome-msg').innerText = `مرحباً، ${profile.username}`;
        }
    } catch (e) {}
}

async function handleSaveProfile() {
    const usernameInput = document.getElementById('username-input');
    const welcomeMsg = document.getElementById('welcome-msg');
    const username = usernameInput.value.trim();
    
    if (!username) return alert('الرجاء إدخال اسم المستخدم');
    
    await ipcRenderer.invoke('save-user-profile', { username });
    welcomeMsg.innerText = `مرحباً، ${username}`;
    alert('تم حفظ الحساب بنجاح!');
}

async function handleScanSteamGames() {
    const gamesListDiv = document.getElementById('games-list');
    gamesListDiv.innerHTML = '<p style="color:#a1a1aa;">جاري فحص ملفات ستيم في الأقراص...</p>';
    
    try {
        const games = await ipcRenderer.invoke('scan-steam-games');
        gamesListDiv.innerHTML = '';

        if (!games || games.length === 0) {
            gamesListDiv.innerHTML = '<p style="color:#a1a1aa;">لم يتم العثور على ألعاب مثبتة عبر ستيم.</p>';
            return;
        }

        for (const game of games) {
            let details = null;
            try {
                details = await ipcRenderer.invoke('fetch-game-details', game.appId);
            } catch (err) {}

            createGameCard(
                details ? details.name : (game.name || `App ID: ${game.appId}`), 
                details ? details.header_image : '', 
                game.appId, 
                details ? details.short_description : 'لعبة مسجلة في مكتبة ستيم.',
                game.executablePath || ''
            );
        }
    } catch (err) {
        gamesListDiv.innerHTML = `<p style="color:#ef4444;">حدث خطأ أثناء الفحص: ${err.message}</p>`;
    }
}

async function handleAddManualGame() {
    try {
        const manualGame = await ipcRenderer.invoke('select-game-executable');
        if (manualGame) {
            createGameCard(manualGame.fileName, '', 'Manual', 'لعبة مضافة يدوياً.', manualGame.filePath);
        }
    } catch (err) {}
}

let currentGameExePath = '';

function createGameCard(name, imageUrl, appId, description, exePath) {
    const gamesListDiv = document.getElementById('games-list');
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
        ${imageUrl ? `<img src="${imageUrl}" alt="cover">` : '<div style="height:120px;background:#27272a;display:flex;align-items:center;justify-content:center;border-radius:6px;color:#71717a;">No Image</div>'}
        <h3>${name}</h3>
        <p>ID: ${appId}</p>
    `;

    card.addEventListener('click', () => {
        currentGameExePath = exePath;
        openGameDetails(name, imageUrl, appId, description);
    });

    gamesListDiv.appendChild(card);
}

async function openGameDetails(name, imageUrl, appId, description) {
    document.getElementById('library-view').style.display = 'none';
    document.getElementById('main-toolbar').style.display = 'none';
    document.getElementById('game-details-view').style.display = 'block';

    document.getElementById('detail-title').innerText = name;
    document.getElementById('detail-id').innerText = `App ID: ${appId}`;
    document.getElementById('detail-desc').innerText = description;
    
    const bannerUrl = imageUrl || 'https://via.placeholder.com/400x200?text=No+Image';
    document.getElementById('detail-image').src = bannerUrl;
    document.getElementById('game-hero-container').style.backgroundImage = `url('${bannerUrl}')`;

    const subBox = document.getElementById('sub-content-box');
    subBox.style.display = 'none';

    document.getElementById('btn-show-mods').onclick = async () => {
        subBox.style.display = 'block';
        loadModsWithSource('nexus', name, subBox);
    };

    const achievementsContainer = document.getElementById('achievements-container');
    achievementsContainer.innerHTML = '<p style="color:#a1a1aa;">جاري جلب إنجازات اللعبة من ستيم...</p>';

    try {
        const achievements = await ipcRenderer.invoke('fetch-game-achievements', appId);
        let achHtml = '';
        
        if (!achievements || achievements.length === 0) {
            achHtml = `
                <div class="ach-card">
                    <div class="ach-icon-box">🔒</div>
                    <div class="ach-info">
                        <h4>إنهاء المهمة الأولى</h4>
                        <p>تلميح: أكمل المرحلة التعليمية بنجاح عبر مسار القصة.</p>
                    </div>
                </div>
            `;
        } else {
            achievements.forEach(ach => {
                const isImageUrl = typeof ach.icon === 'string' && (ach.icon.startsWith('http') || ach.icon.includes('/'));
                const iconContent = isImageUrl 
                    ? `<img src="${ach.icon}" alt="icon" onerror="this.onerror=null; this.parentElement.innerHTML='🔒';">` 
                    : (ach.icon || '🔒');

                achHtml += `
                    <div class="ach-card">
                        <div class="ach-icon-box">${iconContent}</div>
                        <div class="ach-info">
                            <h4>${ach.title}</h4>
                            <p>${ach.hint}</p>
                        </div>
                    </div>
                `;
            });
        }
        achievementsContainer.innerHTML = achHtml;
    } catch (e) {
        achievementsContainer.innerHTML = '<p style="color:#ef4444;">تعذر تحميل الإنجازات.</p>';
    }
}

async function loadModsWithSource(source, gameQuery, container) {
    container.innerHTML = `
        <div class="source-tabs">
            <button class="source-tab-btn ${source === 'nexus' ? 'active' : ''}" id="tab-nexus">Nexus Mods</button>
            <button class="source-tab-btn ${source === 'modrinth' ? 'active' : ''}" id="tab-modrinth">Modrinth (Minecraft)</button>
            <button class="source-tab-btn ${source === 'ultra' ? 'active' : ''}" id="tab-ultra">⚡ UltraPlus</button>
            <button class="source-tab-btn ${source === 'onlinefix' ? 'active' : ''}" id="tab-onlinefix">🌐 Online-Fix</button>
            <button class="source-tab-btn ${source === 'opensteam' ? 'active' : ''}" id="tab-opensteam">⚙️ OpenSteamTool</button>
        </div>
        <p style="color:#a1a1aa;">جاري تحميل البيانات والمحرك لـ ${source}...</p>
    `;

    document.getElementById('tab-nexus').onclick = () => loadModsWithSource('nexus', gameQuery, container);
    document.getElementById('tab-modrinth').onclick = () => loadModsWithSource('modrinth', gameQuery, container);
    document.getElementById('tab-ultra').onclick = () => loadModsWithSource('ultra', gameQuery, container);
    document.getElementById('tab-onlinefix').onclick = () => loadModsWithSource('onlinefix', gameQuery, container);
    document.getElementById('tab-opensteam').onclick = () => loadModsWithSource('opensteam', gameQuery, container);

    if (source === 'opensteam') {
        renderOpenSteamToolView(container, gameQuery);
        return;
    }

    try {
        const data = await ipcRenderer.invoke('fetch-game-mods', source, gameQuery);
        if (source === 'onlinefix') {
            renderNativeOnlineFixView(data, container, gameQuery);
        } else {
            renderModsView(source, gameQuery, data || [], container);
        }
    } catch (err) {
        container.innerHTML += `<p style="color:#ef4444; margin-top:10px;">فشل جلب البيانات: ${err.message}</p>`;
    }
}

function renderOpenSteamToolView(container, gameQuery) {
    container.innerHTML = `
        <div class="source-tabs">
            <button class="source-tab-btn" id="tab-nexus">Nexus Mods</button>
            <button class="source-tab-btn" id="tab-modrinth">Modrinth (Minecraft)</button>
            <button class="source-tab-btn" id="tab-ultra">⚡ UltraPlus</button>
            <button class="source-tab-btn" id="tab-onlinefix">🌐 Online-Fix</button>
            <button class="source-tab-btn active" id="tab-opensteam">⚙️ OpenSteamTool</button>
        </div>
        
        <div class="onlinefix-hero-card">
            <div class="onlinefix-header">
                <div>
                    <h3 style="color:#10b981; font-size:20px; margin-bottom:5px;">⚙️ أداة OpenSteamTool وإدارة المحاكيات</h3>
                    <p style="color:#e4e4e7; font-size:14px;">إدارة ملفات Steam Emulator وإعدادات الـ AppID للعبة (${gameQuery})</p>
                </div>
                <span class="onlinefix-badge">Steam Tool</span>
            </div>

            <p style="color:#a1a1aa; font-size:13px; line-height:1.6;">
                تتيح لك هذه الأداة تفعيل اللعبة وفتح مميزات OpenSteamTool عبر إعدادات ستيم مباشرة.
            </p>

            <div class="onlinefix-actions">
                <button class="btn btn-primary" id="btn-apply-opensteam">⚡ تفعيل وربط الـ AppID بملفات Steam</button>
            </div>
            
            <div id="opensteam-status-msg" style="margin-top:12px; font-size:13px; font-weight:600;"></div>
        </div>
    `;

    document.getElementById('tab-nexus').onclick = () => loadModsWithSource('nexus', gameQuery, container);
    document.getElementById('tab-modrinth').onclick = () => loadModsWithSource('modrinth', gameQuery, container);
    document.getElementById('tab-ultra').onclick = () => loadModsWithSource('ultra', gameQuery, container);
    document.getElementById('tab-onlinefix').onclick = () => loadModsWithSource('onlinefix', gameQuery, container);
    document.getElementById('tab-opensteam').onclick = () => loadModsWithSource('opensteam', gameQuery, container);

    document.getElementById('btn-apply-opensteam').onclick = async () => {
        const statusDiv = document.getElementById('opensteam-status-msg');
        statusDiv.style.color = '#a1a1aa';
        statusDiv.innerText = 'جاري حقن الـ AppID...';

        const result = await ipcRenderer.invoke('apply-opensteam-direct', '480');
        
        if (result.success) {
            statusDiv.style.color = '#10b981';
            statusDiv.innerText = result.message;
        } else {
            statusDiv.style.color = '#ef4444';
            statusDiv.innerText = result.message;
        }
    };
}

function renderNativeOnlineFixView(ofData, container, gameQuery) {
    container.innerHTML = `
        <div class="source-tabs">
            <button class="source-tab-btn" id="tab-nexus">Nexus Mods</button>
            <button class="source-tab-btn" id="tab-modrinth">Modrinth (Minecraft)</button>
            <button class="source-tab-btn" id="tab-ultra">⚡ UltraPlus</button>
            <button class="source-tab-btn active" id="tab-onlinefix">🌐 Online-Fix</button>
            <button class="source-tab-btn" id="tab-opensteam">⚙️ OpenSteamTool</button>
        </div>
        
        <div class="onlinefix-hero-card">
            <div class="onlinefix-header">
                <div>
                    <h3 style="color:#10b981; font-size:20px; margin-bottom:5px;">🌐 محرك تحميل أونلاين (Online-Fix Downloader)</h3>
                    <p style="color:#e4e4e7; font-size:14px;">${ofData ? ofData.title : 'إصلاح طور الجماعي'}</p>
                </div>
                <span class="onlinefix-badge">In-App Downloader</span>
            </div>

            <p style="color:#a1a1aa; font-size:13px; line-height:1.6;">${ofData ? ofData.summary : ''}</p>

            <div class="onlinefix-instructions">
                <h5 style="color:#10b981; margin-bottom:8px;">💡 طريقة التحميل المباشر:</h5>
                <p style="color:#f4f4f5; font-size:13px; margin-bottom:6px;">1. اضغط على الزر أدناه لفتح الصفحة داخل النافذة المدمجة بالتطبيق.</p>
                <p style="color:#f4f4f5; font-size:13px; margin-bottom:6px;">2. اختر سيرفر التحميل واضغط Download، وسيقوم التطبيق بالتقاط الملف وحفظه بمجلد اللعبة.</p>
                <p style="color:#10b981; font-size:13px;">🔑 كلمة سر فك الضغط لجميع ملفات الموقع: <strong>online-fix.me</strong></p>
            </div>

            <div class="onlinefix-actions">
                <button class="btn btn-primary" id="btn-open-embedded">🚀 فتح النافذة المدمجة والتحميل المباشر</button>
            </div>
        </div>
    `;

    document.getElementById('tab-nexus').onclick = () => loadModsWithSource('nexus', gameQuery, container);
    document.getElementById('tab-modrinth').onclick = () => loadModsWithSource('modrinth', gameQuery, container);
    document.getElementById('tab-ultra').onclick = () => loadModsWithSource('ultra', gameQuery, container);
    document.getElementById('tab-onlinefix').onclick = () => loadModsWithSource('onlinefix', gameQuery, container);
    document.getElementById('tab-opensteam').onclick = () => loadModsWithSource('opensteam', gameQuery, container);

    document.getElementById('btn-open-embedded').onclick = () => {
        if (ofData && ofData.link) {
            ipcRenderer.invoke('open-onlinefix-in-app', ofData.link, currentGameExePath);
        }
    };
}

function renderModsView(source, gameQuery, mods, container) {
    container.innerHTML = `
        <div class="source-tabs">
            <button class="source-tab-btn ${source === 'nexus' ? 'active' : ''}" id="tab-nexus">Nexus Mods</button>
            <button class="source-tab-btn ${source === 'modrinth' ? 'active' : ''}" id="tab-modrinth">Modrinth (Minecraft)</button>
            <button class="source-tab-btn ${source === 'ultra' ? 'active' : ''}" id="tab-ultra">⚡ UltraPlus</button>
            <button class="source-tab-btn ${source === 'onlinefix' ? 'active' : ''}" id="tab-onlinefix">🌐 Online-Fix</button>
            <button class="source-tab-btn" id="tab-opensteam">⚙️ OpenSteamTool</button>
        </div>
        <div class="mods-header-bar">
            <h4 style="color:#10b981; font-size:18px;">🧩 متصفح (${source === 'ultra' ? 'UltraPlus' : source === 'modrinth' ? 'Modrinth' : 'Nexus'})</h4>
            <input type="text" id="mod-search-input" class="mods-search-input" placeholder="ابحث بالاسم...">
        </div>
        <div id="mods-grid-container" class="nexus-mods-grid"></div>
    `;

    document.getElementById('tab-nexus').onclick = () => loadModsWithSource('nexus', gameQuery, container);
    document.getElementById('tab-modrinth').onclick = () => loadModsWithSource('modrinth', gameQuery, container);
    document.getElementById('tab-ultra').onclick = () => loadModsWithSource('ultra', gameQuery, container);
    document.getElementById('tab-onlinefix').onclick = () => loadModsWithSource('onlinefix', gameQuery, container);
    document.getElementById('tab-opensteam').onclick = () => loadModsWithSource('opensteam', gameQuery, container);

    const gridContainer = document.getElementById('mods-grid-container');
    const searchInput = document.getElementById('mod-search-input');

    function displayFilteredMods(list) {
        gridContainer.innerHTML = '';
        if (list.length === 0) {
            gridContainer.innerHTML = '<p style="color:#a1a1aa; grid-column: 1/-1;">لا توجد نتائج مطابقة لبحثك.</p>';
            return;
        }

        list.forEach(mod => {
            const card = document.createElement('div');
            card.className = 'nexus-mod-card';
            card.innerHTML = `
                ${mod.image ? `<img src="${mod.image}" alt="mod">` : '<div style="height:130px;background:#18181b;display:flex;align-items:center;justify-content:center;color:#71717a;border-radius:6px;">No Image</div>'}
                <div class="nexus-mod-info">
                    <h5>${mod.name}</h5>
                    <p class="mod-author">المطور: ${mod.author} | الإصدار: ${mod.version}</p>
                    <p class="mod-summary">${mod.summary}</p>
                    <div class="mod-footer">
                        <span class="mod-downloads" style="font-size: 12px; color: #a1a1aa;">⬇️ ${Number(mod.downloads).toLocaleString()} تنزيل</span>
                        <button class="btn btn-primary btn-sm" onclick="require('electron').shell.openExternal('${mod.link}')">تحميل أو فتح</button>
                    </div>
                </div>
            `;
            gridContainer.appendChild(card);
        });
    }

    displayFilteredMods(mods);

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = mods.filter(m => m.name.toLowerCase().includes(query) || m.summary.toLowerCase().includes(query));
        displayFilteredMods(filtered);
    });
}