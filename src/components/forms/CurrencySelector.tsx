import React, { useMemo } from 'react';
import { Dropdown } from './Dropdown';
import { Currency } from '../../types';
import { CURRENCIES, currencyLabel } from '../../domain/shared/currencies';
import { useTranslation } from '../../context/LanguageContext';

interface CurrencySelectorProps {
  label?: string;
  value: Currency;
  onSelect: (currency: Currency) => void;
}

/** Searchable currency picker over every supported currency (see domain/shared/currencies). */
export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ label, value, onSelect }) => {
  const { language } = useTranslation();
  const options = useMemo(
    () => CURRENCIES.map(c => ({ label: currencyLabel(c.code, language), value: c.code })),
    [language],
  );
  return <Dropdown label={label} options={options} value={value} onSelect={v => onSelect(v as Currency)} searchable />;
};
