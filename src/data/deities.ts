export type DeityId = 'rama' | 'shiva' | 'ganesh' | 'surya' | 'shakthi' | 'krishna' | 'shanmukha' | 'venkateswara';

export interface Deity {
  id: DeityId;
  name: string;
  color: string;
  mantraAudio: string;
  /** Mantra text for PDF (e.g. "Ram" for Rama). User provides actual mantras. */
  mantra: string;
}

export const DEITIES: Deity[] = [
  { id: 'rama', name: 'Rama', color: '#2E8B57', mantraAudio: '/sounds/rama.m4a', mantra: 'Ram' },
  { id: 'shiva', name: 'Shiva', color: '#4FC3F7', mantraAudio: '/sounds/shiva.m4a', mantra: 'Om Namah Shivaya' },
  { id: 'ganesh', name: 'Ganesh', color: '#E53935', mantraAudio: '/sounds/ganesh.m4a', mantra: 'Om Gan Ganapataye Namah' },
  { id: 'surya', name: 'Surya', color: '#FFD600', mantraAudio: '/sounds/surya.m4a', mantra: 'Om sooryaya Namaha' },
  { id: 'shakthi', name: 'Shakthi', color: '#E91E9B', mantraAudio: '/sounds/shakthi.m4a', mantra: 'Sri Maatre namaha' },
  { id: 'krishna', name: 'Krishna', color: '#1A237E', mantraAudio: '/sounds/krishna.m4a', mantra: 'Om namo Bhagavathe vaasudevaya' },
  { id: 'shanmukha', name: 'Shanmukha', color: '#FF6F00', mantraAudio: '/sounds/shanmukha.m4a', mantra: 'Om Saravana Bhavaya Namaha' },
  { id: 'venkateswara', name: 'Venkateswara', color: '#6A1B9A', mantraAudio: '/sounds/venkateswara.m4a', mantra: 'Om namo Venkateshaaya' }
];

export const DEITY_IDS: DeityId[] = DEITIES.map(d => d.id);

export function getDeity(id: DeityId): Deity {
  return DEITIES.find(d => d.id === id)!;
}
