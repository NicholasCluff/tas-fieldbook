// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password validation - minimum 8 characters, at least one letter and one number
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' }
  }
  
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter and one number' }
  }
  
  return { valid: true, message: '' }
}

// Phone number validation (Australian format)
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^(\+61|0)[0-9]{8,9}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Project title validation
export function validateProjectTitle(title: string): { valid: boolean; message: string } {
  if (!title.trim()) {
    return { valid: false, message: 'Project title is required' }
  }
  
  if (title.length < 3) {
    return { valid: false, message: 'Project title must be at least 3 characters long' }
  }
  
  if (title.length > 100) {
    return { valid: false, message: 'Project title must be less than 100 characters' }
  }
  
  return { valid: true, message: '' }
}

// Location validation
export function validateLocation(location: string): { valid: boolean; message: string } {
  if (!location.trim()) {
    return { valid: false, message: 'Location is required' }
  }
  
  if (location.length < 2) {
    return { valid: false, message: 'Location must be at least 2 characters long' }
  }
  
  return { valid: true, message: '' }
}

// Generic required field validation
export function validateRequired(value: string, fieldName: string): { valid: boolean; message: string } {
  if (!value || !value.trim()) {
    return { valid: false, message: `${fieldName} is required` }
  }
  return { valid: true, message: '' }
}