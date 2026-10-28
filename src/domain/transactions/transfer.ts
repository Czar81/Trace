import { Envelope } from '../../types';
import { translateActive } from '../../i18n';

/** Translated error for an invalid transfer, or null when it's valid. */
export function validateTransfer(envelopes: Envelope[], envelopeId: string, toEnvelopeId: string | undefined): string | null {
  if (envelopeId === toEnvelopeId) return translateActive('transfer.error.sameEnvelope');
  const source = envelopes.find(e => e.id === envelopeId);
  const destination = envelopes.find(e => e.id === toEnvelopeId);
  if (!source || !destination) return translateActive('transfer.error.envelopeNotFound');
  if (source.currency !== destination.currency) return translateActive('transfer.error.currencyMismatch');
  return null;
}
