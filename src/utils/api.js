export const MAL_API_BASE = 'https://api.myanimelist.net/v2';

/**
 * Fetches the user's anime list from MyAnimeList API.
 * @param {string} username - The MyAnimeList username.
 * @param {string} status - 'watching' or 'completed'.
 * @param {string} clientId - The API Client ID.
 * @returns {Promise<Array>} - List of anime nodes.
 */
export async function fetchUserAnimeList(username, status, clientId) {
    const url = `${MAL_API_BASE}/users/${username}/animelist?status=${status}&limit=1000&fields=list_status,num_episodes,mean,list_updated_at,updated_at`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'X-MAL-CLIENT-ID': clientId
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid Client ID');
            }
            if (response.status === 404) {
                throw new Error('User not found');
            }
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Fetch Error:', error);
        throw error;
    }
}

/**
 * Fetches the user's recently updated anime (History).
 * Uses animelist endpoint sorted by list_updated_at.
 * @param {string} username 
 * @param {string} clientId 
 * @returns {Promise<Array>}
 */
export async function fetchUserAnimeHistory(username, clientId) {
    const url = `${MAL_API_BASE}/users/${username}/animelist?sort=list_updated_at&limit=50&fields=list_status,num_episodes,mean,rank,genres,studios,alternative_titles,list_updated_at,updated_at`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'X-MAL-CLIENT-ID': clientId
            }
        });

        if (!response.ok) {
           // Reuse error handling or simplify
           if (response.status === 401) throw new Error('Invalid Client ID');
           if (response.status === 404) throw new Error('User not found');
           throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Fetch History Error:', error);
        throw error; // Propagate to popup
    }
}

/**
 * Validates the Client ID by making a dummy request.
 * @param {string} clientId 
 * @returns {Promise<boolean>}
 */
export async function validateClientId(clientId) {
    // Basic check pattern or a dummy fetch
    if (!clientId || clientId.length < 10) return false;
    return true; 
}
/**
 * Fetches top rated completed anime for reference.
 * @param {string} username 
 * @param {string} clientId 
 * @returns {Promise<Array>}
 */
export async function fetchUserFavorites(username, clientId) {
    // Tamamlananlar, Puana göre azalan sırada, ilk 10 tane
    // Using list_score to get top rated by user
    const url = `${MAL_API_BASE}/users/${username}/animelist?status=completed&sort=list_score&limit=10&fields=list_status,num_episodes,mean`;
    
    try {
        const response = await fetch(url, { headers: { 'X-MAL-CLIENT-ID': clientId } });
        if (!response.ok) return [];
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Fetch Favorites Error:', error);
        return [];
    }
}
