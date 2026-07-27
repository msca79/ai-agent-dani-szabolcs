import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './render-markdown';

describe('renderMarkdown', () => {
  it('should render bold text', () => {
    expect(renderMarkdown('Ez **fontos** infó.')).toEqual('<p>Ez <strong>fontos</strong> infó.</p>');
  });

  it('should render italic text', () => {
    expect(renderMarkdown('Ez *kiemelt* szó.')).toEqual('<p>Ez <em>kiemelt</em> szó.</p>');
  });

  it('should render inline code', () => {
    expect(renderMarkdown('Használd a `run_sql` tool-t.')).toEqual('<p>Használd a <code>run_sql</code> tool-t.</p>');
  });

  it('should render an unordered list', () => {
    expect(renderMarkdown('- Sushi Go!\n- Love Letter')).toEqual('<ul><li>Sushi Go!</li><li>Love Letter</li></ul>');
  });

  it('should render an ordered list', () => {
    expect(renderMarkdown('1. Sushi Go!\n2. Love Letter')).toEqual('<ol><li>Sushi Go!</li><li>Love Letter</li></ol>');
  });

  it('should join consecutive non-list lines into one paragraph with line breaks', () => {
    expect(renderMarkdown('Első sor.\nMásodik sor.')).toEqual('<p>Első sor.<br>Második sor.</p>');
  });

  it('should split on blank lines into separate paragraphs', () => {
    expect(renderMarkdown('Első bekezdés.\n\nMásodik bekezdés.')).toEqual(
      '<p>Első bekezdés.</p><p>Második bekezdés.</p>',
    );
  });

  it('should render a paragraph followed by a list', () => {
    expect(renderMarkdown('Két jó választás:\n- Sushi Go!\n- Love Letter')).toEqual(
      '<p>Két jó választás:</p><ul><li>Sushi Go!</li><li>Love Letter</li></ul>',
    );
  });

  it('should escape raw HTML instead of rendering it, to stay XSS-safe', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toEqual('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('should return an empty string for empty input', () => {
    expect(renderMarkdown('')).toEqual('');
  });

  it('should not treat a lone asterisk as italic markup', () => {
    expect(renderMarkdown('5 * 3 = 15')).toEqual('<p>5 * 3 = 15</p>');
  });
});
