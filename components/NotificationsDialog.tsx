"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, CheckCircle2, X } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { NotificationButton } from "@/components/NotificationButton"
import { getUserNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, getUnreadCount, type Notification } from "@/lib/notifications"
import { getCurrentUser } from "@/lib/userAuth"
import { formatTimeAgo } from "@/lib/format"
import { Button } from "@/components/ui/button"

interface NotificationsDialogProps {
  notifications?: Notification[]
}

export function NotificationsDialog({ notifications: propNotifications }: NotificationsDialogProps) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const currentUser = useMemo(() => getCurrentUser(), [])

  useEffect(() => {
    // Load notifications from localStorage
    if (currentUser) {
      const userNotifications = getUserNotifications(currentUser.id)
      setNotifications(userNotifications)
    }
  }, [currentUser])

  useEffect(() => {
    // Listen for notification updates
    const handleNotificationAdded = (event: Event) => {
      if (currentUser) {
        const userNotifications = getUserNotifications(currentUser.id)
        setNotifications(userNotifications)
      }
    }

    const handleNotificationUpdated = () => {
      if (currentUser) {
        const userNotifications = getUserNotifications(currentUser.id)
        setNotifications(userNotifications)
      }
    }

    window.addEventListener('lootube:notification-added', handleNotificationAdded)
    window.addEventListener('lootube:notification-updated', handleNotificationUpdated)

    return () => {
      window.removeEventListener('lootube:notification-added', handleNotificationAdded)
      window.removeEventListener('lootube:notification-updated', handleNotificationUpdated)
    }
  }, [currentUser])

  const groupedNotifications = useMemo(() => {
    const unread = notifications.filter((notification) => !notification.read)
    const read = notifications.filter((notification) => notification.read)
    return { unread, read }
  }, [notifications])

  const hasNotifications = notifications.length > 0
  const unreadCount = currentUser ? getUnreadCount(currentUser.id) : 0

  const handleMarkAllRead = () => {
    if (currentUser) {
      markAllNotificationsRead(currentUser.id)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markNotificationRead(notification.id)
  }

  const handleDeleteNotification = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteNotification(notificationId)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <NotificationButton enableToggle={false} />
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[420px] w-[calc(100vw-2rem)] max-h-[80vh] rounded-xl bg-background sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Notifications</DialogTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
                Mark all read
              </Button>
            )}
          </div>
          <DialogDescription className="sr-only">
            Review unread and earlier notifications for your account.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          {hasNotifications ? (
            <div className="space-y-4">
              {groupedNotifications.unread.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">New</h3>
                    <span className="inline-flex items-center rounded-full border border-border/60 px-2 py-0.5 text-xs font-medium dark:border-white/15">
                      {groupedNotifications.unread.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {groupedNotifications.unread.map((notification) => (
                      <article
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm dark:border-white/15 dark:bg-muted/20 cursor-pointer hover:bg-muted/60 transition-colors relative group"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <p className="font-medium pr-8">{notification.title}</p>
                        <p className="text-muted-foreground">{notification.description}</p>
                        <span className="mt-2 block text-xs text-muted-foreground">{formatTimeAgo(notification.time)}</span>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {groupedNotifications.read.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Earlier</span>
                  </div>
                  <div className="space-y-2">
                    {groupedNotifications.read.map((notification) => (
                      <article
                        key={notification.id}
                        className="rounded-lg border border-border/40 p-3 text-sm dark:border-white/10 relative group"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <p className="font-medium pr-8">{notification.title}</p>
                        <p className="text-muted-foreground">{notification.description}</p>
                        <span className="mt-2 block text-xs text-muted-foreground">{formatTimeAgo(notification.time)}</span>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-border/60 dark:border-white/15">
                <Bell className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">You're all caught up</p>
              <p className="text-xs text-muted-foreground">We'll let you know when there's something new.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
