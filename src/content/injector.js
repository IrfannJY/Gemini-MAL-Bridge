// Injector Script for Gemini
const TRIGGER_KEYWORD = '#anime';
let contextInjected = false; // Flag for shadow injection

// Cached Configuration for Synchronous Checks
let bridgeConfig = {
    mal_username: null,
    target_url: null,
    anime_list_watching: null,
    last_shadow_hash: null,
    anime_list_history: null,
    ready: false
};

// Initialize Cache
console.log('Gemini-MAL Bridge: Injector started');
updateConfig();

// Listen for updates
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        updateConfig();
    }
});

function updateConfig() {
    chrome.storage.local.get(null, (result) => {
        bridgeConfig = { ...bridgeConfig, ...result, ready: true };
        // console.log('Gemini-MAL Bridge: Config updated', bridgeConfig);
    });
}

async function getStoredData() {
    // Safety check for orphaned scripts (Extension context invalidated)
    if (!chrome.runtime?.id) {
        console.warn('Gemini-MAL Bridge: Extension context invalidated. Please reload the page.');
        return null; 
    }

    return new Promise((resolve) => {
        try {
            chrome.storage.local.get(null, (result) => {
                if (chrome.runtime.lastError) {
                    console.warn('Gemini-MAL Bridge: Storage error:', chrome.runtime.lastError);
                    resolve(null);
                } else {
                    resolve(result);
                }
            });
        } catch (e) {
            console.warn('Gemini-MAL Bridge: Storage access failed:', e);
            resolve(null);
        }
    });
}

// ... helper functions (generatePrompt, etc. - ensure they use the passed data or config) ...

