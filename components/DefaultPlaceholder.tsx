import React from 'react'

interface DefaultPlaceholderProps {
  width?: number
  height?: number
  type?: 'video' | 'short' | 'avatar' | 'banner'
  text?: string
}

export function DefaultPlaceholder({ 
  width = 320, 
  height = 180, 
  type = 'video',
  text
}: DefaultPlaceholderProps) {
  // Adjust viewBox based on type
  const viewBox = `0 0 ${width} ${height}`
  
  // Calculate aspect ratio for responsiveness
  const aspectRatio = height / width
  
  // Determine background color based on type
  let bgColor = 'var(--muted)'
  let textColor = 'var(--muted-foreground)'
  let iconColor = 'var(--primary)'
  
  // Set dimensions for icon
  const iconSize = Math.min(width, height) * 0.2
  const iconX = (width - iconSize) / 2
  const iconY = (height - iconSize) / 2

  // Choose icon based on type
  let icon
  if (type === 'video' || type === 'short') {
    icon = (
      <path 
        d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 3.993L9 16z" 
        fill={iconColor}
        transform={`translate(${iconX}, ${iconY}) scale(${iconSize/24})`}
      />
    )
  } else if (type === 'avatar') {
    icon = (
      <path 
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" 
        stroke={iconColor}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`translate(${iconX}, ${iconY}) scale(${iconSize/24})`}
      />
    )
  } else if (type === 'banner') {
    icon = (
      <path 
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" 
        stroke={iconColor}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`translate(${iconX}, ${iconY}) scale(${iconSize/24})`}
      />
    )
  }

  // Display text if provided
  const textElement = text ? (
    <text 
      x="50%" 
      y="50%" 
      dominantBaseline="middle" 
      textAnchor="middle" 
      fill={textColor}
      fontSize={Math.min(width, height) * 0.1}
      fontFamily="system-ui, sans-serif"
    >
      {text}
    </text>
  ) : null

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      style={{ 
        aspectRatio: `${width} / ${height}`,
        maxWidth: '100%'
      }}
      role="img"
      aria-label={text || "placeholder image"}
    >
      <rect width={width} height={height} fill={bgColor} rx={type === 'avatar' ? width/2 : 8} />
      {icon}
      {textElement}
    </svg>
  )
}

// Create specific variants
export function VideoPlaceholder(props: Omit<DefaultPlaceholderProps, 'type'>) {
  return <DefaultPlaceholder type="video" {...props} />
}

export function ShortPlaceholder(props: Omit<DefaultPlaceholderProps, 'type'>) {
  return <DefaultPlaceholder type="short" height={320} width={180} {...props} />
}

export function AvatarPlaceholder(props: Omit<DefaultPlaceholderProps, 'type'>) {
  return <DefaultPlaceholder type="avatar" width={40} height={40} {...props} />
}

export function BannerPlaceholder(props: Omit<DefaultPlaceholderProps, 'type'>) {
  return <DefaultPlaceholder type="banner" width={1200} height={300} {...props} />
}