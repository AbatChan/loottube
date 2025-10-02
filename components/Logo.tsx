import Link from 'next/link'
import Image from 'next/image'

interface LogoProps {
  variant?: 'default' | 'small'
  className?: string
  linkWrapper?: boolean
}

export function Logo({ 
  variant = 'default', 
  className = '',
  linkWrapper = true 
}: LogoProps) {
  const logoSrc = variant === 'small' 
    ? '/brand/logo-small.svg' 
    : '/brand/logo.svg'
  
  const content = (
    <>
      <Image
        src={logoSrc}
        alt="Lootube"
        width={variant === 'small' ? 24 : 32}
        height={variant === 'small' ? 24 : 32}
        priority
      />
      <span className="text-xl font-semibold">Lootube</span>
    </>
  )
  
  if (linkWrapper) {
    return (
      <Link href="/" className={`flex items-center space-x-2 ${className}`}>
        {content}
      </Link>
    )
  }
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {content}
    </div>
  )
}