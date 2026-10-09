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
