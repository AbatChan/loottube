'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'

interface UserInfo {
  channelName: string
  channelHandle: string
  avatar: string
  joinedAt: string
  subscribers: number
  isCurrentUser?: boolean
}

interface UserAvatarModalProps {
  userInfo: UserInfo
  children: React.ReactNode
  className?: string
}

export function UserAvatarModal({ userInfo, children, className = '' }: UserAvatarModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{ vertical: 'top' | 'bottom', horizontal: 'left' | 'center' | 'right' }>({ vertical: 'bottom', horizontal: 'center' })
  const triggerRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      const spaceLeft = rect.left
      const spaceRight = viewportWidth - rect.right

      // Modal dimensions (adjusted for horizontal layout)
      const modalHeight = 140
      const modalWidth = 300

      // Determine vertical position
      let vertical: 'top' | 'bottom' = 'bottom'
      if (spaceBelow >= modalHeight) {
        vertical = 'bottom'
      } else if (spaceAbove >= modalHeight) {
        vertical = 'top'
      } else {
        vertical = 'bottom' // Default to bottom if not enough space either way
      }

      // Determine horizontal position
      let horizontal: 'left' | 'center' | 'right' = 'center'
      const centerPosition = rect.left + rect.width / 2 - modalWidth / 2

      if (centerPosition < 16) {
        // Not enough space on left, align to left
        horizontal = 'left'
      } else if (centerPosition + modalWidth > viewportWidth - 16) {
        // Not enough space on right, align to right
        horizontal = 'right'
      } else {
        // Enough space for center alignment
        horizontal = 'center'
      }

      setPosition({ vertical, horizontal })
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const joinedLabel = (() => {
    if (!userInfo.joinedAt) return 'Joined recently'
    const parsed = Date.parse(userInfo.joinedAt)
    if (Number.isNaN(parsed)) {
      return 'Joined recently'
    }
    try {
      const formatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
      return `Joined ${formatter.format(new Date(parsed))}`
    } catch (_error) {
      return 'Joined recently'
    }
  })()

  const subscriberLabel = Number.isFinite(userInfo.subscribers)
    ? `${Math.max(0, userInfo.subscribers).toLocaleString()} subscribers`
    : null

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`cursor-pointer ${className}`}
      >
        {children}
      </div>

      {isOpen && (
        <div
          ref={modalRef}
          style={{ width: '300px' }}
          className={`absolute z-50 bg-background border border-border rounded-xl shadow-lg p-4 ${
            position.vertical === 'bottom'
              ? 'top-full mt-2'
              : 'bottom-full mb-2'
          } ${
            position.horizontal === 'left'
              ? 'left-0'
              : position.horizontal === 'right'
              ? 'right-0'
              : 'left-1/2 transform -translate-x-1/2'
          }`}
        >
          {/* Arrow */}
          <div
            className={`absolute w-3 h-3 bg-background border-border rotate-45 ${
              position.vertical === 'bottom'
                ? 'border-t border-l -top-1.5'
                : 'border-b border-r -bottom-1.5'
            } ${
              position.horizontal === 'left'
                ? 'left-6'
                : position.horizontal === 'right'
                ? 'right-6'
                : 'left-1/2 transform -translate-x-1/2'
            }`}
          />

          <div className="space-y-3">
            {/* Avatar and Info Container */}
            <div className="flex gap-3">
              {/* Large Avatar */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                  {userInfo.avatar && userInfo.avatar !== '/placeholder.svg' ? (
                    <img
                      src={userInfo.avatar}
                      alt={userInfo.channelName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                  <User className="w-8 h-8 text-muted-foreground hidden" />
                </div>
              </div>

              {/* Channel Info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={userInfo.channelHandle.startsWith('/') ? userInfo.channelHandle : `/${userInfo.channelHandle}`}
                  onClick={() => setIsOpen(false)}
                  className="font-semibold text-base hover:text-primary transition-colors block truncate"
                >
                  {userInfo.channelName}
                </Link>
                <Link
                  href={userInfo.channelHandle.startsWith('/') ? userInfo.channelHandle : `/${userInfo.channelHandle}`}
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors block truncate"
                >
                  {userInfo.channelHandle}
                </Link>
                <div className="mt-1">
                  <span className="text-xs text-muted-foreground">
                    {joinedLabel}
                    {subscriberLabel ? ` • ${subscriberLabel}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!userInfo.isCurrentUser && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    className="rounded-full whitespace-nowrap"
                    onClick={() => setIsOpen(false)}
                  >
                    Subscribe
                  </Button>
                  <Link href={userInfo.channelHandle.startsWith('/') ? userInfo.channelHandle : `/${userInfo.channelHandle}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full whitespace-nowrap"
                      onClick={() => setIsOpen(false)}
                    >
                      View channel
                    </Button>
                  </Link>
                </>
              )}

              {userInfo.isCurrentUser && (
                <Link href={userInfo.channelHandle.startsWith('/') ? userInfo.channelHandle : `/${userInfo.channelHandle}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full whitespace-nowrap"
                    onClick={() => setIsOpen(false)}
                  >
                    View your channel
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
