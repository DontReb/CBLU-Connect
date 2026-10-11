// Head turn from YuNet's five landmarks — shared by the browser and server.
//
// On a real head, the nose sticks out in front of the eyes, so when the
// person turns, the nose tip moves sideways relative to the point between
// the eyes. The sideways shift divided by the distance between the eyes
// gives a turn value that doesn't depend on how close the face is:
//   about 0     looking straight at the camera
//   about ±0.2  turned roughly 30°
// A flat photo tilted in front of the camera barely changes this value,
// because a photo has no depth.
//
// Frames are the camera's own pictures (not mirrored), so the person's left
// is on the image's right: turning to THEIR left moves the nose to the
// image's right and gives a POSITIVE value.

export const TURN = {
  // Browser: the client has turned far enough to take the picture.
  captureAt: 0.16,
  // Server: smallest turn accepted in a "look left/right" picture.
  minimum: 0.1,
  // Both: largest turn accepted in a "look straight" picture.
  straightMax: 0.12,
};

/**
 * @param {number[][]} landmarks  YuNet order: right eye, left eye, nose, right mouth, left mouth
 * @returns {number} positive = turned to the person's left, negative = to their right
 */
export function headTurn(landmarks) {
  const [rightEye, leftEye, nose] = landmarks;
  const eyeMidX = (rightEye[0] + leftEye[0]) / 2;
  const eyeDistance = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]);
  if (eyeDistance < 1) return 0;
  return (nose[0] - eyeMidX) / eyeDistance;
}

/** 'left' | 'right' | 'straight' | null (in between) — from the person's point of view. */
export function turnDirection(turn, threshold = TURN.captureAt) {
  if (turn >= threshold) return 'left';
  if (turn <= -threshold) return 'right';
  if (Math.abs(turn) <= TURN.straightMax) return 'straight';
  return null;
}
