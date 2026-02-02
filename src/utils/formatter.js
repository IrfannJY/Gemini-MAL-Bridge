export function simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
}

function cleanTitle(title) {
    return title.split(':')[0].split(' Season')[0].split(' Part')[0].trim();
}

export function generateShadowPrompt(data, language = 'tr') {
    const watching = data.anime_list_watching || [];
    const history = data.anime_list_history || [];
    const favorites = data.anime_list_favorites || [];

    let languageInstruction = "";
    if (language.startsWith('tr')) {
        languageInstruction = `
        - **OUTPUT LANGUAGE:** TURKISH (Türkçe).
        - **TONE:** Use authentic Turkish anime community slang (e.g., "Efsane", "Çöp", "Hype", "Duygu sömürüsü").
        - **STYLE:** Act like a Turkish "Nakama" (Close friend).
        `;
    } else {
        languageInstruction = `
        - **OUTPUT LANGUAGE:** ENGLISH.
        - **TONE:** Use casual anime community slang (e.g., "Goated", "Trash", "Hype", "Feels").
        - **STYLE:** Act like an English-speaking "Nakama" (Close friend).
        `;
    }

    const listText = watching.map(item => {
        const title = item.title;
        const watched = item.episodes_watched;
        const score = item.score > 0 ? `(Score: ${item.score})` : "(Score: -)";
        return `- ${title}: Ep ${watched} ${score}`;
    }).join("\n");

    const favText = favorites.map(item => {
        const title = item.node ? item.node.title : (item.title || "Unknown"); 
        const score = item.list_status ? item.list_status.score : (item.score || "?");
        return `- ${title} (Score: ${score} ⭐)`;
    }).join("\n");

    const seenFranchises = new Set();
    const historyText = history.reduce((acc, item) => {
        const simpleTitle = cleanTitle(item.title);
        if (seenFranchises.has(simpleTitle)) return acc;
        seenFranchises.add(simpleTitle);
        
        const dateStr = item.updated_at_formatted || "??.??.????";
        const scoreStr = item.score > 0 ? ` (Score: ${item.score})` : '';
        acc.push(`- ${item.title} [${dateStr}]: ${item.status}${scoreStr}`);
        return acc;
    }, []).slice(0, 15).join("\n");
    return `
--- 🛡️ HIDDEN SYSTEM CONTEXT (SHADOW MODE) ---
[System Notification: Live MyAnimeList Data Injected]

👤 **USER PROFILE:**

▶️ **CURRENTLY WATCHING:**
${listText}

🏆 **TASTE REFERENCES (Top Rated):**
${favText}
*(Note: Use these to understand the user's taste palette.)*

🕒 **RECENT ACTIVITY:**
${historyText}

⚙️ **MANDATORY INSTRUCTIONS:**
1. **Context Integration:** Merge this data with your existing memory. This is the single source of truth.
2. **Memory Update:** If there are conflicts with previous data (e.g., episode counts), **overwrite** with this new data.
3. **Context Preservation:** Do NOT delete personal details or chat history the user shared previously. Only update anime data.
4. **Spoiler Shield:** NEVER discuss events beyond the "Episodes Watched" count.
${languageInstruction}

--- END OF CONTEXT (Please reply to the user's message above) ---
`;
}

export function generatePlanToWatchPrompt(ptwList, limit = 50, language = 'tr') {
    if (!ptwList || ptwList.length === 0) return "No planned anime found.";

    let languageInstruction = "";
    if (language.startsWith('tr')) {
        languageInstruction = `
        - **OUTPUT LANGUAGE:** TURKISH (Türkçe).
        - **TONE:** Enthusiastic, encouraging.
        - **STYLE:** Act like a Turkish "Nakama".
        `;
    } else {
        languageInstruction = `
        - **OUTPUT LANGUAGE:** ENGLISH.
        - **TONE:** Enthusiastic, encouraging.
        - **STYLE:** Act like an English-speaking "Nakama".
        `;
    }

    const sorted = [...ptwList].sort((a, b) => {
        const meanA = a.node?.mean || 0;
        const meanB = b.node?.mean || 0;
        return meanB - meanA;
    });

    const sliced = sorted.slice(0, limit);

    const listText = sliced.map(item => {
        const node = item.node || {};
        const score = node.mean ? `(Score: ${node.mean})` : "";
        const type = node.media_type ? `[${node.media_type.toUpperCase()}]` : "";
        return `- ${node.title} ${type} ${score}`;
    }).join("\n");

    return `
--- 📜 PLANNED ANIME (PLAN TO WATCH) ---
[SYSTEM NOTIFICATION: User shared their plan to watch list.]
(Top ${sliced.length} highest rated out of ${ptwList.length} total)

${listText}

⚙️ **INSTRUCTIONS:**
This list contains series the user has *not watched yet* but is interested in.
1. If you recommend something from this list, say "It's already in your plan, start it now!".
2. Analyze the user's taste based on genres here.
${languageInstruction}
--- END OF LIST ---
`;
}

export function generatePlanToWatchPrompt(ptwList, limit = 50) {
    if (!ptwList || ptwList.length === 0) return "Planlanmış anime bulunamadı.";

    const sorted = [...ptwList].sort((a, b) => (b.mean || 0) - (a.mean || 0));
    const sliced = sorted.slice(0, limit);

    const listText = sliced.map(item => {
        const score = item.mean ? `(Puan: ${item.mean})` : "";
        const type = item.media_type ? `[${item.media_type.toUpperCase()}]` : "";
        return `- ${item.title} ${type} ${score}`;
    }).join("\n");

    return `
--- 📜 PLANLANMIŞ ANİMELER (PLAN TO WATCH) ---
[SİSTEM BİLDİRİMİ: Kullanıcı izleme listesini paylaştı.]
(Toplam ${ptwList.length} seriden en yüksek puanlı ${sliced.length} tanesi)

${listText}

⚙️ **YÖNERGE:**
Bu liste kullanıcının *henüz izlemediği* ama merak ettiği serilerdir. Öneri yaparken bu listeyi kontrol et:
1. Eğer önerdiğin seri buradaysa "Zaten plan listende var, hemen başla!" de.
2. Buradaki türlere bakarak kullanıcının zevkini analiz et.
--- LİSTE SONU ---
`;
}
