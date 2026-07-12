import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const sites = [
  ['david-heckhoff', 'david-heckhoff-portfolio'],
  ['giats', 'https-giats-me'],
  ['pedro-matos-chaves', 'pedro-matos-chaves-design'],
  ['thibaud-fellay', 'thibaud-fellay-portfolio-24'],
  ['jhosue-mesias', 'jhosue-mesias-portfolio'],
  ['veronica-zubakova', 'veronica-zubakova-portfolio'],
  ['sai-narayanan', 'sai-narayanan'],
  ['gregory-lalle', 'gregory-lalle-24'],
  ['jack-elder', 'jack-elder-design'],
  ['nalaprasad', 'nalaprasad-portfolio'],
  ['luc-hohler', 'luc-hohler-design'],
  ['tomoya-okada', 'portfolio-ver7-tomoya-okada'],
  ['dennis-snellenberg', 'dennis-snellenberg-portfolio'],
  ['agustin-burgos', 'agustin-burgos-portfolio'],
];

function decode(value = '') {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

const metadata = [];
for (const [id, slug] of sites) {
  const url = `https://www.awwwards.com/sites/${slug}`;
  const html = await (await fetch(url)).text();
  const title = decode(html.match(/<title>(.*?)<\/title>/s)?.[1]?.trim());
  const award = decode(html.match(/<h2 class="text-default">([^<]+)<\/h2>/s)?.[1]?.trim());
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/s)?.[1]?.trim());
  const rawTags = html.match(/&quot;tags&quot;:\[(.*?)\]/s)?.[1] || '';
  const tags = [...rawTags.matchAll(/&quot;(.*?)&quot;/g)].map((m) => decode(m[1]));
  const live = decode(html.match(/href="([^"]+)"\s+class="button button--medium--rounded"/s)?.[1]);
  metadata.push({ id, slug, url, title, award, live, description, tags });
  console.log(`${id}: ${award} ${live}`);
}

await fs.writeFile(path.join(ROOT, 'awwwards-metadata.json'), JSON.stringify(metadata, null, 2));
