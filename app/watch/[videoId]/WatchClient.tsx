"use client"

import React, { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { UploadDialog } from '@/app/upload-dialog'
import { AuthForm } from '@/components/AuthForm'
import { VideoPage } from '@/components/VideoPage'
import { useLocalData } from '@/hooks/useLocalData'
import { Video } from '@/types'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AuthResult, getCurrentUser } from '@/lib/userAuth'

import { useTheme } from '@/components/ThemeProvider'

interface WatchClientProps {
  video: Video
}

export function WatchClient({ video }: WatchClientProps) {
  const { theme, setTheme } = useTheme()
  const [isMobile, setIsMobile] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  const { addVideo, addShort, refreshUploads } = useLocalData()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if user is authenticated
    const currentUser = getCurrentUser()
    if (currentUser) {
      setIsAuthenticated(true)
    }

    // Listen for user updates (sign in/out)
    const handleUserUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ user: any; previousUser: any }>
      const { user } = customEvent.detail
      setIsAuthenticated(!!user)
    }

    window.addEventListener('lootube:user-updated', handleUserUpdate)

    return () => {
      window.removeEventListener('lootube:user-updated', handleUserUpdate)
    }
  }, [])

  const handleAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode)
    setShowAuthDialog(true)
  }

  const handleAuthSubmit = (result: AuthResult) => {
    if (result.success) {
      setIsAuthenticated(true)
      setShowAuthDialog(false)
    }
  }

  const handleUploadComplete = (videoData: any) => {
    if (videoData?.isShort) {
      addShort(videoData)
    } else {
      addVideo(videoData)
    }
    refreshUploads()
    setShowUploadDialog(false)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setIsSearchOpen(false)
  }

  return (
    <>
      <Header
        isMobile={isMobile}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isAuthenticated={isAuthenticated}
        theme={theme}
        setTheme={setTheme}
        handleAuth={handleAuth}
        setShowUploadDialog={setShowUploadDialog}
        setIsAuthenticated={setIsAuthenticated}
      />
      <VideoPage video={video} />
      <UploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUploadComplete={handleUploadComplete}
      />
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-[425px] w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto rounded-xl bg-background text-foreground sm:rounded-2xl">
          <DialogTitle>{authMode === 'signin' ? 'Sign In' : 'Sign Up'} to Lootube</DialogTitle>
          <AuthForm
            mode={authMode}
            onSuccess={handleAuthSubmit}
            onToggle={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
