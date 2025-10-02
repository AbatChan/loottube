import { useToast as useToastContext } from '@/components/ui/toast'

export function useToast() {
  const { addToast } = useToastContext()

  const toast = {
    success: (title: string, description?: string, duration?: number) => {
      addToast({ type: 'success', title, description, duration })
    },
    error: (title: string, description?: string, duration?: number) => {
      addToast({ type: 'error', title, description, duration })
    },
    info: (title: string, description?: string, duration?: number) => {
      addToast({ type: 'info', title, description, duration })
    },
    warning: (title: string, description?: string, duration?: number) => {
      addToast({ type: 'warning', title, description, duration })
    },
  }

  return { toast }
}