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
| Random | 73.7% | 215.7 | 54.1 | 150.8 | 17 | Close Call: 528, Early Ride Home: 1314, Forecast Whisperer: 176, Mission Complete: 1138, Science Legend: 1844 |

## Commander

| Bot | Win | Mean score | Median science | Median dose | Median shifts | Endings |
|---|---:|---:|---:|---:|---:|---|
| AlwaysShelter | 100.0% | 190.4 | 0.0 | 38.8 | 22 | Kamote Kingdom: 5000 |
| NeverShelter | 9.7% | 126.0 | 130.8 | 185.8 | 7 | Early Ride Home: 4516, Forecast Whisperer: 145, Mission Complete: 122, Science Legend: 217 |
| TrustForecast | 57.0% | 208.4 | 152.3 | 139.3 | 21 | Close Call: 188, Early Ride Home: 2149, Forecast Whisperer: 381, Mission Complete: 1415, Science Legend: 867 |
| Cautious | 98.6% | 262.9 | 55.4 | 78.8 | 22 | Close Call: 1036, Early Ride Home: 69, Forecast Whisperer: 220, Kamote Kingdom: 255, Mission Complete: 854, Science Legend: 2566 |
| Greedy | 9.7% | 126.0 | 130.8 | 185.8 | 7 | Early Ride Home: 4516, Forecast Whisperer: 145, Mission Complete: 122, Science Legend: 217 |
| Random | 49.8% | 178.7 | 48.8 | 152.9 | 20 | Close Call: 63, Early Ride Home: 2511, Forecast Whisperer: 202, Mission Complete: 1143, Science Legend: 1081 |

## Flight Director

| Bot | Win | Mean score | Median science | Median dose | Median shifts | Endings |
|---|---:|---:|---:|---:|---:|---|
| AlwaysShelter | 100.0% | 190.7 | 0.0 | 44.7 | 26 | Kamote Kingdom: 5000 |
| NeverShelter | 9.7% | 131.9 | 117.2 | 155.6 | 6 | Early Ride Home: 4516, Forecast Whisperer: 145, Mission Complete: 220, Science Legend: 119 |
| TrustForecast | 34.7% | 173.0 | 130.0 | 142.2 | 15 | Early Ride Home: 3263, Forecast Whisperer: 350, Mission Complete: 1046, Science Legend: 341 |
| Cautious | 98.6% | 270.4 | 57.2 | 65.6 | 26 | Close Call: 1153, Early Ride Home: 69, Forecast Whisperer: 295, Kamote Kingdom: 138, Mission Complete: 782, Science Legend: 2563 |
| Greedy | 9.7% | 131.9 | 117.2 | 155.6 | 6 | Early Ride Home: 4516, Forecast Whisperer: 145, Mission Complete: 220, Science Legend: 119 |
| Random | 38.3% | 159.0 | 43.4 | 141.6 | 12 | Close Call: 26, Early Ride Home: 3085, Forecast Whisperer: 198, Mission Complete: 810, Science Legend: 881 |

## Starting GAME configuration (Commander)

| Bot | Win | Mean score | Median science | Median dose | Median shifts | Endings |
|---|---:|---:|---:|---:|---:|---|
| AlwaysShelter | 74.3% | 141.4 | 0.0 | 28.4 | 22 | Early Ride Home: 1287, Kamote Kingdom: 3713 |
| NeverShelter | 20.7% | 143.1 | 78.4 | 173.1 | 10 | Early Ride Home: 3964, Forecast Whisperer: 173, Mission Complete: 586, Science Legend: 277 |
| TrustForecast | 71.6% | 218.1 | 55.6 | 80.2 | 22 | Close Call: 376, Early Ride Home: 1422, Forecast Whisperer: 439, Mission Complete: 798, Science Legend: 1965 |
| Cautious | 75.7% | 199.6 | 31.6 | 75.4 | 22 | Close Call: 912, Early Ride Home: 1216, Forecast Whisperer: 183, Kamote Kingdom: 54, Mission Complete: 485, Science Legend: 2150 |
| Greedy | 18.9% | 139.5 | 78.4 | 173.1 | 10 | Early Ride Home: 4054, Forecast Whisperer: 144, Mission Complete: 572, Science Legend: 230 |
| Random | 65.5% | 178.4 | 24.8 | 92.4 | 21 | Close Call: 261, Early Ride Home: 1724, Forecast Whisperer: 274, Mission Complete: 972, Science Legend: 1768, Snack Attack: 1 |

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
| Difficulty survival (Cadet / Commander / Flight Director) | Cadet easier; Director harder | 88.6% / 57.0% / 34.7% | PASS |
| Largest single-item win benefit | <=25 percentage points | 0.9 points | PASS |
| No-radio good-play survival | >=5% | 97.7% | PASS |
| Radio strongest item benefit | At least every other type | 0.9 points | PASS |

Variety protocol: 1,000 separate seeds, six policies in rotation, no-radio every seventh run and one-person scramble every seventeenth run. Endings: Blind Luck, Close Call, Early Ride Home, Forecast Whisperer, Kamote Kingdom, Mission Complete, Science Legend, Skeleton Crew. Full figures and exact config: [results.json](../docs/balance/results.json).
