// lib/cityData.ts
// Static city list used for the City Selector in Settings.
// Each city carries lat/lng so GPS nearest-match can work offline (no geocoding API needed).
//
// Display format:
//   US / Canada : "City, STATE/PROVINCE"  (e.g. "San Francisco, CA")
//   Everywhere else : "City, Country"     (e.g. "London, UK")
//
// The `displayName` is what gets stored in `profiles.city` and compared for
// geo-affinity matching in the community garden layout.

export type Continent = 'North America' | 'Latin America' | 'Europe' | 'Middle East & Africa' | 'Asia Pacific'

export interface City {
  name: string         // canonical short name  — "San Francisco"
  region: string       // state / province / country code  — "CA"
  country: string      // ISO-style label  — "US"
  displayName: string  // stored in DB + shown to the user  — "San Francisco, CA"
  continent: Continent
  lat: number
  lng: number
}

export const CONTINENT_ORDER: Continent[] = [
  'North America',
  'Latin America',
  'Europe',
  'Middle East & Africa',
  'Asia Pacific',
]

export const CITIES: City[] = [
  // ── North America ──────────────────────────────────────────────────────────
  { name: 'Atlanta',        region: 'GA', country: 'US', displayName: 'Atlanta, GA',          continent: 'North America', lat:  33.75, lng:  -84.39 },
  { name: 'Austin',         region: 'TX', country: 'US', displayName: 'Austin, TX',            continent: 'North America', lat:  30.27, lng:  -97.74 },
  { name: 'Boston',         region: 'MA', country: 'US', displayName: 'Boston, MA',            continent: 'North America', lat:  42.36, lng:  -71.06 },
  { name: 'Calgary',        region: 'AB', country: 'CA', displayName: 'Calgary, AB',           continent: 'North America', lat:  51.05, lng: -114.07 },
  { name: 'Chicago',        region: 'IL', country: 'US', displayName: 'Chicago, IL',           continent: 'North America', lat:  41.88, lng:  -87.63 },
  { name: 'Denver',         region: 'CO', country: 'US', displayName: 'Denver, CO',            continent: 'North America', lat:  39.74, lng: -104.98 },
  { name: 'Houston',        region: 'TX', country: 'US', displayName: 'Houston, TX',           continent: 'North America', lat:  29.76, lng:  -95.37 },
  { name: 'Los Angeles',    region: 'CA', country: 'US', displayName: 'Los Angeles, CA',       continent: 'North America', lat:  34.05, lng: -118.24 },
  { name: 'Miami',          region: 'FL', country: 'US', displayName: 'Miami, FL',             continent: 'North America', lat:  25.77, lng:  -80.19 },
  { name: 'Minneapolis',    region: 'MN', country: 'US', displayName: 'Minneapolis, MN',       continent: 'North America', lat:  44.98, lng:  -93.27 },
  { name: 'Montreal',       region: 'QC', country: 'CA', displayName: 'Montreal, QC',          continent: 'North America', lat:  45.50, lng:  -73.57 },
  { name: 'Nashville',      region: 'TN', country: 'US', displayName: 'Nashville, TN',         continent: 'North America', lat:  36.17, lng:  -86.78 },
  { name: 'New York',       region: 'NY', country: 'US', displayName: 'New York, NY',          continent: 'North America', lat:  40.71, lng:  -74.01 },
  { name: 'Philadelphia',   region: 'PA', country: 'US', displayName: 'Philadelphia, PA',      continent: 'North America', lat:  39.95, lng:  -75.17 },
  { name: 'Phoenix',        region: 'AZ', country: 'US', displayName: 'Phoenix, AZ',           continent: 'North America', lat:  33.45, lng: -112.07 },
  { name: 'Portland',       region: 'OR', country: 'US', displayName: 'Portland, OR',          continent: 'North America', lat:  45.52, lng: -122.68 },
  { name: 'San Diego',      region: 'CA', country: 'US', displayName: 'San Diego, CA',         continent: 'North America', lat:  32.72, lng: -117.16 },
  { name: 'San Francisco',  region: 'CA', country: 'US', displayName: 'San Francisco, CA',     continent: 'North America', lat:  37.77, lng: -122.42 },
  { name: 'Seattle',        region: 'WA', country: 'US', displayName: 'Seattle, WA',           continent: 'North America', lat:  47.61, lng: -122.33 },
  { name: 'Toronto',        region: 'ON', country: 'CA', displayName: 'Toronto, ON',           continent: 'North America', lat:  43.65, lng:  -79.38 },
  { name: 'Vancouver',      region: 'BC', country: 'CA', displayName: 'Vancouver, BC',         continent: 'North America', lat:  49.25, lng: -123.12 },
  { name: 'Washington',     region: 'DC', country: 'US', displayName: 'Washington, DC',        continent: 'North America', lat:  38.91, lng:  -77.04 },

  // ── Latin America ──────────────────────────────────────────────────────────
  { name: 'Bogotá',         region: '', country: 'Colombia',  displayName: 'Bogotá, Colombia',        continent: 'Latin America', lat:   4.71, lng:  -74.07 },
  { name: 'Buenos Aires',   region: '', country: 'Argentina', displayName: 'Buenos Aires, Argentina', continent: 'Latin America', lat: -34.60, lng:  -58.38 },
  { name: 'Lima',           region: '', country: 'Peru',      displayName: 'Lima, Peru',              continent: 'Latin America', lat: -12.05, lng:  -77.04 },
  { name: 'Mexico City',    region: '', country: 'Mexico',    displayName: 'Mexico City, Mexico',     continent: 'Latin America', lat:  19.43, lng:  -99.13 },
  { name: 'Rio de Janeiro', region: '', country: 'Brazil',    displayName: 'Rio de Janeiro, Brazil',  continent: 'Latin America', lat: -22.91, lng:  -43.17 },
  { name: 'Santiago',       region: '', country: 'Chile',     displayName: 'Santiago, Chile',         continent: 'Latin America', lat: -33.46, lng:  -70.65 },
  { name: 'São Paulo',      region: '', country: 'Brazil',    displayName: 'São Paulo, Brazil',       continent: 'Latin America', lat: -23.55, lng:  -46.63 },

  // ── Europe ─────────────────────────────────────────────────────────────────
  { name: 'Amsterdam',      region: '', country: 'Netherlands', displayName: 'Amsterdam, Netherlands', continent: 'Europe', lat:  52.37, lng:   4.90 },
  { name: 'Athens',         region: '', country: 'Greece',      displayName: 'Athens, Greece',         continent: 'Europe', lat:  37.98, lng:  23.73 },
  { name: 'Barcelona',      region: '', country: 'Spain',       displayName: 'Barcelona, Spain',       continent: 'Europe', lat:  41.39, lng:   2.17 },
  { name: 'Berlin',         region: '', country: 'Germany',     displayName: 'Berlin, Germany',        continent: 'Europe', lat:  52.52, lng:  13.40 },
  { name: 'Brussels',       region: '', country: 'Belgium',     displayName: 'Brussels, Belgium',      continent: 'Europe', lat:  50.85, lng:   4.35 },
  { name: 'Copenhagen',     region: '', country: 'Denmark',     displayName: 'Copenhagen, Denmark',    continent: 'Europe', lat:  55.68, lng:  12.57 },
  { name: 'Dublin',         region: '', country: 'Ireland',     displayName: 'Dublin, Ireland',        continent: 'Europe', lat:  53.33, lng:  -6.25 },
  { name: 'Helsinki',       region: '', country: 'Finland',     displayName: 'Helsinki, Finland',      continent: 'Europe', lat:  60.17, lng:  24.94 },
  { name: 'Lisbon',         region: '', country: 'Portugal',    displayName: 'Lisbon, Portugal',       continent: 'Europe', lat:  38.72, lng:  -9.14 },
  { name: 'London',         region: '', country: 'UK',          displayName: 'London, UK',             continent: 'Europe', lat:  51.51, lng:  -0.13 },
  { name: 'Madrid',         region: '', country: 'Spain',       displayName: 'Madrid, Spain',          continent: 'Europe', lat:  40.42, lng:  -3.70 },
  { name: 'Milan',          region: '', country: 'Italy',       displayName: 'Milan, Italy',           continent: 'Europe', lat:  45.47, lng:   9.19 },
  { name: 'Munich',         region: '', country: 'Germany',     displayName: 'Munich, Germany',        continent: 'Europe', lat:  48.14, lng:  11.58 },
  { name: 'Oslo',           region: '', country: 'Norway',      displayName: 'Oslo, Norway',           continent: 'Europe', lat:  59.91, lng:  10.75 },
  { name: 'Paris',          region: '', country: 'France',      displayName: 'Paris, France',          continent: 'Europe', lat:  48.85, lng:   2.35 },
  { name: 'Prague',         region: '', country: 'Czechia',     displayName: 'Prague, Czechia',        continent: 'Europe', lat:  50.08, lng:  14.44 },
  { name: 'Rome',           region: '', country: 'Italy',       displayName: 'Rome, Italy',            continent: 'Europe', lat:  41.90, lng:  12.50 },
  { name: 'Stockholm',      region: '', country: 'Sweden',      displayName: 'Stockholm, Sweden',      continent: 'Europe', lat:  59.33, lng:  18.07 },
  { name: 'Vienna',         region: '', country: 'Austria',     displayName: 'Vienna, Austria',        continent: 'Europe', lat:  48.21, lng:  16.37 },
  { name: 'Warsaw',         region: '', country: 'Poland',      displayName: 'Warsaw, Poland',         continent: 'Europe', lat:  52.23, lng:  21.01 },
  { name: 'Zurich',         region: '', country: 'Switzerland', displayName: 'Zurich, Switzerland',    continent: 'Europe', lat:  47.38, lng:   8.54 },

  // ── Middle East & Africa ────────────────────────────────────────────────────
  { name: 'Cairo',          region: '', country: 'Egypt',        displayName: 'Cairo, Egypt',           continent: 'Middle East & Africa', lat:  30.05, lng:  31.24 },
  { name: 'Cape Town',      region: '', country: 'South Africa', displayName: 'Cape Town, South Africa',continent: 'Middle East & Africa', lat: -33.93, lng:  18.42 },
  { name: 'Dubai',          region: '', country: 'UAE',          displayName: 'Dubai, UAE',             continent: 'Middle East & Africa', lat:  25.20, lng:  55.27 },
  { name: 'Istanbul',       region: '', country: 'Turkey',       displayName: 'Istanbul, Turkey',       continent: 'Middle East & Africa', lat:  41.01, lng:  28.95 },
  { name: 'Lagos',          region: '', country: 'Nigeria',      displayName: 'Lagos, Nigeria',         continent: 'Middle East & Africa', lat:   6.45, lng:   3.47 },
  { name: 'Nairobi',        region: '', country: 'Kenya',        displayName: 'Nairobi, Kenya',         continent: 'Middle East & Africa', lat:  -1.29, lng:  36.82 },
  { name: 'Tel Aviv',       region: '', country: 'Israel',       displayName: 'Tel Aviv, Israel',       continent: 'Middle East & Africa', lat:  32.09, lng:  34.78 },

  // ── Asia Pacific ────────────────────────────────────────────────────────────
  { name: 'Auckland',       region: '', country: 'New Zealand', displayName: 'Auckland, New Zealand',  continent: 'Asia Pacific', lat: -36.85, lng:  174.76 },
  { name: 'Bangkok',        region: '', country: 'Thailand',    displayName: 'Bangkok, Thailand',      continent: 'Asia Pacific', lat:  13.75, lng:  100.52 },
  { name: 'Beijing',        region: '', country: 'China',       displayName: 'Beijing, China',         continent: 'Asia Pacific', lat:  39.91, lng:  116.39 },
  { name: 'Chennai',        region: '', country: 'India',       displayName: 'Chennai, India',         continent: 'Asia Pacific', lat:  13.08, lng:   80.27 },
  { name: 'Delhi',          region: '', country: 'India',       displayName: 'Delhi, India',           continent: 'Asia Pacific', lat:  28.66, lng:   77.23 },
  { name: 'Ho Chi Minh City',region:'', country: 'Vietnam',     displayName: 'Ho Chi Minh City, Vietnam',continent:'Asia Pacific',lat:  10.82, lng:  106.63 },
  { name: 'Hong Kong',      region: '', country: 'China',       displayName: 'Hong Kong, China',       continent: 'Asia Pacific', lat:  22.32, lng:  114.17 },
  { name: 'Jakarta',        region: '', country: 'Indonesia',   displayName: 'Jakarta, Indonesia',     continent: 'Asia Pacific', lat:  -6.21, lng:  106.85 },
  { name: 'Kuala Lumpur',   region: '', country: 'Malaysia',    displayName: 'Kuala Lumpur, Malaysia', continent: 'Asia Pacific', lat:   3.14, lng:  101.69 },
  { name: 'Manila',         region: '', country: 'Philippines', displayName: 'Manila, Philippines',    continent: 'Asia Pacific', lat:  14.60, lng:  120.98 },
  { name: 'Melbourne',      region: '', country: 'Australia',   displayName: 'Melbourne, Australia',   continent: 'Asia Pacific', lat: -37.81, lng:  144.96 },
  { name: 'Mumbai',         region: '', country: 'India',       displayName: 'Mumbai, India',          continent: 'Asia Pacific', lat:  19.08, lng:   72.88 },
  { name: 'Osaka',          region: '', country: 'Japan',       displayName: 'Osaka, Japan',           continent: 'Asia Pacific', lat:  34.69, lng:  135.50 },
  { name: 'Seoul',          region: '', country: 'South Korea', displayName: 'Seoul, South Korea',     continent: 'Asia Pacific', lat:  37.57, lng:  126.98 },
  { name: 'Shanghai',       region: '', country: 'China',       displayName: 'Shanghai, China',        continent: 'Asia Pacific', lat:  31.23, lng:  121.47 },
  { name: 'Singapore',      region: '', country: 'Singapore',   displayName: 'Singapore',              continent: 'Asia Pacific', lat:   1.35, lng:  103.82 },
  { name: 'Sydney',         region: '', country: 'Australia',   displayName: 'Sydney, Australia',      continent: 'Asia Pacific', lat: -33.87, lng:  151.21 },
  { name: 'Taipei',         region: '', country: 'Taiwan',      displayName: 'Taipei, Taiwan',         continent: 'Asia Pacific', lat:  25.05, lng:  121.55 },
  { name: 'Tokyo',          region: '', country: 'Japan',       displayName: 'Tokyo, Japan',           continent: 'Asia Pacific', lat:  35.69, lng:  139.69 },
]

// Sort each continent's cities alphabetically by displayName.
// (The array literal order above is the canonical grouping reference only.)
CITIES.sort((a, b) => {
  const ci = CONTINENT_ORDER.indexOf(a.continent) - CONTINENT_ORDER.indexOf(b.continent)
  if (ci !== 0) return ci
  return a.displayName.localeCompare(b.displayName)
})

/**
 * Look up a city by its displayName string (as stored in profiles.city).
 * Returns undefined if the stored value doesn't match any entry.
 */
export function findCityByDisplayName(displayName: string): City | undefined {
  const lower = displayName.trim().toLowerCase()
  return CITIES.find(c => c.displayName.toLowerCase() === lower)
}

/**
 * Find the nearest city to a GPS coordinate using squared Euclidean distance.
 * Accurate enough for "which major city am I near?" — not for navigation.
 */
export function findNearestCity(lat: number, lng: number): City {
  let best = CITIES[0]
  let bestDist = Infinity
  for (const c of CITIES) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2
    if (d < bestDist) { bestDist = d; best = c }
  }
  return best
}
