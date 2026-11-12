# Payday Frontend (Showcase)

A standalone Next.js showcase of **Payday** — an income, paycheque, tax intelligence, and allocation tracking dashboard — powered by local mock data (`mock_data.json`) with no backend required.

## Features Showcased

- **Overview Dashboard**: Year-to-date income, annual goal tracking, monthly income breakdown, source distribution, and upcoming payday prediction.
- **Paycheques Ledger**: Full paycheque history with gross-to-net breakdowns, hours worked, notes, CSV export (`/api/export.csv`), and in-memory add/edit/delete.
- **Income Sources**: Job, government, and other income sources (including untaxed contractor sources with configurable tax reserve rates and archived sources).
- **Allocations**: Largest-remainder cent-exact allocation engine across Essentials, Investments, Savings, and Lifestyle buckets, plus one-click presets (`50-30-20`, `student-coop`, `aggressive-saver`).
- **Tax Intelligence**: Gross-to-net retention analysis, explicit tax/deductions tracking, and contractor tax reserve calculations.

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
