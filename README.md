# CherryHUB - GaCherry + Music verzió

Tartalom:
- Online/Offline panel
- Főoldali következő stream preview
- Twitch schedule modal Cherry ID-val
- GaCherry nagy panel
- Cherry Music panel

## GaCherry banner

A panel ezt a fájlt használja:

assets/gacherry-banner.png

Most egy könnyű, webre optimalizált placeholder van benne.
Ha megvan az eredeti `banner.png`, egyszerűen cseréld le ezt a fájlt ugyanarra a névre.

A CSS aránytartva jeleníti meg:
- nem vágja le
- `object-fit: contain`
- max-height korlátozás
- keretes képmegjelenítés

## Cherry Music

A zene lista itt szerkeszthető:

data/content.json → musicTracks

Most a pontos videólinkek helyén a YouTube csatorna van.
Ha megvannak a konkrét videók, csak cseréld ki az URL-eket.
