## Purpose

Keeps the USD and EUR exchange rates against CRC up to date without manual typing.

## Requirements

### Requirement: Fetch rates from open.er-api.com
The currency settings SHALL offer a button that fetches `https://open.er-api.com/v6/latest/USD` and stores `USD_TO_CRC` and `EUR_TO_CRC` (EUR derived as CRC/EUR), plus `exchangeRatesUpdatedAt`. Failures SHALL show an error and leave the saved rates unchanged. Manual editing remains available.

### Requirement: Optional automatic refresh
When `autoExchangeRates` is on (off by default), the app SHALL refresh the rates in the background on start if they are older than 12 hours, silently keeping the saved rates on any failure.
