import React from 'react'

interface PlaceholderImageProps {
  width: number
  height: number
  text: string
  className?: string
}

export function PlaceholderImage({ width, height, text, className }: PlaceholderImageProps) {
  const fontSize = Math.min(width, height) / 10

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width={width} height={height} fill="#f0f0f0" />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#888888"
        fontSize={fontSize}
        fontFamily="Arial, sans-serif"
      >
        {text}
      </text>
    </svg>
  )
}