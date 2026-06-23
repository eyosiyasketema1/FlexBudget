# FlexBudget

Local-first personal flex-budgeting app. React Native + TypeScript, on-device SQLite (WatermelonDB). No server, no account — all data stays on the device.

Built phase-by-phase from `FlexBudget-Build-Plan.md`.

## Status by phase

| Phase | Scope | State |
|---|---|---|
| 0 | Project foundation, navigation skeleton, theme | ✅ Done |
| 1 | Local DB schema + migrations + models; pure calculation engine (unit-tested); core single-month UI (income & budget CRUD, live totals) | ✅ Done |
| 2 | Multi-month timeline, copy-baseline-forward, lock/close-out, archive-on-delete, restore | ✅ Done |
| 3 | Comparison / delta matrix (budget-vs-actual + month-vs-month, color-coded variance) | ✅ Done |
| 4 | Smart rollover, predictive runway, 50/30/20 benchmark overlay, encrypted backups | ✅ Done |
| 5 | Hardening (edge-case tests + guards), accessibility, backup round-trip test | ✅ Done |

## Run it

This is real source. To launch on a device/simulator you need the native toolchain (Xcode / Android Studio) since WatermelonDB and React Native require it.

```bash
npm install
npx expo prebuild          # generates native projects (WatermelonDB needs a dev build)
npm run ios                # or: npm run android
npm test                   # runs the calculation-engine unit tests
npm run typecheck          # tsc --noEmit
```

> WatermelonDB uses native SQLite + JSI, so plain Expo Go won't work — use a dev build (`expo prebuild` + run). For a quick no-native spike you can swap the adapter in `src/db/index.ts` to `expo-sqlite`.

## Architecture at a glance

```
src/
  db/            WatermelonDB: schema (v2), migrations, models, seed, local SQLite adapter
  calc/          Pure calculation engine + types + tests (no DB, no React — fully unit-tested)
  data/          Bridge layer: snapshot loader, useMonth/useHistory hooks, repository, backup
  state/         ActiveMonth context (which month is being viewed)
  screens/       Timeline (home), Budget, Comparison, Insights, Settings + forms/
  components/    Card, Button, Field, TotalsHeader, VarianceBadge, MonthBanner
  utils/         money (integer-cents helpers), date (month_year helpers)
  theme/         design tokens
```

### Core design rules
- **Money is always integer cents.** Conversion/formatting is isolated to `utils/money.ts`. No float arithmetic on amounts.
- **Months are isolated** by a `month_year` string (`"2026-06"`) on every row. Switching months filters by that key.
- **Delete = archive.** Nothing user-facing is hard-deleted; `is_archived` keeps history intact and totals exclude archived rows. A true purge lives only in Settings (restore is offered there).
- **Live totals fall out of the data.** `useMonth` observes every relevant table; any change re-runs the pure engine — the real-time calculation matrix with zero manual recompute.
- **The calc engine is decoupled** from the DB so it stays pure and testable (`npm test`).

## The calculation matrix (Section 3 of the spec)

Implemented in `src/calc/engine.ts`, verified against the spec's sample data in `src/calc/engine.test.ts`:

```
totalIncome      = Σ income.amount
totalBudgeted    = Σ item.budget_cap        (non-archived)
totalActual      = Σ item.actual_spent      (non-archived)
expectedSavings  = totalIncome - totalBudgeted
actualNetSaved   = totalIncome - totalActual
itemVariance     = budget_cap - actual_spent   (>0 saved, <0 over)
```

## Phase 4 features (done)
- **Smart rollover** — opt in per item (toggle in the item form). On copy-forward, unspent rolls into next month as a credit, overspend as a debt (`rollover_cents`). The engine raises/lowers that item's *effective* budget accordingly (`itemVariance`, `rolloverCarry`).
- **Predictive runway** — `computeRunway` averages the last 3 months' actual spend and divides accumulated net savings by it → "X months of runway" on the Insights tab.
- **50/30/20 benchmark** — tag categories Needs/Wants/Savings (category form); the Insights tab shows actuals vs the 50/30/20 targets with a savings-rate readout (`computeBenchmark`).
- **Encrypted backup** — `src/data/backup.ts` serializes the whole DB → AES-encrypts with a passphrase (crypto-js) → writes a `.fbk` file and opens the share sheet. Import decrypts, confirms, and rebuilds the DB. No cloud.

## Phase 5 hardening (done)
- **Edge-case tests** (`src/calc/edgecases.test.ts`) — empty months, negative savings, very large amounts, empty/archived categories, deleting the last item, rollover debt pushing the effective budget negative. All guarded against `NaN`/divide-by-zero.
- **Backup round-trip test** (`src/data/backupCodec.test.ts`) — encrypt → decrypt equality, ciphertext doesn't leak plaintext, wrong passphrase and non-FlexBudget files are rejected. The pure codec was split out of `backup.ts` into `backupCodec.ts` so it's testable without Expo.
- **Accessibility** — roles, labels, and state on buttons, inputs, month chips, and budget rows.

Test suite: **31 tests across 3 files**, all passing (`npm test`).

## Possible future work
- True end-to-end UI tests (Detox/Maestro) on a device, multi-currency support, and cloud-optional sync.
