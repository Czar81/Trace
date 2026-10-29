import { SETTINGS_SECTIONS } from './settingsSections';
import { es } from '../../i18n/es';
import { en } from '../../i18n/en';

describe('SETTINGS_SECTIONS', () => {
  const ids = SETTINGS_SECTIONS.flatMap(section => section.items);

  it('places each setting in exactly one section', () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has the six grouped sections in order', () => {
    expect(SETTINGS_SECTIONS.map(s => s.id)).toEqual(['general', 'finance', 'tools', 'alerts', 'security', 'data']);
  });

  it('keeps automatic backups behind the single sub-screen', () => {
    const data = SETTINGS_SECTIONS.find(s => s.id === 'data');
    expect(data?.items).toEqual(['dataBackups']);
  });

  it('has Spanish and English titles for every section', () => {
    for (const section of SETTINGS_SECTIONS) {
      expect((es as Record<string, string>)[section.titleKey]).toBeTruthy();
      expect((en as Record<string, string>)[section.titleKey]).toBeTruthy();
    }
  });
});
