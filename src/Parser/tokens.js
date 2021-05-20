import { ExternalTokenizer, ContextTracker } from 'lezer';
import {
  startTag as _startTag,
  startCloseTag,
  mismatchedStartCloseTag,
  incompleteStartCloseTag,
  Element,
  OpenTag,
  commentContent as _commentContent,
  cdataContent as _cdataContent,
} from './doenet.terms.js';

function nameChar(ch) {
  return (
    ch == 45 ||
    ch == 46 ||
    ch == 58 ||
    (ch >= 65 && ch <= 90) ||
    ch == 95 ||
    (ch >= 97 && ch <= 122) ||
    ch >= 161
  );
}

function isSpace(ch) {
  return ch == 9 || ch == 10 || ch == 13 || ch == 32;
}

let cachedName = null,
  cachedInput = null,
  cachedPos = 0;
function tagNameAfter(input, pos) {
  if (cachedPos == pos && cachedInput == input) return cachedName;
  let next = input.get(pos);
  while (isSpace(next)) next = input.get(++pos);
  let start = pos;
  while (nameChar(next)) next = input.get(++pos);
  // Undefined to signal there's a <? or <!, null for just missing
  cachedInput = input;
  cachedPos = pos;
  return (cachedName =
    pos > start ? input.read(start, pos).toLowerCase() : null);
}

function ElementContext(name, parent) {
  this.name = name;
  this.parent = parent;
  this.hash = parent ? parent.hash : 0;
  for (let i = 0; i < name.length; i++)
    this.hash +=
      (this.hash << 4) + name.charCodeAt(i) + (name.charCodeAt(i) << 8);
}

export const elementContext = new ContextTracker({
  start: null,
  shift(context, term, input, stack) {
    return term == _startTag
      ? new ElementContext(tagNameAfter(input, stack.pos) || '', context)
      : context;
  },
  reduce(context, term) {
    return term == Element && context ? context.parent : context;
  },
  reuse(context, node, input, stack) {
    let type = node.type.id;
    return type == _startTag || type == OpenTag
      ? new ElementContext(
          tagNameAfter(input, stack.pos - node.length + 1) || '',
          context,
        )
      : context;
  },
  hash(context) {
    return context ? context.hash : 0;
  },
  strict: false,
});

export const startTag = new ExternalTokenizer((input, token, stack) => {
  let pos = token.start;
  if (input.get(pos++) != 60 /* '<' */) return;
  let next = input.get(pos);
  if (next == 47 /* '/' */) {
    pos++;
    let name = tagNameAfter(input, pos);
    if (!name) return token.accept(incompleteStartCloseTag, pos);
    if (stack.context && name == stack.context.name)
      return token.accept(startCloseTag, pos);
    for (let cx = stack.context; cx; cx = cx.parent)
      if (cx.name == name) return;
    token.accept(mismatchedStartCloseTag, pos);
  } else if (next != 33 /* '!' */ && next != 63 /* '?' */) {
    return token.accept(_startTag, pos);
  }
});

function scanTo(type, end) {
  return new ExternalTokenizer((input, token) => {
    let pos = token.start,
      endPos = 0;
    for (;;) {
      let next = input.get(pos);
      if (next < 0) break;
      pos++;
      if (next == end.charCodeAt(endPos)) {
        endPos++;
        if (endPos == end.length) {
          pos -= end.length;
          break;
        }
      } else {
        endPos = 0;
      }
    }
    if (pos > token.start) token.accept(type, pos);
  });
}

export const commentContent = scanTo(_commentContent, '-->');
export const cdataContent = scanTo(_cdataContent, '?>');
