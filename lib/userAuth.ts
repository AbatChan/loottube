export interface User {
  id: string
  email: string
  password: string
  channelName: string
  channelId: string
  channelHandle: string
  avatar: string
  createdAt: string
  fullName?: string
}

export interface AuthResult {
  success: boolean
  message: string
  user?: User
}

const USERS_KEY = 'lootube_users'
const CURRENT_USER_KEY = 'lootube_current_user'

type StoredUserRecord = Omit<User, 'channelHandle'> & { channelHandle?: string }

function sanitizeHandleValue(raw: string | null | undefined) {
  if (!raw) return ''
  return raw.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30)
}

function generateChannelHandle(
  channelName: string,
  fallbackId: string,
  preferredHandle?: string
): string {
  const candidates = [preferredHandle, channelName, fallbackId, `${channelName}-${fallbackId}`]

  for (const candidate of candidates) {
    const sanitized = sanitizeHandleValue(candidate)
    if (sanitized.length >= 3) {
      return `@${sanitized}`
    }
  }

  const randomCandidate = sanitizeHandleValue(`channel-${Math.random().toString(36).slice(2, 10)}`)
  const fallback = (randomCandidate || 'channel').padEnd(3, '0').slice(0, 30)
  return `@${fallback}`
}

function normalizeUser(user: StoredUserRecord): User {
  const normalizedHandle = generateChannelHandle(user.channelName, user.id, user.channelHandle)
  if (user.channelHandle === normalizedHandle) {
    return user as User
  }
  return {
    ...user,
    channelHandle: normalizedHandle,
  }
}

function normalizeUsers(users: StoredUserRecord[]): { normalized: User[]; mutated: boolean } {
  let mutated = false
  const normalized = users.map((user) => {
    const next = normalizeUser(user)
    if (next !== user) {
      mutated = true
    }
    return next
  })
  return { normalized, mutated }
}

function dispatchUserUpdate(user: User | null, previous?: User | null) {
  if (typeof window === 'undefined') return
  try {
    const detail = { user, previousUser: previous ?? null }
    window.dispatchEvent(new CustomEvent('lootube:user-updated', { detail }))
  } catch (error) {
    console.warn('Failed to dispatch user update event:', error)
  }
}

function normalizeHandleForLookup(value: string | null | undefined) {
  if (!value) return ''
  return value.trim().replace(/^@+/, '').toLowerCase()
}

function buildVideoCommentSnapshot(user: User) {
  return {
    author: user.channelName,
    authorAvatar: user.avatar,
    authorHandle: user.channelHandle,
    authorId: user.id,
    authorJoinedAt: user.createdAt,
  }
}

function buildShortCommentSnapshot(user: User) {
  const normalizedHandle = normalizeHandleForLookup(user.channelHandle)
  const displayHandle = normalizedHandle ? `@${normalizedHandle}` : null
  return {
    author: displayHandle ?? user.channelName,
    authorAvatar: user.avatar,
    authorHandle: displayHandle ?? undefined,
    authorId: user.id,
    authorJoinedAt: user.createdAt,
  }
}

