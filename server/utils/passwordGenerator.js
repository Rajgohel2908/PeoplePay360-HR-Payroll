const crypto = require('crypto');

/**
 * Generates a cryptographically strong temporary password.
 * Guaranteed to contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.
 * @param {number} length Default 10
 * @returns {string}
 */
function generateRandomPassword(length = 10) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous I, O
  const lower = 'abcdefghijkmnopqrstuvwxyz'; // Exclude ambiguous l
  const digits = '23456789';                  // Exclude ambiguous 0, 1
  const symbols = '!@#$%&*';

  const allChars = upper + lower + digits + symbols;

  // Pick at least one from each category
  const guaranteed = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  const remainingLength = Math.max(0, length - guaranteed.length);
  const remaining = [];
  for (let i = 0; i < remainingLength; i++) {
    const idx = crypto.randomInt(0, allChars.length);
    remaining.push(allChars[idx]);
  }

  // Shuffle array using Fisher-Yates
  const combined = [...guaranteed, ...remaining];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}

/**
 * Generates a secure reset token (hex) or OTP code.
 */
function generateResetToken() {
  return crypto.randomBytes(24).toString('hex');
}

module.exports = {
  generateRandomPassword,
  generateResetToken,
};
