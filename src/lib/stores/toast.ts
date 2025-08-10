import { writable } from 'svelte/store'

export interface ToastMessage {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
  duration?: number
}

const createToastStore = () => {
  const { subscribe, update } = writable<ToastMessage[]>([])

  return {
    subscribe,
    add: (message: string, type: 'error' | 'success' | 'info' = 'info', duration = 5000) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      const toast: ToastMessage = { id, message, type, duration }
      
      update(toasts => [...toasts, toast])
      
      // Auto-remove toast after duration
      if (duration > 0) {
        setTimeout(() => {
          update(toasts => toasts.filter(t => t.id !== id))
        }, duration)
      }
      
      return id
    },
    remove: (id: string) => {
      update(toasts => toasts.filter(t => t.id !== id))
    },
    clear: () => {
      update(() => [])
    }
  }
}

export const toastStore = createToastStore()

// Helper functions for common toast types
export const showError = (message: string, duration?: number) => 
  toastStore.add(message, 'error', duration)

export const showSuccess = (message: string, duration?: number) => 
  toastStore.add(message, 'success', duration)

export const showInfo = (message: string, duration?: number) => 
  toastStore.add(message, 'info', duration)