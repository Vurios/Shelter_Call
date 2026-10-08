import { describe, it, expect } from 'vitest';
import { rateHint, stamp } from '../../src/ui/shelter/view.js';
import { stats } from '../../src/core/data.js';

describe('journal scientific presentation', () => {
  it('keeps missing rates unknown and renders the archive association rate without implying certainty', () => {
    expect(rateHint('B1.0', null)).toContain('no particle-rate estimate');
    expect(rateHint('B1.0', null)).not.toContain('0 in 100');
    expect(rateHint('X5.8', stats.flareSepRate.X)).toContain(
      'About 22 in 100 X-class',
    );
    expect(rateHint('X5.8', stats.flareSepRate.X)).toContain('not a promise');
  });
  it('escapes source metadata in both hover tooltips and touch/keyboard details', () => {
    const html = stamp({
      source: 'GAME',
      donkiId: 'fixture<"&',
      utc: 'fixture>',
    });
    expect(html).toContain('fixture&lt;&quot;&amp;');
    expect(html).not.toContain('fixture<');
    expect(html).toContain('<summary title=');
    expect(html).toContain('<time>fixture&gt;</time>');
    expect(html).toContain('GAME · source');
  });
});
