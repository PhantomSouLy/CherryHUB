# Indulás előtti ellenőrzés – 2026. október 18.

## Domain és tárhely

A honlap statikus HTML/CSS/JavaScript oldal; a jelenlegi GitHub Pages tárhelyről saját domainen is kiszolgálható. A Rackhostnál jelenleg csak a domain van meg.

Az ellenőrzött aktív névszerverek:

- `shubhi.ns.cloudflare.com`
- `plato.ns.cloudflare.com`

Ezért a DNS-rekordokat a Cloudflare DNS → Records felületén kell kezelni. A Rackhoston megjelenő másik DNS-zóna szerkesztése nem módosítja az aktív Cloudflare-zónát.

Először a CherryHUB GitHub-repó Settings → Pages → Custom domain mezőjében kell menteni a `happycherrychan.hu` címet. Ezután az aktív DNS-ben a weboldal rekordjai:

| Típus | Név | Érték |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | phantomsouly.github.io |

Az első beállításnál ezekhez DNS only, szürke felhő használható; a többi szolgáltatás rekordjait nem kell módosítani. Az esetleges ütköző A/AAAA/CNAME webes rekordokat kell rendezni. A GitHub Pages sikeres DNS-ellenőrzése és tanúsítványkiadása után kapcsolható be az Enforce HTTPS. A www változat a fődomainre irányulhat.

Hivatalos útmutatók: [GitHub Pages saját domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), [Cloudflare proxyállapot](https://developers.cloudflare.com/dns/proxy-status/).

A vizsgálat idején a GitHub Pages cím HTTP 200 választ adott. A saját domain és a www változat HTTPS-en még 521 választ adott, ezért a saját domain indulása még DNS/GitHub-beállítást és utóellenőrzést igényel. Az audit során DNS-t, névszervert és GitHub Pages-beállítást nem módosítottam.

## Javítások

- A hírek megérkezhettek az oldal helyi adatainak betöltése előtt. Ez null adaton történő renderelést és JavaScript-hibát okozott. A hírlista most megvárja a helyi adatokat.
- A hírlekérés 12 másodperces időkorlátot kapott; hiba esetén az oldal érthető állapotüzenetet mutat.
- A világos háttér eredetileg 21,38 MiB-os PNG volt. Az új, 2560×1435-ös WebP 335 624 bájt. A sötét háttér új WebP-változata 369 952 bájt. Az eredeti fájlok megmaradtak.
- A módosított CSS és hírszkript verziózott hivatkozást kapott a gyorsítótár frissítéséhez.

## Ellenőrzött működés

- 12 témakártya, 13 tartalomfül, megnyitás és bezárás.
- Két zenei album, összesen 18 dal. Mind a 18 YouTube oEmbed-lekérés HTTP 200 választ adott, és a címek megfeleltek a megadott daloknak.
- A szabályzat 8 Twitch- és 7 Discord-fejezete.
- Világos/sötét mód váltása és a témagomb felirata.
- Hírek: normál, üres, hálózati hiba, illetve a helyi adatokat megelőző válasz.
- A hírek HTML-ként értelmezhető szövegeinek biztonságos megjelenítése és nem engedélyezett extra linkek elutasítása.
- Live/offline előnézet: csak élő állapotban van kattintható Twitch-link.
- Hír- és témakártyák görgős/húzásos kezelése, a húzás utáni kattintás elnyomása.
- A betöltött három CSS-fájl 669 szabályának szintaktikai feldolgozása.
- A megjelenített HTML helyi erőforrásai léteznek; nincsenek ismétlődő HTML-azonosítók.
- A hírek API-ja, a Twitch-menetrend és a live státusz végpontja HTTP 200 választ adott. A szükséges CORS-hozzáférés működött a `https://happycherrychan.hu` eredettel.

## Korlátok és tervezett üres részek

A DOM-tesztek nem végeznek képernyőn renderelt látványellenőrzést. Valódi mobilon és asztali böngészőben az indulás előtt még érdemes végignézni a tördelést és az animációkat.

A Cherry Világa lejátszási lista külön oldalán a YouTube beleegyezőoldala miatt a lista tartalmát nem lehetett függetlenül megerősíteni. Ez a hat külön dallink ellenőrzését nem érintette.

A háttérgaléria adatai még üresek; a felület ezt jelzi. A Discord GaCherry szüneteltetése, a letiltott gombja és a T.I.T.S. átmeneti kikapcsolása szándékos állapotok. Ezeken az audit nem változtatott.

## Következő ellenőrzés

A módosításokat fel kell tölteni a GitHubra. A saját domain beállítása után ellenőrizni kell a fődomain és a www HTTPS-átirányítását, az új háttérfájlok elérhetőségét és a hírek/live adatok böngészős betöltését a saját domainen.
