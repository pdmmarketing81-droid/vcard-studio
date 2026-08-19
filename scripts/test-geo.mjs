#!/usr/bin/env node
/**
 * Tests for lib/geo.ts — reading a location out of whatever someone pastes.
 *
 *   npm run test:geo
 *
 * There is no test runner in this project. The first version of this file
 * stripped the TypeScript with regexes and evaluated the result; it broke the
 * moment geo.ts gained a non-exported `interface`. So it now runs the real
 * compiler over the one file and imports the output — slower by a second, and
 * it cannot rot in that way again.
 *
 * Worth having: two of these failed on their first run. A /maps/place/ URL
 * carries TWO coordinate pairs — @ is the camera, !3d/!4d is the pin — and the
 * original code read the wrong one, putting the marker a few hundred metres
 * from the shop. Reading the code had not shown it.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'geo-'));

try {
  execFileSync(
    'npx',
    [
      'tsc', 'src/lib/geo.ts',
      '--outDir', out,
      '--module', 'esnext',
      '--target', 'es2022',
      '--moduleResolution', 'bundler',
      // geo.ts imports nothing, but tsc still pulls in every @types package it
      // can find and then reports errors from inside them. None of that has
      // anything to do with this file.
      '--skipLibCheck',
    ],
    { stdio: 'inherit' }
  );
} catch {
  console.error('Could not compile src/lib/geo.ts');
  process.exit(1);
}

const { parseLatLng, parsePlaceName, parseEmbedSrc, isShortMapsLink } = await import(
  pathToFileURL(join(out, 'geo.js')).href
);

let fail = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(56)} -> ${JSON.stringify(got)}`);
};

/* ------------------------------ coordinates ----------------------------- */
const coords = [
  ['24.5362, 81.3037', { lat: 24.5362, lng: 81.3037 }],
  ['24.5362,81.3037', { lat: 24.5362, lng: 81.3037 }],
  ['https://www.google.com/maps/@24.5362,81.3037,17z', { lat: 24.5362, lng: 81.3037 }],
  // Both pairs present: !3d/!4d is the pin and must win over @.
  [
    'https://www.google.com/maps/place/Rewa/@24.5362,81.3037,15z/data=!3m1!4b1!4m6!3d24.5535!4d81.2993',
    { lat: 24.5535, lng: 81.2993 },
  ],
  ['https://maps.google.com/?q=24.5362,81.3037', { lat: 24.5362, lng: 81.3037 }],
  ['Rewa Madhya Pradesh', null],
  // Short links carry no coordinates at all.
  ['https://maps.app.goo.gl/abc123', null],
  // Null Island is a failed parse, not a shop.
  ['0,0', null],
  ['999, 999', null],
  ['', null],
];
for (const [input, want] of coords) {
  check(JSON.stringify(input).slice(0, 54), parseLatLng(input), want);
}

/* -------------------------------- the name ------------------------------ */
const names = [
  [
    'https://www.google.com/maps/place/Samdareeya+hotel+and+multiplex/@24.5442214,81.3166173,17z/data=!3m1',
    'Samdareeya hotel and multiplex',
  ],
  ['https://www.google.com/maps/place/Shri+Ram+Medical/@24.5,81.3,17z', 'Shri Ram Medical'],
  ['https://www.google.com/maps/@24.5442,81.3166,17z', null],
  ['24.5442, 81.3166', null],
];
for (const [input, want] of names) {
  check(`name ${JSON.stringify(input).slice(0, 48)}`, parsePlaceName(input), want);
}

/* ------------------------------ embed link ------------------------------ */
const EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3600.5!2d81.29!3d24.54!5e0';
const embeds = [
  // The whole iframe tag, which is what "Copy HTML" puts on the clipboard.
  [`<iframe src="${EMBED}" width="600" height="450"></iframe>`, EMBED],
  // Just the URL.
  [EMBED, EMBED],
  // A normal place link is not an embed link.
  ['https://www.google.com/maps/place/Samdariya+Gold/@24.5,81.2,17z', null],
  // Anything else must be refused: this value becomes an iframe src.
  ['<iframe src="https://evil.example.com/x"></iframe>', null],
  ['https://www.google.com.evil.test/maps/embed?pb=1', null],
  ['', null],
];
for (const [input, want] of embeds) {
  check(`embed ${JSON.stringify(input).slice(0, 46)}`, parseEmbedSrc(input), want);
}

check('short link recognised', isShortMapsLink('https://maps.app.goo.gl/x'), true);

rmSync(out, { recursive: true, force: true });

console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
