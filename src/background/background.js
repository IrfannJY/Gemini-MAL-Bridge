import { fetchUserAnimeHistory, fetchUserAnimeList, fetchUserFavorites } from '../utils/api.js';
import { normalizeAnimeData } from '../utils/normalizer.js';
import { calculateDiff } from '../utils/diff_engine.js';

console.log('Gemini-MAL Bridge: Background Service (Module) Started');

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    checkAndSync(activeInfo.tabId);
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        checkAndSync(tabId);
    }
});

const SYNC_COOLDOWN = 5 * 60 * 1000; 

async function checkAndSync(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab.url || !tab.url.includes('gemini.google.com')) {
            return;
        }

        console.log('Gemini-MAL Bridge: Gemini tab detected. Checking for updates...');
        
        const data = await chrome.storage.local.get(['mal_username', 'mal_client_id', 'anime_list_watching', 'last_snapshot', 'last_synced', 'last_snapshot_date']); 
        
        if (!data.mal_username || !data.mal_client_id) {
            console.log('Gemini-MAL Bridge: Credentials missing.');
            return;
        }

        const lastSync = data.last_synced ? new Date(data.last_synced).getTime() : 0;
        const now = Date.now();

        if (now - lastSync < SYNC_COOLDOWN) {
            console.log(`Gemini-MAL Bridge: Sync skipped. Cooldown active. (Wait ${Math.ceil((SYNC_COOLDOWN - (now - lastSync))/1000)}s)`);
            return;
        }
    const history = await fetchUserAnimeHistory(data.mal_username, data.mal_client_id);
    const normalizedHistory = normalizeAnimeData([], history); 
    const watchingList = await fetchUserAnimeList(data.mal_username, 'watching', data.mal_client_id);
    const ptwList = await fetchUserAnimeList(data.mal_username, 'plan_to_watch', data.mal_client_id);
    const favorites = await fetchUserFavorites(data.mal_username, data.mal_client_id);
    const lastSnapshot = data.last_snapshot || [];
    const lastSnapshotDate = data.last_snapshot_date || null;
    const diff = calculateDiff(lastSnapshot, normalizedHistory.history, lastSnapshotDate);

        const updates = {
            last_synced: new Date().toISOString(),
            anime_list_watching: watchingList,
            anime_list_plan_to_watch: ptwList,
        };

        if (diff.has_changes) {
            console.log('Gemini-MAL Bridge: Changes detected!', diff);
            
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
