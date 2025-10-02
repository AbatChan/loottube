// Map of country codes to region codes supported by YouTube API
const COUNTRY_TO_REGION: Record<string, string> = {
  US: 'US',
  GB: 'GB',
  IN: 'IN',
  CA: 'CA',
  AU: 'AU',
  DE: 'DE',
  FR: 'FR',
  JP: 'JP',
  BR: 'BR',
  MX: 'MX',
  ES: 'ES',
  IT: 'IT',
  KR: 'KR',
  RU: 'RU',
  NL: 'NL',
  PL: 'PL',
  SE: 'SE',
  TR: 'TR',
  AR: 'AR',
  CO: 'CO',
  NG: 'NG', // Nigeria
  ZA: 'ZA',
  EG: 'EG',
  KE: 'KE',
  GH: 'GH',
  PH: 'PH',
  ID: 'ID',
  TH: 'TH',
  VN: 'VN',
  MY: 'MY',
  SG: 'SG',
  NZ: 'NZ',
  IE: 'IE',
  CH: 'CH',
  AT: 'AT',
  BE: 'BE',
  DK: 'DK',
  NO: 'NO',
  FI: 'FI',
  PT: 'PT',
  CZ: 'CZ',
  RO: 'RO',
  HU: 'HU',
  IL: 'IL',
  SA: 'SA',
  AE: 'AE',
  CL: 'CL',
  PE: 'PE',
}

const DEFAULT_REGIONS = ['US', 'GB', 'IN', 'CA', 'AU']

interface GeolocationResult {
  regionCode: string
  fromGeolocation: boolean
}

// Get user's country from IP-based geolocation API via our server route
async function getCountryFromIP(): Promise<string | null> {
  try {
    // Use our API route to avoid CSP issues
    const response = await fetch('/api/geolocation', {
      cache: 'force-cache',
      next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.country_code || null
  } catch (error) {
    console.warn('Failed to get country from IP:', error)
    return null
  }
}

// Get user's region code for YouTube API
export async function getUserRegion(): Promise<GeolocationResult> {
  // Check for user-selected location preference (highest priority)
  if (typeof window !== 'undefined') {
    const userSelectedLocation = localStorage.getItem('lootube_location')
    if (userSelectedLocation && COUNTRY_TO_REGION[userSelectedLocation]) {
      return {
        regionCode: COUNTRY_TO_REGION[userSelectedLocation],
        fromGeolocation: false // User selected, not auto-detected
      }
    }

    // Check for manual override (useful for development)
    const manualRegion = localStorage.getItem('lootube_manual_region')
    if (manualRegion && COUNTRY_TO_REGION[manualRegion]) {
      return {
        regionCode: COUNTRY_TO_REGION[manualRegion],
        fromGeolocation: true
      }
    }

    // Check if we have a cached region
    const cached = localStorage.getItem('lootube_user_region')
    const cacheTime = localStorage.getItem('lootube_user_region_time')

    if (cached && cacheTime) {
      const age = Date.now() - parseInt(cacheTime, 10)
      // Use cache if less than 24 hours old
      if (age < 86400000) {
        return {
          regionCode: cached,
          fromGeolocation: true
        }
      }
    }
  }

  // Try to get country from IP
  const countryCode = await getCountryFromIP()

  if (countryCode && COUNTRY_TO_REGION[countryCode]) {
    const regionCode = COUNTRY_TO_REGION[countryCode]

    // Cache the result
    if (typeof window !== 'undefined') {
      localStorage.setItem('lootube_user_region', regionCode)
      localStorage.setItem('lootube_user_region_time', Date.now().toString())
    }

    return {
      regionCode,
      fromGeolocation: true
    }
  }

  // Fallback to random region
  const randomRegion = DEFAULT_REGIONS[Math.floor(Math.random() * DEFAULT_REGIONS.length)]

  return {
    regionCode: randomRegion,
    fromGeolocation: false
  }
}

// Set manual region (useful for development or if auto-detection fails)
export function setManualRegion(countryCode: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lootube_manual_region', countryCode)
    // Clear cache to force re-detection next time
    clearRegionCache()
  }
}

// Clear manual region override
export function clearManualRegion(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lootube_manual_region')
  }
}

// Clear cached region (useful for testing or manual override)
export function clearRegionCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lootube_user_region')
    localStorage.removeItem('lootube_user_region_time')
  }
}
