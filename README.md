# El Ocotal · Café de Nicaragua (website concept)

Unofficial concept site, marked `noindex`. Static HTML, no build step. Double-click `index.html` to open it, and `compare.html` for the before/after.

## Idea

The brand's only asset is its bag, so **the site is the bag**. The hero is the black logo window with gold pines, the middle is the yellow label read line by line (the signature section), and the footer is the foil "Tostado y molido" band. The bag in the hero is an SVG redrawing, not a photo, so it stays sharp at any size.

- Palette from the packaging: saco yellow `#F1D417`, resina black `#12110D`, pine `#1C261E`, gold foil `#C9A45C`
- Type: Antonio (condensed, like the label's "CAFÉ DE NICARAGUA"), Cormorant Garamond italic (for the luxury voice), Montserrat (the bag's own sans)
- Spanish first, with an EN toggle

## Where the facts come from

| Claim on site | Source |
|---|---|
| Café de origen, 100% Arábica, Tueste medio, Café de Nicaragua, Gourmet | Bag front |
| Tostado y molido, Peso neto 400 g | Bag front |
| cafeelocotalnic@gmail.com | Bag front (printed as "gmailcom", missing the dot) |
| Ocotal = place of ocote pines; from Nahuatl *ocotl* | General Spanish usage |
| Brew ratios, storage tips | General coffee guidance, not from the brand |
| "De nuestra finca a tu taza", 100% produced on our farm, specialty coffee | Owner's promo video (WhatsApp, 2026-11-26) |
| Elevation 1,200–1,300 masl; Catuaí, Catimor, Parainema; natural process, patio-dried in the sun; regulated shade; hand harvest December–March | Owner's promo video, info poster |
| Tasting notes: chocolate, blueberries, citrus acidity | Owner's promo video, info poster |
| `assets/finca-scene.svg` (coffee branch over pine hills) | Original illustration drawn in code (`el-ocotal-ad/scripts/finca_art.py`). No client photos are used on the site |

## 3D bean (hero)

`assets/bean.js` builds the bean in code with Three.js r158 (bundled in `assets/vendor`), with no model file.
- **Shape (mesh):** roughly 10 × 7 × 4 mm proportions, a flat face with two rolled halves, a deep S-shaped slit that fades before the ends, a domed back, and one end slightly narrower.
- **Surface (custom per-pixel shader):** roast wrinkles running across the bean, micro-grain, pores, mottled roast color, pale fibrous silverskin in the slit with a dark core, and roughness that varies across the surface.
- **Photo finish:** a soft studio environment for reflections, warm key and gold rim lights, self-shadowing, background beans in a separate blurred canvas for depth of field, plus film grain and a vignette.

Drag to spin it. It stops spinning when reduced motion is on, and uses lighter settings on phones. Everything is local, so it works offline. To preview it, run `python -m http.server 4177` in this folder, or double-click `index.html`.

## Placeholders

The farm facts (altitude, process, notes) now come from the owner's video, and the guessed region was removed. What's left are guesses. Open `index.html?ph` to outline each one in pink.

| Placeholder | Value used | Why |
|---|---|---|
| Price | US$ 14.00 | `PRICE` in the order script |
| WhatsApp | Opens WhatsApp with a prefilled message and no number | Set `WA_NUMBER` in the order script |
| Shipping | Nicaragua and the United States | Guess |

## To confirm with the owner

- [ ] The farm's town or region. The video doesn't say, so the site only says "Nicaragua"
- [ ] The producers' names. The poster lists them, but the coffee-cup emoji cover them (it looks like "Elmer Augusto Reyes & …")
- [ ] The original logo file. The logo on the site is a stand-in drawn from the photo
- [ ] Prices, shipping area, WhatsApp or phone number (the order section is email-only for now)
- [ ] The email typo on the bag
