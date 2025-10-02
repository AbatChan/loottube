"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Upload, Image as ImageIcon, Loader2, X, Plus } from "lucide-react"
import Image from "next/image"
import { YouTubeVideo } from "@/lib/youtube"
import { YOUTUBE_CATEGORIES, VISIBILITY_OPTIONS } from "@/lib/upload-constants"
import { getCurrentUser } from "@/lib/userAuth"
import { notifySubscribersOfNewUpload } from "@/lib/notifications"

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: (videoData: YouTubeVideo & { filePath?: string }) => void
}

export function UploadDialog({ open, onOpenChange, onUploadComplete }: UploadDialogProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string>("General")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [visibility, setVisibility] = useState<string>("public")
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setUploading(false)
      setSelectedFile(null)
      setTitle('')
      setDescription('')
      setCategory('General')
      setTags([])
      setTagInput('')
      setVisibility('public')
      setThumbnailPreview(null)
      setThumbnailFile(null)
      setDuration(0)
      setErrorMessage(null)
    }
  }, [open])

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const canLoadBlobMedia = useCallback(() => {
    if (typeof document === "undefined") return true
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    if (!meta) return true
    const content = meta.getAttribute('content') ?? ''
    const mediaDirective = content
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('media-src'))
    if (!mediaDirective) return true
    return /\bblob:\b/.test(mediaDirective) || /\*/.test(mediaDirective)
  }, [])

  const computeVideoDuration = useCallback((file: File) => {
    return new Promise<number | null>((resolve) => {
      if (typeof window === "undefined" || !('URL' in window) || !canLoadBlobMedia()) {
        resolve(null)
        return
      }

      try {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src)
          resolve(video.duration)
        }
        video.onerror = () => {
          window.URL.revokeObjectURL(video.src)
          resolve(null)
        }
        video.src = window.URL.createObjectURL(file)
      } catch (error) {
        resolve(null)
      }
    })
  }, [canLoadBlobMedia])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const detectedDuration = await computeVideoDuration(file)
      setDuration(detectedDuration ?? 0)
    }
  }

  const handleThumbnailSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    setErrorMessage(null)

    const formData = new FormData()

    // Add current user info for user-specific channel info
    const currentUser = getCurrentUser()
    if (currentUser) {
      formData.append('userId', currentUser.id)
      formData.append('channelId', currentUser.channelId)
      formData.append('channelName', currentUser.channelName)
    }

    formData.append('file', selectedFile)
    formData.append('title', title)
    formData.append('description', description)
    formData.append('category', category)
    formData.append('tags', JSON.stringify(tags))
    formData.append('visibility', visibility)
    formData.append('durationSeconds', Math.round(duration).toString())
    formData.append('type', duration > 0 && duration <= 60 ? 'short' : 'video')
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile)
    }

    try {
      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Upload failed')
      }

      const data = await response.json()

      // Notify subscribers about new upload
      const currentUser = getCurrentUser()
      if (currentUser && data.record) {
        const isShort = duration <= 60
        notifySubscribersOfNewUpload(
          data.record.channelId || currentUser.channelId,
          data.record.channelTitle || currentUser.channelName,
          currentUser.channelHandle || `@${currentUser.channelName}`,
          data.record.id,
          data.record.title,
          isShort
        )
      }

      onUploadComplete(data.record)
      onOpenChange(false)

      setSelectedFile(null)
      setTitle('')
      setDescription('')
      setCategory('General')
      setTags([])
      setTagInput('')
      setVisibility('public')
      setThumbnailPreview(null)
      setThumbnailFile(null)
      setDuration(0)
    } catch (error) {
      console.error('Upload failed:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[calc(100vw-2rem)] max-h-[90vh] rounded-xl sm:rounded-2xl">
        <div className="max-h-[80vh] overflow-y-auto pr-1">
          <DialogHeader>
            <DialogTitle className="text-foreground">Upload</DialogTitle>
            <DialogDescription className="sr-only">
              Provide basic details about your video and optional thumbnail before uploading.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="file" className="text-foreground">Video File</Label>
            <input
              ref={fileInputRef}
              type="file"
              id="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
              required
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-full"
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Select Video
            </Button>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title" className="text-foreground">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              className="bg-background text-foreground dark:border-white/10"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              className="bg-background text-foreground dark:border-white/10"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category" className="text-foreground">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={uploading}>
              <SelectTrigger className="bg-background text-foreground dark:border-white/10">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(YOUTUBE_CATEGORIES).map(([name, id]) => (
                  <SelectItem key={id} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags" className="text-foreground">Tags (up to 10)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagInputKeyPress}
                disabled={uploading || tags.length >= 10}
                placeholder="Add a tag and press Enter"
                className="bg-background text-foreground dark:border-white/10"
              />
              <Button
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim() || tags.length >= 10 || uploading}
                variant="outline"
                size="sm"
                className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      disabled={uploading}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="visibility" className="text-foreground">Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility} disabled={uploading}>
              <SelectTrigger className="bg-background text-foreground dark:border-white/10">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="thumbnail" className="text-foreground">Thumbnail</Label>
            <input
              ref={thumbnailInputRef}
              type="file"
              id="thumbnail"
              accept="image/*"
              onChange={handleThumbnailSelect}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => thumbnailInputRef.current?.click()}
              variant="outline"
              className="w-full rounded-full bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
              disabled={uploading}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Select Thumbnail
            </Button>
            {thumbnailPreview && (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                <Image
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>

          {errorMessage && (
            <p className="text-sm text-red-500">{errorMessage}</p>
          )}

          {uploading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading...</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
              className="w-full rounded-full bg-background text-foreground hover:bg-accent hover:text-accent-foreground sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!selectedFile || uploading}
              className="w-full rounded-full sm:w-auto"
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
