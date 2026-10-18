# Éles oldal és forráskód ellenőrzése – 2026. október 18.

## Az éles ellenőrzés eredménye

A `happycherrychan.hu` és a `www.happycherrychan.hu` HTTPS-kapcsolata az utolsó ellenőrzéskor tanúsítványnév-eltéréssel állt meg (`RemoteCertificateNameMismatch`, böngészőben `ERR_CERT_COMMON_NAME_INVALID`). Az ellenőrzés elején volt sikeres HTTPS-válasz is; a DNS-váltás utáni állapot ezért még nem tekinthető stabilnak. Tanúsítvány-ellenőrzést nem kapcsoltam ki, böngészős figyelmeztetést nem kerültem meg.

A HTTP-cím HTTP 200 választ ad, HTTPS-re kényszerítés még nincs. A `www` a fődomainre irányít. Az ellenőrzött A-rekordok a GitHub Pages négy címére, a `www` CNAME a `phantomsouly.github.io` címre mutat; ütköző apex AAAA-címet nem találtam.

Az éles HTML, a három CSS, a három JavaScript és a két JSON-adatfájl a vizsgálat kezdetén megegyezett a helyi verzióval (szövegnél a sorvégeket normalizálva). A két optimalizált háttér és a Cherry WebP karakter bájtra megegyezett. A logó, profilkép és az első hír képe HTTP 200 választ adott. A hírek API-ja egy hírt ad vissza; CORS-hozzáférése engedi a HTTPS fődomaint. A tényleges Twitch-menetrend és a live státusz végpontja is HTTP 200 választ adott, CORS-hozzáféréssel.

**Még szükséges:** a GitHub Pages saját domaines tanúsítványának kiadása után mindkét HTTPS-cím újraellenőrzése, majd Settings → Pages → Enforce HTTPS bekapcsolása. [Hivatalos GitHub HTTPS-útmutató](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https). DNS-t és távoli tárhelybeállítást az audit nem módosított.

## Az éles ellenőrzés során javított kód

- A helyi tartalom, a háttérlista és a két Twitch-menetrend lekérése időkorlátot kapott. Az elakadt háttérlista korábban az egész oldal megjelenítését korlátlanul késleltethette. Tartalom/menetrend: 12 másodperc; háttérlista: 5 másodperc.
- A Twitch ICS-ben szereplő `TZID=/Europe/Budapest` most feldolgozásra kerül. Korábban a budapesti időpontot a látogató saját helyi időpontjaként értelmezte az oldal; más időzónában elcsúszhatott az esemény. A megjelenítés továbbra is a látogató helyi idejét használja, de már a helyes időpillanatból számolva.
- A menetrend hálózati hibája külön üzenetet kapott; nem állítja, hogy nincs menetrend.
- A módosított szkript új gyorsítótár-verziót kapott. Ezek a módosítások helyiek, feltöltés után jelennek meg élesben.

Újra lefutott DOM-ellenőrzés: 12 témakártya, 15 tartalomfül, 18 dal, 15 szabályzatfejezet, hírek megnyitása és szöveges escaping, tiltott hivatkozás elutasítása, témaváltás, online/offline előnézet, mindkét görgetősáv eseménykötése. A három CSS 669 szabálya szintaktikailag feldolgozható. Három elakadt hálózati forgatókönyv igazolta az időkorlátot és a felület hibaállapotait. Az időpontfeldolgozás öt UTC/nyári/téli/óraátállítási esete `America/New_York` környezetben is helyes eredményt adott. JavaScript-szintaxisellenőrzés és `git diff --check` rendben.

**A vizuális ellenőrzés korlátja:** a natív böngészőablak hozzáférési kérése időtúllépéssel zárult; az elkülönített böngésző a fenti tanúsítványhibával megállt. Ezért valódi asztali/mobil tördelést, képernyőn megjelenő animációt és tényleges egérhúzást ezen az éles ellenőrzésen nem igazoltam. A DOM-tesztek nem helyettesítik ezt.

## Domain és tárhely

A honlap statikus HTML/CSS/JavaScript oldal; a jelenlegi GitHub Pages tárhelyről saját domainen is kiszolgálható. A Rackhostnál jelenleg csak a domain van meg.

Az ellenőrzött aktív névszerverek:

- `rob.ns.cloudflare.com`
- `tegan.ns.cloudflare.com`

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

A korábbi, DNS-váltás előtti ellenőrzéskor a saját domain HTTPS-en 521 választ adott. Az aktuális állapotot és a fennmaradó tanúsítványhibát a dokumentum eleje tartalmazza.

## Korábbi, már közzétett javítások

- A hírek megérkezhettek az oldal helyi adatainak betöltése előtt. Ez null adaton történő renderelést és JavaScript-hibát okozott. A hírlista most megvárja a helyi adatokat.
- A hírlekérés 12 másodperces időkorlátot kapott; hiba esetén az oldal érthető állapotüzenetet mutat.
- A világos háttér eredetileg 21,38 MiB-os PNG volt. Az új, 2560×1435-ös WebP 335 624 bájt. A sötét háttér új WebP-változata 369 952 bájt. Az eredeti fájlok megmaradtak.
- A módosított CSS és hírszkript verziózott hivatkozást kapott a gyorsítótár frissítéséhez.

## Korábbi ellenőrzések

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

A mostani kódjavításokat fel kell tölteni a GitHubra. A tanúsítványhiba rendezése után ellenőrizni kell mindkét HTTPS-címet, a HTTP → HTTPS átirányítást, az asztali és mobil tördelést, a panelek görgetését/bezárását, valamint a hírek és live adatok böngészős megjelenését a saját domainen.
