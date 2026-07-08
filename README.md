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


## Final módosítások

- Hírek blokk fölött középre igazított `Hírek röviden` címke.
- A fő hero gomb most `📅 Menetrend`, és közvetlenül a Stream / Menetrend modalt nyitja.
- Cherry Music panelben két gomb:
  - YouTube csatorna
  - Lista megnyitása
- A zene lista külön modalban nyílik, a `data/content.json` → `musicTracks` alapján.
- Finom animációk:
  - CherryHUB / cím enyhe pulzálás
  - háttérben lassú szimbólummozgás
  - gombok enyhe glow
  - GaCherry banner keret enyhe fény
  - music hangjegy finom lebegés

Nincs benne token, Client Secret, Bearer token vagy privát API kulcs.


## Visible soft animation tuning

Ebben a verzióban az animációk már jobban láthatók:
- több háttérjel
- erősebb, de még soft glow
- CherryHUB és középső mag látványosabb lélegzése
- gombok láthatóbb fénylése
- GaCherry keret erősebb, de nem vakító glow
