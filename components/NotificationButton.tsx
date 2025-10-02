"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Bell } from 'lucide-react'
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getUnreadCount } from "@/lib/notifications"
import { getCurrentUser } from "@/lib/userAuth"

export interface NotificationButtonProps extends ButtonProps {
  enableToggle?: boolean
}

export const NotificationButton = React.forwardRef<HTMLButtonElement, NotificationButtonProps>(
  ({ className, onClick, enableToggle = true, ...props }, ref) => {
    const [notificationsEnabled, setNotificationsEnabled] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const currentUser = useMemo(() => getCurrentUser(), [])

    useEffect(() => {
      // Update unread count
      if (currentUser) {
        setUnreadCount(getUnreadCount(currentUser.id))
      }
    }, [currentUser])

    useEffect(() => {
      // Listen for notification updates
      const handleNotificationUpdate = () => {
        if (currentUser) {
          setUnreadCount(getUnreadCount(currentUser.id))
        }
      }

      window.addEventListener('lootube:notification-added', handleNotificationUpdate)
      window.addEventListener('lootube:notification-updated', handleNotificationUpdate)

      return () => {
        window.removeEventListener('lootube:notification-added', handleNotificationUpdate)
        window.removeEventListener('lootube:notification-updated', handleNotificationUpdate)
      }
    }, [currentUser])

    const handleNotificationClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (enableToggle) {
        if (typeof Notification !== "undefined") {
          if (!notificationsEnabled) {
            try {
              const permission = await Notification.requestPermission()
              if (permission === 'granted') {
                setNotificationsEnabled(true)
              }
            } catch (error) {
              console.error('Error requesting notification permission:', error)
            }
          } else {
            setNotificationsEnabled(false)
          }
        }
      }

      onClick?.(event)
    }

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        onClick={enableToggle ? handleNotificationClick : onClick}
        className={cn(enableToggle && notificationsEnabled && "text-blue-500", "relative", className)}
        {...props}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
    )
  }
)

NotificationButton.displayName = "NotificationButton"
