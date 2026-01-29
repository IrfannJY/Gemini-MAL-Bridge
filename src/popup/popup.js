import { saveUserData, getUserData } from '../utils/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
    const usernameInput = document.getElementById('username');
    const clientIdInput = document.getElementById('clientId');
    const targetUrlInput = document.getElementById('targetUrl');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');
    const diffContainer = document.getElementById('diffContainer');
    const diffList = document.getElementById('diffList');
    const toggleClientIdBtn = document.getElementById('toggleClientId');
    const languageSelect = document.getElementById('languageSelect'); // Was missing in selection

    // Password Toggle Logic
    if (toggleClientIdBtn && clientIdInput) {
        toggleClientIdBtn.addEventListener('click', () => {
            const currentType = clientIdInput.getAttribute('type');
            if (currentType === 'password') {
                clientIdInput.setAttribute('type', 'text');
                toggleClientIdBtn.textContent = '🔒';
                toggleClientIdBtn.title = "Gizle";
            } else {
                clientIdInput.setAttribute('type', 'password');
                toggleClientIdBtn.textContent = '👁️';
                toggleClientIdBtn.title = "Göster";
            }
        });
    }

    // Load saved settings
    const savedData = await getUserData(['mal_username', 'mal_client_id', 'target_url', 'preferred_language', 'theme', 'pending_changes']);
    
    if (savedData.mal_username) usernameInput.value = savedData.mal_username;
    if (savedData.mal_client_id) clientIdInput.value = savedData.mal_client_id;
    if (savedData.target_url) targetUrlInput.value = savedData.target_url;
    if (savedData.preferred_language) languageSelect.value = savedData.preferred_language;
    
    
    // Initial UI Update
    updateUI(savedData);

    // Watch for updates (if background sync finishes while popup is open)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            getUserData(['pending_changes']).then(updateUI);
        }
    });

    saveBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const clientId = clientIdInput.value.trim();
        const targetUrl = targetUrlInput.value.trim();
        const language = languageSelect.value;

        if (!username || !clientId) {
            showStatus('Please enter both Client ID and Username.', 'error');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Syncing...';

        try {
            // Save Credentials First
            await saveUserData({
                mal_username: username,
                mal_client_id: clientId,
                target_url: targetUrl,
                preferred_language: language
            });

            // Trigger Background Sync manually via explicit check
            // For now, let's just re-use the background logic or fetch here. 
            // Better: use sendMessage to ask background to sync current tab.
            // But background sync logic requires a tab ID. Let's just do a direct fetch here to be sure,
            // OR simpler: Update the credentials and let the background script pick it up on next event.
            // FOR USER EXPERIENCE: We want immediate feedback. So we will fetch here similar to background.
            
            // Re-importing diff logic in popup might be redundant but safe.
            // Actually, let's rely on the background service worker if possible, or just duplicate the fetch logic for the "Force Sync" button.
            // Given the complexity of sharing code between service worker and popup in a simple structure without bundler, 
            // let's just trigger the background processing by sending a message if we implemented a listener, 
            // OR just do the fetch here.
            
            // Let's go with direct fetch here to ensure immediate feedback in the popup.
            // importing modules dynamically or relying on the file structure...
            // We need to import API here.
            
            const { fetchUserAnimeHistory, fetchUserFavorites } = await import('../utils/api.js');
            const { normalizeAnimeData } = await import('../utils/normalizer.js');
            const { calculateDiff } = await import('../utils/diff_engine.js');

            const history = await fetchUserAnimeHistory(username, clientId);
            const favorites = await fetchUserFavorites(username, clientId);
            const normalized = normalizeAnimeData([], history);
            
            const prevData = await getUserData(['last_snapshot']);
            const lastSnapshot = prevData.last_snapshot || [];

            const diff = calculateDiff(lastSnapshot, normalized.history);

            if (diff.has_changes) {
                await saveUserData({
                    pending_changes: diff,
                    latest_fetch: normalized.history,
                    anime_list_favorites: favorites // Save favorites
                });
                showStatus('Changes Detected!', 'success');
            } else {
                // If no changes, we might want to optionally update snapshot if it was empty?
                // If snapshot is empty, let's init it.
                if (lastSnapshot.length === 0) {
                     await saveUserData({
                        last_snapshot: normalized.history,
                        latest_fetch: normalized.history
                    });
                    showStatus('Initialized (No Diff).', 'success');
                } else {
                    showStatus('Synced (No New Changes).', 'info');
                }
            }

        } catch (error) {
            console.error(error);
            showStatus('Error: ' + error.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save & Sync';
        }
    });

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'status';
            }, 3000);
        }
    }

    function updateUI(data) {
        // Pending Changes (Diff)
        if (data.pending_changes && data.pending_changes.has_changes) {
            diffContainer.style.display = 'block';
            diffList.innerHTML = '';
            
            // Summary Text is generated by diff_engine, let's use it or rebuild list
            // For popup, a nice list is better.
            const report = data.pending_changes;
            
            report.new_entries.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `🆕 <b>${item.title}</b> (${item.status})`;
                diffList.appendChild(li);
            });

            report.updates.forEach(u => {
                const li = document.createElement('li');
                const changes = u.changes.map(c => `${c.field}: ${c.old} &rarr; <b>${c.new}</b>`).join(', ');
                li.innerHTML = `📝 <b>${u.anime.title}</b>: ${changes}`;
                diffList.appendChild(li);
            });

            chrome.action.setBadgeText({ text: '!' });
        } else {
            diffContainer.style.display = 'none';
            chrome.action.setBadgeText({ text: '' });
        }
    }
});
