// Comment-preserving edits on a JSONC document.
//
// The form editor never re-serializes the whole config object — that would strip
// every // comment, and those comments are the field help texts. Instead each
// field change is a surgical text patch at a JSONPath, applied via jsonc-parser's
// modify()/applyEdits(). Comments, key order and whitespace of any untouched part
// of the file stay byte-for-byte intact.
//
// The raw `content` string stays the single source of truth: the form reads from
// safeParse(content) and writes back into content through these helpers.

import { modify, applyEdits, parse } from 'jsonc-parser';

// Match the 2-space indentation used throughout the example config files.
const FORMAT = { tabSize: 2, insertSpaces: true, eol: '\n' };

/** Replace the value at `path`, preserving surrounding comments/formatting. */
export function editValue(content, path, value) {
  return applyEdits(content, modify(content, path, value, { formattingOptions: FORMAT }));
}

/** Append `item` to the array at `arrayPath` (inserted at the current length, so
 *  an existing element is never overwritten). New elements carry no comments. */
export function appendArrayItem(content, arrayPath, item) {
  const arr = getAtPath(safeParse(content), arrayPath);
  const index = Array.isArray(arr) ? arr.length : 0;
  const edits = modify(content, [...arrayPath, index], item, {
    formattingOptions: FORMAT,
    isArrayInsertion: true,
  });
  return applyEdits(content, edits);
}

/** Remove the element at `arrayPath[index]`. Passing `undefined` makes
 *  jsonc-parser delete it and fix up the surrounding commas. */
export function removeArrayItem(content, arrayPath, index) {
  return applyEdits(content, modify(content, [...arrayPath, index], undefined, { formattingOptions: FORMAT }));
}

/** Parse tolerantly (comments + trailing commas). Returns undefined on hard failure. */
export function safeParse(content) {
  try {
    return parse(content, [], { allowTrailingComma: true });
  } catch {
    return undefined;
  }
}

/** Traverse a parsed model along a JSONPath. Returns undefined if any step misses. */
export function getAtPath(model, path) {
  let current = model;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}
