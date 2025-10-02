'use client'

import React, { useState, useEffect } from 'react'
import { Download, Trash2, Eye, Clock, Heart, History, Video, FileText, Database, Shield, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { getCurrentUser } from '@/lib/userAuth'
import { getUserInterestProfile } from '@/lib/userInteractions'
import Link from 'next/link'

interface VideoHistoryItem {
  videoId: string
  timestamp: number
  channelId?: string
  category?: string
  tags?: string[]
  watchDuration?: number
}

interface LikedVideoItem {
  videoId: string
  timestamp: number
  channelId?: string
  category?: string
  tags?: string[]
}

interface CommentItem {
  videoId: string
  timestamp: number
  channelId?: string
}

export default function YourDataPage() {
  const currentUser = getCurrentUser()
  const [activeSection, setActiveSection] = useState<'overview' | 'watch-history' | 'liked' | 'comments' | 'downloads' | 'delete' | null>(null)
  const [historyPaused, setHistoryPaused] = useState(false)
  const [viewingHistory, setViewingHistory] = useState<VideoHistoryItem[]>([])
  const [viewingLiked, setViewingLiked] = useState<LikedVideoItem[]>([])
  const [viewingComments, setViewingComments] = useState<CommentItem[]>([])
  const [groupedHistory, setGroupedHistory] = useState<Record<string, VideoHistoryItem[]>>({})
  const [stats, setStats] = useState({
    videosWatched: 0,
    videosLiked: 0,
    comments: 0,
    subscriptions: 0,
    playlists: 0,
    storageUsed: '0 MB'
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      // Get real interaction data
      const profile = getUserInterestProfile(currentUser.id)

      const videosWatched = profile.recentInteractions.filter(i => i.type === 'view').length
      const videosLiked = profile.recentInteractions.filter(i => i.type === 'like').length
      const comments = profile.recentInteractions.filter(i => i.type === 'comment').length
      const subscriptions = profile.recentInteractions.filter(i => i.type === 'subscribe').length

      // Get playlists from localStorage
      const playlistsData = localStorage.getItem(`lootube_playlists_${currentUser.id}`)
      const playlists = playlistsData ? JSON.parse(playlistsData).length : 0

      // Calculate storage from uploads
      const uploadsData = localStorage.getItem('lootube_uploads')
      let storageBytes = 0
      if (uploadsData) {
        try {
          const uploads = JSON.parse(uploadsData)
          const userUploads = uploads.filter((u: any) => u.ownerId === currentUser.id)
          // Rough estimate: average video = 50MB, short = 10MB
          userUploads.forEach((u: any) => {
            storageBytes += u.type === 'short' ? 10 * 1024 * 1024 : 50 * 1024 * 1024
          })
        } catch {}
      }

      const storageUsed = storageBytes === 0 ? '0 MB' :
        storageBytes < 1024 * 1024 * 1024 ? `${(storageBytes / (1024 * 1024)).toFixed(1)} MB` :
        `${(storageBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`

      setStats({
        videosWatched,
        videosLiked,
        comments,
        subscriptions,
        playlists,
        storageUsed
      })

      // Check if history is paused
      const pausedState = localStorage.getItem('lootube_history_paused')
      setHistoryPaused(pausedState === 'true')
    }
  }, [currentUser?.id])

  // Action handlers
  const loadHistory = () => {
    if (typeof window !== 'undefined' && currentUser) {
      const profile = getUserInterestProfile(currentUser.id)
      const watchHistory = profile.recentInteractions
        .filter(i => i.type === 'view')
        .sort((a, b) => b.timestamp - a.timestamp) as VideoHistoryItem[]

      setViewingHistory(watchHistory)

      if (watchHistory.length === 0) {
        alert('No watch history found. Watch some videos to see them here!')
        return
      }

      // Group by date
      const grouped: Record<string, VideoHistoryItem[]> = {}
      watchHistory.forEach((item) => {
        const date = new Date(item.timestamp)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        let dateKey: string
        if (date.toDateString() === today.toDateString()) {
          dateKey = 'Today'
        } else if (date.toDateString() === yesterday.toDateString()) {
          dateKey = 'Yesterday'
        } else {
          dateKey = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        }

        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(item)
      })

      setGroupedHistory(grouped)
    }
  }

  const loadLikedVideos = () => {
    if (typeof window !== 'undefined' && currentUser) {
      const profile = getUserInterestProfile(currentUser.id)
      const liked = profile.recentInteractions
        .filter(i => i.type === 'like')
        .sort((a, b) => b.timestamp - a.timestamp) as LikedVideoItem[]

      if (liked.length === 0) {
        alert('No liked videos found. Like some videos to see them here!')
        return
      }

      setViewingLiked(liked)
    }
  }

  const loadComments = () => {
    if (typeof window !== 'undefined' && currentUser) {
      const profile = getUserInterestProfile(currentUser.id)
      const comments = profile.recentInteractions
        .filter(i => i.type === 'comment')
        .sort((a, b) => b.timestamp - a.timestamp) as CommentItem[]

      if (comments.length === 0) {
        alert('No comments found. Comment on some videos to see them here!')
        return
      }

      setViewingComments(comments)
    }
  }

  const handleClearHistory = () => {
    if (typeof window !== 'undefined' && currentUser && confirm('Are you sure you want to clear your watch history? This cannot be undone.')) {
      const key = `lootube_interests_${currentUser.id}`
      const profile = getUserInterestProfile(currentUser.id)
      profile.recentInteractions = profile.recentInteractions.filter(i => i.type !== 'view')
      localStorage.setItem(key, JSON.stringify(profile))
      setStats(prev => ({ ...prev, videosWatched: 0 }))
      setViewingHistory([])
      setGroupedHistory({})
      alert('Watch history cleared successfully')
    }
  }

  const handleRemoveHistoryItem = (videoId: string, timestamp: number) => {
    if (typeof window !== 'undefined' && currentUser) {
      const key = `lootube_interests_${currentUser.id}`
      const profile = getUserInterestProfile(currentUser.id)
      profile.recentInteractions = profile.recentInteractions.filter(
        i => !(i.videoId === videoId && i.timestamp === timestamp)
      )
      localStorage.setItem(key, JSON.stringify(profile))
      loadHistory()
      setStats(prev => ({ ...prev, videosWatched: prev.videosWatched - 1 }))
    }
  }

  const handleRemoveLikedItem = (videoId: string, timestamp: number) => {
    if (typeof window !== 'undefined' && currentUser) {
      const key = `lootube_interests_${currentUser.id}`
      const profile = getUserInterestProfile(currentUser.id)
      profile.recentInteractions = profile.recentInteractions.filter(
        i => !(i.videoId === videoId && i.timestamp === timestamp)
      )
      localStorage.setItem(key, JSON.stringify(profile))
      loadLikedVideos()
      setStats(prev => ({ ...prev, videosLiked: prev.videosLiked - 1 }))
    }
  }

  const handleRemoveCommentItem = (videoId: string, timestamp: number) => {
    if (typeof window !== 'undefined' && currentUser) {
      const key = `lootube_interests_${currentUser.id}`
      const profile = getUserInterestProfile(currentUser.id)
      profile.recentInteractions = profile.recentInteractions.filter(
        i => !(i.videoId === videoId && i.timestamp === timestamp)
      )
      localStorage.setItem(key, JSON.stringify(profile))
      loadComments()
      setStats(prev => ({ ...prev, comments: prev.comments - 1 }))
    }
  }

  const handlePauseHistory = () => {
    if (typeof window !== 'undefined') {
      const newState = !historyPaused
      localStorage.setItem('lootube_history_paused', String(newState))
      setHistoryPaused(newState)
      alert(newState ? 'Watch history paused' : 'Watch history resumed')
    }
  }

  const handleClearLikes = () => {
    if (typeof window !== 'undefined' && currentUser && confirm('Are you sure you want to clear all your liked videos? This cannot be undone.')) {
      const key = `lootube_interests_${currentUser.id}`
      const profile = getUserInterestProfile(currentUser.id)
      profile.recentInteractions = profile.recentInteractions.filter(i => i.type !== 'like')
      localStorage.setItem(key, JSON.stringify(profile))
      setStats(prev => ({ ...prev, videosLiked: 0 }))
      alert('Liked videos cleared successfully')
    }
  }

  const handleClearComments = () => {
    if (typeof window !== 'undefined' && currentUser && confirm('Are you sure you want to delete all your comments? This cannot be undone.')) {
      const key = `lootube_interests_${currentUser.id}`
      const profile = getUserInterestProfile(currentUser.id)
      profile.recentInteractions = profile.recentInteractions.filter(i => i.type !== 'comment')
      localStorage.setItem(key, JSON.stringify(profile))
      setStats(prev => ({ ...prev, comments: 0 }))
      alert('Comments deleted successfully')
    }
  }

  const handleDownloadData = (type: string) => {
    if (typeof window !== 'undefined' && currentUser) {
      let data: any = {}

      switch(type) {
        case 'Watch History':
          const profile = getUserInterestProfile(currentUser.id)
          data = profile.recentInteractions.filter(i => i.type === 'view')
          break
        case 'Liked Videos':
          const likeProfile = getUserInterestProfile(currentUser.id)
          data = likeProfile.recentInteractions.filter(i => i.type === 'like')
          break
        case 'Comments':
          const commentProfile = getUserInterestProfile(currentUser.id)
          data = commentProfile.recentInteractions.filter(i => i.type === 'comment')
          break
        case 'Subscriptions':
          const subProfile = getUserInterestProfile(currentUser.id)
          data = subProfile.recentInteractions.filter(i => i.type === 'subscribe')
          break
        case 'Playlists':
          const playlistsData = localStorage.getItem(`lootube_playlists_${currentUser.id}`)
          data = playlistsData ? JSON.parse(playlistsData) : []
          break
        case 'Channel Data':
          data = {
            id: currentUser.id,
            email: currentUser.email,
            channelName: currentUser.channelName,
            channelHandle: currentUser.channelHandle,
            fullName: currentUser.fullName
          }
          break
        case 'Complete Archive':
          const fullProfile = getUserInterestProfile(currentUser.id)
          const allPlaylists = localStorage.getItem(`lootube_playlists_${currentUser.id}`)
          data = {
            user: {
              id: currentUser.id,
              email: currentUser.email,
              channelName: currentUser.channelName,
              channelHandle: currentUser.channelHandle,
              fullName: currentUser.fullName
            },
            interactions: fullProfile.recentInteractions,
            interests: {
              categories: fullProfile.categories,
              channels: fullProfile.channels,
              tags: fullProfile.tags
            },
            playlists: allPlaylists ? JSON.parse(allPlaylists) : []
          }
          break
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `loottube-${type.toLowerCase().replace(/ /g, '-')}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      alert(`${type} downloaded successfully!`)
    }
  }

  const handleDeleteAccount = () => {
    if (typeof window !== 'undefined' && currentUser) {
      const confirmed = confirm('⚠️ WARNING: This will permanently delete your account and all associated data. This action cannot be reversed. Type "DELETE" in the prompt to confirm.')
      if (confirmed) {
        const doubleConfirm = prompt('Type DELETE to confirm account deletion:')
        if (doubleConfirm === 'DELETE') {
          // Clear all user data
          localStorage.removeItem(`lootube_interests_${currentUser.id}`)
          localStorage.removeItem(`lootube_playlists_${currentUser.id}`)
          localStorage.removeItem('lootube_user')
          localStorage.removeItem('lootube_settings')
          alert('Account deleted. You will be redirected to the home page.')
          window.location.href = '/'
        }
      }
    }
  }

  const dataSections = [
    {
      id: 'overview' as const,
      icon: Database,
      title: 'Data Overview',
      description: 'Summary of all your data stored in Loottube',
      stats: [
        { label: 'Videos Watched', value: stats.videosWatched.toString() },
        { label: 'Videos Liked', value: stats.videosLiked.toString() },
        { label: 'Comments', value: stats.comments.toString() },
        { label: 'Subscriptions', value: stats.subscriptions.toString() },
        { label: 'Playlists Created', value: stats.playlists.toString() },
        { label: 'Total Storage Used', value: stats.storageUsed }
      ]
    },
    {
      id: 'watch-history' as const,
      icon: History,
      title: 'Watch History',
      description: 'View and manage your viewing history',
      actions: ['View Full History', 'Clear All History', 'Pause History']
    },
    {
      id: 'liked' as const,
      icon: Heart,
      title: 'Liked Videos',
      description: 'Videos you have liked',
      actions: ['View Liked Videos', 'Export List', 'Clear All Likes']
    },
    {
      id: 'comments' as const,
      icon: FileText,
      title: 'Comments & Interactions',
      description: 'Your comments and interactions across Loottube',
      actions: ['View All Comments', 'Export Comments', 'Delete All Comments']
    },
    {
      id: 'downloads' as const,
      icon: Download,
      title: 'Download Your Data',
      description: 'Export a copy of your Loottube data',
      downloadTypes: [
        'Watch History',
        'Liked Videos',
        'Comments',
        'Subscriptions',
        'Playlists',
        'Channel Data',
        'Complete Archive'
      ]
    },
    {
      id: 'delete' as const,
      icon: Trash2,
      title: 'Delete Your Data',
      description: 'Permanently delete specific data or your entire account',
      dangerZone: true
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Your Data in Loottube</h1>
          <p className="text-muted-foreground">
            View, download, and manage the data associated with your account
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-border/60 bg-card/80 p-6 dark:border-white/10 dark:bg-card/60">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Privacy & Control</h3>
              <p className="text-sm text-muted-foreground">You own your data and have full control over it</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Loottube is committed to protecting your privacy. You can download, view, or delete your data at any time.
            Your data is stored securely and will never be shared with third parties without your explicit consent.
          </p>
        </div>

        <div className="space-y-3">
          {dataSections.map((section) => {
            const Icon = section.icon
            return (
              <Dialog key={section.id} open={activeSection === section.id} onOpenChange={(open) => setActiveSection(open ? section.id : null)}>
                <Button
                  variant="ghost"
                  className={`flex h-auto w-full items-center justify-between rounded-2xl border p-6 text-left transition-all hover:shadow-md ${
                    section.dangerZone
                      ? 'border-destructive/40 bg-destructive/5 hover:border-destructive hover:bg-destructive/10 dark:bg-destructive/10'
                      : 'border-border/60 bg-card/80 hover:border-primary/40 dark:border-white/10 dark:bg-card/60'
                  }`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      section.dangerZone ? 'bg-destructive/20' : 'bg-primary/10'
                    }`}>
                      <Icon className={`h-6 w-6 ${section.dangerZone ? 'text-destructive' : 'text-primary'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{section.title}</h3>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Button>

                <DialogContent className="sm:max-w-[600px] w-[calc(100vw-2rem)] max-h-[85vh] rounded-xl bg-background text-foreground sm:rounded-2xl">
                  <div className="max-h-[75vh] overflow-y-auto pr-1">
                    <DialogTitle className="mb-6 text-2xl font-bold">{section.title}</DialogTitle>
                    <DialogDescription className="sr-only">{section.description}</DialogDescription>

                    {section.id === 'overview' && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Account Data Summary</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {section.stats?.map((stat) => (
                              <div key={stat.label} className="rounded-xl border border-border/40 bg-background/50 p-4">
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <p className="text-sm text-muted-foreground">
                            Last data export: Never
                          </p>
                        </div>
                      </div>
                    )}

                    {section.id === 'watch-history' && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Watch History Settings</h4>
                          <p className="mb-4 text-sm text-muted-foreground">
                            Your watch history helps personalize your recommendations and makes it easier to find videos you've watched.
                          </p>
                          <div className="space-y-3">
                            <Button variant="outline" className="w-full justify-start rounded-full" onClick={loadHistory}>
                              <Eye className="mr-3 h-5 w-5" />
                              View Full History
                            </Button>
                            <Button variant="outline" className="w-full justify-start rounded-full" onClick={handlePauseHistory}>
                              <Clock className="mr-3 h-5 w-5" />
                              {historyPaused ? 'Resume History' : 'Pause History'}
                            </Button>
                            <Button variant="outline" className="w-full justify-start rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleClearHistory}>
                              <Trash2 className="mr-3 h-5 w-5" />
                              Clear All History
                            </Button>
                          </div>

                          {viewingHistory.length > 0 ? (
                            <div className="mt-6 max-h-96 overflow-y-auto rounded-xl border border-border/60 bg-background/50 p-4">
                              <div className="mb-4 flex items-center justify-between">
                                <h4 className="font-semibold">Watch History ({viewingHistory.length})</h4>
                                <Button variant="ghost" size="sm" onClick={() => setViewingHistory([])}>Close</Button>
                              </div>
                              <div className="space-y-6">
                                {Object.entries(groupedHistory).map(([date, items]) => (
                                  <div key={date}>
                                    <div className="mb-3 flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-primary" />
                                      <h5 className="font-medium">{date}</h5>
                                      <span className="text-sm text-muted-foreground">({items.length})</span>
                                    </div>
                                    <div className="space-y-2">
                                      {items.map((item) => (
                                        <div key={`${item.videoId}-${item.timestamp}`} className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/30 p-3 text-sm">
                                          <Link href={`/watch?v=${item.videoId}`} className="flex flex-1 items-center gap-3">
                                            <Video className="h-4 w-4 text-muted-foreground" />
                                            <div className="flex-1">
                                              <p className="font-medium">Video {item.videoId.slice(0, 8)}...</p>
                                              <p className="text-xs text-muted-foreground">
                                                {new Date(item.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                {item.category && ` • ${item.category}`}
                                              </p>
                                            </div>
                                          </Link>
                                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100" onClick={() => handleRemoveHistoryItem(item.videoId, item.timestamp)}>
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : stats.videosWatched === 0 ? null : (
                            <div className="mt-6 rounded-xl border border-border/60 bg-background/50 p-6 text-center">
                              <p className="text-sm text-muted-foreground">No watch history found. Watch some videos to see them here!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {section.id === 'liked' && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Liked Videos</h4>
                          <p className="mb-4 text-sm text-muted-foreground">
                            Manage videos you've liked across Loottube.
                          </p>
                          <div className="space-y-3">
                            <Button variant="outline" className="w-full justify-start rounded-full" onClick={loadLikedVideos}>
                              <Heart className="mr-3 h-5 w-5" />
                              View Liked Videos
                            </Button>
                            <Button variant="outline" className="w-full justify-start rounded-full" onClick={() => handleDownloadData('Liked Videos')}>
                              <Download className="mr-3 h-5 w-5" />
                              Export List
                            </Button>
                            <Button variant="outline" className="w-full justify-start rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleClearLikes}>
                              <Trash2 className="mr-3 h-5 w-5" />
                              Clear All Likes
                            </Button>
                          </div>

                          {viewingLiked.length > 0 ? (
                            <div className="mt-6 max-h-96 overflow-y-auto rounded-xl border border-border/60 bg-background/50 p-4">
                              <div className="mb-4 flex items-center justify-between">
                                <h4 className="font-semibold">Liked Videos ({viewingLiked.length})</h4>
                                <Button variant="ghost" size="sm" onClick={() => setViewingLiked([])}>Close</Button>
                              </div>
                              <div className="space-y-2">
                                {viewingLiked.map((item) => (
                                  <div key={`${item.videoId}-${item.timestamp}`} className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/30 p-3 text-sm">
                                    <Link href={`/watch?v=${item.videoId}`} className="flex flex-1 items-center gap-3">
                                      <Heart className="h-4 w-4 text-primary" />
                                      <div className="flex-1">
                                        <p className="font-medium">Video {item.videoId.slice(0, 8)}...</p>
                                        <p className="text-xs text-muted-foreground">
                                          Liked {new Date(item.timestamp).toLocaleDateString()}
                                          {item.category && ` • ${item.category}`}
                                        </p>
                                      </div>
                                    </Link>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100" onClick={() => handleRemoveLikedItem(item.videoId, item.timestamp)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : stats.videosLiked === 0 ? null : (
                            <div className="mt-6 rounded-xl border border-border/60 bg-background/50 p-6 text-center">
                              <p className="text-sm text-muted-foreground">No liked videos found. Like some videos to see them here!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {section.id === 'comments' && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Comments & Interactions</h4>
                          <p className="mb-4 text-sm text-muted-foreground">
                            View and manage all your comments across Loottube.
                          </p>
                          <div className="space-y-3">
                            <Button variant="outline" className="w-full justify-start rounded-full" onClick={loadComments}>
                              <FileText className="mr-3 h-5 w-5" />
                              View All Comments
                            </Button>
                            <Button variant="outline" className="w-full justify-start rounded-full" onClick={() => handleDownloadData('Comments')}>
                              <Download className="mr-3 h-5 w-5" />
                              Export Comments
                            </Button>
                            <Button variant="outline" className="w-full justify-start rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleClearComments}>
                              <Trash2 className="mr-3 h-5 w-5" />
                              Delete All Comments
                            </Button>
                          </div>

                          {viewingComments.length > 0 ? (
                            <div className="mt-6 max-h-96 overflow-y-auto rounded-xl border border-border/60 bg-background/50 p-4">
                              <div className="mb-4 flex items-center justify-between">
                                <h4 className="font-semibold">Comments ({viewingComments.length})</h4>
                                <Button variant="ghost" size="sm" onClick={() => setViewingComments([])}>Close</Button>
                              </div>
                              <div className="space-y-2">
                                {viewingComments.map((item) => (
                                  <div key={`${item.videoId}-${item.timestamp}`} className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/30 p-3 text-sm">
                                    <Link href={`/watch?v=${item.videoId}`} className="flex flex-1 items-center gap-3">
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                      <div className="flex-1">
                                        <p className="font-medium">Comment on Video {item.videoId.slice(0, 8)}...</p>
                                        <p className="text-xs text-muted-foreground">
                                          {new Date(item.timestamp).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </Link>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100" onClick={() => handleRemoveCommentItem(item.videoId, item.timestamp)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : stats.comments === 0 ? null : (
                            <div className="mt-6 rounded-xl border border-border/60 bg-background/50 p-6 text-center">
                              <p className="text-sm text-muted-foreground">No comments found. Comment on some videos to see them here!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {section.id === 'downloads' && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Download Your Data</h4>
                          <p className="mb-4 text-sm text-muted-foreground">
                            Export a copy of your data in JSON format. This may take a few minutes to prepare.
                          </p>
                          <div className="space-y-2">
                            {section.downloadTypes?.map((type) => (
                              <div key={type} className="flex items-center justify-between rounded-xl border border-border/40 bg-background/50 p-3">
                                <span className="text-sm font-medium">{type}</span>
                                <Button variant="ghost" size="sm" className="rounded-full" onClick={() => handleDownloadData(type)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {section.id === 'delete' && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-destructive/60 bg-destructive/5 p-6">
                          <h4 className="mb-4 font-semibold text-destructive">Danger Zone</h4>
                          <p className="mb-4 text-sm text-muted-foreground">
                            These actions are permanent and cannot be undone. Please proceed with caution.
                          </p>
                          <div className="space-y-3">
                            <Button variant="outline" className="w-full justify-start rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleClearHistory}>
                              <Trash2 className="mr-3 h-5 w-5" />
                              Delete Watch History
                            </Button>
                            <Button variant="outline" className="w-full justify-start rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleClearComments}>
                              <Trash2 className="mr-3 h-5 w-5" />
                              Delete All Comments
                            </Button>
                            <Button variant="outline" className="w-full justify-start rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => {
                              if (currentUser && confirm('Are you sure you want to delete all your playlists? This cannot be undone.')) {
                                localStorage.removeItem(`lootube_playlists_${currentUser.id}`)
                                setStats(prev => ({ ...prev, playlists: 0 }))
                                alert('All playlists deleted successfully')
                              }
                            }}>
                              <Trash2 className="mr-3 h-5 w-5" />
                              Delete All Playlists
                            </Button>
                            <div className="my-4 border-t border-destructive/20" />
                            <Button variant="destructive" className="w-full rounded-full" onClick={handleDeleteAccount}>
                              <Trash2 className="mr-3 h-5 w-5" />
                              Delete My Account
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              This will permanently delete your account and all associated data. This action cannot be reversed.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )
          })}
        </div>
      </div>
    </div>
  )
}
