#!/usr/bin/env node
/**
 * Tests for lib/geo.ts — reading a location out of whatever someone pastes.
 *
 *   node scripts/test-geo.mjs
 *
 * There is no test runner in this project, and geo.ts is pure functions with no
 * imports, so this strips the TypeScript annotations crudely and evaluates it.
 * Brittle if geo.ts grows imports or classes — if that happens, this stops
 * working loudly rather than silently, which is the acceptable failure.
 *
 * Worth having: the /maps/place/ case below failed on the first run. Such a URL
 * carries TWO coordinate pairs — @ is the camera position, !3d/!4d is the pin —
 * and the original code read the wrong one. Reading the code had not shown it.
 */
const src = await import('fs').then(m => m.readFileSync('src/lib/geo.ts','utf8'));
// crude TS->JS: strip types well enough for these pure functions
const js = src
  .replace(/export interface[\s\S]*?\n}\n/g, '')
  .replace(/: LatLng \| null/g, '').replace(/: string\)/g, ')')
  .replace(/: boolean/g, '').replace(/export function/g, 'function')
  .replace(/\(input: string\)/g, '(input)')
  .replace(/\(lat: number, lng: number\)/g, '(lat, lng)')
  .replace(/b: \{[\s\S]*?\}\): string \| null/g, 'b)')
  .replace(/: string \| null/g, '');
const mod = new Function(js + '; return { parseLatLng, isShortMapsLink };')();
const { parseLatLng, isShortMapsLink } = mod;

const cases = [
  ['24.5362, 81.3037', {lat:24.5362,lng:81.3037}],
  ['24.5362,81.3037', {lat:24.5362,lng:81.3037}],
  ['https://www.google.com/maps/@24.5362,81.3037,17z', {lat:24.5362,lng:81.3037}],
  ['https://www.google.com/maps/place/Rewa/@24.5362,81.3037,15z/data=!3m1!4b1!4m6!3d24.5535!4d81.2993', {lat:24.5535,lng:81.2993}],
  ['https://maps.google.com/?q=24.5362,81.3037', {lat:24.5362,lng:81.3037}],
  ['Rewa Madhya Pradesh', null],
  ['https://maps.app.goo.gl/abc123', null],
  ['0,0', null],
  ['999, 999', null],
  ['', null],
];
let fail = 0;
for (const [input, want] of cases) {
  const got = parseLatLng(input);
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok?'ok  ':'FAIL'} ${JSON.stringify(input).slice(0,58).padEnd(60)} -> ${JSON.stringify(got)}`);
}
console.log(`\nshort-link detected: ${isShortMapsLink('https://maps.app.goo.gl/x')}`);
console.log(fail ? `${fail} FAILED` : 'ALL PASS');
