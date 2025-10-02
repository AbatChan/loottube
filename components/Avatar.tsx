import { useEffect, useState } from 'react'

interface AvatarProps {
  src?: string
  alt: string
  fallback?: string
  className?: string
}

export function Avatar({ src, alt, fallback, className = "" }: AvatarProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [error, setError] = useState(false)

  useEffect(() => {
    setImgSrc(src)
    setError(false)
  }, [src])

  if (error || !imgSrc) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 dark:bg-gray-800 ${className}`}
        title={alt}
      >
        <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
          {fallback || alt.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => {
        setError(true)
        setImgSrc(undefined)
      }}
    />
  )
}