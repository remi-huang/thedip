# The Dip Interactive 2.0

An interactive physics simulation inspired by Seth Godin's *The Dip*. Players push a ball through effort valleys, diagnose whether a challenge is a true Dip, Cul-de-Sac, or Cliff, and generate custom goal curves with a server-side Gemini endpoint.

## Features

- Physics-based Dip canvas with breakthrough feedback
- Diagnostic quiz for strategic persistence versus quitting
- Bilingual insight cards and interactive momentum tools
- Express API endpoint for custom Dip curve generation

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`.

3. Run the app:

   ```sh
   npm run dev
   ```

## Build

```sh
npm run lint
npm run build
```
