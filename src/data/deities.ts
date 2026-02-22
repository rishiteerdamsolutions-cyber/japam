export type DeityId = 'rama' | 'shiva' | 'ganesh' | 'surya' | 'shakthi' | 'krishna' | 'shanmukha' | 'venkateswara';

export interface Deity {
  id: DeityId;
  name: string;
  color: string;
  mantraAudio: string;
  /** Mantra text for PDF (e.g. "Ram" for Rama). User provides actual mantras. */
  mantra: string;
  image: string;
}

export const DEITIES: Deity[] = [
  { id: 'rama', name: 'Rama', color: '#2E8B57', mantraAudio: '/sounds/rama.m4a', mantra: 'Ram', image: '/images/deities/rama.png' },
  { id: 'shiva', name: 'Shiva', color: '#4FC3F7', mantraAudio: '/sounds/shiva.m4a', mantra: 'Om Namah Shivaya', image: '/images/deities/shiva.png' },
  { id: 'ganesh', name: 'Ganesh', color: '#E53935', mantraAudio: '/sounds/ganesh.m4a', mantra: 'Om Gan Ganapataye Namah', image: '/images/deities/ganesh.png' },
  { id: 'surya', name: 'Surya', color: '#FFD600', mantraAudio: '/sounds/surya.m4a', mantra: 'Om sooryaya Namaha', image: '/images/deities/surya.png' },
  { id: 'shakthi', name: 'Shakthi', color: '#E91E9B', mantraAudio: '/sounds/shakthi.m4a', mantra: 'Sri Maatre namaha', image: '/images/deities/shakthi.png' },
  { id: 'krishna', name: 'Krishna', color: '#1A237E', mantraAudio: '/sounds/krishna.m4a', mantra: 'Om namo Bhagavathe vaasudevaya', image: '/images/deities/krishna.png' },
  { id: 'shanmukha', name: 'Shanmukha', color: '#FF6F00', mantraAudio: '/sounds/shanmukha.m4a', mantra: 'Om Saravana Bhavaya Namaha', image: '/images/deities/shanmukha.png' },
  { id: 'venkateswara', name: 'Venkateswara', color: '#6A1B9A', mantraAudio: '/sounds/venkateswara.m4a', mantra: 'Om namo Venkateshaaya', image: '/images/deities/venkateswara.png' }
];

export const DEITY_IDS: DeityId[] = DEITIES.map(d => d.id);

export function getDeity(id: DeityId): Deity {
  return DEITIES.find(d => d.id === id)!;
}
