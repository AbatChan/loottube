import React from 'react'
import Link from 'next/link'
import { Search, X, Sun, Moon, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { NotificationsDialog } from '@/components/NotificationsDialog'
import { UserMenu } from '@/components/UserMenu'
import { Logo } from '@/components/Logo'

interface HeaderProps {
  isMobile: boolean
  isSearchOpen: boolean
  setIsSearchOpen: (isOpen: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  isAuthenticated: boolean
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  handleAuth: (mode: 'signin' | 'signup') => void
  setShowUploadDialog: (show: boolean) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
}

export function Header({
  isMobile,
  isSearchOpen,
  setIsSearchOpen,
  searchQuery,
  setSearchQuery,
  isAuthenticated,
  theme,
  setTheme,
  handleAuth,
  setShowUploadDialog,
  setIsAuthenticated
}: HeaderProps) {
  const clearSearch = () => {
    setSearchQuery("")
    setIsSearchOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-background/95 px-4 shadow-[0_1px_0_0_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:backdrop-blur dark:bg-background/80 dark:shadow-[0_1px_0_0_rgba(148,163,184,0.2)]">
      <div className="flex items-center space-x-3">
        <Link href="/" className="flex items-center">
          <Logo variant={isMobile ? 'small' : 'default'} linkWrapper={false} />
        </Link>
        {!isMobile && (
          <span className="text-sm italic text-muted-foreground/70">
            for my grandparents
          </span>
        )}
      </div>
      
      {isMobile ? (
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Search className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Search</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DialogContent className="sm:max-w-[425px] w-[calc(100vw-2rem)] rounded-xl sm:rounded-2xl">
            <DialogTitle className="sr-only">Search</DialogTitle>
            <DialogDescription className="sr-only">
              Search for videos and channels on Lootube
            </DialogDescription>
            <div className="flex w-full items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-border/80 bg-background/80 px-4 py-2 pr-10 text-foreground outline-none transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-0 dark:border-white/20 dark:bg-background/60"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                  {searchQuery && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={clearSearch}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clear search</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Submit search</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <div className="flex max-w-xl flex-1 items-center justify-center px-4">
          <div className="relative flex w-full items-center">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-border/80 bg-background/80 px-4 py-1.5 pr-20 text-foreground outline-none transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-0 dark:border-white/20 dark:bg-background/60"
            />
            <div className="absolute right-1 flex items-center space-x-1">
              {searchQuery && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={clearSearch}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear search</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Submit search</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      )}

      {!isMobile && (
        <div className="flex items-center space-x-2">
          {isAuthenticated ? (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setShowUploadDialog(true)}>
                      <Upload className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upload video</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <NotificationsDialog />
            </>
          ) : (
            <Button variant="outline" className="rounded-full" onClick={() => handleAuth('signin')}>Sign In</Button>
          )}
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      {theme === 'light' ? (
                        <Sun className="h-5 w-5" />
                      ) : theme === 'dark' ? (
                        <Moon className="h-5 w-5" />
                      ) : (
                        <Sun className="h-5 w-5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Appearance</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" className="rounded-2xl p-2">
              <DropdownMenuItem onClick={() => setTheme('light')} className="rounded-xl mb-1">Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className="rounded-xl mb-1">Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className="rounded-xl">System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isAuthenticated && <UserMenu theme={theme} setTheme={setTheme} onSignOut={() => {
            if (window.confirm('Are you sure you want to sign out?')) {
              const { signOut } = require('@/lib/userAuth')
              signOut()
              setIsAuthenticated(false)
            }
          }} />}
        </div>
      )}
    </header>
  )
}
