import { Pricing, Reservation, TrailerStatus } from '../types';

// Price calculation utilities
export const calculateRentalPrice = (pricing: Pricing, days: number): number => {
  if (days <= 0) return 0;
  if (days === 1) return pricing.oneDay;
  if (days === 2) return pricing.twoDays;

  return pricing.twoDays + (days - 2) * pricing.additionalDays;
};

export const calculateRentalDays = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Date utilities
export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('cs-CZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('cs-CZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  );
};

// Phone number utilities
export const formatCzechPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Check if it's a Czech number (9 digits after country code)
  if (cleaned.startsWith('420') && cleaned.length === 12) {
    return `+420 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  // If it's just 9 digits, assume Czech and add country code
  if (cleaned.length === 9) {
    return `+420 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }

  // Return as-is if format is unexpected
  return phone;
};

export const validateCzechPhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');

  // Czech numbers: either 9 digits (local) or 12 digits with country code
  if (cleaned.startsWith('420')) {
    return cleaned.length === 12;
  }

  return cleaned.length === 9;
};

// ICO (Czech company ID) validation
export const validateCzechICO = (ico: string): boolean => {
  const cleaned = ico.replace(/\D/g, '');

  // ICO must be 8 digits
  if (cleaned.length !== 8) {
    return false;
  }

  // Check checksum (simple validation)
  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  let sum = 0;

  for (let i = 0; i < 7; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }

  const remainder = sum % 11;
  const checksum = remainder === 0 ? 1 : remainder === 1 ? 0 : 11 - remainder;

  return parseInt(cleaned[7]) === checksum;
};

// Postal code validation
export const validateCzechPostalCode = (postalCode: string): boolean => {
  const cleaned = postalCode.replace(/\D/g, '');
  return cleaned.length === 5 && parseInt(cleaned) >= 10000;
};

export const formatCzechPostalCode = (postalCode: string): string => {
  const cleaned = postalCode.replace(/\D/g, '');
  if (cleaned.length === 5) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  return postalCode;
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Name validation
export const validateName = (name: string): boolean => {
  // Allow Czech characters, spaces, and hyphens
  const nameRegex = /^[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s-]+$/;
  return name.length >= 2 && name.length <= 50 && nameRegex.test(name);
};

// Address validation
export const validateAddress = (street: string, city: string, postalCode: string): boolean => {
  return (
    street.length >= 3 &&
    city.length >= 2 &&
    validateCzechPostalCode(postalCode)
  );
};

// Trailer utilities
export const getTrailerStatusColor = (status: TrailerStatus): string => {
  switch (status) {
    case 'available':
      return '#22c55e'; // green
    case 'reserved':
      return '#f59e0b'; // yellow
    case 'maintenance':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
};

export const getTrailerStatusText = (status: TrailerStatus): string => {
  switch (status) {
    case 'available':
      return 'Dostupný';
    case 'reserved':
      return 'Rezervován';
    case 'maintenance':
      return 'V údržbě';
    default:
      return 'Neznámý';
  }
};

// Reservation utilities
export const isReservationActive = (reservation: Reservation): boolean => {
  const now = new Date();
  const start = new Date(reservation.startDate);
  const end = new Date(reservation.endDate);

  return (
    reservation.status === 'active' ||
    (reservation.status === 'confirmed' && now >= start && now <= end)
  );
};

export const isReservationUpcoming = (reservation: Reservation): boolean => {
  const now = new Date();
  const start = new Date(reservation.startDate);

  return reservation.status === 'confirmed' && now < start;
};

export const isReservationCompleted = (reservation: Reservation): boolean => {
  return reservation.status === 'completed' || reservation.status === 'cancelled';
};

export const canExtendReservation = (reservation: Reservation): boolean => {
  const now = new Date();
  const end = new Date(reservation.endDate);

  return (
    reservation.status === 'active' &&
    now >= end &&
    now <= new Date(end.getTime() + 24 * 60 * 60 * 1000) // Within 24 hours of end
  );
};

// PIN utilities
export const isPinValid = (pinExpiry: Date): boolean => {
  return new Date() <= new Date(pinExpiry);
};

export const generateRandomPin = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// File utilities
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

export const validateImageFile = (filename: string): boolean => {
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
  const extension = getFileExtension(filename).toLowerCase();
  return validExtensions.includes(extension);
};

// String utilities
export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncateString = (str: string, maxLength: number): string => {
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
};

// Currency utilities
export const formatCzk = (amount: number): string => {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Error handling utilities
export const getErrorMessage = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  if (error?.code) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'Uživatel nenalezen';
      case 'auth/wrong-password':
        return 'Špatné heslo';
      case 'auth/invalid-email':
        return 'Neplatný e-mail';
      case 'auth/user-disabled':
        return 'Účet je zablokován';
      case 'auth/too-many-requests':
        return 'Příliš mnoho pokusů, zkuste to později';
      case 'permission-denied':
        return 'Nemáte oprávnění k této akci';
      case 'not-found':
        return 'Záznam nebyl nalezen';
      case 'already-exists':
        return 'Záznam již existuje';
      default:
        return `Došlo k chybě (${error.code})`;
    }
  }
  return 'Došlo k neznámé chybě';
};

// Validation utilities
export const validateRequired = (value: any, fieldName: string): string | null => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} je povinné pole`;
  }
  return null;
};

export const validateLength = (
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string
): string | null => {
  if (value.length < minLength) {
    return `${fieldName} musí mít alespoň ${minLength} znaků`;
  }
  if (value.length > maxLength) {
    return `${fieldName} může mít maximálně ${maxLength} znaků`;
  }
  return null;
};

// Local storage utilities
export const storage = {
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue || null;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};