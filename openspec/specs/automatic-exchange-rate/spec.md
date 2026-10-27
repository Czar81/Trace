## Purpose

Keeps the USD and EUR exchange rates against CRC up to date without manual typing.

## Requirements

### Requirement: Fetch rates from open.er-api.com
The currency settings SHALL offer a button that fetches `https://open.er-api.com/v6/latest/USD` and stores `USD_TO_CRC` and `EUR_TO_CRC` (EUR derived as CRC/EUR), plus `exchangeRatesUpdatedAt`. Failures SHALL show an error and leave the saved rates unchanged. Manual editing remains available.

### Requirement: Respect provider limits
Manual refreshes SHALL be refused within 5 minutes of the last update (new rates are published once a day), and the screen SHALL show the "Rates By Exchange Rate API" attribution linking to https://www.exchangerate-api.com.

### Requirement: Optional automatic refresh
When `autoExchangeRates` is on (off by default), the app SHALL refresh the rates in the background on start if they are older than 12 hours, silently keeping the saved rates on any failure.
