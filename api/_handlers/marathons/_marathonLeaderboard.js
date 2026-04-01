/**
 * Build leaderboard entries for display + rank card. Returns top `topN` plus the viewer's row
 * when they participate but rank below topN (so "Download rank card" still works).
 */
export async function buildMarathonLeaderboard(db, marathonId, options = {}) {
  const topN = typeof options.topN === 'number' && options.topN > 0 ? options.topN : 5;
  const viewerUid = typeof options.viewerUid === 'string' && options.viewerUid ? options.viewerUid : null;

  const partsSnap = await db.collection('marathonParticipations').where('marathonId', '==', marathonId).get();
  const participants = partsSnap.docs.map((p) => {
    const pdata = p.data();
    return {
      userId: pdata.userId,
      displayName: typeof pdata.displayName === 'string' ? pdata.displayName : null,
      japasCount: pdata.japasCount ?? 0,
    };
  });
  participants.sort((a, b) => (b.japasCount || 0) - (a.japasCount || 0));

  const ranked = participants.map((p, i) => ({
    userId: p.userId,
    displayName: p.displayName,
    japasCount: p.japasCount,
    rank: i + 1,
  }));

  const toEntry = (p) => ({
    rank: p.rank,
    uid: p.userId,
    name: p.displayName || (p.userId ? String(p.userId).slice(0, 8) : '—'),
    japasCount: p.japasCount,
  });

  const top = ranked.slice(0, topN).map(toEntry);
  if (!viewerUid || top.some((e) => e.uid === viewerUid)) {
    return top;
  }
  const mine = ranked.find((p) => p.userId === viewerUid);
  if (!mine) return top;
  return [...top, toEntry(mine)];
}
