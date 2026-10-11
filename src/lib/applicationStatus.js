// How far a client is with their loan application and requirements, for
// the admin pages. Works on one client from GET /api/admin/clients.

export const ID_TYPE_LABELS = {
  philsys: 'PhilSys ID',
  drivers_license: "Driver's License",
  passport: 'Passport',
};

export function applicationStage(application) {
  if (!application) return { key: 'not_started', label: 'Not started' };
  if (application.requiredFilled >= application.requiredTotal) return { key: 'complete', label: 'Form complete' };
  return {
    key: 'in_progress',
    label: `${application.requiredFilled} of ${application.requiredTotal} required fields`,
  };
}

export function documentsReady(checklist) {
  return checklist.total > 0 && checklist.requiredMissing === 0;
}

// --- face check (identity) ------------------------------------------------------

// Why a face check failed, in words for bank staff.
export const IDENTITY_REASONS = {
  no_face: 'No clear face in the picture',
  several_faces: 'More than one face',
  not_straight: 'Not looking straight at the camera',
  turn_missing: 'Head turn not seen',
  flash_weak: 'Screen light too weak to judge',
  flash_mismatch: "Flash colours didn't show on the face (possible video)",
  not_real: 'Looked like a photo or a screen',
  different_person: 'Face changed during the check',
  no_match: "Face didn't match the ID photo",
};

export function identityStage(identity) {
  if (identity?.verifiedAt) return { key: 'verified', label: 'Verified' };
  if (identity?.locked) return { key: 'locked', label: 'Failed — locked today' };
  if (identity?.failedToday) return { key: 'failed', label: `${identity.failedToday} failed today` };
  return { key: 'none', label: 'Not done' };
}
