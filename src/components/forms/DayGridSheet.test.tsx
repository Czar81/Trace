import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DayGridSheet } from './DayGridSheet';

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => {
    const { THEMES, DEFAULT_THEME_ID } = require('../../theme/colors');
    return { colors: THEMES[DEFAULT_THEME_ID].colors };
  },
}));

describe('DayGridSheet', () => {
  it('renders the 31 days', async () => {
    await render(<DayGridSheet visible title="Día de corte" value={1} onSelect={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('31')).toBeTruthy();
  });

  it('selects a day and closes', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await render(<DayGridSheet visible title="Día de corte" value={1} onSelect={onSelect} onClose={onClose} />);
    await fireEvent.press(screen.getByText('25'));
    expect(onSelect).toHaveBeenCalledWith(25);
    expect(onClose).toHaveBeenCalled();
  });
});