function updateCachedCommentMetadata(previous: User | null, next: User) {
  if (typeof window === 'undefined' || !previous) return

  try {
    const previousHandles = new Set<string>()
    const addHandle = (value: string | null | undefined) => {
      const normalized = normalizeHandleForLookup(value)
      if (normalized) previousHandles.add(normalized)
    }

    addHandle(previous.channelHandle)
    addHandle(previous.channelName)

    const videoSnapshot = buildVideoCommentSnapshot(next)
    const shortSnapshot = buildShortCommentSnapshot(next)

    const shouldUpdateEntity = (entity: any) => {
      if (!entity || typeof entity !== 'object') return false
      if (previous.id && entity.authorId === previous.id) return true

      const entityHandle = normalizeHandleForLookup(
        entity.authorHandle ?? entity.handle ?? entity.channelHandle ?? null
      )
      if (entityHandle && previousHandles.has(entityHandle)) return true

      const entityName = normalizeHandleForLookup(entity.author ?? entity.channelName ?? null)
      if (entityName && previousHandles.has(entityName)) return true

      return false
    }

    const updateVideoComments = (key: string) => {
      const raw = window.localStorage.getItem(key)
      if (!raw) return
      let parsed: any[]
      try {
        parsed = JSON.parse(raw)
      } catch (_error) {
        return
      }
      if (!Array.isArray(parsed)) return

      let changed = false
      const updated = parsed.map((comment: any) => {
        if (!comment || typeof comment !== 'object') return comment

        let commentChanged = false
        let nextComment = comment

        if (shouldUpdateEntity(comment)) {
          nextComment = {
            ...comment,
            ...videoSnapshot,
          }
          commentChanged = true
        }

        if (Array.isArray(comment.replies)) {
          const updatedReplies = comment.replies.map((reply: any) => {
            if (!reply || typeof reply !== 'object') return reply
            if (!shouldUpdateEntity(reply)) return reply
            commentChanged = true
            return {
              ...reply,
              ...videoSnapshot,
            }
          })

          if (commentChanged) {
            nextComment = {
              ...nextComment,
              replies: updatedReplies,
            }
          }
        }

        if (commentChanged) changed = true
        return nextComment
      })

      if (changed) {
        window.localStorage.setItem(key, JSON.stringify(updated))
      }
    }

    const updateShortComments = (key: string) => {
      const raw = window.localStorage.getItem(key)
      if (!raw) return
      let parsed: any[]
      try {
        parsed = JSON.parse(raw)
      } catch (_error) {
        return
      }
      if (!Array.isArray(parsed)) return

      let changed = false
      const updated = parsed.map((comment: any) => {
        if (!comment || typeof comment !== 'object') return comment

        let commentChanged = false
        let nextComment = comment

        if (shouldUpdateEntity(comment)) {
          nextComment = {
            ...comment,
            ...shortSnapshot,
          }
          commentChanged = true
        }

        if (Array.isArray(comment.replies)) {
          const updatedReplies = comment.replies.map((reply: any) => {
            if (!reply || typeof reply !== 'object') return reply
            if (!shouldUpdateEntity(reply)) return reply
            commentChanged = true
            return {
              ...reply,
              ...shortSnapshot,
            }
          })

          if (commentChanged) {
            nextComment = {
              ...nextComment,
              replies: updatedReplies,
            }
          }
        }

        if (commentChanged) changed = true
        return nextComment
      })

      if (changed) {
        window.localStorage.setItem(key, JSON.stringify(updated))
      }
    }

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key) continue
      if (key.startsWith('comments_shorts_')) {
        updateShortComments(key)
      } else if (key.startsWith('comments_') && !key.startsWith('comments_shorts_')) {
        updateVideoComments(key)
      }
    }
  } catch (error) {
    console.warn('Failed to refresh cached comment metadata:', error)
  }
}

function normalizeChannelName(name: string) {
  return name.trim().toLowerCase()
}

function generateUniqueChannelName(
  rawName: string,
  users: User[],
  excludeUserId?: string
): string {
  const baseName = rawName.trim()
  if (!baseName) {
    return ''
  }

  const takenNames = new Set(
    users
      .filter((user) => !excludeUserId || user.id !== excludeUserId)
      .map((user) => normalizeChannelName(user.channelName))
  )

  const normalizedBase = normalizeChannelName(baseName)
  if (!takenNames.has(normalizedBase)) {
    return baseName
  }

  let suffix = 2
  let candidate = `${baseName} ${suffix}`
  while (takenNames.has(normalizeChannelName(candidate))) {
    suffix += 1
    candidate = `${baseName} ${suffix}`
  }

  return candidate
}

function updateUserChannelProfile(user: User) {
  if (typeof window === 'undefined') return

  try {
    const userChannelKey = `lootube_channel_${user.id}`
    const existing = localStorage.getItem(userChannelKey)
    const sanitizedHandle = generateChannelHandle(user.channelName, user.id, user.channelHandle)
    let parsedExisting: Record<string, unknown> = {}

    if (existing) {
      try {
        parsedExisting = JSON.parse(existing)
      } catch (_err) {
        parsedExisting = {}
      }
    }

    const next = existing ? {
      ...parsedExisting,
      id: user.channelId,
      title: user.channelName,
      handle: sanitizedHandle,
      avatar: user.avatar,
      updatedAt: new Date().toISOString(),
    } : {
      id: user.channelId,
      title: user.channelName,
      handle: sanitizedHandle,
      description: 'Tell viewers about your channel. This space is perfect for your mission statement or a short bio.',
      avatar: user.avatar,
      banner: '/brand/banner.svg',
      joinedAt: user.createdAt,
      subscribers: 0,
      totalViews: 0,
      themeColor: '#ff0033',
      updatedAt: new Date().toISOString(),
    }

    localStorage.setItem(userChannelKey, JSON.stringify(next))
  } catch (error) {
    console.warn('Failed to update channel profile:', error)
  }
}

