import { useRef } from 'react';
import { cn } from '@/lib/utils.js';
import { highlight } from '@/lib/highlight.js';

// Line box height in px for the 14 px system monospace. Every layer (gutter,
// highlight, textarea) uses exactly this so they stay pixel-aligned.
const LINE = 22;

/**
 * A plain-text code editor with a line-number gutter and syntax highlighting.
 *
 * No heavy editor dependency: the highlight is an overlay. A coloured layer sits
 * behind a textarea whose own text is transparent — the textarea handles typing,
 * the caret and selection, while the overlay shows the colours.
 *
 * The overlay renders one FIXED-HEIGHT block per line. That is the important bit:
 * a textarea always draws each row at exactly line-height, but a <pre> lets a tall
 * glyph (a colour emoji, whose fallback font is taller than the text font) stretch
 * its line — which would drift the colours away from the caret and clip the bottom
 * lines. Clamping every overlay line to LINE px keeps it locked to the textarea.
 */
export function CodeEditor({ value, onChange, readOnly = false, language = 'jsonc', label, className }) {
  const taRef = useRef(null);
  const preRef = useRef(null);
  const gutterRef = useRef(null);

  const lineHtmls = highlight(value, language).split('\n');
  const lineCount = lineHtmls.length;

  const sync = () => {
    const ta = taRef.current;
    if (!ta) return;
    if (preRef.current) { preRef.current.scrollTop = ta.scrollTop; preRef.current.scrollLeft = ta.scrollLeft; }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  };

  const TYPO = 'font-mono text-[0.875rem]';
  const rowStyle = { height: LINE, lineHeight: `${LINE}px` };

  return (
    <div className={cn('flex w-full min-w-0 overflow-hidden rounded-lg border-[1.5px] border-input bg-card focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ring', TYPO, className)}>
      <div
        ref={gutterRef}
        aria-hidden="true"
        className={cn('shrink-0 select-none overflow-hidden border-r bg-muted py-2 pr-2.5 pl-3 text-right text-muted-foreground tabular-nums', TYPO)}
      >
        {Array.from({ length: lineCount }, (_, i) => <div key={i} style={rowStyle}>{i + 1}</div>)}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <pre
          ref={preRef}
          aria-hidden="true"
          className={cn('pointer-events-none absolute inset-0 m-0 overflow-hidden px-3 py-2', TYPO)}
        >
          {lineHtmls.map((lh, i) => (
            <div
              key={i}
              style={rowStyle}
              className="w-max overflow-hidden whitespace-pre"
              dangerouslySetInnerHTML={{ __html: lh || ' ' }}
            />
          ))}
        </pre>
        <textarea
          ref={taRef}
          value={value}
          readOnly={readOnly}
          onChange={e => onChange(e.target.value)}
          onScroll={sync}
          spellCheck={false}
          aria-label={label}
          wrap="off"
          style={{ lineHeight: `${LINE}px` }}
          className={cn(
            'absolute inset-0 resize-none overflow-auto whitespace-pre bg-transparent px-3 py-2 text-transparent caret-foreground outline-none selection:bg-primary-text/25',
            TYPO,
          )}
        />
      </div>
    </div>
  );
}
