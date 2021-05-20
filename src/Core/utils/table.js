// Convert letter string or number index starting with 1)
// to number index starting with 0
// (Author can index tables with the letter/1-based number system
// while the internals of the code use a 0-based number system)
export function normalizeIndex(numberOrLetter) {
  if (numberOrLetter === null) {
    return undefined;
  }

  if (numberOrLetter === '') {
    return undefined;
  }

  if (Number.isFinite(Number(numberOrLetter))) {
    return Number(numberOrLetter) - 1;
  }

  if (typeof numberOrLetter !== 'string') {
    return undefined;
  }

  return lettersToNumber(numberOrLetter);
}

// convert letter combinations to 0-based number
export function lettersToNumber(letters) {
  letters = letters.toUpperCase();
  let number = 0,
    len = letters.length,
    pos = len;
  while ((pos -= 1) > -1) {
    let numForLetter = letters.charCodeAt(pos) - 64;
    if (numForLetter < 1 || numForLetter > 26) {
      console.warn('Cannot convert ' + letters + ' to a number');
      return undefined;
    }
    number += numForLetter * Math.pow(26, len - 1 - pos);
  }
  number--;
  return number;
}