// Global Keydown Listener
// Using { capture: true } to intercept event BEFORE Gemini's listeners
document.addEventListener('keydown', async (e) => {
    
    // 1. Ignore simulated events (our re-dispatches) to prevent loops
    if (!e.isTrusted) return;

    // 2. Only care about Enter (No Shift)
    if (e.key !== 'Enter' || e.shiftKey) return;

    // 3. Early Exit if Config not ready
    if (!bridgeConfig.ready) return;

    // 4. URL Scope Check (Synchronous)
    if (bridgeConfig.target_url) {
        const current = window.location.href.toLowerCase();
        const target = bridgeConfig.target_url.toLowerCase().replace(/\/$/, '');
        if (!current.startsWith(target)) return;
    } else {
        // If no target URL set, maybe we shouldn't run globally to be safe?
        // Or we assume the user wants it everywhere if they installed it.
        // Let's be safe: if no URL, don't block.
        return; 
    }

    // 5. Target Check
    const target = e.target.closest('div[contenteditable="true"], textarea, input');
    if (!target) return;

    // 6. Data Check
    if (!bridgeConfig.anime_list_watching) return;

    const userMessage = target.innerText || target.value || '';
    if (!userMessage.trim()) return;

    // --- DECISION: CHECK HASH BEFORE BLOCKING ---
    // --- DETECT COMMANDS ---
    // #plan2w, #plan2w50, #anime
    const planMatch = userMessage.match(/#plan2w(\d*)/i);
    const forceAnime = userMessage.match(/#anime/i);

    if (planMatch) {
         // --- PLAN COMMAND ---
         e.preventDefault();
         e.stopPropagation();
         
         const limit = planMatch[1] ? parseInt(planMatch[1], 10) : 50;
         console.log(`Gemini-MAL Bridge: Command #plan2w detected (Limit: ${limit})`);

         // const { generatePlanToWatchPrompt } = await import(chrome.runtime.getURL('src/utils/formatter.js'));
         // Retrieve PTW list
         chrome.storage.local.get(['anime_list_plan_to_watch'], (res) => {
             const ptw = res.anime_list_plan_to_watch || [];
             // Detect Language (Preference > Browser)
             const pref = bridgeConfig.preferred_language || 'auto';
             const userLang = (pref === 'auto') ? (navigator.language || 'en') : pref;
             
             const shadowPrompt = generatePlanToWatchPrompt(ptw, limit, userLang);
             
             // Remove command from user message? Or keep it? 
             // Usually better to remove the command keyword or replace it.
             // Replacing command with empty string for user message part, but we inject context.
             // Replacing command with empty string for user message part, but we inject context.
             const cleanMessage = userMessage.replace(/#plan2w(\d*)/i, '').trim() || "What do you think about my Plan to Watch list?";
             
             handleEnterLogic(target, cleanMessage, shadowPrompt, null); // Null diff, force inject
         });
         return;
    }

    if (forceAnime) {
        // --- FORCE ANIME CONTEXT COMMAND ---
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Gemini-MAL Bridge: Command #anime detected. Forcing full context.');
        
        // Detect Language (Preference > Browser)
        const pref = bridgeConfig.preferred_language || 'auto';
        const userLang = (pref === 'auto') ? (navigator.language || 'en') : pref;
        
        const shadowPrompt = generateShadowPrompt(bridgeConfig, userLang); // Pass Language
        
        const cleanMessage = userMessage.replace(/#anime/i, '').trim() || "What do you think about my anime profile?";
        
        handleEnterLogic(target, cleanMessage, shadowPrompt, null);
        return;
    }

    // --- DIFFING LOGIC (EVENT BASED) ---
    // We access the data directly from the bridgeConfig cache which is kept in sync via storage listener
    const pendingDiff = bridgeConfig.pending_changes;

    // Check if we have pending changes to inject.
    // If NO pending changes => Silent Mode (Do nothing).
    if (!pendingDiff || !pendingDiff.has_changes) {
        console.log('Gemini-MAL Bridge: No pending changes. Silent mode active.');
        return; // EXIT: Normal Enter proceeds
    }

    console.log('Gemini-MAL Bridge: Pending changes detected!', pendingDiff);

    // !!! SHADOW INJECTION START !!!
    e.preventDefault(); 
    e.stopImmediatePropagation(); 
    e.stopPropagation();

    // Generate Diff Prompt
    // We use the summary text generated by diff engine, wrapped in context
    const diffSummary = pendingDiff.summary_text;
    
    // Check Language (Preference > Browser)
    const pref = bridgeConfig.preferred_language || 'auto';
    const userLang = (pref === 'auto') ? (navigator.language || 'en') : pref;
    const isTurkish = userLang.startsWith('tr');

    const shadowPrompt = `
--- 🛡️ HIDDEN SYSTEM CONTEXT (SHADOW MODE) ---
[System Notification: User updated MyAnimeList data.]

${diffSummary}

⚙️ **INSTRUCTIONS:**
1. Update your memory with these changes.
2. This is real data, take precedence over old memory.
${isTurkish ? 
'- **OUTPUT LANGUAGE:** TURKISH (Türkçe). Act like a Turkish Nakama.' : 
'- **OUTPUT LANGUAGE:** ENGLISH. Act like an English Nakama.'}
--- END OF CONTEXT ---
`;

    console.log('Gemini-MAL Bridge: Injecting Shadow Prompt:\n', shadowPrompt);

    // Pass calculated values to avoid re-calculation
    handleEnterLogic(target, userMessage, shadowPrompt, pendingDiff);

}, { capture: true });

async function handleEnterLogic(target, userMessage, shadowPrompt, pendingDiff) {
    try {
        const finalPayload = userMessage + "\n\n" + shadowPrompt;

        // Safe Inject using execCommand
        target.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, finalPayload);

        // Update Snapshot (Commit Changes) if it was a Diff Injection
        if (pendingDiff) {
            const data = await getStoredData();
            if (data && data.latest_fetch) {
                chrome.storage.local.set({ 
                    last_snapshot: data.latest_fetch,
                    pending_changes: null // Clear pending
                });
                console.log('Gemini-MAL Bridge: Snapshot updated, queue cleared.');
            }
        }
        
        // Visual Feedback (Success)
        flashSuccess(target);

        // Trigger Send (Re-dispatch Enter + Click Fallback)
        setTimeout(() => {
            triggerSend(target);
        }, 300); // Wait 300ms for send

    } catch (err) {
        console.error('Gemini-MAL Bridge: Error in logic:', err);
        // Fallback
        triggerSend(target);
    }
}

function triggerSend(target) {
    // 1. Re-dispatch Enter (Primary Method)
    const options = {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window
    };
    
    target.dispatchEvent(new KeyboardEvent('keydown', options));
    target.dispatchEvent(new KeyboardEvent('keypress', options));
    target.dispatchEvent(new KeyboardEvent('keyup', options));

    // 2. Click Fallback (Safety mechanism)
    setTimeout(() => {
        if (!target.innerText || target.innerText.trim() === '') {
            console.log('Gemini-MAL Bridge: Input appears empty, assuming Enter worked. Skipping fallback click.');
            return;
        }

        const sendButton = document.querySelector('button[aria-label*="Send"], button[aria-label*="Gönder"], div[role="button"][aria-label*="Gönder"], div[role="button"][aria-label*="Send"]');
        
        if (sendButton) {
            const label = (sendButton.ariaLabel || '').toLowerCase();
            if (label.includes('stop') || label.includes('durdur')) {
                console.log('Gemini-MAL Bridge: Detected Stop button. Aborting click.');
                return;
            }

            console.log('Gemini-MAL Bridge: Enter didn\'t clear input. Asking to click Send...');
            sendButton.click();
        }
    }, 300); 
}

function flashSuccess(target) {
    const originalBorder = target.style.border;
    target.style.transition = "box-shadow 0.3s, border-color 0.3s";
    target.style.borderColor = "#4caf50";
    target.style.boxShadow = "0 0 10px rgba(76, 175, 80, 0.5)";
    setTimeout(() => {
        target.style.borderColor = ""; 
        target.style.boxShadow = "";
        if (originalBorder) target.style.border = originalBorder;
    }, 1000);
}

function flashSuccess(target) {
    const originalBorder = target.style.border;
    target.style.transition = "box-shadow 0.3s, border-color 0.3s";
    target.style.borderColor = "#4caf50";
    target.style.boxShadow = "0 0 10px rgba(76, 175, 80, 0.5)";
    setTimeout(() => {
        target.style.borderColor = ""; 
        target.style.boxShadow = "";
        if (originalBorder) target.style.border = originalBorder;
    }, 1000);
}
// Manual Trigger logic (#anime) removed as per user request for cleanup


// Redundant listener removed.

// Helper: Franchise temizliği (Örn: "Dr. Stone: New World" -> "Dr. Stone")
function cleanTitle(title) {
    return title.split(':')[0].split(' Season')[0].split(' Part')[0].trim();
}

/**
 * Generates the Shadow Prompt for Gemini.
 * Uses an English skeleton for better reasoning, with dynamic output language rules.
 * @param {Object} data - User data (watching, history, favorites).
 * @param {string} language - Target output language code ('tr', 'en', etc.). Default: 'tr'.
 */
function generateShadowPrompt(data, language = 'tr') {
    const watching = data.anime_list_watching || [];
    const history = data.anime_list_history || [];
    const favorites = data.anime_list_favorites || []; // Popup/Background'dan geliyor

    // --- 1. DYNAMIC LANGUAGE INSTRUCTION ---
    let languageInstruction = "";
    // Check if language starts with 'tr' (e.g. 'tr-TR')
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

    // 1. WATCHING
    const listText = watching.map(item => {
        const title = item.title;
        const watched = item.episodes_watched;
        const score = item.score > 0 ? `(Score: ${item.score})` : "(Score: -)";
        return `- ${title}: Ep ${watched} ${score}`;
    }).join("\n");

    // 2. FAVORITES
    const favText = favorites.map(item => {
        const title = item.node ? item.node.title : (item.title || "Unknown"); 
        const score = item.list_status ? item.list_status.score : (item.score || "?");
        return `- ${title} (Score: ${score} ⭐)`;
    }).join("\n");

    // 3. HISTORY
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

function generatePlanToWatchPrompt(ptwList, limit = 50, language = 'tr') {
    if (!ptwList || ptwList.length === 0) return "No planned anime found.";

    // --- DYNAMIC LANGUAGE INSTRUCTION ---
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

    // Sort by Score (Desc) then Randomize slightly? 
    // User asked for "Highest Score" logic.
    // MAL API returns data wrapped in a 'node' object: { node: { title:..., mean:... } }
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
