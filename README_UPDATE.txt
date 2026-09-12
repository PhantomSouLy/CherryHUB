HappyCherryChan official site – WebNews live feed update

Changed/new files:
- index.html
- news-live.js

What it does:
- Connects the Hírek section to:
  https://happycherrychan-webnews.phantomsouly.workers.dev/api/news
- The old local sample news is ignored by the site.
- If Discord contains no WebNews entries, the news area shows only:
  “Még nincsenek hírek.”
- When /webnews creates a Discord WebNews message, the site fetches it from the Worker API.
- The optional Discord extra text/link is mapped to the existing full-news modal.
- Browser title now uses HappyCherryChan official-site naming rather than CherryHUB.

Note:
The legacy data/content.json still contains the old sample news entry, but news-live.js deliberately overrides the local news source, so it will never be displayed. It can be cleaned from content.json later without affecting the live system.
