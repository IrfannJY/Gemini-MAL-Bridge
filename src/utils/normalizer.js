/**
 * Normalizes Anime Data for the Bridge.
 * Formats dates to DD.MM.YYYY and cleans up unnecessary fields.
 */

export function normalizeAnimeData(watching, history) {
    return {
        watching: watching.map(normalizeItem),
        history: history.map(normalizeItem)
    };
}

function normalizeItem(item) {
    const status = item.list_status;
    const node = item.node;

    // Resolve Date
    // Priority: updated_at -> list_updated_at
    const rawDate = status.updated_at || status.list_updated_at;
    let formattedDate = "??.??.????";

    if (rawDate) {
        try {
            const d = new Date(rawDate);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            formattedDate = `${day}.${month}.${year}`;
        } catch (e) {
            console.warn('Date Parsing Error:', rawDate);
        }
    }

    return {
        id: node.id,
        title: node.title,
        status: status.status,
        episodes_watched: status.num_episodes_watched,
        score: status.score,
        updated_at_formatted: formattedDate,
        raw_updated_at: rawDate,
        // Extended Metadata
        mean: node.mean,
        rank: node.rank,
        genres: node.genres ? node.genres.map(g => g.name) : [],
        studios: node.studios ? node.studios.map(s => s.name) : [],
        num_episodes: node.num_episodes
    };
}
