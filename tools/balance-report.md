# Headless balance report

Reproduce: npm run sim (5000 paired seeds per bot per difficulty, no network/browser).

All pickups saved in a multi-trip scramble proxy; item ablations remove ONE instance of each type. Paired item checks use the Cautious good-play policy. Crew: Ria, Dom, Aiko, Tunde.

Fixed GAME score: 100 for win + 25 per crew home + min(100, science*2) - total GAME dose*0.2. Bots consume filtered views; no observed arrival or future event feeds their decisions. Starting dose/duration/science/supply values and the 90-second timer cap are reproduced in the before table; final GAME config is stored alongside. The scramble proxy does not establish achievable 3D pickup capacity. NASA records and associations are unchanged.

## Cadet

| Bot | Win | Mean score | Median science | Median dose | Median shifts | Endings |
|---|---:|---:|---:|---:|---:|---|
| AlwaysShelter | 100.0% | 190.4 | 0.0 | 36.0 | 18 | Kamote Kingdom: 5000 |
| NeverShelter | 32.5% | 146.2 | 191.8 | 273.8 | 10 | Early Ride Home: 3374, Forecast Whisperer: 341, Mission Complete: 933, Science Legend: 352 |
| TrustForecast | 88.0% | 251.3 | 179.9 | 144.3 | 18 | Close Call: 668, Early Ride Home: 598, Forecast Whisperer: 454, Mission Complete: 1574, Science Legend: 1706 |
| Cautious | 100.0% | 261.8 | 55.4 | 94.2 | 18 | Close Call: 1160, Forecast Whisperer: 165, Kamote Kingdom: 290, Science Legend: 3385 |
| Greedy | 32.5% | 146.2 | 191.8 | 273.8 | 10 | Early Ride Home: 3374, Forecast Whisperer: 341, Mission Complete: 933, Science Legend: 352 |
| Random | 73.0% | 214.8 | 55.1 | 153.4 | 18 | Close Call: 506, Early Ride Home: 1350, Forecast Whisperer: 226, Mission Complete: 1169, Science Legend: 1749 |

## Commander

| Bot | Win | Mean score | Median science | Median dose | Median shifts | Endings |
|---|---:|---:|---:|---:|---:|---|
| AlwaysShelter | 100.0% | 190.3 | 0.0 | 39.1 | 22 | Kamote Kingdom: 5000 |
| NeverShelter | 9.7% | 125.9 | 130.8 | 185.8 | 7 | Early Ride Home: 4516, Forecast Whisperer: 145, Mission Complete: 145, Science Legend: 194 |
| TrustForecast | 56.4% | 207.2 | 154.3 | 142.0 | 21 | Close Call: 172, Early Ride Home: 2180, Forecast Whisperer: 430, Mission Complete: 1421, Science Legend: 797 |
| Cautious | 98.6% | 262.9 | 55.4 | 79.5 | 22 | Close Call: 1036, Early Ride Home: 69, Forecast Whisperer: 220, Kamote Kingdom: 255, Mission Complete: 854, Science Legend: 2566 |
| Greedy | 9.7% | 125.9 | 130.8 | 185.8 | 7 | Early Ride Home: 4516, Forecast Whisperer: 145, Mission Complete: 145, Science Legend: 194 |
| Random | 48.9% | 177.3 | 49.5 | 154.5 | 20.5 | Close Call: 60, Early Ride Home: 2555, Forecast Whisperer: 230, Mission Complete: 1104, Science Legend: 1051 |

## Flight Director

| Bot | Win | Mean score | Median science | Median dose | Median shifts | Endings |
|---|---:|---:|---:|---:|---:|---|
| AlwaysShelter | 100.0% | 190.7 | 0.0 | 44.8 | 26 | Kamote Kingdom: 5000 |
| NeverShelter | 9.7% | 131.8 | 117.2 | 155.6 | 6 | Early Ride Home: 4516, Forecast Whisperer: 145, Mission Complete: 220, Science Legend: 119 |
| TrustForecast | 34.7% | 173.1 | 130.0 | 142.2 | 15 | Early Ride Home: 3263, Forecast Whisperer: 350, Mission Complete: 1092, Science Legend: 295 |
| Cautious | 98.6% | 270.3 | 57.2 | 65.6 | 26 | Close Call: 1153, Early Ride Home: 69, Forecast Whisperer: 295, Kamote Kingdom: 138, Mission Complete: 786, Science Legend: 2559 |
| Greedy | 9.7% | 131.8 | 117.2 | 155.6 | 6 | Early Ride Home: 4516, Forecast Whisperer: 145, Mission Complete: 220, Science Legend: 119 |
| Random | 37.9% | 158.4 | 43.1 | 141.7 | 12 | Close Call: 25, Early Ride Home: 3103, Forecast Whisperer: 216, Mission Complete: 805, Science Legend: 850, Snack Attack: 1 |

## Starting GAME configuration (Commander)

| Bot | Win | Mean score | Median science | Median dose | Median shifts | Endings |
|---|---:|---:|---:|---:|---:|---|
| AlwaysShelter | 62.0% | 116.8 | 0.0 | 29.1 | 22 | Early Ride Home: 1899, Kamote Kingdom: 3101 |
| NeverShelter | 18.3% | 138.3 | 78.4 | 173.1 | 10 | Early Ride Home: 4084, Forecast Whisperer: 161, Mission Complete: 488, Science Legend: 267 |
| TrustForecast | 63.1% | 201.2 | 55.6 | 79.7 | 22 | Close Call: 332, Early Ride Home: 1844, Forecast Whisperer: 366, Mission Complete: 659, Science Legend: 1799 |
| Cautious | 63.7% | 175.5 | 31.6 | 75.4 | 22 | Close Call: 804, Early Ride Home: 1816, Forecast Whisperer: 149, Kamote Kingdom: 33, Mission Complete: 379, Science Legend: 1819 |
| Greedy | 15.3% | 132.2 | 78.4 | 173.1 | 10 | Early Ride Home: 4237, Forecast Whisperer: 107, Mission Complete: 474, Science Legend: 182 |
| Random | 61.2% | 171.4 | 25.1 | 92.3 | 22 | Close Call: 206, Early Ride Home: 1937, Forecast Whisperer: 296, Mission Complete: 845, Science Legend: 1711, Snack Attack: 5 |

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
| TrustForecast survival | 45-65% | 56.4% | PASS |
| TrustForecast mean score | Higher than both extremes | 207.2 vs 190.3 / 125.9 | PASS |
| Distinct endings / 1,000 variety runs | >=6 | 8 | PASS |
| Commander median shifts | 20-28 | 21 | PASS |
| Commander median scramble seconds | 30-60 | 60 | PASS |
| Difficulty survival (Cadet / Commander / Flight Director) | Cadet easier; Director harder | 88.0% / 56.4% / 34.7% | PASS |
| Largest single-item win benefit | <=25 percentage points | 0.9 points | PASS |
| No-radio good-play survival | >=5% | 97.7% | PASS |
| Radio strongest item benefit | At least every other type | 0.9 points | PASS |

Variety protocol: 1,000 separate seeds, six policies in rotation, no-radio every seventh run and one-person scramble every seventeenth run. Endings: Blind Luck, Close Call, Early Ride Home, Forecast Whisperer, Kamote Kingdom, Mission Complete, Science Legend, Skeleton Crew. Full figures and exact config: [results.json](../docs/balance/results.json).
