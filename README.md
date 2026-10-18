# Contact Center Intelligence — interactive web demo

A free, static browser demo of the supplied 2021 contact-center analysis, designed for GitHub Pages.

## Explore

- **Overview:** daily-normalized monthly demand, PCA/SLA service trends, quarterly language AHT, monthly FCR–CSAT relationship.
- **Operations:** actual daily offered calls with an average reference, weekday averages, monthly skill mix, within-skill answer rates.
- **Team Performance:** daily AHT Boxplots, monthly weighted AHT, distribution summary and handling-time components.
- Six shared KPI cards, Month/Language/Skill selectors, copyable selection URLs, monthly numerical summaries and CSV export.

The website is a JavaScript/SVG analytical demo. GitHub Pages does not execute Tableau workbook files. The original **`Call_Center_Tableau.twbx`** is available in `downloads/` for use in Tableau.

## Data and calculations

The source snapshot contains **1,028 aggregate call records**, **551 survey responses**, and **365 Calendar dates**, covering 1 January–31 December 2021. Call rows are aggregates, not individual calls. Survey Language, Skill and Call ID are not supplied.

| Measure | Definition |
|---|---|
| Within SL | Ans Calls − Ans Calls After Service Level |
| Answered | Within SL + answers after SL |
| Handle time | Talk + Hold + ACW |
| AHT, minutes | SUM(handle time) / SUM(answered) / 60 |
| PCA | SUM(answered) / SUM(offered) |
| SLA | SUM(within SL) / SUM(offered) |
| Calls per day | Offered / selected Calendar dates, including zero-volume dates for a selected segment |
| CSAT | Mean rating: Very Dissatisfied=1 through Very Satisfied=5 |
| FCR | Mean of normalized Yes=1 / No=0 responses |
| Monthly r | Unweighted Pearson correlation of monthly FCR/CSAT means |

Source duration units are not specified: **seconds are an explicit assumption**. The source supplies no service-level threshold or performance targets. Colors identify measures and categories, not pass/fail outcomes.

### Scope

- Month filters both fact sources through the complete Calendar.
- Language and Skill filter regular call measures only.
- Language comparisons retain AR and ENG while applying Month and Skill.
- Skill comparisons retain both skills while applying Month and Language.
- Survey results use Month only.
- Boxplots use one weighted AHT per date/language with answered calls; whiskers use 1.5 × IQR. Quartiles use linear interpolation. These are daily aggregates, not individual-call duration distributions.
- The Scatter contains one equally weighted monthly pair, with sample sizes in point tooltips. Association is descriptive, not causal.

## Full-year anchors

Offered **528,107** · Answered **492,391** · AHT **7.63 min** · PCA **93.24%** · SLA **76.20%** · CSAT **4.63/5** · FCR **93.47%**.

Daily offered average **1,446.87**; monthly r **0.5313601784**, R² **0.2823436392**; daily medians **AR 7.5502** (298 valid days), **ENG 7.3612** (308 valid days).

## Run locally

Serve this directory with any static HTTP server, for example:

```sh
python -m http.server 8080
```

Open `http://localhost:8080`. No backend, build step, account, analytics tracker or paid license is required to use the browser demo. Optional Google Fonts fall back to system fonts if unavailable.

## Deploy on GitHub Pages

Use a public repository. In **Settings → Pages**, choose **Deploy from a branch → main → /(root)**. The `.nojekyll` file permits direct static asset publishing. All application/download paths are relative, so project-site hosting works.

`source-provenance.json` records the exact downloadable workbook hash and source counts. The data snapshot and workbook are included intentionally as public demo assets.
