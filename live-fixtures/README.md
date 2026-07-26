# Bandersnatch checkout fixtures

Public, controlled Web targets for the cross-platform consistency demo.

## Production scenarios

- Success: `https://bandersnatch-fixtures-alok.magic-shark-0825.chatgpt.site/?mode=success`
- Mismatch: `https://bandersnatch-fixtures-alok.magic-shark-0825.chatgpt.site/?mode=mismatch`
- Missing evidence: `https://bandersnatch-fixtures-alok.magic-shark-0825.chatgpt.site/?mode=missing`

Each scenario exposes the same stable Playwright test IDs:

- `open-cart`
- `cart`
- `coupon-input`
- `apply-coupon`
- `coupon-status`
- `total`

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run build
```

Set `WEB_FIXTURE_URL` to the production root URL when Bandersnatch should run
Playwright against the hosted fixture. When it is unset, the adapter uses the
portable local HTML fixture.
