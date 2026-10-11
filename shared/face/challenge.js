// The live face check's challenge — shared by the browser (which shows it)
// and the server (which makes a random one and checks the answer).
//
// 1. Look straight at the camera.
// 2. The screen flashes a random sequence of colours, with black in between.
//    The light from the screen tints a real face, so the colour seen on the
//    face must follow the sequence. A pre-recorded video can't know the
//    sequence in advance.
// 3. Turn your head left and right, in a random order. A flat photo can't
//    do this, because a photo has no depth.
// 4. Look straight again.

export const FLASH_COLOURS = {
  red: [255, 0, 0],
  green: [0, 255, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
};

export const FLASH = {
  count: 6, // colours per check
  colourMs: 450, // how long each colour stays on
  darkMs: 300, // black between colours
  settleMs: 330, // wait this long after a change before taking the picture
};

export const TURN_TIMEOUT_MS = 12000;

/** A random challenge. `random` returns 0 ≤ x < 1 (crypto-based on the server). */
export function makeChallenge(random = Math.random) {
  const names = Object.keys(FLASH_COLOURS);
  const colours = [];
  while (colours.length < FLASH.count) {
    const pick = names[Math.floor(random() * names.length)];
    if (pick !== colours.at(-1)) colours.push(pick);
  }
  const turns = random() < 0.5 ? ['left', 'right'] : ['right', 'left'];
  return { colours, turns };
}

/** The frames the browser sends, in order (names match the upload fields). */
export function frameNames(challenge) {
  return [
    'front',
    ...challenge.colours.flatMap((_, i) => [`dark_${i}`, `flash_${i}`]),
    ...challenge.turns,
    'front_end',
  ];
}
