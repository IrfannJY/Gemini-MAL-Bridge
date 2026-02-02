export function calculateDiff(oldList, newList, cutoffDate = null) {
    const diffReport = {
        updates: [],
        new_entries: [],
        has_changes: false,
        summary_text: ""
    };

    if (!oldList || oldList.length === 0) {
        if (cutoffDate) {
             const cutoffTime = new Date(cutoffDate).getTime();
             newList.forEach(item => {
                 const itemTime = item.raw_updated_at ? new Date(item.raw_updated_at).getTime() : 0;
                 if (itemTime > cutoffTime) {
                     diffReport.new_entries.push(item);
                     diffReport.has_changes = true;
                 }
             });
        }
        return diffReport; 
    }

    const oldMap = new Map(oldList.map(item => [item.id, item]));
    const cutoffTime = cutoffDate ? new Date(cutoffDate).getTime() : 0;

    for (const newItem of newList) {
        const oldItem = oldMap.get(newItem.id);
        const itemTime = newItem.raw_updated_at ? new Date(newItem.raw_updated_at).getTime() : 0;
        const isRecentlyUpdated = cutoffDate && itemTime > cutoffTime;

        if (!oldItem) {
            diffReport.new_entries.push(newItem);
            diffReport.has_changes = true;
            continue;
        }

        const changes = [];

        if (newItem.episodes_watched !== oldItem.episodes_watched) {
            changes.push({
                field: 'episodes_watched',
                old: oldItem.episodes_watched,
                new: newItem.episodes_watched
            });
        }

        if (newItem.score !== oldItem.score) {
            changes.push({
                field: 'score',
                old: oldItem.score,
                new: newItem.score
            });
        }

        if (newItem.status !== oldItem.status) {
            changes.push({
                field: 'status',
                old: oldItem.status,
                new: newItem.status
            });
        }

        if (changes.length === 0 && isRecentlyUpdated) {
             changes.push({
                 field: 'metadata',
                 old: null,
                 new: 'updated'
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

    diff.new_entries.forEach(item => {
        if (item.status === 'completed') {
            lines.push(`🎉 **${item.title}** successfully completed!`);
        } else if (item.status === 'watching') {
            lines.push(`▶️ **${item.title}** started watching.`);
        } else if (item.status === 'plan_to_watch') {
            lines.push(`📑 **${item.title}** added to plan to watch.`);
        } else {
            lines.push(`🆕 **${item.title}** added to list (${item.status}).`);
        }
    });

    diff.updates.forEach(update => {
        const anime = update.anime;
        const changeParts = [];
        let statusChangedToCompleted = false;

        update.changes.forEach(c => {
            if (c.field === 'episodes_watched') {
                changeParts.push(`Ep: ${c.old} -> **${c.new}**`);
            } else if (c.field === 'score') {
                const oldScore = c.old === 0 ? '-' : c.old;
                const newScore = c.new === 0 ? '-' : c.new;
                changeParts.push(`Score: ${oldScore} -> **${newScore}**`);
            } else if (c.field === 'status') {
                if (c.new === 'completed') {
                    statusChangedToCompleted = true;
                }
                changeParts.push(`Status: ${c.old} -> **${c.new}**`);
            } else if (c.field === 'metadata') {
                changeParts.push(`Metadata updated`);
            }
        });

        if (statusChangedToCompleted) {
             lines.push(`🎉 **${anime.title}** successfully completed! (${changeParts.join(', ')})`);
        } else {
             lines.push(`📝 **${anime.title}**: ${changeParts.join(', ')}`);
        }
    });

    return lines.join('\n');
}
