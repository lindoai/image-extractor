import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { parseHTML } from 'linkedom';
import { readTurnstileTokenFromUrl, verifyTurnstileToken } from '../../_shared/turnstile';
import { renderTextToolPage, turnstileSiteKeyFromEnv } from '../../_shared/tool-page';

type Env = { Bindings: { TURNSTILE_SITE_KEY?: string; TURNSTILE_SECRET_KEY?: string } };

const app = new Hono<Env>();
app.use('/api/*', cors());
app.get('/', (c) =>
  c.html(
    renderTextToolPage({
      title: 'Image Extractor',
      description: 'List images, alt text, dimensions, and likely hero images from a page.',
      endpoint: '/api/extract',
      sample: '{ "url": "https://example.com", "images": [] }',
      siteKey: turnstileSiteKeyFromEnv(c.env),
      buttonLabel: 'Extract',
      toolSlug: 'image-extractor',
    })
  )
);
app.get('/health', (c) => c.json({ ok: true }));
app.get('/api/extract', async (c) => {
  const captcha = await verifyTurnstileToken(
    c.env,
    readTurnstileTokenFromUrl(c.req.url),
    c.req.header('CF-Connecting-IP')
  );
  if (!captcha.ok) return c.json({ error: captcha.error }, 403);

  const normalized = normalizeUrl(c.req.query('url') ?? '');
  if (!normalized) return c.json({ error: 'A valid http(s) URL is required.' }, 400);

  const html = await fetchHtml(normalized);
  if (!html) return c.json({ error: 'Failed to fetch page.' }, 502);

  const { document } = parseHTML(html);
  const base = new URL(normalized);
  const images: { src: string; alt: string; width: number | null; height: number | null; likelyHero: boolean }[] = [];
  const seen = new Set<string>();

  document.querySelectorAll('img[src]').forEach((el: any, index: number) => {
    const raw = el.getAttribute('src')?.trim() ?? '';
    if (!raw) return;
    let absolute: string;
    try {
      absolute = new URL(raw, base).toString();
    } catch {
      return;
    }
    if (seen.has(absolute)) return;
    seen.add(absolute);
    const alt = (el.getAttribute('alt') || '').trim();
    const width = parseInt(el.getAttribute('width') || '', 10) || null;
    const height = parseInt(el.getAttribute('height') || '', 10) || null;
    const likelyHero = Boolean(index < 3 && ((width && width >= 800) || (height && height >= 400)));
    images.push({ src: absolute, alt, width, height, likelyHero });
  });

  return c.json({ url: normalized, total: images.length, images });
});

async function fetchHtml(url: string) {
  const r = await fetch(url, {
    headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': 'Lindo Free Tools/1.0 (+https://lindo.ai/tools)' },
  }).catch(() => null);
  return r?.ok ? r.text() : null;
}

function normalizeUrl(value: string): string | null {
  try {
    return new URL(value.startsWith('http') ? value : `https://${value}`).toString();
  } catch {
    return null;
  }
}

export default app;
