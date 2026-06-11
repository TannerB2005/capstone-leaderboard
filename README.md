# Alan Wire Carrier Scorecard

A freight carrier performance dashboard
created for Alan Wire
that ingests shipment data and surfaces comparative metrics (cost accuracy and service reliability), across all carriers in a single view.

**[Live Demo](https://mdcurt.github.io/alan-wire-carrier-scorecard/)**

---

## What it does

Logistics teams quote shipments with carriers and later receive the actual invoice. Delivery windows are promised and either met or missed. This tool answers two questions for every carrier:

- **Cost accuracy** — How closely do actual charges match quoted prices? Who over-charges, and by how much?
- **Service reliability** — How often do shipments arrive on time? Are delays systematic or occasional?

Carriers are ranked by a composite score combining both dimensions so the best and worst performers surface immediately.

## Features

- **Overview table** — sortable, searchable, paginated carrier leaderboard with rank score, over-charge rate, avg cost delta, shipment count, and avg transit delta
- **Cost delta chart** — daily quote vs. actual charges with delta trend line
- **Service delta chart** — daily expected vs. actual transit days
- **Shipments chart** — volume per carrier (overview) or per week (carrier drill-down)
- **Filters** — truck type (LTL / TL), date presets (Today / 7D / 30D / All), custom date range, and per-carrier drill-down

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Angular 19 (standalone components, signals) |
| Language | TypeScript 5.7 (strict mode) |
| Charts | angular-google-charts |
| CSV parsing | PapaParse |
| Tests | Karma + Jasmine |
| CI/CD | GitHub Actions → GitHub Pages |

## Getting started

```bash
# Install dependencies
npm install

# Start the dev server
npm start
```

Open **http://localhost:4200** in your browser. The app hot-reloads on file save.

## Running tests

```bash
npm test
```

33 tests covering the metrics engine (`ScorecardService`), CSV parsing (`CsvService`), and reactive state (`ScorecardStore`).

## Building for production

```bash
ng build --configuration production
```

Output is written to `dist/alanwire-capstone/browser/`.

## Deployment

The `master` branch auto-deploys to GitHub Pages via the included [GitHub Actions workflow](.github/workflows/deploy.yml). Every push to `master` triggers a production build and publishes to:

```
https://mdcurt.github.io/alan-wire-carrier-scorecard/
```

To deploy manually:

```bash
ng build --configuration production --base-href /alan-wire-carrier-scorecard/
npx angular-cli-ghpages --dir=dist/alanwire-capstone/browser
```

## Project structure

```
src/
├── app/                  # Root component and app config
├── components/
│   ├── dashboard/        # Layout shell
│   ├── overview-panel/   # Carrier leaderboard table
│   └── charts/           # Cost delta, service delta, shipments charts
├── models/               # TypeScript interfaces (CSV rows, scorecard metrics)
├── services/
│   ├── csvparser.service # HTTP fetch + PapaParse CSV parsing
│   └── scorecard.service # Metrics computation (pure function)
├── stores/
│   └── scorecard.store   # Centralized reactive state (Angular signals)
└── data/raw/             # Sample CSV files (carriers, quotes, deliveries)
```

## Data format

The app reads three CSV files from `src/data/raw/`:

**Carriers.csv** — carrier lookup
```
TrnspCode, CarrierName, TruckType
```

**QUOTESvsACTUAL.csv** — quoted vs. invoiced amounts
```
Quote Date, Carrier, Weight, Quote, Amount
```

**deliveries.csv** — transit time records
```
carrier, pickup, delivery, expected_delivery
```

To use your own data, replace these files and run `npm start`.
