import { fetchUserAnimeHistory, fetchUserAnimeList, fetchUserFavorites } from '../utils/api.js';
import { normalizeAnimeData } from '../utils/normalizer.js';
import { calculateDiff } from '../utils/diff_engine.js';

console.log('Gemini-MAL Bridge: Background Service (Module) Started');

// Event: Tab Activated (Focus)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    checkAndSync(activeInfo.tabId);
});

// Event: Tab Updated (URL Change)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        checkAndSync(tabId);
    }
});

// Cooldown: 5 Minutes
const SYNC_COOLDOWN = 5 * 60 * 1000; 

async function checkAndSync(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab.url || !tab.url.includes('gemini.google.com')) {
            return;
        }

        console.log('Gemini-MAL Bridge: Gemini tab detected. Checking for updates...');
        
        // 1. Get Stored Config
        const data = await chrome.storage.local.get(['mal_username', 'mal_client_id', 'anime_list_watching', 'last_snapshot', 'last_synced']); 
        
        if (!data.mal_username || !data.mal_client_id) {
            console.log('Gemini-MAL Bridge: Credentials missing.');
            return;
        }

        // 2. Rate Limiting (Cooldown Check)
        const lastSync = data.last_synced ? new Date(data.last_synced).getTime() : 0;
        const now = Date.now();

        if (now - lastSync < SYNC_COOLDOWN) {
            console.log(`Gemini-MAL Bridge: Sync skipped. Cooldown active. (Wait ${Math.ceil((SYNC_COOLDOWN - (now - lastSync))/1000)}s)`);
            return;
        }

        // 3. Fetch Latest Data
        // History (for Diffing)
        const history = await fetchUserAnimeHistory(data.mal_username, data.mal_client_id);
        const normalizedHistory = normalizeAnimeData([], history); 
        
        // Plan to Watch (For #plan2w command)
        const ptwList = await fetchUserAnimeList(data.mal_username, 'plan_to_watch', data.mal_client_id);
        
        // Favorites (Hybrid Context)
        const favorites = await fetchUserFavorites(data.mal_username, data.mal_client_id);

        // 4. Diffing (History vs Last Snapshot)
        const lastSnapshot = data.last_snapshot || [];
        const diff = calculateDiff(lastSnapshot, normalizedHistory.history);

        const updates = {
            last_synced: new Date().toISOString(),
            anime_list_plan_to_watch: ptwList,
            anime_list_favorites: favorites, // Store favorites
        };

        if (diff.has_changes) {
            console.log('Gemini-MAL Bridge: Changes detected!', diff);
            
            // Update Badge
            chrome.action.setBadgeText({ text: '!' });
            chrome.action.setBadgeBackgroundColor({ color: '#FF9800' });

            updates.pending_changes = diff;
            updates.latest_fetch = normalizedHistory.history; 
        } else {
            console.log('Gemini-MAL Bridge: No changes.');
        }

        await chrome.storage.local.set(updates);

    } catch (e) {
        console.error('Gemini-MAL Bridge: Sync Error', e);
    }
}
