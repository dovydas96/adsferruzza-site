#!/usr/bin/env node
// Fetch Google reviews + place details via Places API (New) v1, write data/reviews.json.
// Falls back to legacy Place Details on HTTP 400.
// Env: GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID; optional: REVIEWS_MAX (default 6), LANGUAGE (default it), OUTPUT_PATH
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.GOOGLE_PLACES_API_KEY;
const placeId = process.env.GOOGLE_PLACE_ID;
const language = process.env.LANGUAGE || 'it';
const max = parseInt(process.env.REVIEWS_MAX || '6', 10);
const outputPath = resolve(process.env.OUTPUT_PATH || resolve(__dirname, '..', 'data', 'reviews.json'));

if (!apiKey || !placeId) {
  console.error('Missing GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID');
  process.exit(1);
}

function writeJson(data) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function fetchV1() {
  const fieldMask = [
    'reviews', 'displayName', 'googleMapsUri', 'rating', 'userRatingCount',
    'regularOpeningHours', 'regularOpeningHours.weekdayDescriptions', 'regularOpeningHours.periods',
    'specialOpeningHours', 'specialOpeningHours.specialHourPeriods',
  ].join(',');
  const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=${language}`;
  const res = await fetch(url, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': fieldMask },
  });
  return { ok: res.ok, status: res.status, body: res.ok ? await res.json() : await res.text() };
}

async function fetchLegacy() {
  const fields = 'name,rating,user_ratings_total,website,url,opening_hours,formatted_phone_number,reviews,geometry';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&language=${language}&fields=${fields}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Legacy HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 'OK') throw new Error(`Legacy status ${json.status}`);
  return json.result;
}

function buildResultV1(resp) {
  const place = {
    name: resp.displayName?.text,
    place_id: placeId,
    rating: resp.rating,
    user_ratings_total: resp.userRatingCount,
    url: resp.googleMapsUri,
    regularOpeningHours: resp.regularOpeningHours || null,
    specialOpeningHours: resp.specialOpeningHours || null,
  };
  const sorted = (resp.reviews || []).slice().sort((a, b) =>
    (b.publishTime || '').localeCompare(a.publishTime || ''));
  const reviews = sorted.slice(0, max).map((r) => ({
    author_name: r.authorAttribution?.displayName,
    rating: r.rating,
    text: r.text?.text,
    relative_time_description: r.relativePublishTimeDescription,
    profile_photo_url: r.authorAttribution?.photoUri,
    time: r.publishTime ? Math.floor(new Date(r.publishTime).getTime() / 1000) : null,
    language,
  }));
  return { place, lastFetched: new Date().toISOString(), reviews };
}

function buildResultLegacy(result) {
  const place = {
    name: result.name,
    place_id: placeId,
    rating: result.rating,
    user_ratings_total: result.user_ratings_total,
    url: result.url || null,
    regularOpeningHours: result.opening_hours || null,
    specialOpeningHours: null,
  };
  const reviews = (result.reviews || []).slice(0, max).map((r) => ({
    author_name: r.author_name,
    rating: r.rating,
    text: r.text,
    relative_time_description: r.relative_time_description,
    profile_photo_url: r.profile_photo_url,
    time: r.time || null,
    language,
  }));
  return { place, lastFetched: new Date().toISOString(), reviews };
}

const v1 = await fetchV1();
if (v1.ok) {
  writeJson(buildResultV1(v1.body));
  console.log(`Saved ${(v1.body.reviews || []).length} reviews to ${outputPath}`);
  process.exit(0);
}

console.warn(`Places v1 HTTP ${v1.status}; body: ${String(v1.body).slice(0, 500)}`);
if (v1.status === 400) {
  try {
    const legacy = await fetchLegacy();
    writeJson(buildResultLegacy(legacy));
    console.log(`Legacy fallback saved to ${outputPath}`);
    process.exit(0);
  } catch (e) {
    console.warn(`Legacy fallback failed: ${e.message}`);
  }
}

if (v1.status === 401 || v1.status === 403) {
  writeJson({ place: null, lastFetched: new Date().toISOString(), reviews: [] });
  console.warn(`Places API ${v1.status}; wrote empty reviews.`);
  process.exit(0);
}

console.error('Unrecoverable Places API error');
process.exit(1);
