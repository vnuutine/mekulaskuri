# Ajomatkalaskuri

A small browser tool for calculating the forwarding distance (*metsäkuljetusmatka*) of a single
harvesting block when the wood is driven to more than one landing (*varastopaikka*).

Metsä's work instruction *Metsäkuljetusmatkan määrittäminen* (14.05.2019) defines the figure as a
volume-weighted mean: *"Useamman kuvion lohkolla kuvioiden puumäärillä punnittu lohkon
keskiajomatka."* In other words:

```
d = Σ(Vᵢ · dᵢ) / Σ Vᵢ
```

where `Vᵢ` is the volume driven to landing *i* and `dᵢ` is the distance from the centre of gravity
(*painopiste*) of that particular batch of wood to that landing.

With a single landing there is nothing to calculate. With two or three, the arithmetic is simple
but tedious, and a wrong weighted mean looks exactly like a right one. This tool removes that one
source of error. It does not help with the hard parts — deciding where the painopiste is and
picking the shortest usable route on the map — and does not pretend to.

The user interface is in Finnish, since that is the language of the work it supports.

---

## Features

- Add as many landings as needed, two by default
- Volume-weighted average distance, recalculated as you type
- Each landing's share of the total volume, which makes a mistyped volume obvious at a glance
- Landings with no wood are left out of the average instead of pulling it down
- Accepts the Finnish decimal comma as well as the decimal point
- Withholds the result while any filled row is unusable, rather than showing a plausible wrong number
- Result rounded to whole metres, the accuracy the map measurement actually has
- Clear button, so rows from the previous block cannot contaminate the next one
- No dependencies, no build step and no storage — every calculation is a one-off

---

## Usage

Open `index.html` in a browser, or visit the hosted version on GitHub Pages. No installation and no
server required.

1. Enter the volume in m³ driven to the first landing, and the distance in metres to it.
2. Add a row for each further landing.
3. Read the weighted forwarding distance from the result card.

Measure each distance from the painopiste of the wood driven to *that* landing, not from the
block's overall centre of gravity. The tool cannot check this for you.

### Example

| Varastopaikka | Puumäärä | Ajomatka |
| ------------- | -------- | -------- |
| 1             | 340 m³   | 210 m    |
| 2             | 155 m³   | 580 m    |

`(340 · 210 + 155 · 580) / 495 = 161 300 / 495 ≈ 326 m`

---

## Project Structure

```
ajomatkalaskuri/
├── index.html          # Page markup
├── styles/
│   └── styles.css      # All styles
├── scripts/
│   └── script.js       # Calculation and rendering
├── images/
│   └── favicon.svg
├── LICENSE
└── README.md
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

Ville Nuutinen
