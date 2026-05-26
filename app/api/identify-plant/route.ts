// app/api/identify-plant/route.ts
// Server-side proxy to the Pl@ntNet API — keeps the API key off the client.
// POST with FormData containing an "image" field.
// Returns: { results: SpeciesSuggestion[] }
import { NextRequest, NextResponse } from 'next/server'

// Best-effort emoji for common genera / families
function plantEmoji(scientificName: string, family: string): string {
  const s = (scientificName + ' ' + family).toLowerCase()
  if (s.includes('rosa')    || s.includes('rosaceae'))   return '🌹'
  if (s.includes('lavandula'))                           return '💜'
  if (s.includes('helianthus'))                         return '🌻'
  if (s.includes('cactaceae') || s.includes('cactus'))  return '🌵'
  if (s.includes('crassulaceae') || s.includes('sedum')
    || s.includes('echeveria') || s.includes('succulent')) return '🌵'
  if (s.includes('aloe'))                               return '🌵'
  if (s.includes('ocimum')  || s.includes('lamiaceae') && s.includes('basil')) return '🌿'
  if (s.includes('mentha')  || s.includes('mint'))      return '🌱'
  if (s.includes('solanum') || s.includes('tomato'))    return '🍅'
  if (s.includes('jasminum') || s.includes('jasmin'))   return '🌸'
  if (s.includes('lilium')  || s.includes('liliaceae')) return '🌷'
  if (s.includes('tulipa'))                             return '🌷'
  if (s.includes('orchidaceae') || s.includes('orchid'))return '🌺'
  if (s.includes('pelargonium') || s.includes('geranium')) return '🌸'
  if (s.includes('hydrangea'))                          return '💐'
  if (s.includes('chrysanthemum'))                      return '🌼'
  if (s.includes('polypodiopsida') || s.includes('fern')) return '🌿'
  if (s.includes('bamboo') || s.includes('bambus'))     return '🎋'
  if (s.includes('ipomoea') || s.includes('convolvul')) return '🌸'
  return '🪴'
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.PLANTNET_API_KEY
  if (!apiKey) {
    // Key not configured — return empty list gracefully
    return NextResponse.json({ results: [] })
  }

  try {
    const incoming = await req.formData()
    const imageFile = incoming.get('image') as File | null
    if (!imageFile) {
      return NextResponse.json({ error: 'No image field' }, { status: 400 })
    }

    // Build the Pl@ntNet multipart request
    const pnForm = new FormData()
    pnForm.append('images', imageFile, imageFile.name || 'plant.jpg')
    pnForm.append('organs', 'auto')   // let PlantNet auto-detect organ type

    const url =
      `https://my-api.plantnet.org/v2/identify/all` +
      `?api-key=${apiKey}` +
      `&lang=en` +
      `&include-related-images=false` +
      `&no-reject=false` +
      `&nb-results=5`

    const pnRes = await fetch(url, { method: 'POST', body: pnForm })

    if (!pnRes.ok) {
      // Log server-side, return empty to client
      const errText = await pnRes.text().catch(() => '')
      console.error(`[identify-plant] PlantNet ${pnRes.status}:`, errText)
      return NextResponse.json({ results: [] })
    }

    const pnData = await pnRes.json() as {
      results?: Array<{
        score: number
        species?: {
          scientificName?: string
          commonNames?: string[]
          family?: { scientificName?: string }
        }
      }>
    }

    const results = (pnData.results ?? [])
      .filter(r => (r.score ?? 0) > 0.05)   // drop very low confidence
      .slice(0, 3)
      .map(r => ({
        name:  r.species?.scientificName ?? 'Unknown',
        emoji: plantEmoji(
          r.species?.scientificName ?? '',
          r.species?.family?.scientificName ?? '',
        ),
      }))

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[identify-plant] error:', err)
    return NextResponse.json({ results: [] })
  }
}
