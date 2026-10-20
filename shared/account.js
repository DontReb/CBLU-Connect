// Account rules shared by the website (to explain them as the user types)
// and the server (which is what actually enforces them).

// 72 is bcrypt's limit: it ignores anything past 72 bytes, so a longer
// password would silently be only partly checked.
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 72,
};

export const PASSWORD_HINT = 'At least 8 characters, with at least one letter and one number.';

// Returns what's wrong with a chosen password, or '' if it's fine.
// `email` (optional) stops the password from being the email itself.
export function passwordProblem(password, email = '') {
  if (typeof password !== 'string' || password.length < PASSWORD_RULES.minLength) {
    return `Use at least ${PASSWORD_RULES.minLength} characters.`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_RULES.maxLength) {
    return `Use at most ${PASSWORD_RULES.maxLength} characters.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Use at least one letter and one number.';
  }
  if (email && password.trim().toLowerCase() === email.trim().toLowerCase()) {
    return "Don't use your email address as your password.";
  }
  return '';
}

// Philippine mobile numbers as people type them: 09171234567,
// 0917 123 4567, +63 917 123 4567.
export const PHONE_PATTERN = /^\+?[0-9][0-9 -]{6,18}$/;
export const PHONE_MESSAGE = 'Enter a valid mobile number, e.g. 0917 123 4567.';
