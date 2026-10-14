const axios = require('axios');

async function searchOnlineFixDirectly(gameName) {
    try {
        const cleanName = gameName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const searchUrl = `https://online-fix.me/index.php?do=search&subaction=search&story=${encodeURIComponent(cleanName)}`;

        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 8000
        });

        const html = response.data;
        const titleRegex = /<a[^>]+href=["'](https?:\/\/online-fix\.me\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
        let match;
        const results = [];

        while ((match = titleRegex.exec(html)) !== null) {
            const link = match[1];
            const title = match[2].replace(/<[^>]+>/g, '').trim();

            if (title && link && !link.includes('/user/') && !link.includes('/xfsearch/')) {
                results.push({
                    id: `of-${results.length}`,
                    title: title,
                    link: link,
                    summary: 'باتش وتفعيل طور اللعب الجماعي (Multiplayer / Co-op) عبر سيرفرات Steam Spacewar.'
                });
            }
        }

        if (results.length > 0) return results[0];

        return {
            id: 'of-default',
            title: `إصلاح أونلاين لـ ${gameName}`,
            link: searchUrl,
            summary: 'تفعيل اللعب الجماعي مع الأصدقاء بربط شبكة Steam Spacewar.'
        };
    } catch (error) {
        console.error("خطأ في جلب بيانات Online-Fix:", error.message);
        return {
            id: 'of-error',
            title: `باتش أونلاين لـ ${gameName}`,
            link: `https://online-fix.me/index.php?do=search&subaction=search&story=${encodeURIComponent(gameName)}`,
            summary: 'إصلاح طور الأونلاين للعب مع الأصدقاء.'
        };
    }
}

module.exports = { searchOnlineFixDirectly };