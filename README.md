# Pocket Memories — Browser Photo Booth

A polished, privacy-first photostrip web app built with Next.js, React, TypeScript and the browser MediaDevices/Canvas APIs.

## Features
- Live webcam preview
- Mirrored selfie mode
- Automated 3-second countdown for four photos
- Flash feedback and camera framing
- Retake/reset flow
- Four strip themes
- Original, monochrome, warm and cool photo finishes
- Custom strip caption and date
- Client-side Canvas rendering
- High-resolution PNG download
- Responsive desktop/mobile layout
- No backend or photo uploads

## Run locally
Use Node.js 22. If you manage Node with `nvm`, select the project's version first:

```bash
nvm install
nvm use
npm install
npm run dev
```
Open http://localhost:3000 and allow camera access.

## Production
Camera access requires HTTPS in production. Vercel provides HTTPS automatically.

### Deploy to Vercel
Import this project with the following settings:
- Framework preset: **Next.js**
- Root directory: the folder containing `package.json`
- Node.js version: **22.x** (also set in `package.json`)
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: leave the Next.js default
- Environment variables: none required

Before deploying, use Node 22 and run:

```bash
npm ci
npm run typecheck
npm run build
```

After deployment, test camera permission, four-photo capture, retake, and PNG
download on desktop and mobile. Camera access depends on browser support and
permission. Keep `package-lock.json` in source control so deployments use the
same dependency versions.

## Privacy
Images are captured and composed locally in the browser. This project does not include a server-side photo upload endpoint.
