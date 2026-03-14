export type DeityId =
  | 'rama'
  | 'shiva'
  | 'ganesh'
  | 'surya'
  | 'shakthi'
  | 'krishna'
  | 'shanmukha'
  | 'venkateswara'
  | 'hanuman'
  | 'narasimha'
  | 'lakshmi'
  | 'durga'
  | 'saraswati'
  | 'ayyappan'
  | 'jagannath'
  | 'dattatreya'
  | 'saiBaba'
  | 'narayana'
  | 'iskcon'
  | 'guru'
  | 'shani'
  | 'rahu'
  | 'ketu'
  | 'bramhamgaaru';

export interface Deity {
  id: DeityId;
  name: string;
  color: string;
  mantraAudio: string;
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
  { id: 'venkateswara', name: 'Venkateswara', color: '#6A1B9A', mantraAudio: '/sounds/venkateswara.m4a', mantra: 'Om namo Venkateshaaya', image: '/images/deities/venkateswara.png' },
  { id: 'hanuman', name: 'Hanuman', color: '#FF6F00', mantraAudio: '/sounds/hanuman.m4a', mantra: 'Om Sri Hanumate Namaha', image: '/images/deities/hanuman.png' },
  { id: 'narasimha', name: 'Narasimha', color: '#E65100', mantraAudio: '/sounds/narasimha.m4a', mantra: 'Om Namo Narasimhaya', image: '/images/deities/narasimha.png' },
  { id: 'lakshmi', name: 'Lakshmi', color: '#F9A825', mantraAudio: '/sounds/lakshmi.m4a', mantra: 'Om Sri Mahalakshmyai Namaha', image: '/images/deities/lakshmi.png' },
  { id: 'durga', name: 'Durga', color: '#C62828', mantraAudio: '/sounds/durga.m4a', mantra: 'Om Sri Durgaya Namaha', image: '/images/deities/durga.png' },
  { id: 'saraswati', name: 'Saraswati', color: '#5C6BC0', mantraAudio: '/sounds/saraswati.m4a', mantra: 'Om Saraswatyai Namaha', image: '/images/deities/saraswati.png' },
  { id: 'ayyappan', name: 'Ayyappan', color: '#1B5E20', mantraAudio: '/sounds/ayyappan.m4a', mantra: 'Swamiye Saranam Ayyappa', image: '/images/deities/ayyappan.png' },
  { id: 'jagannath', name: 'Jagannath', color: '#0D47A1', mantraAudio: '/sounds/jagannath.m4a', mantra: 'Jai Jagannath', image: '/images/deities/jagannath.png' },
  { id: 'dattatreya', name: 'Dattatreya', color: '#1565C0', mantraAudio: '/sounds/dattatreya.m4a', mantra: 'Om Sri Dattatreyaya Namaha', image: '/images/deities/dattatreya.png' },
  { id: 'saiBaba', name: 'Sai Baba', color: '#FF8F00', mantraAudio: '/sounds/saiBaba.m4a', mantra: 'Om Sai Ram', image: '/images/deities/saiBaba.png' },
  { id: 'narayana', name: 'Narayana', color: '#283593', mantraAudio: '/sounds/narayana.m4a', mantra: 'Om Namo Narayanaya', image: '/images/deities/narayana.png' },
  { id: 'iskcon', name: 'ISKCON', color: '#FF9800', mantraAudio: '/sounds/iskcon.m4a', mantra: 'Hare Krishna', image: '/images/deities/iskcon.png' },
  { id: 'guru', name: 'Guru', color: '#FBC02D', mantraAudio: '/sounds/guru.m4a', mantra: 'Om Graam Greem Graum Sah Gurave Namaha', image: '/images/deities/guru.png' },
  { id: 'shani', name: 'Shani', color: '#37474F', mantraAudio: '/sounds/shani.m4a', mantra: 'Om Shan Shanicharaya Namaha', image: '/images/deities/shani.png' },
  { id: 'rahu', name: 'Rahu', color: '#455A64', mantraAudio: '/sounds/rahu.m4a', mantra: 'Om Raam Rahave Namaha', image: '/images/deities/rahu.png' },
  { id: 'ketu', name: 'Ketu', color: '#5D4037', mantraAudio: '/sounds/ketu.m4a', mantra: 'Om Kem Ketave Namaha', image: '/images/deities/ketu.png' },
  { id: 'bramhamgaaru', name: 'Bramhamgaaru', color: '#B71C1C', mantraAudio: '/sounds/bramhamgaaru.m4a', mantra: 'Om Brahmaye Namaha', image: '/images/deities/bramhamgaaru.png' },
];

export const DEITY_IDS: DeityId[] = DEITIES.map((d) => d.id);

export function getDeity(id: DeityId): Deity {
  return DEITIES.find((d) => d.id === id)!;
}
