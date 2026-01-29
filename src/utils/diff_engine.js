/**
 * Diff Engine for Gemini-MAL Bridge
 * Compares old and new anime lists to detect specific changes.
 */

export function calculateDiff(oldList, newList) {
    const diffReport = {
        updates: [],
        new_entries: [],
        has_changes: false,
        summary_text: ""
    };

    if (!oldList || oldList.length === 0) {
        // First run or empty cache: everything is "new" but we might not want to spam.
        // Let's treat it as no diff to avoid initial explosion, OR just sync silently.
        // Better: Return empty diff, let the full list be the context context.
        return diffReport; 
    }

    // Map old list by ID for fast lookup
    const oldMap = new Map(oldList.map(item => [item.id, item]));

    for (const newItem of newList) {
        const oldItem = oldMap.get(newItem.id);

        if (!oldItem) {
            // New Entry found
            diffReport.new_entries.push(newItem);
            diffReport.has_changes = true;
            continue;
        }

        // Check for updates
        const changes = [];

        // 1. Episode Progress
        if (newItem.episodes_watched !== oldItem.episodes_watched) {
            changes.push({
                field: 'episodes_watched',
                old: oldItem.episodes_watched,
                new: newItem.episodes_watched
            });
        }

        // 2. Score
        if (newItem.score !== oldItem.score) {
            changes.push({
                field: 'score',
                old: oldItem.score,
                new: newItem.score
            });
        }

        // 3. Status
        if (newItem.status !== oldItem.status) {
            changes.push({
                field: 'status',
                old: oldItem.status,
                new: newItem.status
            });
        }

        if (changes.length > 0) {
            diffReport.updates.push({
                anime: newItem,
                changes: changes
            });
            diffReport.has_changes = true;
        }
    }

    if (diffReport.has_changes) {
        diffReport.summary_text = generateSummary(diffReport);
    }

    return diffReport;
}

function generateSummary(diff) {
    const lines = [];

    // New Entries
    diff.new_entries.forEach(item => {
        lines.push(`🆕 **${item.title}** listeye eklendi (${item.status}).`);
    });

    // Updates
    diff.updates.forEach(update => {
        const anime = update.anime;
        const changeParts = [];

        update.changes.forEach(c => {
            if (c.field === 'episodes_watched') {
                changeParts.push(`Bölüm: ${c.old} -> **${c.new}**`);
            } else if (c.field === 'score') {
                const oldScore = c.old === 0 ? '-' : c.old;
                const newScore = c.new === 0 ? '-' : c.new;
                changeParts.push(`Puan: ${oldScore} -> **${newScore}**`);
            } else if (c.field === 'status') {
                changeParts.push(`Durum: ${c.old} -> **${c.new}**`);
            }
        });

        // Context Metadata (Genres, Studio, Rank)
        // Note: item should have these if normalized correctly.
        // We will assume normalizer passes them through.
        
        lines.push(`📝 **${anime.title}**: ${changeParts.join(', ')}`);
    });

    return lines.join('\n');
}
