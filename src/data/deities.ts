import { matchMantraAudioPath } from '../lib/matchSfx';

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

/**
 * Guru-reserved deities: **not in active play** (menu, boards, powers, world map). Full records live in
 * `HIDDEN_GURU_DEITIES` for a future “Gurus” path or Pro-only unlock. Kept on `DeityId` and in
 * `JAPA_COUNT_DEITY_IDS` so saved japa / API history still round-trips.
 */
export const HIDDEN_GURU_RESERVED_IDS = ['saiBaba', 'bramhamgaaru'] as const;
export type HiddenGuruReservedId = (typeof HIDDEN_GURU_RESERVED_IDS)[number];

/** Deities that appear in menus, boards, and the power strip (`DEITY_IDS`). */
export type PlayableDeityId = Exclude<DeityId, HiddenGuruReservedId>;

export interface Deity {
  id: DeityId;
  /** English short label (e.g. match-3 hints). Localized UI uses i18n `deities.{id}`. */
  name: string;
  color: string;
  mantraAudio: string;
  mantra: string;
  /** Optional PDF / attribution text by match length; each defaults to `mantra` when omitted. */
  mantra3?: string;
  mantra4?: string;
  mantra5?: string;
  /** Full artwork for menu, level select, etc. */
  image: string;
  /** Optional face-focused asset for match-3 gems (falls back to `image` if omitted). */
  imageGame?: string;
  /**
   * With `imageGame`: how the image is fitted in the gem.
   * `center` — asset already cropped (e.g. from menu art); `upper` — bias to upper third for painted face tiles.
   */
  imageGameObjectPosition?: 'center' | 'upper';
}

export const DEITIES: Deity[] = [
  {
    id: 'rama',
    name: 'Rama',
    color: '#2E8B57',
    mantraAudio: matchMantraAudioPath('rama'),
    mantra: 'Ram',
    image: '/images/deities/rama.png',
    imageGame: '/images/deities/game/rama-face.png',
  },
  {
    id: 'shiva',
    name: 'Shiva',
    color: '#4FC3F7',
    mantraAudio: matchMantraAudioPath('shiva'),
    mantra: 'Om Namah Shivaya',
    image: '/images/deities/shiva.png',
    imageGame: '/images/deities/game/shiva-face.png',
  },
  {
    id: 'ganesh',
    name: 'Ganesh',
    color: '#E53935',
    mantraAudio: matchMantraAudioPath('ganesh'),
    mantra: 'Om Ganeshaya Namaha',
    image: '/images/deities/ganesh.png',
    imageGame: '/images/deities/game/ganesh-face.png',
  },
  {
    id: 'surya',
    name: 'Surya',
    color: '#FFD600',
    mantraAudio: matchMantraAudioPath('surya'),
    mantra: 'Om sooryaya Namaha',
    image: '/images/deities/surya.png',
    imageGame: '/images/deities/game/surya-face.png',
  },
  {
    id: 'shakthi',
    name: 'Shakthi',
    /** Gem rim / plate: vivid magenta-pink (distinct from Lakṣmī gold, Durgā red, Sarasvatī teal). */
    color: '#C51162',
    mantraAudio: matchMantraAudioPath('shakthi'),
    mantra: 'Sri Maatre namaha',
    image: '/images/deities/shakthi.png',
    imageGame: '/images/deities/game/shakthi-face.png',
  },
  {
    id: 'krishna',
    name: 'Krishna',
    color: '#1A237E',
    mantraAudio: matchMantraAudioPath('krishna'),
    mantra: 'Om namo Bhagavathe vaasudevaya',
    image: '/images/deities/krishna.png',
    imageGame: '/images/deities/game/krishna-face.png',
  },
  {
    id: 'shanmukha',
    name: 'Shanmukha',
    color: '#FF6F00',
    mantraAudio: matchMantraAudioPath('shanmukha'),
    mantra: 'Om Saravana Bhavaya Namaha',
    image: '/images/deities/shanmukha.png',
    imageGame: '/images/deities/game/shanmukha-face.png',
  },
  {
    id: 'venkateswara',
    name: 'Venkateswara',
    color: '#6A1B9A',
    mantraAudio: matchMantraAudioPath('venkateswara'),
    mantra: 'Om namo Venkateshaaya',
    image: '/images/deities/venkateswara.png',
    imageGame: '/images/deities/game/venkateswara-face.png',
  },
  {
    id: 'hanuman',
    name: 'Hanuman',
    color: '#FF6F00',
    mantraAudio: matchMantraAudioPath('hanuman'),
    mantra: 'Om Sri Hanumate Namaha',
    image: '/images/deities/hanuman.png',
    imageGame: '/images/deities/game/hanuman-face.png',
  },
  {
    id: 'narasimha',
    name: 'Narasimha',
    color: '#E65100',
    mantraAudio: matchMantraAudioPath('narasimha'),
    mantra: 'Om Namo Narasimhaya',
    image: '/images/deities/narasimha.png',
    imageGame: '/images/deities/game/narasimha-face.png',
  },
  {
    id: 'lakshmi',
    name: 'Lakshmi',
    /** Amber / golden yellow — reads clearly vs Durgā’s red and Śakti’s pink. */
    color: '#FF8F00',
    mantraAudio: matchMantraAudioPath('lakshmi'),
    mantra: 'Om Sri Mahalakshmyai Namaha',
    image: '/images/deities/lakshmi.png',
    imageGame: '/images/deities/game/lakshmi-face.png',
  },
  {
    id: 'durga',
    name: 'Durga',
    /** Deep warrior red — separated from Śakti pink and Lakṣmī amber. */
    color: '#B71C1C',
    mantraAudio: matchMantraAudioPath('durga'),
    mantra: 'Om Sri Durgaya Namaha',
    image: '/images/deities/durga.png',
    imageGame: '/images/deities/game/durga-face.png',
  },
  {
    id: 'saraswati',
    name: 'Saraswati',
    /** Teal — stands apart from blues (Kṛṣṇa, Śiva sky) and the red/pink/gold goddess set. */
    color: '#00897B',
    mantraAudio: matchMantraAudioPath('saraswati'),
    mantra: 'Om Saraswatyai Namaha',
    image: '/images/deities/saraswati.png',
    imageGame: '/images/deities/game/saraswati-face.png',
  },
  {
    id: 'ayyappan',
    name: 'Ayyappan',
    color: '#1B5E20',
    mantraAudio: matchMantraAudioPath('ayyappan'),
    mantra: 'Swamiye Saranam Ayyappa',
    image: '/images/deities/ayyappan.png',
    imageGame: '/images/deities/game/ayyappan-face.png',
  },
  {
    id: 'jagannath',
    name: 'Jagannath',
    color: '#0D47A1',
    mantraAudio: matchMantraAudioPath('jagannath'),
    mantra: 'Jai Jagannath',
    image: '/images/deities/jagannath.png',
    imageGame: '/images/deities/game/jagannath-face.png',
  },
  {
    id: 'dattatreya',
    name: 'Dattatreya',
    color: '#1565C0',
    mantraAudio: matchMantraAudioPath('dattatreya'),
    mantra: 'Om Sri Dattatreyaya Namaha',
    image: '/images/deities/dattatreya.png',
    imageGame: '/images/deities/game/dattatreya-face.png',
  },
  {
    id: 'narayana',
    name: 'Narayana',
    color: '#283593',
    mantraAudio: matchMantraAudioPath('narayana'),
    mantra: 'Om Namo Narayanaya',
    image: '/images/deities/narayana.png',
    imageGame: '/images/deities/game/narayana-face.png',
  },
  {
    id: 'iskcon',
    name: 'ISKCON',
    color: '#FF9800',
    mantraAudio: matchMantraAudioPath('iskcon'),
    mantra: 'Hare Krishna',
    image: '/images/deities/iskcon.png',
    imageGame: '/images/deities/game/iskcon-face.png',
  },
  {
    id: 'guru',
    name: 'Guru',
    color: '#FBC02D',
    mantraAudio: matchMantraAudioPath('guru'),
    mantra: 'Om Graam Greem Graum Sah Gurave Namaha',
    image: '/images/deities/guru.png',
    imageGame: '/images/deities/game/guru-face.png',
  },
  {
    id: 'shani',
    name: 'Shani',
    color: '#37474F',
    mantraAudio: matchMantraAudioPath('shani'),
    mantra: 'Om Shan Shanicharaya Namaha',
    image: '/images/deities/shani.png',
    imageGame: '/images/deities/game/shani-face.png',
  },
  {
    id: 'rahu',
    name: 'Rahu',
    color: '#455A64',
    mantraAudio: matchMantraAudioPath('rahu'),
    mantra: 'Om Raam Rahave Namaha',
    image: '/images/deities/rahu.png',
    imageGame: '/images/deities/game/rahu-face.png',
  },
  {
    id: 'ketu',
    name: 'Ketu',
    color: '#5D4037',
    mantraAudio: matchMantraAudioPath('ketu'),
    mantra: 'Om Kem Ketave Namaha',
    image: '/images/deities/ketu.png',
    imageGame: '/images/deities/game/ketu-face.png',
  },
];

