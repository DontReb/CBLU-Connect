// Privacy notice settings shared by the website and the server, under the
// Data Privacy Act of 2012 (RA 10173) and NPC Circular 2023-04 (consent).
//
// PRIVACY_NOTICE_VERSION: change it whenever the notice changes in a way
// clients should agree to again (new data, new purpose, new recipient).
// Every client is then asked again on their next visit. Fixing a typo
// doesn't need a new version.

export const PRIVACY_NOTICE_VERSION = '2026-10-16';

// The two things a client can agree to, separately (consent must be
// specific to each purpose, and each can be withdrawn on its own).
export const CONSENT_PURPOSES = {
  // Needed to use the client portal at all: the loan form asks for
  // sensitive personal information (age, civil status, TIN, ID numbers),
  // which needs consent given beforehand (RA 10173, Sec. 13a).
  portal: {
    title: 'Using the client portal',
    statement:
      'I have read the Privacy Notice. I agree that Cooperative Bank of La Union may collect, use and keep my personal information, including sensitive personal information such as my age, civil status and TIN, to prepare and process my loan application, as described in the notice.',
  },
  // Optional: the client can type the form by hand instead.
  id_face: {
    title: 'ID scan and face check',
    statement:
      'I agree to have the photo of my ID read to fill in my form, and to a live face check with my camera that compares my face with the ID photo and checks that I am really there. The pictures are only checked, never saved.',
  },
};

// Who to contact about privacy. Fill in `dpoName` and `dpoEmail` once CBLU
// names its Data Protection Officer; empty values are simply not shown.
export const PRIVACY_CONTACT = {
  controller: 'Cooperative Bank of La Union',
  dpoName: '',
  dpoEmail: '',
  address: 'Dona Torilba Aspiras Road, Consolacion, Agoo, La Union',
  phone: '(072) 521-0006',
};
