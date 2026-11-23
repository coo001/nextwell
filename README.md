# NextWell

**Not red or green. Which well, how far, how much lower.**

NextWell takes the field arsenic reading of every tube well in a village and shows each well's users the lowest-reading well within walking distance. Then it checks that plan against laboratory results the plan never used.

Built for the Acodemic X KeebsforWater Global SDG Hackathon. SDG 6.1 (safe drinking water) and SDG 3.9 (deaths and illness from contaminated water).

## The problem

In rural Bangladesh many households drink from shallow tube wells, and many of those wells carry arsenic above the national limit of 50 µg/L (the WHO guideline is 10 µg/L). Arsenic varies a lot over short distances, so a well with a much lower reading is often a short walk away. Testing campaigns usually leave behind a binary mark (safe or unsafe) on each well. That mark does not tell a household which nearby well is lower, how far it is, or how big the difference is.

NextWell is for the person who holds the village's test results: a health volunteer or an NGO field worker.

## What it does

1. **Wells.** Opens a real survey (Mandari village, 236 tube wells, 1999) or lets you enter your own wells: position, field-kit reading, and whether the owner agrees to share. Wells are drawn from their coordinates on a plain grid, coloured by reading on a continuous scale with the 10 and 50 µg/L marks.
2. **Switching plan.** For every well above 50 µg/L it finds a candidate well and draws an arrow to it. A slider sets the walking distance (50 to 300 m). The summary shows wells above the limit and the mean reading, before and after.
3. **Lab check.** One toggle scores the same plan with laboratory values instead of field-kit readings.
4. **Notice.** A one-page notice for the households of one well, in English and Bangla, with a small map, the direction and the distance.

### The rules (fixed, in `src/lib/plan.ts`)

1. Only users of a well reading above 50 µg/L get a candidate. Wells at or below 50 stay as they are.
2. A candidate must be within the walking distance (straight line), shared by its owner, and read **at most half** of your well's reading. Half, because field kits are imprecise.
3. The lowest reading wins. Ties go to the nearer well, then to the earlier ID.
4. No candidate: the well is listed as "no lower well in range". An untested well is neither a source nor a candidate; it is listed as "test first".

### What the rules give on the Mandari survey (200 m, ratio 0.5)

| | Before | After |
|---|---|---|
| Wells above 50 µg/L, field-kit readings (of 236) | 175 | 80 |
| Mean reading at the well in use, field kit (µg/L) | 118 | 48 |
| Wells above 50 µg/L, lab values | 166 | 76 |
| Mean at the well in use, lab values (µg/L, "<30" counted as 15) | 121 | 53 |

- 113 wells get a candidate, spread over 39 receiving wells. Median walk 135 m.
- All 113 candidates are lower by lab value as well.
- 18 candidates are lower but still above the limit. 62 wells have no candidate within 200 m.
- 6 receiving wells take users from 6 or more wells (the most is 11). The app marks them as crowded.
- Kit and lab agree on the 50 limit for 219 of 236 wells. 4 wells the kit puts under the limit are above it by lab.
- At 100 m, 136 wells remain above the limit; at 300 m, 57.

These numbers are locked by unit tests (`src/lib/plan.test.ts`). They are a recalculation on a 1999 survey, **not** a result measured in a village.

## Run it

```bash
npm install
npm run dev      # local development
npm test         # 15 unit tests for the rules
npm run build    # type check + static build in dist/
npm run preview  # serve the build
```

Static site. No server, no account, no external API, no analytics, no map tiles. Wells you enter are stored only in your browser's local storage.

Stack: React 19, TypeScript, Vite, Vitest, hand-written SVG and CSS.

## Data

The built-in village is the Mandari Village Survey (Lakshmipur district, Bangladesh), 236 tube wells sampled from 22 November 1999, published with the BGS/DPHE study below. This repository contains only a processed JSON file (`src/data/mandari_wells.json`) with the columns the app uses: well ID, coordinates, depth, well type, year, sampling date, field-kit arsenic and laboratory arsenic. The original CSV is not redistributed here; it can be downloaded from the [BGS Bangladesh reports and data page](https://www.bgs.ac.uk/groundwater/quality/groundwater-and-health/arsenic-contamination-of-groundwater/bangladesh-reports/).

> BGS and DPHE. 2001. Arsenic contamination of groundwater in Bangladesh. Kinniburgh, D G, and Smedley, P L (editors). British Geological Survey Technical Report WC/00/19. (Nottingham, UK: British Geological Survey.)

This material was produced by the British Geological Survey and the Department of Public Health Engineering (Bangladesh) undertaking a project funded by the UK Department for International Development (DFID). Any views expressed are not necessarily those of DFID.

## Limits

- The survey is 27 years old. Nothing here describes a well as it is today.
- The numbers are a recalculation. Nobody in Mandari has used this tool, and no field worker has tested it.
- Counts are wells, not people. The survey has no household or population figures.
- Distance is a straight line. It ignores paths, water bodies and whether an owner actually allows access. Coordinates are rounded to about 10 m.
- A well that receives many new users may run short of water or strain a relationship. The app flags crowding but does not solve it.
- The 0.5 ratio and the 200 m default are design choices, not validated thresholds.
- Bangla text is machine-translated and has not been reviewed by a native speaker. It appears only on the demo notice, which carries a "DEMO – not for distribution" watermark.
- Readings are field-kit values and can be wrong. An untested well is not a safe well. This is not a water-quality certificate or medical advice.

## AI use

AI coding assistance was used to write the code, the tests and this README. The calculation rules were fixed in writing before the code and are covered by unit tests against the survey. No AI model runs inside the app: every result is produced by the four rules above.

## License

Code: MIT. Data: see the citation and acknowledgement above.
