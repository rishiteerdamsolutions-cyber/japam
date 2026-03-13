# Japam - Audio Files for Mantra Playback

Place these audio files in `public/sounds/`.

**Background music:** `background.mp3` (loops during gameplay)

**Matching bonus (special matches):**
- `temple-bells.mp3` – Hindu temple bells (plays on 4-candy match, and with conch on 5-candy match)
- `conch.mp3` – Hindu conch sound (plays on 5-candy match, L/T-shaped match, and with bells on 5-candy match)

## Deity mantra audio (expected filenames in code)

The app references `.m4a` files in `src/data/deities.ts`. Use these exact filenames:

| Deity | Filename | Mantra |
|-------|----------|--------|
| Rama | `rama.m4a` | Ram |
| Shiva | `shiva.m4a` | Om Namah Shivaya |
| Ganesh | `ganesh.m4a` | Om Gan Ganapataye Namah |
| Surya | `surya.m4a` | Om sooryaya Namaha |
| Shakthi | `shakthi.m4a` | Sri Maatre namaha |
| Krishna | `krishna.m4a` | Om namo Bhagavathe vaasudevaya |
| Shanmukha | `shanmukha.m4a` | Om Saravana Bhavaya Namaha |
| Venkateswara | `venkateswara.m4a` | Om namo Venkateshaaya |
| Hanuman | `hanuman.m4a` | Om Sri Hanumate Namaha |
| Narasimha | `narasimha.m4a` | Om Namo Narasimhaya |
| Lakshmi | `lakshmi.m4a` | Om Sri Mahalakshmyai Namaha |
| Durga | `durga.m4a` | Om Sri Durgaya Namaha |
| Saraswati | `saraswati.m4a` | Om Saraswatyai Namaha |
| Ayyappan | `ayyappan.m4a` | Swamiye Saranam Ayyappa |
| Jagannath | `jagannath.m4a` | Jai Jagannath |
| Dattatreya | `dattatreya.m4a` | Om Sri Dattatreyaya Namaha |
| Sai Baba | `saiBaba.m4a` | Om Sai Ram |
| Narayana | `narayana.m4a` | Om Namo Narayanaya |
| ISKCON | `iskcon.m4a` | Hare Krishna |
| Guru | `guru.m4a` | Om Graam Greem Graum Sah Gurave Namaha |
| Shani | `shani.m4a` | Om Shan Shanicharaya Namaha |
| Rahu | `rahu.m4a` | Om Raam Rahave Namaha |
| Ketu | `ketu.m4a` | Om Kem Ketave Namaha |

## Replacing or updating audios

1. Place new audio files in `public/sounds/` with the exact filenames above (e.g. `rama.m4a`, `shiva.m4a`).
2. If using a different extension (e.g. `.mp3` instead of `.m4a`), update the `mantraAudio` paths in `src/data/deities.ts` for each deity.

## Notes

- Format: MP3 or M4A (browsers support both). Code currently expects `.m4a`.
- Duration: Short clip (1–3 seconds per mantra chant).
- Until you add these files, the app uses placeholder tones.
