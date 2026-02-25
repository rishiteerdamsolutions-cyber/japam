export interface Episode {
  id: number;
  name: string;
  levelRange: [number, number];
}

/** Sanathana-themed episode names (replacing Village Temple, River Ghat, etc.). 100 episodes for levels 1–1000. */
const SANATHANA_EPISODE_NAMES: string[] = [
  'Veda Bhoomi', 'Upanishad Vanam', 'Gita Kshetra', 'Ramayana Path', 'Mahabharata Dham',
  'Purana Lok', 'Dharma Sindhu', 'Rishi Ashram', 'Vedanga Grama', 'Darshana Dham',
  'Tapovan', 'Badri Kshetra', 'Kedar Dham', 'Naimisharanya', 'Ayodhya Marg',
  'Mathura Mandal', 'Dwaraka Dweep', 'Kashi Kshetra', 'Rameshwaram', 'Puri Dham',
  'Haridwar Ghat', 'Ujjain Nagari', 'Kanchi Puram', 'Srirangam', 'Tirupati Kshetra',
  'Sabarimala', 'Guruvayur', 'Chidambaram', 'Madurai Meenakshi', 'Thanjavur',
  'Sringeri', 'Dwarka Peeth', 'Jyotir Math', 'Govardhan', 'Vrindavan',
  'Gokul', 'Nanda Gram', 'Vraja Bhoomi', 'Braj Mandal', 'Nathdwara',
  'Pushkar', 'Nashik Kumbh', 'Prayagraj', 'Gangotri', 'Yamunotri',
  'Kedarnath', 'Badrinath', 'Amarnath', 'Vaishno Devi', 'Tirumala',
  'Rishikesh', 'Hrishikesh', 'Deva Bhumi', 'Manasa Sarovar', 'Kailash Marg',
  'Char Dham', 'Sapta Puri', 'Dwadash Jyotirling', 'Panch Kedar', 'Panch Badri',
  'Sapta Rishi', 'Nava Graha', 'Ashta Dikpalaka', 'Loka Palaka', 'Deva Lok',
  'Pitru Lok', 'Bhu Lok', 'Bhuvar Lok', 'Swarga Lok', 'Satya Lok',
  'Sanatana Dhara', 'Vedic Path', 'Shruti Marg', 'Smriti Van', 'Shastra Gram',
  'Mantra Bhoomi', 'Yantra Kshetra', 'Tantra Dham', 'Jnana Vana', 'Bhakti Path',
  'Karma Kshetra', 'Raja Yoga', 'Gyan Yoga', 'Bhakti Yoga', 'Karma Yoga',
  'Hatha Yoga', 'Kundalini Dham', 'Chakra Kshetra', 'Nadi Vanam', 'Prana Lok',
  'Omkara Bhoomi', 'Pranava Kshetra', 'Gayatri Dham', 'Savitri Marg', 'Saraswati Van',
  'Lakshmi Kshetra', 'Parvati Dham', 'Durga Marg', 'Kali Kshetra', 'Shakti Peeth',
  'Jyotirlinga', 'Shiva Kshetra', 'Vishnu Dham', 'Brahma Lok', 'Trimurti Marg',
  'Sanatana Gram', 'Dharma Kshetra', 'Artha Dham', 'Kama Van', 'Moksha Marg',
];

function buildEpisodes(): Episode[] {
  const list: Episode[] = [];
  for (let id = 1; id <= 100; id++) {
    const start = (id - 1) * 10 + 1;
    const end = id * 10;
    list.push({
      id,
      name: SANATHANA_EPISODE_NAMES[id - 1] ?? `Sanathana ${id}`,
      levelRange: [start, end],
    });
  }
  return list;
}

export const EPISODES: Episode[] = buildEpisodes();
