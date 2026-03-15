import { getApiBase } from './apiBase';

export type RewardVideoEvent = 'started' | 'completed' | 'continue_clicked';
export type RewardVideoContentType = 'adyathmika' | 'advertisement';
export type RewardType = 'moves' | 'life';

export async function trackRewardVideoEvent(
  getIdToken: () => Promise<string | null>,
  payload: {
    event: RewardVideoEvent;
    videoId: string;
    type: RewardVideoContentType;
    rewardType?: RewardType;
  }
): Promise<void> {
  try {
    const token = await getIdToken();
    if (!token) return;
    const base = getApiBase();
    const url = base ? `${base}/api/user/reward-video-event` : '/api/user/reward-video-event';
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch {
    // non-blocking
  }
}
