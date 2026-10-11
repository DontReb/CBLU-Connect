// The face check's decision. Two separate results:
//
//   Face verification — is the person at the camera the person on the ID?
//     SFace similarity between the ID photo and the "look straight" picture.
//
//   Liveness detection — is it a real, live person (not a printed photo or a
//   video on a screen)? All of these must hold:
//     • passive:  MiniFASNet says the straight-on pictures show a real face
//     • flash:    the face's colour followed the random flash sequence
//     • turns:    the head turned left and right, in the order asked
//     • same person in every picture (stops swapping a photo in and out)
//
// Nothing here stores images or face data; the caller gets scores only.
import { largestFace } from '../../shared/face/yunet.js';
import { headTurn, TURN } from '../../shared/face/pose.js';
import { detectFaces } from './detect.js';
import { faceFeature, cosineSimilarity } from './match.js';
import { realFaceScore } from './antispoof.js';
import { flashResponse, centreFaceRegion } from './flash.js';

export const THRESHOLDS = {
  // ID photo vs live face. 0.363 is OpenCV's suggested SFace threshold;
  // set FACE_MATCH_THRESHOLD after measuring on your own volunteers.
  match: numberFromEnv('FACE_MATCH_THRESHOLD', 0.363),
  // Same person across the pictures of one check (a turned head scores lower).
  sameSession: numberFromEnv('FACE_SESSION_THRESHOLD', 0.3),
  // MiniFASNet "real face" score, averaged over the two straight-on pictures.
  realFace: numberFromEnv('FACE_REAL_THRESHOLD', 0.5),
};

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && process.env[name] !== '' ? value : fallback;
}

// Failure reasons, most specific first. The API turns these into messages.
export const REASONS = {
  NO_FACE_ON_ID: 'no_face_on_id',
  NO_FACE: 'no_face',
  SEVERAL_FACES: 'several_faces',
  NOT_STRAIGHT: 'not_straight',
  TURN_MISSING: 'turn_missing',
  FLASH_WEAK: 'flash_weak',
  FLASH_MISMATCH: 'flash_mismatch',
  NOT_REAL: 'not_real',
  DIFFERENT_PERSON: 'different_person',
  NO_MATCH: 'no_match',
};

/**
 * @param {object} input
 * @param {object} input.idImage   RGB image of the ID's front
 * @param {Record<string, object>} input.frames  RGB images named as in frameNames()
 * @param {{ colours: string[], turns: string[] }} input.challenge
 * @returns {Promise<object>} { passed, faceVerified, live, reason, scores, liveness, processingMs }
 */
export async function checkIdentity({ idImage, frames, challenge }) {
  const started = performance.now();
  const result = (fields) => ({ ...fields, processingMs: Math.round(performance.now() - started) });

  // --- the ID photo
  const idFace = largestFace(await detectFaces(idImage, { scoreThreshold: 0.6 }));
  if (!idFace) {
    return result({ passed: false, faceVerified: false, live: false, reason: REASONS.NO_FACE_ON_ID, scores: {} });
  }
  const idFeature = await faceFeature(idImage, idFace);

  // --- one face in every picture
  const faces = {};
  for (const [name, img] of Object.entries(frames)) {
    const found = await detectFaces(img, { scoreThreshold: name.startsWith('flash_') || name.startsWith('dark_') ? 0.6 : 0.8 });
    faces[name] = found;
  }
  const keyFrames = ['front', 'front_end', ...challenge.turns];
  for (const name of keyFrames) {
    if (faces[name].length === 0) return result({ passed: false, faceVerified: false, live: false, reason: REASONS.NO_FACE, scores: { frame: name } });
    if (countBigFaces(faces[name]) > 1) return result({ passed: false, faceVerified: false, live: false, reason: REASONS.SEVERAL_FACES, scores: { frame: name } });
  }
  const main = (name) => largestFace(faces[name]);

  // --- face verification: ID vs the first straight-on picture
  const frontFeature = await faceFeature(frames.front, main('front'));
  const match = cosineSimilarity(idFeature, frontFeature);
  const faceVerified = match >= THRESHOLDS.match;

  // --- liveness
  const turns = Object.fromEntries(keyFrames.map((name) => [name, headTurn(main(name).landmarks)]));
  const straightOk = Math.abs(turns.front) <= TURN.straightMax * 1.5 && Math.abs(turns.front_end) <= TURN.straightMax * 1.5;
  const turnsOk = turns.left >= TURN.minimum && turns.right <= -TURN.minimum;

  const sameSession = {};
  for (const name of ['front_end', ...challenge.turns]) {
    sameSession[name] = cosineSimilarity(frontFeature, await faceFeature(frames[name], main(name)));
  }
  const sameSessionMin = Math.min(...Object.values(sameSession));
  const samePersonOk = sameSessionMin >= THRESHOLDS.sameSession;

  const realScores = [await realFaceScore(frames.front, main('front')), await realFaceScore(frames.front_end, main('front_end'))];
  const realFace = (realScores[0] + realScores[1]) / 2;
  const realOk = realFace >= THRESHOLDS.realFace;

  // The centre of the face in a flash picture. A dark or tinted picture can
  // be harder to read, so fall back to where the face was in another one.
  const regionIn = (name, fallbackName) => {
    const face = largestFace(faces[name]);
    if (face) return centreFaceRegion(face);
    return scaleRegion(centreFaceRegion(main(fallbackName)), frames[fallbackName], frames[name]);
  };
  const flash = flashResponse(
    challenge.colours.map((colour, i) => {
      const darkRegion = regionIn(`dark_${i}`, 'front');
      const litFace = largestFace(faces[`flash_${i}`]);
      return {
        colour,
        dark: frames[`dark_${i}`],
        lit: frames[`flash_${i}`],
        darkRegion,
        litRegion: litFace ? centreFaceRegion(litFace) : darkRegion,
      };
    })
  );

  const live = straightOk && turnsOk && samePersonOk && realOk && flash.ok;
  const reason = !straightOk ? REASONS.NOT_STRAIGHT
    : !turnsOk ? REASONS.TURN_MISSING
    : flash.weak ? REASONS.FLASH_WEAK
    : !flash.ok ? REASONS.FLASH_MISMATCH
    : !realOk ? REASONS.NOT_REAL
    : !samePersonOk ? REASONS.DIFFERENT_PERSON
    : !faceVerified ? REASONS.NO_MATCH
    : null;

  return result({
    passed: live && faceVerified,
    faceVerified,
    live,
    reason,
    scores: {
      match: round(match),
      realFace: round(realFace),
      flashMatches: flash.matches,
      flashTotal: flash.total,
      flashStrength: round(flash.strength),
      turnLeft: round(turns.left),
      turnRight: round(turns.right),
      sameSession: round(sameSessionMin),
    },
    liveness: { straightOk, turnsOk, samePersonOk, realOk, flashOk: flash.ok },
  });
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}

// Ignore tiny faces (a face on a poster behind the client) when counting.
function countBigFaces(faces) {
  const biggest = largestFace(faces);
  const area = biggest.box[2] * biggest.box[3];
  return faces.filter((f) => f.box[2] * f.box[3] >= area * 0.25).length;
}

// Regions are found in one picture but measured in another of possibly a
// different size (straight-on pictures are larger than the flash pictures).
function scaleRegion(region, from, to) {
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  return [region[0] * sx, region[1] * sy, region[2] * sx, region[3] * sy];
}
