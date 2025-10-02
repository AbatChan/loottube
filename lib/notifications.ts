export interface Notification {
  id: string
  type: 'subscriber' | 'upload' | 'interest' | 'system'
  title: string
  description: string
  time: string
  read: boolean
  userId: string // The user who receives the notification
  metadata?: {
    channelId?: string
    channelName?: string
    channelHandle?: string
    videoId?: string
    videoTitle?: string
    subscriberId?: string
    subscriberName?: string
  }
}

const NOTIFICATIONS_KEY = 'lootube_notifications'

// Get all notifications for a user
export function getUserNotifications(userId: string): Notification[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY)
    if (!stored) return []

    const all: Notification[] = JSON.parse(stored)
    return all.filter(n => n.userId === userId).sort((a, b) =>
      new Date(b.time).getTime() - new Date(a.time).getTime()
    )
  } catch (error) {
    console.error('Failed to get notifications:', error)
    return []
  }
}

// Add a new notification
export function addNotification(notification: Omit<Notification, 'id' | 'time' | 'read'>): void {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY)
    const all: Notification[] = stored ? JSON.parse(stored) : []

    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      time: new Date().toISOString(),
      read: false
    }

    all.push(newNotification)

    // Keep only last 100 notifications per user
    const userNotifs = all.filter(n => n.userId === notification.userId)
    if (userNotifs.length > 100) {
      const sortedByTime = userNotifs.sort((a, b) =>
        new Date(b.time).getTime() - new Date(a.time).getTime()
      )
      const toRemove = sortedByTime.slice(100)
      const removeIds = new Set(toRemove.map(n => n.id))
      const filtered = all.filter(n => !removeIds.has(n.id))
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered))
    } else {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all))
    }

    // Dispatch event for real-time updates
    window.dispatchEvent(new CustomEvent('lootube:notification-added', {
      detail: newNotification
    }))
  } catch (error) {
    console.error('Failed to add notification:', error)
  }
}

// Mark notification as read
export function markNotificationRead(notificationId: string): void {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY)
    if (!stored) return

    const all: Notification[] = JSON.parse(stored)
    const updated = all.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    )

    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated))

    window.dispatchEvent(new CustomEvent('lootube:notification-updated'))
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
  }
}

// Mark all notifications as read for a user
export function markAllNotificationsRead(userId: string): void {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY)
    if (!stored) return

    const all: Notification[] = JSON.parse(stored)
    const updated = all.map(n =>
      n.userId === userId ? { ...n, read: true } : n
    )

    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated))

    window.dispatchEvent(new CustomEvent('lootube:notification-updated'))
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
  }
}

// Delete a notification
export function deleteNotification(notificationId: string): void {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY)
    if (!stored) return

    const all: Notification[] = JSON.parse(stored)
    const filtered = all.filter(n => n.id !== notificationId)

    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered))

    window.dispatchEvent(new CustomEvent('lootube:notification-updated'))
  } catch (error) {
    console.error('Failed to delete notification:', error)
  }
}

// Get unread count for a user
export function getUnreadCount(userId: string): number {
  const notifications = getUserNotifications(userId)
  return notifications.filter(n => !n.read).length
}

// Create notification for new subscriber
export function notifyNewSubscriber(
  channelOwnerId: string,
  subscriberId: string,
  subscriberName: string,
  subscriberHandle?: string
): void {
  addNotification({
    type: 'subscriber',
    userId: channelOwnerId,
    title: 'New subscriber',
    description: `${subscriberName}${subscriberHandle ? ` (${subscriberHandle})` : ''} subscribed to your channel`,
    metadata: {
      subscriberId,
      subscriberName
    }
  })
}

// Create notification for new upload from subscribed channel
export function notifyNewUpload(
  subscriberId: string,
  channelId: string,
  channelName: string,
  channelHandle: string,
  videoId: string,
  videoTitle: string,
  isShort: boolean
): void {
  addNotification({
    type: 'upload',
    userId: subscriberId,
    title: `New ${isShort ? 'short' : 'video'} from ${channelName}`,
    description: videoTitle,
    metadata: {
      channelId,
      channelName,
      channelHandle,
      videoId,
      videoTitle
    }
  })
}

// Create notification for interest-based recommendation
export function notifyInterestRecommendation(
  userId: string,
  videoId: string,
  videoTitle: string,
  reason: string
): void {
  addNotification({
    type: 'interest',
    userId,
    title: 'Recommended for you',
    description: `${videoTitle} - ${reason}`,
    metadata: {
      videoId,
      videoTitle
    }
  })
}

// Notify all subscribers about new upload
export function notifySubscribersOfNewUpload(
  channelId: string,
  channelName: string,
  channelHandle: string,
  videoId: string,
  videoTitle: string,
  isShort: boolean
): void {
  if (typeof window === 'undefined') return

  try {
    // Get all users who are subscribed to this channel
    const subscriptionsKey = 'lootube:subscriptions'

    // Get all user IDs from localStorage
    const userIds: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('lootube_user_')) {
        const userId = key.replace('lootube_user_', '')
        userIds.push(userId)
      }
    }

    // Check each user's subscriptions
    userIds.forEach(userId => {
      try {
        const userKey = `lootube_user_${userId}`
        const userData = localStorage.getItem(userKey)
        if (userData) {
          // Check if this user has subscriptions
          const subscriptions = localStorage.getItem(subscriptionsKey)
          if (subscriptions) {
            const subArray = JSON.parse(subscriptions)
            if (Array.isArray(subArray) && subArray.includes(channelId)) {
              // This user is subscribed, send notification
              notifyNewUpload(
                userId,
                channelId,
                channelName,
                channelHandle,
                videoId,
                videoTitle,
                isShort
              )
            }
          }
        }
      } catch (error) {
        // Skip this user on error
      }
    })
  } catch (error) {
    console.error('Failed to notify subscribers:', error)
  }
}
