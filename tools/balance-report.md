# Headless balance report

Reproduce: npm run sim (5000 paired seeds per bot per difficulty, no network/browser).

All pickups saved in a multi-trip scramble proxy; item ablations remove ONE instance of each type. Paired item checks use the Cautious good-play policy. Crew: Ria, Dom, Aiko, Tunde.

Fixed GAME score: 100 for win + 25 per crew home + min(100, science*2) - total GAME dose*0.2. Bots consume filtered views; no observed arrival or future event feeds their decisions. Starting dose/duration/science/supply values and the 90-second timer cap are reproduced in the before table; final GAME config is stored alongside. Both configuration tables use the corrected UTC-day/resupply rules and EVA flare interrupts; the starting table is not a replay of the historical engine. The scramble proxy does not establish achievable 3D pickup capacity. NASA records and associations are unchanged.

## Cadet

| Bot | Win | Mean score | Median science | Median dose | Median shifts | Endings |
|---|---:|---:|---:|---:|---:|---|
| AlwaysShelter | 100.0% | 190.5 | 0.0 | 36.0 | 18 | Kamote Kingdom: 5000 |
| NeverShelter | 33.6% | 147.9 | 191.8 | 273.8 | 10 | Early Ride Home: 3318, Forecast Whisperer: 337, Mission Complete: 973, Science Legend: 372 |
| TrustForecast | 88.6% | 252.5 | 171.5 | 143.2 | 18 | Close Call: 682, Early Ride Home: 569, Forecast Whisperer: 454, Mission Complete: 1571, Science Legend: 1724 |
| Cautious | 100.0% | 261.8 | 55.4 | 93.9 | 18 | Close Call: 1184, Forecast Whisperer: 141, Kamote Kingdom: 308, Science Legend: 3367 |
| Greedy | 33.6% | 147.9 | 191.8 | 273.8 | 10 | Early Ride Home: 3318, Forecast Whisperer: 337, Mission Complete: 973, Science Legend: 372 |
| Random | 73.7% | 215.7 | 54.1 | 151.3 | 17 | Close Call: 528, Early Ride Home: 1313, Forecast Whisperer: 181, Mission Complete: 1152, Science Legend: 1826 |

## Commander

| Bot | Win | Mean score | Median science | Median dose | Median shifts | Endings |
|---|---:|---:|---:|---:|---:|---|
| AlwaysShelter | 100.0% | 190.4 | 0.0 | 38.8 | 22 | Kamote Kingdom: 5000 |
| NeverShelter | 9.7% | 126.0 | 130.8 | 185.8 | 7 | Early Ride Home: 4516, Forecast Whisperer: 145, Mission Complete: 122, Science Legend: 217 |
| TrustForecast | 57.0% | 208.4 | 152.3 | 139.3 | 21 | Close Call: 188, Early Ride Home: 2149, Forecast Whisperer: 381, Mission Complete: 1415, Science Legend: 867 |
| Cautious | 98.6% | 262.9 | 55.4 | 78.8 | 22 | Close Call: 1036, Early Ride Home: 69, Forecast Whisperer: 220, Kamote Kingdom: 255, Mission Complete: 854, Science Legend: 2566 |
| Greedy | 9.7% | 126.0 | 130.8 | 185.8 | 7 | Early Ride Home: 4516, Forecast Whisperer: 145, Mission Complete: 122, Science Legend: 217 |
| Random | 49.6% | 178.5 | 48.8 | 153.1 | 20 | Close Call: 61, Early Ride Home: 2520, Forecast Whisperer: 203, Mission Complete: 1130, Science Legend: 1086 |

## Flight Director

