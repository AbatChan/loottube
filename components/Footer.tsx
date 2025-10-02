import React from 'react'
import { Home, Play, Upload, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/UserMenu'

interface FooterProps {
  activeTab: 'home' | 'shorts'
  setActiveTab: (tab: 'home' | 'shorts') => void
  isAuthenticated: boolean
  handleAuth: (mode: 'signin' | 'signup') => void
  setShowUploadDialog: (show: boolean) => void
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
}

export function Footer({
  activeTab,
  setActiveTab,
  isAuthenticated,
  handleAuth,
  setShowUploadDialog,
  theme,
  setTheme,
  setIsAuthenticated
}: FooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-border/80 bg-background dark:border-white/15">
      <Button variant="ghost" className="flex flex-col items-center h-[3.4rem] w-[3.4rem]" onClick={() => setActiveTab('home')}>
        <Home className="h-full w-full" />
        <span className="text-xs mt-1">Home</span>
      </Button>
      <Button variant="ghost" className="flex flex-col items-center h-[3.4rem] w-[3.4rem]" onClick={() => setActiveTab('shorts')}>
        <Play className="h-full w-full" />
        <span className="text-xs mt-1">Shorts</span>
      </Button>
      {isAuthenticated ? (
        <Button variant="ghost" className="flex flex-col items-center h-[3.4rem] w-[3.4rem]" onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-full w-full" />
          <span className="text-xs mt-1">Create</span>
        </Button>
      ) : (
        <Button variant="ghost" className="flex flex-col items-center h-[3.4rem] w-[3.4rem]" onClick={() => handleAuth('signin')}>
          <User className="h-full w-full" />
          <span className="text-xs mt-1">Sign In</span>
        </Button>
      )}
      {isAuthenticated && <UserMenu theme={theme} setTheme={setTheme} onSignOut={() => setIsAuthenticated(false)} isMobile />}
    </footer>
  )
}
