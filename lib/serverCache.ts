import { promises as fs } from 'fs'
import path from 'path'

const CACHE_DIR = path.join(process.cwd(), 'data')
const CACHE_FILE = path.join(CACHE_DIR, 'youtube-cache.json')

interface CacheMap {
  [key: string]: {
    timestamp: number
    value: unknown
  }
}

// In-memory lock to prevent concurrent writes
let writeLock: Promise<void> = Promise.resolve()

async function readCache(): Promise<CacheMap> {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8')
    return JSON.parse(raw) as CacheMap
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {}
    }
    // If JSON parse fails, return empty cache and log warning
    if (error instanceof SyntaxError) {
      console.warn('Cache file corrupted, resetting cache')
      return {}
    }
    throw error
  }
}

async function writeCache(cache: CacheMap) {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  // Write to temp file first, then rename atomically
  const tempFile = CACHE_FILE + '.tmp'
  await fs.writeFile(tempFile, JSON.stringify(cache), 'utf8')
  await fs.rename(tempFile, CACHE_FILE)
}

export async function getCachedValue<T>(key: string, maxAgeMs: number): Promise<T | null> {
  try {
    const cache = await readCache()
    const entry = cache[key]
    if (!entry) return null

    if (Date.now() - entry.timestamp > maxAgeMs) {
      return null
    }

    return entry.value as T
  } catch (error) {
    console.error('Error reading cache:', error)
    return null
  }
}

export async function setCachedValue(key: string, value: unknown) {
  // Queue writes to prevent race conditions
  writeLock = writeLock.then(async () => {
    try {
      const cache = await readCache()
      cache[key] = {
        timestamp: Date.now(),
        value,
      }
      await writeCache(cache)
    } catch (error) {
      console.error('Error writing to cache:', error)
    }
  })
  await writeLock
}
