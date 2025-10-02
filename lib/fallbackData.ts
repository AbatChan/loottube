import { promises as fs } from 'fs'
import path from 'path'

const FALLBACK_DATA_DIR = path.join(process.cwd(), 'data', 'fallback')

// Ensure fallback data directory exists
async function ensureFallbackDir() {
  try {
    await fs.mkdir(FALLBACK_DATA_DIR, { recursive: true })
  } catch (error) {
    console.warn('Could not create fallback data directory:', error)
  }
}

// Save API data as fallback for future use
export async function saveFallbackData(key: string, data: any): Promise<void> {
  try {
    await ensureFallbackDir()
    const filePath = path.join(FALLBACK_DATA_DIR, `${key}.json`)
    await fs.writeFile(filePath, JSON.stringify(data, null, 2))
    console.info(`[Fallback] Saved data for key: ${key}`)
  } catch (error) {
    console.warn(`[Fallback] Could not save data for key ${key}:`, error)
  }
}

// Load fallback data when API fails
export async function loadFallbackData(key: string): Promise<any | null> {
  try {
    const filePath = path.join(FALLBACK_DATA_DIR, `${key}.json`)
    const data = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(data)

    // Handle cached data structure with timestamp and value
    const result = parsed.value || parsed

    console.info(`[Fallback] Loaded data for key: ${key}`)
    return result
  } catch (error) {
    console.warn(`[Fallback] No fallback data found for key ${key}`)
    return null
  }
}

// Check if fallback data exists and is recent (within 7 days)
export async function isFallbackDataRecent(key: string, maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<boolean> {
  try {
    const filePath = path.join(FALLBACK_DATA_DIR, `${key}.json`)
    const stats = await fs.stat(filePath)
    const age = Date.now() - stats.mtime.getTime()
    return age < maxAgeMs
  } catch (error) {
    return false
  }
}

// Generate fallback data key based on API parameters
export function generateFallbackKey(type: 'videos' | 'shorts', category: string, region: string, categoryId?: string): string {
  const parts = [type, category, region]
  if (categoryId) {
    parts.push(`cat${categoryId}`)
  }
  return parts.join('_').replace(/[^a-zA-Z0-9_]/g, '_')
}

// Clear old fallback data to prevent storage bloat
export async function cleanupOldFallbackData(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    await ensureFallbackDir()
    const files = await fs.readdir(FALLBACK_DATA_DIR)
    const now = Date.now()

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      const filePath = path.join(FALLBACK_DATA_DIR, file)
      const stats = await fs.stat(filePath)
      const age = now - stats.mtime.getTime()

      if (age > maxAgeMs) {
        await fs.unlink(filePath)
        console.info(`[Fallback] Cleaned up old file: ${file}`)
      }
    }
  } catch (error) {
    console.warn('[Fallback] Error during cleanup:', error)
  }
}