export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateChannelId(): string {
  return `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

type UserChannelMutableFields = Pick<User, 'channelName' | 'channelId' | 'avatar' | 'channelHandle'>

export function updateStoredUserChannelDetails(userId: string, updates: Partial<UserChannelMutableFields>): void {
  if (typeof window === 'undefined') return
  try {
    const users = getStoredUsers()
    const previousUser = users.find((user) => user.id === userId) ?? null
    let updatedUser: User | null = null
    const nextUsers = users.map((user) => {
      if (user.id !== userId) return user
      const candidate = { ...user, ...updates }
      updatedUser = normalizeUser(candidate)
      return updatedUser
    })

    if (!updatedUser) {
      return
    }

    saveUsers(nextUsers)

    const current = getCurrentUser()
    if (current?.id === userId) {
      const nextCurrent = normalizeUser({ ...current, ...updates })
      setCurrentUser(nextCurrent)
      updateUserChannelProfile(nextCurrent)
      updateCachedCommentMetadata(previousUser, nextCurrent)
      return
    }

    updateUserChannelProfile(updatedUser)
    updateCachedCommentMetadata(previousUser, updatedUser)
  } catch (error) {
    console.warn('Failed to update stored user channel details:', error)
  }
}

async function persistChannelProfile(user: User): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const formData = new FormData()
    formData.append('title', user.channelName)
    formData.append('handle', user.channelHandle)
    formData.append('description', 'Tell viewers about your channel. This space is perfect for your mission statement or a short bio.')
    formData.append('userId', user.id)

    const response = await fetch('/api/channel/profile', {
      method: 'PUT',
      body: formData,
    })

    if (!response.ok) {
      return
    }

    const data = await response.json().catch(() => null)
    const profile = data?.profile as Partial<{ id: string; title: string; avatar: string; handle: string } | null>

    if (profile && user.id) {
      const updates: Partial<UserChannelMutableFields> = {}
      if (profile.id && profile.id !== user.channelId) {
        updates.channelId = profile.id
      }
      if (profile.title && profile.title !== user.channelName) {
        updates.channelName = profile.title
      }
      if (profile.avatar && profile.avatar !== user.avatar) {
        updates.avatar = profile.avatar
      }
      if (profile.handle && profile.handle !== user.channelHandle) {
        updates.channelHandle = profile.handle
      }

      if (Object.keys(updates).length > 0) {
        updateStoredUserChannelDetails(user.id, updates)
      }
    }
  } catch (error) {
    console.warn('Failed to persist channel profile:', error)
  }
}

export function getStoredUsers(): User[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(USERS_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    const { normalized, mutated } = normalizeUsers(parsed as StoredUserRecord[])

    if (mutated) {
      try {
        localStorage.setItem(USERS_KEY, JSON.stringify(normalized))
      } catch (error) {
        console.error('Failed to normalize users:', error)
      }
    }

    return normalized
  } catch (error) {
    console.error('Failed to read users:', error)
    return []
  }
}

export function saveUsers(users: User[]): void {
  if (typeof window === 'undefined') return
  try {
    const { normalized } = normalizeUsers(users)
    localStorage.setItem(USERS_KEY, JSON.stringify(normalized))
  } catch (error) {
    console.error('Failed to save users:', error)
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as StoredUserRecord
    return normalizeUser(parsed)
  } catch (error) {
    console.error('Failed to read current user:', error)
    return null
  }
}

export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return
  try {
    const previous = getCurrentUser()
    if (user) {
      const normalized = normalizeUser(user)
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalized))
      localStorage.setItem('isAuthenticated', 'true')
      dispatchUserUpdate(normalized, previous ?? undefined)
    } else {
      localStorage.removeItem(CURRENT_USER_KEY)
      localStorage.removeItem('isAuthenticated')
      dispatchUserUpdate(null, previous ?? undefined)
    }
  } catch (error) {
    console.error('Failed to set current user:', error)
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): boolean {
  return password.length >= 6
}

export async function signUp(
  email: string,
  password: string,
  confirmPassword: string,
  channelName: string
): Promise<AuthResult> {
  // Detailed email validation
  if (!email.trim()) {
    return { success: false, message: 'Email address is required' }
  }
  if (!validateEmail(email)) {
    return { success: false, message: 'Please enter a valid email address (e.g., user@example.com)' }
  }

  // Detailed password validation
  if (!password) {
    return { success: false, message: 'Password is required' }
  }
  if (password.length < 6) {
    return { success: false, message: `Password must be at least 6 characters long (you entered ${password.length} characters)` }
  }

  // Password confirmation validation
  if (!confirmPassword) {
    return { success: false, message: 'Please confirm your password' }
  }
  if (password !== confirmPassword) {
    return { success: false, message: 'Password and confirm password do not match. Please make sure both passwords are identical.' }
  }

  // Channel name validation
  if (!channelName.trim()) {
    return { success: false, message: 'Channel name is required. Please enter a name for your channel.' }
  }
  if (channelName.trim().length < 2) {
    return { success: false, message: 'Channel name must be at least 2 characters long' }
  }
  if (channelName.trim().length > 50) {
    return { success: false, message: 'Channel name cannot be longer than 50 characters' }
  }

  const users = getStoredUsers()
  const baseChannelName = channelName.trim()
  const uniqueChannelName = generateUniqueChannelName(baseChannelName, users)

  // Check if email already exists
  const existingUser = users.find(user => user.email.toLowerCase() === email.toLowerCase())
  if (existingUser) {
    return { success: false, message: `An account with email "${email}" already exists. Please use a different email or sign in to your existing account.` }
  }

  // Create new user
  const userId = generateUserId()
  const channelId = generateChannelId()
  const channelHandle = generateChannelHandle(uniqueChannelName, userId)

  const newUserRecord: StoredUserRecord = {
    id: userId,
    email,
    password, // In a real app, this should be hashed
    channelName: uniqueChannelName,
    channelId,
    channelHandle,
    avatar: '/placeholder.svg', // Default avatar
    createdAt: new Date().toISOString(),
  }

  const normalizedUser = normalizeUser(newUserRecord)

  users.push(normalizedUser)
  saveUsers(users)
  setCurrentUser(normalizedUser)

  updateUserChannelProfile(normalizedUser)

  await persistChannelProfile(normalizedUser)

  const successMessage = uniqueChannelName === baseChannelName
    ? `Account created successfully! Welcome to Lootube, ${normalizedUser.channelName}!`
    : `Account created successfully! We named your channel "${normalizedUser.channelName}" to keep it distinct. Welcome to Lootube!`

  return { success: true, message: successMessage, user: normalizedUser }
}

export function signIn(email: string, password: string): AuthResult {
  // Detailed email validation
  if (!email.trim()) {
    return { success: false, message: 'Email address is required to sign in' }
  }
  if (!validateEmail(email)) {
    return { success: false, message: 'Please enter a valid email address (e.g., user@example.com)' }
  }

  // Password validation
  if (!password) {
    return { success: false, message: 'Password is required to sign in' }
  }
  if (password.length < 1) {
    return { success: false, message: 'Please enter your password' }
  }

  const users = getStoredUsers()
  const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase())
  if (userIndex === -1) {
    return { success: false, message: `No account found with email "${email}". Please check your email or sign up for a new account.` }
  }

  const user = users[userIndex]

  if (user.password !== password) {
    return { success: false, message: 'Incorrect password. Please check your password and try again.' }
  }

  let activeUserRecord: StoredUserRecord = user
  let needsPersist = false
  const uniqueChannelName = generateUniqueChannelName(user.channelName, users, user.id)

  if (uniqueChannelName && uniqueChannelName !== user.channelName) {
    activeUserRecord = { ...activeUserRecord, channelName: uniqueChannelName }
    needsPersist = true
  }

  const normalizedActiveUser = normalizeUser(activeUserRecord)
  if (normalizedActiveUser !== activeUserRecord) {
    needsPersist = true
  }

  if (needsPersist) {
    const updatedUsers = [...users]
    updatedUsers[userIndex] = normalizedActiveUser
    saveUsers(updatedUsers)
  }

  updateUserChannelProfile(normalizedActiveUser)
  setCurrentUser(normalizedActiveUser)

  return { success: true, message: 'Welcome back!', user: normalizedActiveUser }
}

export function signOut(): void {
  setCurrentUser(null)
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}

export function getAllUsers(): User[] {
  return getStoredUsers()
}

export function switchUser(userId: string): boolean {
  const users = getStoredUsers()
  const user = users.find(u => u.id === userId)

  if (!user) {
    return false
  }

  setCurrentUser(user)
  updateUserChannelProfile(user)
  return true
}