/** Not merged into `DEITIES` / `DEITY_IDS`; see `HIDDEN_GURU_RESERVED_IDS`. */
export const HIDDEN_GURU_DEITIES: Deity[] = [
  {
    id: 'saiBaba',
    name: 'Sai Baba',
    color: '#FF8F00',
    mantraAudio: matchMantraAudioPath('saiBaba'),
    mantra: 'Om Sai Ram',
    image: '/images/deities/saiBaba.png',
    imageGame: '/images/deities/game/saiBaba-face.png',
  },
  {
    id: 'bramhamgaaru',
    name: 'Bramhamgaaru',
    color: '#B71C1C',
    mantraAudio: matchMantraAudioPath('bramhamgaaru'),
    mantra: 'Om Brahmaye Namaha',
    image: '/images/deities/bramhamgaaru.png',
    imageGame: '/images/deities/game/bramhamgaaru-face.png',
  },
];

export const DEITY_IDS: PlayableDeityId[] = DEITIES.map((d) => d.id as PlayableDeityId);

/** Per-deity japa buckets in Firestore may still include guru-reserved ids — merge/save with this list. */
export const JAPA_COUNT_DEITY_IDS: DeityId[] = [...DEITY_IDS, ...HIDDEN_GURU_RESERVED_IDS];

export function getDeity(id: DeityId): Deity {
  const d = DEITIES.find((x) => x.id === id);
  if (d) return d;
  const h = HIDDEN_GURU_DEITIES.find((x) => x.id === id);
  if (h) return h;
  throw new Error(`Unknown deity: ${id}`);
}

export function mantraForMatchTier(d: Deity, tier: 3 | 4 | 5): string {
  if (tier === 3) return d.mantra3 ?? d.mantra;
  if (tier === 4) return d.mantra4 ?? d.mantra;
  return d.mantra5 ?? d.mantra;
}
