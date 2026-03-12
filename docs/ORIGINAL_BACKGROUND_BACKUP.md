# Original Background Colors & Revert Guide

Backup of original background styles before switching to Bubblegum Pink. Use this to revert if needed.

## Revert Steps

1. **animations.css**: Remove or rename `.bg-gloss-bubblegum` (optional—harmless if kept).
2. **Components**: Change `bg-gloss-bubblegum` back to original class names:
   - `MainMenu.tsx`: `bg-gloss-bubblegum` → `bg-gloss-menu`
   - `GameScreen.tsx`: `bg-gloss-bubblegum` → `bg-gloss-game`
   - `GamePage.tsx` (loading state): `bg-gloss-bubblegum` → `bg-gloss-game`
3. **OpeningVideoModal.tsx**: Restore background image:
   - Add back `style={{ backgroundImage: 'url(/images/videomodalbg.png)' }}`
   - Remove `bg-gloss-bubblegum` class
4. **ApavargaPage.tsx**: Restore background image:
   - Add back `style={{ backgroundImage: 'url(/images/apavargapagebg.png)' }}`
   - Remove `bg-gloss-bubblegum` class

---

## Original Values

### CSS Gradients (animations.css)

**bg-gloss-menu**
```css
background: linear-gradient(160deg, #1a1410 0%, #2d1810 40%, #1a1410 100%);
```

**bg-gloss-game**
```css
background: linear-gradient(160deg, #0f1a1a 0%, #152520 40%, #0f1a1a 100%);
```

### Image Backgrounds

| Component | Original |
|-----------|----------|
| OpeningVideoModal | `backgroundImage: url(/images/videomodalbg.png)` |
| ApavargaPage | `backgroundImage: url(/images/apavargapagebg.png)` |

### Gloss Overlay (all bg-gloss-*)
```css
::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
  pointer-events: none;
}
```
