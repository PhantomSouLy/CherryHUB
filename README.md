# CherryHUB - Twitch Schedule verzió

Ebben a verzióban a Stream / Menetrend tab automatikusan megpróbálja betölteni Cherry Twitch ütemezését.

Cherry Twitch broadcaster ID:
611526048

Automatikus iCalendar endpoint:
https://api.twitch.tv/helix/schedule/icalendar?broadcaster_id=611526048

Fontos:
- Ha a Twitch schedule nem töltődik be, az oldal nem törik el.
- Ilyenkor a data/content.json kézi menetrendje jelenik meg tartalékként.
- GitHub Pages alatt a működés függhet attól, hogy a Twitch iCalendar endpoint engedi-e a böngészős lekérést.
