import React, { useState, useEffect } from 'react'
import { User, UserCircle, Settings, LogOut, DollarSign, FileText, Sun, Moon, Globe, HelpCircle, Keyboard, Users, Database, Languages, MapPin, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getCurrentUser, getAllUsers, switchUser } from '@/lib/userAuth'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface UserMenuProps {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  isMobile?: boolean
  onSignOut: () => void
}

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ar', name: 'العربية' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'hi', name: 'हिन्दी' },
]

const locations = [
  { code: 'US', name: 'United States' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
]

export function UserMenu({ theme, setTheme, isMobile = false, onSignOut }: UserMenuProps) {
  const currentUser = getCurrentUser()
  const channelUrl = currentUser?.channelHandle ? currentUser.channelHandle.startsWith('@') ? `/${currentUser.channelHandle}` : `/@${currentUser.channelHandle}` : '/@your-channel'

  const [allUsers, setAllUsers] = useState<any[]>([])
  const [language, setLanguage] = useState('en')
  const [location, setLocation] = useState('NG')

  useEffect(() => {
    // Load all users for account switching
    const users = getAllUsers()
    setAllUsers(users.filter(u => u.id !== currentUser?.id))
  }, [currentUser?.id])

  useEffect(() => {
    // Load user preferences from localStorage (only once on mount)
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('lootube_language')
      const savedLoc = localStorage.getItem('lootube_location')

      if (savedLang) setLanguage(savedLang)
      else {
        // Auto-detect language
        const browserLang = navigator.language.split('-')[0]
        const detectedLang = languages.find(l => l.code === browserLang)?.code || 'en'
        setLanguage(detectedLang)
      }

      if (savedLoc) setLocation(savedLoc)
      else {
        // Auto-detect location from timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (timezone.includes('America')) setLocation('US')
        else if (timezone.includes('Europe/London')) setLocation('GB')
        else if (timezone.includes('Europe')) setLocation('DE')
        else if (timezone.includes('Asia/Tokyo')) setLocation('JP')
        else if (timezone.includes('Asia/Kolkata')) setLocation('IN')
        else if (timezone.includes('Africa/Lagos')) setLocation('NG')
      }
    }
  }, [])

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode)
    localStorage.setItem('lootube_language', langCode)
  }

  const handleLocationChange = (locCode: string) => {
    setLocation(locCode)
    localStorage.setItem('lootube_location', locCode)
  }

  const handleSwitchAccount = (userId: string) => {
    switchUser(userId)
    window.location.reload()
  }

  // Get avatar from channel profile in localStorage (more up-to-date than user object)
  let userAvatar = currentUser?.avatar
  if (typeof window !== 'undefined' && currentUser?.id) {
    try {
      const channelKey = `lootube_channel_${currentUser.id}`
      const channelData = localStorage.getItem(channelKey)
      if (channelData) {
        const parsed = JSON.parse(channelData)
        if (parsed.avatar) {
          userAvatar = parsed.avatar
        }
      }
    } catch (error) {
      // Fallback to user avatar
    }
  }

  return (
    <Dialog>
      {isMobile ? (
        <DialogTrigger asChild>
          <Button variant="ghost" className="flex h-[3.4rem] w-[3.4rem] flex-col items-center justify-center rounded-full">
            {userAvatar && userAvatar !== '/placeholder.svg' ? (
              <Image src={userAvatar} alt="Profile" width={38} height={38} className="rounded-full object-cover ring-2 ring-blue-500" />
            ) : (
              <User className="h-[2.4rem] w-[2.4rem]" />
            )}
            <span className="text-xs mt-1">You</span>
          </Button>
        </DialogTrigger>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="ghost" className="rounded-full p-1">
                  {userAvatar && userAvatar !== '/placeholder.svg' ? (
                    <Image src={userAvatar} alt="Profile" width={32} height={32} className="rounded-full object-cover ring-2 ring-blue-500" />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Account</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <DialogContent className="sm:max-w-[425px] w-[calc(100vw-2rem)] max-h-[85vh] rounded-xl bg-background text-foreground sm:rounded-2xl">
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-4">
            {userAvatar && userAvatar !== '/placeholder.svg' ? (
              <Image src={userAvatar} alt="Profile" width={48} height={48} className="rounded-full object-cover ring-2 ring-primary" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{currentUser?.fullName || 'User'}</p>
              <p className="text-sm text-muted-foreground truncate">{currentUser?.email}</p>
            </div>
          </div>

          <DialogTitle className="sr-only">User Menu</DialogTitle>
          <DialogDescription className="sr-only">
            Access account settings and personalization options.
          </DialogDescription>

          <div className="flex flex-col space-y-1">
            <Link href={channelUrl}>
              <Button variant="ghost" className="w-full justify-start rounded-full px-4">
                <UserCircle className="mr-3 h-5 w-5" />
                View your channel
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between rounded-full px-4">
                  <div className="flex items-center">
                    <Users className="mr-3 h-5 w-5" />
                    Switch account
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
                {allUsers.length > 0 ? (
                  <>
                    {allUsers.map((user) => (
                      <DropdownMenuItem
                        key={user.id}
                        onClick={() => handleSwitchAccount(user.id)}
                        className="flex items-center gap-3 p-3 rounded-xl mb-1"
                      >
                        {user.avatar && user.avatar !== '/placeholder.svg' ? (
                          <Image src={user.avatar} alt={user.fullName || user.channelName || user.email} width={32} height={32} className="rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.fullName || user.channelName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuItem onClick={onSignOut} className="rounded-xl">
                  Add account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" className="justify-start rounded-full px-4" onClick={onSignOut}>
              <LogOut className="mr-3 h-5 w-5" />
              Sign out
            </Button>

            <div className="my-2 border-t border-border/50" />

            <Link href="/purchases">
              <Button variant="ghost" className="w-full justify-start rounded-full px-4">
                <DollarSign className="mr-3 h-5 w-5" />
                Purchases and memberships
              </Button>
            </Link>

            <Link href="/your-data">
              <Button variant="ghost" className="w-full justify-start rounded-full px-4">
                <Database className="mr-3 h-5 w-5" />
                Your data in Loottube
              </Button>
            </Link>

            <div className="my-2 border-t border-border/50" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between rounded-full px-4">
                  <div className="flex items-center">
                    {(() => {
                      if (theme === 'light') return <Sun className="mr-3 h-5 w-5" />
                      if (theme === 'dark') return <Moon className="mr-3 h-5 w-5" />
                      return <Moon className="mr-3 h-5 w-5" />
                    })()}
                    Appearance: {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'Device theme'}
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl p-2">
                <DropdownMenuItem onClick={() => setTheme('light')} className="rounded-xl mb-1">
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')} className="rounded-xl mb-1">
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')} className="rounded-xl">
                  <Globe className="mr-2 h-4 w-4" />
                  Device theme
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between rounded-full px-4">
                  <div className="flex items-center">
                    <Languages className="mr-3 h-5 w-5" />
                    Language: {languages.find(l => l.code === language)?.name || 'English'}
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto rounded-2xl p-2">
                {languages.map((lang, index) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={cn("rounded-xl", index < languages.length - 1 && "mb-1", language === lang.code ? 'bg-primary/10' : '')}
                  >
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between rounded-full px-4">
                  <div className="flex items-center">
                    <MapPin className="mr-3 h-5 w-5" />
                    Location: {locations.find(l => l.code === location)?.name || 'Nigeria'}
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto rounded-2xl p-2">
                {locations.map((loc, index) => (
                  <DropdownMenuItem
                    key={loc.code}
                    onClick={() => handleLocationChange(loc.code)}
                    className={cn("rounded-xl", index < locations.length - 1 && "mb-1", location === loc.code ? 'bg-primary/10' : '')}
                  >
                    {loc.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="my-2 border-t border-border/50" />

            <Link href="/settings">
              <Button variant="ghost" className="w-full justify-start rounded-full px-4">
                <Settings className="mr-3 h-5 w-5" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
