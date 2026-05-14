# Image Extractor

List images, alt text, dimensions, and likely hero images from a page.

## API

```
GET /api/extract?url=https://example.com
```

Returns a JSON list of images with src, alt, width, height, and a likelyHero flag.

## Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lindoai/image-extractor)

## Environment

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
