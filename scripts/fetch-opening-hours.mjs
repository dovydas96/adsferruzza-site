#!/usr/bin/env node
// Fetch opening hours from Google Places API (New) v1 and merge into data/reviews.json.
// Env: GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const reviewsPath = resolve(__dirname, '..', 'data', 'reviews.json');

const apiKey = process.env.GOOGLE_PLACES_API_KEY;
const placeId = process.env.GOOGLE_PLACE_ID;
if (!apiKey || !placeId) {
  console.error('Missing GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID');
  process.exit(1);
}

const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=it`;
const res = await fetch(url, {
  headers: {
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'regularOpeningHours,specialOpeningHours',
  },
});
if (!res.ok) {
  console.error(`Places API error: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
const body = await res.json();

const existing = JSON.parse(readFileSync(reviewsPath, 'utf8'));
existing.place = existing.place || {};
if (body.regularOpeningHours) existing.place.regularOpeningHours = body.regularOpeningHours;
if (body.specialOpeningHours) existing.place.specialOpeningHours = body.specialOpeningHours;

writeFileSync(reviewsPath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
console.log(`Opening hours updated in ${reviewsPath}`);
