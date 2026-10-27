import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DateField } from './DateField';

jest.mock('lucide-react-native', () => ({ Calendar: () => null }));
jest.mock('../../context/LanguageContext', () => ({
  useTranslation: () => ({ locale: 'es-ES' }),
}));
jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => {
    const { THEMES, DEFAULT_THEME_ID } = require('../../theme/colors');
    return { colors: THEMES[DEFAULT_THEME_ID].colors };
  },
}));

describe('DateField', () => {
  it('invokes onChange with the date from a pressed quick option', async () => {
    const onChange = jest.fn();
    const yesterday = new Date(2026, 0, 14);
    await render(
      <DateField
        value={new Date(2026, 0, 15)}
        onChange={onChange}
        quickOptions={[
          { label: 'Hoy', getDate: () => new Date(2026, 0, 15) },
          { label: 'Ayer', getDate: () => yesterday },
        ]}
      />,
    );
    await fireEvent.press(screen.getByText('Ayer'));
    expect(onChange).toHaveBeenCalledWith(yesterday);
  });

  it('shows the formatted date', async () => {
    await render(<DateField value={new Date(2026, 0, 15)} onChange={jest.fn()} />);
    expect(screen.getByText('15 de enero de 2026')).toBeTruthy();
  });

  it('shows the placeholder when there is no value', async () => {
    await render(<DateField placeholder="Desde" onChange={jest.fn()} />);
    expect(screen.getByText('Desde')).toBeTruthy();
  });

  it('calls a quick option onSelect instead of onChange', async () => {
    const onChange = jest.fn();
    const onSelect = jest.fn();
    const date = new Date(2026, 0, 9);
    await render(
      <DateField placeholder="Desde" onChange={onChange} quickOptions={[{ label: 'Últimos 7 días', getDate: () => date, onSelect }]} />,
    );
    await fireEvent.press(screen.getByText('Últimos 7 días'));
    expect(onSelect).toHaveBeenCalledWith(date);
    expect(onChange).not.toHaveBeenCalled();
  });
});
