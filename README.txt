CherryHUB - Hero Refresh

Changed files:
- index.html
- script.js
- hero-refresh.css (new)

Main changes:
- Removed flower/petal menu from homepage HTML.
- Removed renderFlower() and renderFloatingCard() from script.js.
- Replaced the old homepage petal area with a hero layout.
- Added compact Live status card on the right.
- Live card uses the existing Twitch uptime endpoint.
- Added up to 3 upcoming Twitch schedule entries using the existing ICS schedule.
- Existing top navigation, modals, cards, music and GaCherry sections are preserved.
- Added pastel Cherry-inspired visual overrides in hero-refresh.css.

Future hero background:
Open hero-refresh.css and change:
  --hero-bg-image: none;
to for example:
  --hero-bg-image: url('./assets/cherryhub-hero.png');

The background slot already has the line/grid pastel placeholder style if no image is configured.
