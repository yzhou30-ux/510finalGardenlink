// app/api/identify/route.ts
// Server-side proxy to the Pl@ntNet API — keeps PLANTNET_API_KEY off the client.
//
// POST with FormData containing one "image" field (File / Blob).
//
// Successful response (score ≥ 0.3):
//   { success: true, result: { speciesName, genus, family, commonNames, score } }
//
// Silent-failure response (low confidence, timeout, key missing, API error):
//   { success: false, error: "low_confidence" | "timeout" | "api_error" | "no_api_key" }
//
// Always returns HTTP 200 — callers use the `success` field, not the status code.

import { NextRequest, NextResponse } from 'next/server'

// Minimum confidence to surface a result to the client.
const MIN_SCORE = 0.30

// PlantNet API response shape (only the fields we use)
interface PlantNetResult {
  score: number
  species?: {
    scientificNameWithoutAuthor?: string
    commonNames?: string[]
    genus?:  { scientificNameWithoutAuthor?: string }
    family?: { scientificNameWithoutAuthor?: string }
  }
  // Organ detected in the submitted image.
  // PlantNet v2 exposes this via two locations depending on version:
  //   newer: result.organs[0].id        e.g. "leaf", "flower", "fruit", "bark", "habit"
  //   older: result.images[0].organ     same values, from the best-match reference image
  // We read both and take whichever is present.
  organs?: { id: string; score?: number }[]
  images?: { organ?: string }[]
}

export async function POST(req: NextRequest) {
  // ── 1. Guard: key must be configured ──────────────────────────────────────
  const apiKey = process.env.PLANTNET_API_KEY
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'no_api_key' })
  }

  // ── 2. Extract image from incoming FormData ────────────────────────────────
  let imageFile: File | null = null
  try {
    const form = await req.formData()
    imageFile = form.get('image') as File | null
  } catch {
    return NextResponse.json({ success: false, error: 'api_error' })
  }

  if (!imageFile) {
    return NextResponse.json({ success: false, error: 'api_error' })
  }

  // ── 3. Build Pl@ntNet request with 5s abort timeout ───────────────────────
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), 5_000)

  let pnRes: Response
  try {
    const pnForm = new FormData()
    pnForm.append('images', imageFile, imageFile.name || 'plant.jpg')
    pnForm.append('organs', 'auto')

    const url =
      `https://my-api.plantnet.org/v2/identify/all` +
      `?api-key=${apiKey}` +
      `&lang=en` +
      `&include-related-images=false` +
      `&no-reject=false` +
      `&nb-results=3`

    pnRes = await fetch(url, { method: 'POST', body: pnForm, signal: controller.signal })
  } catch (err) {
    clearTimeout(timeoutId)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json({ success: false, error: isAbort ? 'timeout' : 'api_error' })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!pnRes.ok) {
    const errText = await pnRes.text().catch(() => '')
    console.error(`[identify] PlantNet ${pnRes.status}:`, errText)
    return NextResponse.json({ success: false, error: 'api_error' })
  }

  // ── 4. Parse response and pick the top result ──────────────────────────────
  let pnData: { results?: PlantNetResult[] }
  try {
    pnData = await pnRes.json()
  } catch {
    return NextResponse.json({ success: false, error: 'api_error' })
  }

  // 🔍 DIAGNOSTIC STEP 1 — remove after debugging
  console.log('[DEBUG identify] PlantNet raw response (first result):', JSON.stringify((pnData.results ?? [])[0], null, 2))

  const top = (pnData.results ?? [])[0]
  if (!top || top.score < MIN_SCORE) {
    return NextResponse.json({ success: false, error: 'low_confidence' })
  }

  // ── 5. Extract organ label ────────────────────────────────────────────────
  // Try the newer top-level organs[] first, fall back to images[0].organ.
  // Possible values: "leaf", "flower", "fruit", "bark", "habit", "other", "auto".
  // "auto" means PlantNet couldn't determine the organ — treat it as absent.
  const rawOrgan = top.organs?.[0]?.id ?? top.images?.[0]?.organ ?? null
  const organ = rawOrgan && rawOrgan !== 'auto'
    ? rawOrgan.charAt(0).toUpperCase() + rawOrgan.slice(1)
    : null

  // ── 6. Return structured botanical result ─────────────────────────────────
  return NextResponse.json({
    success: true,
    result: {
      speciesName: top.species?.scientificNameWithoutAuthor ?? '',
      genus:       top.species?.genus?.scientificNameWithoutAuthor ?? '',
      family:      top.species?.family?.scientificNameWithoutAuthor ?? '',
      commonNames: top.species?.commonNames ?? [],
      score:       top.score,
      organ,       // e.g. "Leaf" | "Flower" | "Fruit" | "Bark" | "Habit" | null
    },
  })
}
