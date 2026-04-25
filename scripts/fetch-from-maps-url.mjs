#!/usr/bin/env node
// Resolve a Google Maps short link, extract name+coords, find the Place ID,
// then delegate to fetch-google-reviews.mjs.
// Env: GOOGLE_PLACES_API_KEY, GOOGLE_MAPS_URL; optional: LANGUAGE, BIAS_RADIUS_METERS, OUTPUT_PATH
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.GOOGLE_PLACES_API_KEY;
const mapsUrl = process.env.GOOGLE_MAPS_URL;
const language = process.env.LANGUAGE || 'it';
const biasRadius = parseInt(process.env.BIAS_RADIUS_METERS || '2500', 10);

if (!apiKey || !mapsUrl) {
  console.error('Missing GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_URL');
  process.exit(1);
}

async function resolveFinalUrl(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    return res.url || url;
  } catch (e) {
    console.warn(`Could not resolve redirect: ${e.message}`);
    return url;
  }
}

function parseMapsUrl(url) {
  const decoded = decodeURIComponent(url);
  const nameMatch = decoded.match(/\/maps\/plac[ea]\/([^/]+)/);
  const coordMatch = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return {
    name: nameMatch ? nameMatch[1].replace(/\+/g, ' ') : null,
    lat: coordMatch ? parseFloat(coordMatch[1]) : null,
    lng: coordMatch ? parseFloat(coordMatch[2]) : null,
  };
}

async function findPlaceId({ name, lat, lng }) {
  if (!name) throw new Error('Could not parse a place name from URL');
  const bias = lat && lng ? `&locationbias=circle:${biasRadius}@${lat},${lng}` : '';
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&fields=place_id&language=${language}${bias}&key=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK' || !json.candidates?.[0]?.place_id) {
    throw new Error(`Find Place failed: ${json.status} ${json.error_message || ''}`);
  }
  return json.candidates[0].place_id;
}

const finalUrl = await resolveFinalUrl(mapsUrl);
console.log(`Resolved URL: ${finalUrl}`);
const info = parseMapsUrl(finalUrl);
const placeId = await findPlaceId(info);
console.log(`Found Place ID: ${placeId}`);

const result = spawnSync(process.execPath, [resolve(__dirname, 'fetch-google-reviews.mjs')], {
  stdio: 'inherit',
  env: { ...process.env, GOOGLE_PLACE_ID: placeId, LANGUAGE: language },
});
process.exit(result.status ?? 1);
