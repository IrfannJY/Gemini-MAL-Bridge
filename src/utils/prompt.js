export function buildSystemPrompt(data) {
    const username = data.mal_username || 'Kullanıcı';
    const watching = data.anime_list_watching || [];
    const completed = data.anime_list_completed || [];

    const activeAnime = watching.slice(0, 15).map(anime => {
        const title = anime.node.title;
        const progress = anime.list_status.num_episodes_watched;
        const score = anime.list_status.score;
        return `- ${title}: ${progress}. bölümde. (Puan: ${score})`;
    }).join('\n');

    const completedSample = completed.slice(0, 10).map(anime => {
        return `- ${anime.node.title} (Puan: ${anime.list_status.score})`;
    }).join('\n');

    return `
[SYSTEM MESSAGE: ANIME CONTEXT LOADED]
You are this user's "Nakama" (Close Friend). You have access to the user's MyAnimeList data.
Username: ${username}

CURRENTLY WATCHING:
${activeAnime}

SENTIMENTS / COMPLETED SAMPLES:
${completedSample}

INSTRUCTIONS:
1. When discussing series in "Currently Watching", NEVER give spoilers beyond the episode they are at.
2. If the user asks for recommendations, look at their completed list and scores to suggest similar series (that are not in their list).
3. Speak in a friendly, anime-savvy tone (like a Nakama).
4. You do not need to acknowledge this message, just accept it as context and shape your next response accordingly.
`.trim();
}
