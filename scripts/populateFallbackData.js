// Script to populate fallback data from existing cache
const fs = require('fs').promises
const path = require('path')

const CACHE_FILE = path.join(process.cwd(), 'data', 'youtube-cache.json')
const FALLBACK_DIR = path.join(process.cwd(), 'data', 'fallback')

// Generate fallback data key based on API parameters
function generateFallbackKey(type, category, region, categoryId) {
  const parts = [type, category, region]
  if (categoryId) {
    parts.push(`cat${categoryId}`)
  }
  return parts.join('_').replace(/[^a-zA-Z0-9_]/g, '_')
}

async function populateFallbackData() {
  try {
    // Ensure fallback directory exists
    await fs.mkdir(FALLBACK_DIR, { recursive: true })

    // Read existing cache
    const cacheData = await fs.readFile(CACHE_FILE, 'utf-8')
    const cache = JSON.parse(cacheData)

    console.log(`Found ${Object.keys(cache).length} cached entries`)

    let count = 0
    for (const [cacheKey, data] of Object.entries(cache)) {
      // Parse cache key to generate fallback key
      // Format: "type:categoryId:category:region"
      const parts = cacheKey.split(':')
      if (parts.length >= 3) {
        const [type, categoryId, category, region] = parts
        const fallbackKey = generateFallbackKey(type, category, region || 'US', categoryId)

        const fallbackFile = path.join(FALLBACK_DIR, `${fallbackKey}.json`)
        await fs.writeFile(fallbackFile, JSON.stringify(data, null, 2))

        console.log(`Created fallback file: ${fallbackKey}.json`)
        count++
      }
    }

    console.log(`Successfully created ${count} fallback data files`)
  } catch (error) {
    console.error('Error populating fallback data:', error)
  }
}

// Run the script
populateFallbackData()