| Bot | Win | Mean score | Median science | Median dose | Median shifts | Endings |
|---|---:|---:|---:|---:|---:|---|
| AlwaysShelter | 0.0% | 40.0 | 0.0 | 52.8 | 23 | Early Ride Home: 5000 |
| NeverShelter | 6.7% | 127.4 | 117.2 | 155.6 | 6 | Early Ride Home: 4667, Forecast Whisperer: 97, Mission Complete: 154, Science Legend: 82 |
| TrustForecast | 8.5% | 131.9 | 130.0 | 142.2 | 15 | Early Ride Home: 4505, Forecast Whisperer: 42, Mission Complete: 203, Science Legend: 182, Snack Attack: 68 |
| Cautious | 3.4% | 120.5 | 55.4 | 67.1 | 23 | Early Ride Home: 4825, Forecast Whisperer: 42, Science Legend: 128, Snack Attack: 5 |
| Greedy | 0.0% | 117.5 | 117.2 | 155.6 | 6 | Early Ride Home: 5000 |
| Random | 15.5% | 122.1 | 40.8 | 141.5 | 12 | Close Call: 2, Early Ride Home: 4208, Forecast Whisperer: 64, Mission Complete: 311, Science Legend: 400, Snack Attack: 15 |

## Starting GAME configuration (Commander)

| Bot | Win | Mean score | Median science | Median dose | Median shifts | Endings |
|---|---:|---:|---:|---:|---:|---|
| AlwaysShelter | 74.3% | 141.4 | 0.0 | 28.4 | 22 | Early Ride Home: 1287, Kamote Kingdom: 3713 |
| NeverShelter | 20.7% | 143.1 | 78.4 | 173.1 | 10 | Early Ride Home: 3964, Forecast Whisperer: 173, Mission Complete: 586, Science Legend: 277 |
| TrustForecast | 71.6% | 218.1 | 55.6 | 80.2 | 22 | Close Call: 376, Early Ride Home: 1422, Forecast Whisperer: 439, Mission Complete: 798, Science Legend: 1965 |
| Cautious | 75.7% | 199.6 | 31.6 | 75.4 | 22 | Close Call: 912, Early Ride Home: 1216, Forecast Whisperer: 183, Kamote Kingdom: 54, Mission Complete: 485, Science Legend: 2150 |
| Greedy | 18.9% | 139.5 | 78.4 | 173.1 | 10 | Early Ride Home: 4054, Forecast Whisperer: 144, Mission Complete: 572, Science Legend: 230 |
| Random | 65.4% | 178.0 | 24.8 | 92.0 | 21 | Close Call: 263, Early Ride Home: 1729, Forecast Whisperer: 275, Mission Complete: 978, Science Legend: 1753, Snack Attack: 2 |

## Paired item ablations

| Removed type | Win without | Benefit with (points) |
|---|---:|---:|---:|
| water | 98.6% | 0.0 |
| food | 98.6% | 0.0 |
| radio | 97.7% | 0.9 |
| dosimeter | 98.6% | 0.0 |
| seeds | 98.6% | 0.0 |
| repair | 98.6% | 0.0 |
| med | 98.6% | 0.0 |
| battery | 98.6% | 0.0 |
| guitar | 98.6% | 0.0 |
| game | 98.6% | 0.0 |
| bolt | 98.6% | 0.0 |
| electron | 98.6% | 0.0 |

## Acceptance

| Target | Goal | Measured | Result |
|---|---|---|---|
| Shelter-only survival / Science Legend | >=60% / <5% | 100.0% / 0.0% | PASS |
| NeverShelter medevac | >=70% | 90.3% | PASS |
| TrustForecast survival | 45-65% | 57.0% | PASS |
| TrustForecast mean score | Higher than both extremes | 208.4 vs 190.4 / 126.0 | PASS |
| Distinct endings / 1,000 variety runs | >=6 | 8 | PASS |
| Commander median shifts | 20-28 | 21 | PASS |
| Commander median scramble seconds | 30-60 | 60 | PASS |
| Difficulty survival (Cadet / Commander / Flight Director) | Cadet easier; Director harder | 88.6% / 57.0% / 8.5% | PASS |
| Largest single-item win benefit | <=25 percentage points | 0.9 points | PASS |
| No-radio good-play survival | >=5% | 97.7% | PASS |
| Radio strongest item benefit | At least every other type | 0.9 points | PASS |

Variety protocol: 1,000 separate seeds, six policies in rotation, no-radio every seventh run and one-person scramble every seventeenth run. Endings: Blind Luck, Close Call, Early Ride Home, Forecast Whisperer, Kamote Kingdom, Mission Complete, Science Legend, Skeleton Crew. Full figures and exact config: [results.json](../docs/balance/results.json).
