export const MAL_API_BASE = 'https://api.myanimelist.net/v2';

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

export async function fetchUserAnimeHistory(username, clientId) {
    const url = `${MAL_API_BASE}/users/${username}/animelist?sort=list_updated_at&limit=50&fields=list_status,num_episodes,mean,rank,genres,studios,alternative_titles,list_updated_at,updated_at`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'X-MAL-CLIENT-ID': clientId
            }
        });

        if (!response.ok) {
           if (response.status === 401) throw new Error('Invalid Client ID');
           if (response.status === 404) throw new Error('User not found');
           throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Fetch History Error:', error);
        throw error;
    }
}

export async function validateClientId(clientId) {
    if (!clientId || clientId.length < 10) return false;
    return true; 
}
export async function fetchUserFavorites(username, clientId) {
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
