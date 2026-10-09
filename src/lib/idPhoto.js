// Shrinks an ID photo in the browser before it is uploaded for scanning.
//
// - Phone photos are often 3–6 MB; Vercel refuses request bodies over
//   4.5 MB, and OCR gains nothing from more than ~2000 px.
// - Redrawing the photo turns anything the browser can open (including an
//   iPhone HEIC photo in Safari) into a plain JPEG, and drops the photo's
//   hidden metadata, such as the GPS location it was taken at.
// - Browsers apply the photo's rotation when drawing it, so it arrives upright.

const MAX_SIDE = 2000;

export const UNREADABLE_PHOTO_MESSAGE =
  "That file couldn't be opened as a photo. Please choose a JPG or PNG photo of your ID.";

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(UNREADABLE_PHOTO_MESSAGE));
    image.src = url;
  });
}

/** @returns {Promise<File>} a JPEG no larger than 2000 px on its longest side */
export async function prepareIdPhoto(file, name) {
  if (!file.type.startsWith('image/') && file.type !== '') {
    throw new Error(UNREADABLE_PHOTO_MESSAGE);
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff'; // transparent PNGs would otherwise turn black
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error(UNREADABLE_PHOTO_MESSAGE);
    return new File([blob], name, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}
