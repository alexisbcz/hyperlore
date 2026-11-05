// Push every sitemap URL to IndexNow (Bing, which also feeds DuckDuckGo, Qwant and Ecosia, plus Yandex,
// Seznam and Naver) so new and changed pages are crawled within hours instead of weeks.
// Run after a production deploy: node web/scripts/indexnow.mjs [https://site]
const KEY = "48bf60e226f69a444afeca1e667e01d2"; // public/<key>.txt proves ownership; the key isn't a secret.
const site = (process.argv[2] ?? process.env.SITE_URL ?? "https://hyperlore-omega.vercel.app").replace(/\/$/, "");
const xml = await (await fetch(`${site}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urls.length) throw new Error("No URLs in the sitemap");
for (let i = 0; i < urls.length; i += 10000) {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(site).host, key: KEY, keyLocation: `${site}/${KEY}.txt`, urlList: urls.slice(i, i + 10000) }),
  });
  console.log(`IndexNow: ${Math.min(10000, urls.length - i)} URLs → HTTP ${res.status}`);
}
