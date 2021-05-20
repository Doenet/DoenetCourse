export function sizeToCSS(size) {
  let cssSize = null;

  if (size) {
    cssSize = size.size;
    if (size.isAbsolute) {
      cssSize += 'px';
    } else {
      cssSize += '%';
    }
  }
  return cssSize;
}
