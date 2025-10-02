'use client'

import React, { useState, useEffect } from 'react'
import { User, Bell, Download, CreditCard, Lock, Globe, Shield, Eye, Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { getCurrentUser } from '@/lib/userAuth'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const currentUser = getCurrentUser()
  const [activeSection, setActiveSection] = useState<'account' | 'notifications' | 'downloads' | 'purchases' | 'privacy' | null>(null)

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [newVideosNotif, setNewVideosNotif] = useState(true)
  const [commentsNotif, setCommentsNotif] = useState(true)
  const [likesNotif, setLikesNotif] = useState(false)
  const [subscriptionsNotif, setSubscriptionsNotif] = useState(true)

  // Download settings
  const [downloadQuality, setDownloadQuality] = useState<'auto' | '1080p' | '720p' | '480p' | '360p'>('auto')
  const [autoDownload, setAutoDownload] = useState(false)
  const [downloadLocation, setDownloadLocation] = useState('~/Downloads')

  // Privacy settings
  const [privateAccount, setPrivateAccount] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [showLiked, setShowLiked] = useState(true)
  const [showSubscriptions, setShowSubscriptions] = useState(true)

  useEffect(() => {
    // Load settings from localStorage
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('lootube_settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setEmailNotifications(parsed.emailNotifications ?? true)
        setPushNotifications(parsed.pushNotifications ?? true)
        setNewVideosNotif(parsed.newVideosNotif ?? true)
        setCommentsNotif(parsed.commentsNotif ?? true)
        setLikesNotif(parsed.likesNotif ?? false)
        setSubscriptionsNotif(parsed.subscriptionsNotif ?? true)
        setDownloadQuality(parsed.downloadQuality ?? 'auto')
        setAutoDownload(parsed.autoDownload ?? false)
        setDownloadLocation(parsed.downloadLocation ?? '~/Downloads')
        setPrivateAccount(parsed.privateAccount ?? false)
        setShowHistory(parsed.showHistory ?? true)
        setShowLiked(parsed.showLiked ?? true)
        setShowSubscriptions(parsed.showSubscriptions ?? true)
      }
    }
  }, [])

  const saveSettings = () => {
    const settings = {
      emailNotifications,
      pushNotifications,
      newVideosNotif,
      commentsNotif,
      likesNotif,
      subscriptionsNotif,
      downloadQuality,
      autoDownload,
      downloadLocation,
      privateAccount,
      showHistory,
      showLiked,
      showSubscriptions
    }
    localStorage.setItem('lootube_settings', JSON.stringify(settings))
  }

  useEffect(() => {
    saveSettings()
  }, [emailNotifications, pushNotifications, newVideosNotif, commentsNotif, likesNotif, subscriptionsNotif, downloadQuality, autoDownload, downloadLocation, privateAccount, showHistory, showLiked, showSubscriptions])

  const sections = [
    { id: 'account' as const, icon: User, title: 'Account', description: 'Manage your account information' },
    { id: 'notifications' as const, icon: Bell, title: 'Notifications', description: 'Configure notification preferences' },
    { id: 'downloads' as const, icon: Download, title: 'Downloads', description: 'Set download quality and preferences' },
    { id: 'purchases' as const, icon: CreditCard, title: 'Purchases & Memberships', description: 'Manage subscriptions and payments' },
    { id: 'privacy' as const, icon: Shield, title: 'Privacy & Security', description: 'Control your privacy settings' }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Settings</h1>
        <p className="mb-8 text-muted-foreground">Manage your Loottube account settings</p>

        <div className="space-y-3">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Dialog key={section.id} open={activeSection === section.id} onOpenChange={(open) => setActiveSection(open ? section.id : null)}>
                <Button
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-between rounded-2xl border border-border/60 bg-card/80 p-6 text-left transition-all hover:border-primary/40 hover:shadow-md dark:border-white/10 dark:bg-card/60"
                  onClick={() => setActiveSection(section.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
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

                    {section.id === 'account' && (
                      <div className="space-y-6">
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Account Information</h4>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm text-muted-foreground">Full Name</label>
                              <p className="font-medium">{currentUser?.fullName || 'Not set'}</p>
                            </div>
                            <div>
                              <label className="text-sm text-muted-foreground">Email</label>
                              <p className="font-medium">{currentUser?.email}</p>
                            </div>
                            <div>
                              <label className="text-sm text-muted-foreground">Channel Name</label>
                              <p className="font-medium">{currentUser?.channelName}</p>
                            </div>
                            <div>
                              <label className="text-sm text-muted-foreground">Channel Handle</label>
                              <p className="font-medium">{currentUser?.channelHandle}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Actions</h4>
                          <div className="space-y-3">
                            <Button variant="outline" className="w-full justify-start rounded-full">
                              <Lock className="mr-3 h-5 w-5" />
                              Change Password
                            </Button>
                            <Button variant="outline" className="w-full justify-start rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="mr-3 h-5 w-5" />
                              Delete Account
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {section.id === 'notifications' && (
                      <div className="space-y-6">
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">General Notifications</h4>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Email Notifications</p>
                                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                              </div>
                              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Push Notifications</p>
                                <p className="text-sm text-muted-foreground">Receive push notifications</p>
                              </div>
                              <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Activity Notifications</h4>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">New Videos</p>
                                <p className="text-sm text-muted-foreground">From channels you subscribe to</p>
                              </div>
                              <Switch checked={newVideosNotif} onCheckedChange={setNewVideosNotif} />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Comments</p>
                                <p className="text-sm text-muted-foreground">New comments on your videos</p>
                              </div>
                              <Switch checked={commentsNotif} onCheckedChange={setCommentsNotif} />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Likes</p>
                                <p className="text-sm text-muted-foreground">When someone likes your content</p>
                              </div>
                              <Switch checked={likesNotif} onCheckedChange={setLikesNotif} />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">New Subscriptions</p>
                                <p className="text-sm text-muted-foreground">When someone subscribes to your channel</p>
                              </div>
                              <Switch checked={subscriptionsNotif} onCheckedChange={setSubscriptionsNotif} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {section.id === 'downloads' && (
                      <div className="space-y-6">
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Download Quality</h4>
                          <div className="space-y-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between rounded-full">
                                  <span>Quality: {downloadQuality === 'auto' ? 'Auto' : downloadQuality}</span>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                                <DropdownMenuItem onClick={() => setDownloadQuality('auto')} className={cn("rounded-xl mb-1", downloadQuality === 'auto' && 'bg-primary/10')}>
                                  Auto (Recommended)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDownloadQuality('1080p')} className={cn("rounded-xl mb-1", downloadQuality === '1080p' && 'bg-primary/10')}>
                                  1080p (Full HD)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDownloadQuality('720p')} className={cn("rounded-xl mb-1", downloadQuality === '720p' && 'bg-primary/10')}>
                                  720p (HD)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDownloadQuality('480p')} className={cn("rounded-xl mb-1", downloadQuality === '480p' && 'bg-primary/10')}>
                                  480p (SD)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDownloadQuality('360p')} className={cn("rounded-xl", downloadQuality === '360p' && 'bg-primary/10')}>
                                  360p (Low)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Download Preferences</h4>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Auto-download</p>
                                <p className="text-sm text-muted-foreground">Automatically download videos for offline viewing</p>
                              </div>
                              <Switch checked={autoDownload} onCheckedChange={setAutoDownload} />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium">Download Location</label>
                              <input
                                type="text"
                                value={downloadLocation}
                                onChange={(e) => setDownloadLocation(e.target.value)}
                                className="w-full rounded-full border border-border/80 bg-background/80 px-4 py-2 outline-none transition-colors focus:border-primary dark:border-white/20 dark:bg-background/60"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {section.id === 'purchases' && (
                      <div className="space-y-6">
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Active Memberships</h4>
                          <p className="text-sm text-muted-foreground">You don't have any active memberships</p>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Purchase History</h4>
                          <p className="text-sm text-muted-foreground">No purchases found</p>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Payment Methods</h4>
                          <Button variant="outline" className="w-full rounded-full">
                            Add Payment Method
                          </Button>
                        </div>
                      </div>
                    )}

                    {section.id === 'privacy' && (
                      <div className="space-y-6">
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Privacy Settings</h4>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Private Account</p>
                                <p className="text-sm text-muted-foreground">Only approved followers can see your content</p>
                              </div>
                              <Switch checked={privateAccount} onCheckedChange={setPrivateAccount} />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Show Watch History</p>
                                <p className="text-sm text-muted-foreground">Let others see what you've watched</p>
                              </div>
                              <Switch checked={showHistory} onCheckedChange={setShowHistory} />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Show Liked Videos</p>
                                <p className="text-sm text-muted-foreground">Display your liked videos publicly</p>
                              </div>
                              <Switch checked={showLiked} onCheckedChange={setShowLiked} />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Show Subscriptions</p>
                                <p className="text-sm text-muted-foreground">Let others see your subscriptions</p>
                              </div>
                              <Switch checked={showSubscriptions} onCheckedChange={setShowSubscriptions} />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
                          <h4 className="mb-4 font-semibold">Data & Privacy</h4>
                          <div className="space-y-3">
                            <Button variant="outline" className="w-full justify-start rounded-full">
                              <Eye className="mr-3 h-5 w-5" />
                              View Privacy Policy
                            </Button>
                            <Button variant="outline" className="w-full justify-start rounded-full">
                              <Download className="mr-3 h-5 w-5" />
                              Download My Data
                            </Button>
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
