import '@fontsource/press-start-2p/400.css';
import '@fontsource/silkscreen/400.css';

export const FONT_H = '"Press Start 2P", monospace';
export const FONT_B = 'Silkscreen, monospace';

export async function loadFonts() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('8px Silkscreen')]),
      new Promise(r => setTimeout(r, 2500)),
    ]);
  } catch (e) { /* fall back to monospace */ }
}
