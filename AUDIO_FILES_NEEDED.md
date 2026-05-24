# Japam - Audio Files

Place shared clips in `public/sounds/`:

- `background.mp3` – loops during gameplay
- `temple-bells.mp3` – 4-match bonus (and with conch on 5-match)
- `conch.mp3` – 5-match / L-T bonus
- `notification.mp3` – reminder notifications

## Per-deity mantra / match SFX

All deity clips live under tier folders (same files for match-3 SFX and japa counter mantras):

| Tier | Folder | Filename pattern |
|------|--------|------------------|
| 3-match | `public/sounds/3match-sounds/` | `3match-{deity}.mp3` |
| 4-match | `public/sounds/4match-sounds/` | `4match-{deity}.mp3` |
| 5-match | `public/sounds/5match-sounds/` | `5match-{deity}.mp3` |

Slug exceptions (filename ≠ `DeityId`): `saraswathi`, `saibaba`, `bramhamgaru` — see `SLUG_TRIES` in `src/lib/matchSfx.ts`.

Japa counter and `mantraAudio` in `src/data/deities.ts` use the **3-match** clip via `matchMantraAudioPath()`.

## Replacing audio in place

After swapping an MP3 without renaming, bump `MATCH_SFX_CACHE_BUST` in `src/lib/matchSfx.ts` so browsers drop cached copies.

## Notes

- Format: MP3
- Duration: short clip (typical mantra chant length used in-game)
