// @ts-nocheck - reads source files via Node APIs
import { es } from '../../i18n/es';
import { en } from '../../i18n/en';

const fs = require('fs');
const path = require('path');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx$/.test(e.name) ? [path.join(dir, e.name)] : []);

const keysUsedBy = (dirs) => dirs
  .flatMap(d => walk(path.join(__dirname, '..', '..', d)))
  .flatMap(f => [...fs.readFileSync(f, 'utf8').matchAll(/["'](help\.\w+\.(?:title|body))["']/g)])
  .map(m => m[1]);

describe('screen help', () => {
  const usages = keysUsedBy(['screens', 'components/layout']);

  it('covers every screen that shows a help icon', () => {
    // 13 screens, a title and a body each
    expect(usages).toHaveLength(26);
  });

  it('has es and en text for every help title and body', () => {
    for (const key of usages) {
      expect([key, es[key]?.length > 0]).toEqual([key, true]);
      expect([key, en[key]?.length > 0]).toEqual([key, true]);
    }
  });
});
