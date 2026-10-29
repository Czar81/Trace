import React, { useMemo } from 'react';
import { Dropdown } from './Dropdown';
import { Currency } from '../../types';
import { CURRENCIES, currencyLabel } from '../../domain/shared/currencies';
import { useTranslation } from '../../context/LanguageContext';

interface CurrencySelectorProps {
  label?: string;
  value: Currency;
  onSelect: (currency: Currency) => void;
  compact?: boolean;
}

/** Searchable currency picker over every supported currency (see domain/shared/currencies). */
export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ label, value, onSelect, compact }) => {
  const { language } = useTranslation();
  const options = useMemo(
    () => CURRENCIES.map(c => ({ label: currencyLabel(c.code, language), value: c.code })),
    [language],
  );
  const entry = CURRENCIES.find(c => c.code === value);
  return (
    <Dropdown
      label={label}
      options={options}
      value={value}
      onSelect={v => onSelect(v as Currency)}
      searchable
      compact={compact}
      compactLabel={entry ? `${entry.symbol} ${entry.code}` : value}
    />
  );
};
