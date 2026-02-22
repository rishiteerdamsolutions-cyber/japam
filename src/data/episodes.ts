export interface Episode {
  id: number;
  name: string;
  levelRange: [number, number];
}

export const EPISODES: Episode[] = [
  { id: 1, name: 'Village Temple', levelRange: [1, 10] },
  { id: 2, name: 'River Ghat', levelRange: [11, 20] },
  { id: 3, name: 'Mountain Ashram', levelRange: [21, 30] },
  { id: 4, name: 'Sacred Forest', levelRange: [31, 40] },
  { id: 5, name: 'Divine Summit', levelRange: [41, 50] }
];
