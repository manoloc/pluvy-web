# Pluvy Web

Static landing site for Pluvy at `https://pluvy.org`.

## Stack

- Vite
- React
- TypeScript
- Plain CSS
- Static GitHub Pages deploy

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

## Typecheck

```bash
npm run typecheck
```

## Build

```bash
npm run build
```

The static output is written to `dist/`.

## GitHub Pages Deploy

1. Build the site with `npm run build`.
2. Deploy the `dist/` folder to GitHub Pages.
3. Keep `public/CNAME` set to `pluvy.org`; Vite copies it to `dist/CNAME`.
4. `public/404.html` redirects deep links such as `/privacy` back into the static app.

## DNS Notes

For `pluvy.org`, configure DNS according to GitHub Pages custom-domain instructions:

- Apex `A` records should point to GitHub Pages IPs.
- Optional `AAAA` records can be added for IPv6.
- `www` can be a `CNAME` to the GitHub Pages host if you want `www.pluvy.org`.
- Enable HTTPS in GitHub Pages after DNS resolves.

## Current Scope

This site is static only. It does not include login, Firebase, analytics, ads, payments, or the public map.
