import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns'

// Format date for display
export function formatDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''
    return format(dateObj, 'dd/MM/yyyy')
  } catch {
    return ''
  }
}

// Format datetime for display
export function formatDateTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''
    return format(dateObj, 'dd/MM/yyyy HH:mm')
  } catch {
    return ''
  }
}

// Format date for input fields (YYYY-MM-DD)
export function formatDateForInput(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''
    return format(dateObj, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

// Get relative time (e.g., "2 days ago")
export function getRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''
    
    const now = new Date()
    const diffInMs = now.getTime() - dateObj.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
    return `${Math.floor(diffInDays / 365)} years ago`
  } catch {
    return ''
  }
}

// Get today's date as string
export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

// Check if date is today
export function isToday(date: string | Date): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return false
    
    const today = startOfDay(new Date())
    const compareDate = startOfDay(dateObj)
    return today.getTime() === compareDate.getTime()
  } catch {
    return false
  }
}