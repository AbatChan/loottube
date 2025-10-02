import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRandomString(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function generateVideoId() {
  return `local_${Date.now()}_${getRandomString(8)}`
}

export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src)
      reject('Error loading video metadata')
    }
    video.src = URL.createObjectURL(file)
  })
}

export async function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    video.onseeked = () => {
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        window.URL.revokeObjectURL(video.src)
        resolve(canvas.toDataURL('image/jpeg'))
      } else {
        reject('Could not get canvas context')
      }
    }

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src)
      reject('Error loading video')
    }

    video.src = URL.createObjectURL(file)
    // Seek to 25% of the video duration for thumbnail
    video.currentTime = 1
  })
}