// User types
export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: Address;
  ico?: string;
  stripeCustomerId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  role: 'user' | 'admin';
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
}

// Trailer types
export interface Trailer {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  licensePlate: string;
  specs: TrailerSpecs;
  location: Location;
  pricing: Pricing;
  lockId: string;
  status: TrailerStatus;
  documentsLink: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrailerSpecs {
  loadArea: string;
  height: string;
  maxWeight: number;
  operatingWeight: number;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface Pricing {
  oneDay: number;
  twoDays: number;
  additionalDays: number;
}

export type TrailerStatus = 'available' | 'reserved' | 'maintenance';

// Reservation types
export interface Reservation {
  id: string;
  userId: string;
  trailerId: string;
  status: ReservationStatus;
  startDate: Date;
  endDate: Date;
  actualEndDate?: Date;
  totalPrice: number;
  ico?: string;
  pinCode: string;
  pinExpiry: Date;
  stripePaymentIntentId: string;
  stripeInvoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
  checkInCompletedAt?: Date;
  checkOutCompletedAt?: Date;
  returnPhotos: string[];
}

export type ReservationStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled';

// PIN types
export interface Pin {
  id: string;
  lockId: string;
  reservationId: string;
  pinCode: string;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Payment types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

// Form types
export interface UserProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  city: string;
  postalCode: string;
  ico?: string;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface PhoneAuthForm {
  phone: string;
}

export interface OTPForm {
  code: string;
}

export interface ReservationForm {
  trailerId: string;
  startDate: Date;
  endDate: Date;
  ico?: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  PhoneAuth: undefined;
  OTP: { confirmation: any };
  ProfileCreation: undefined;
  TrailerDetail: { trailerId: string };
  Reservation: { trailerId: string };
  Payment: { reservationId: string };
  ActiveRental: { reservationId: string };
  CheckIn: { reservationId: string };
  CheckOut: { reservationId: string };
  Profile: undefined;
  History: undefined;
  FAQ: undefined;
};

export type MainTabParamList = {
  Map: undefined;
  Profile: undefined;
  History: undefined;
  FAQ: undefined;
};

// Admin types
export interface AdminStats {
  activeReservations: number;
  totalTrailers: number;
  totalUsers: number;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  type: 'reservation_created' | 'reservation_completed' | 'user_registered';
  userId: string;
  trailerId?: string;
  timestamp: Date;
  description: string;
}

export interface UserManagement extends User {
  reservationCount: number;
  totalSpent: number;
  lastActive: Date;
}

export interface TrailerManagement extends Trailer {
  reservationCount: number;
  utilizationRate: number;
  nextAvailable?: Date;
}

export interface ReservationManagement extends Reservation {
  user: UserManagement;
  trailer: TrailerManagement;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Filter and sort types
export interface FilterOptions {
  status?: ReservationStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  userId?: string;
  trailerId?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  data?: any;
}

// Lock types
export interface Lock {
  id: string;
  name: string;
  lockId: string;
  batteryLevel: number;
  lastSeen: Date;
  status: 'online' | 'offline' | 'low_battery';
  trailerId?: string;
}

export interface LockPinRequest {
  lockId: string;
  reservationId: string;
  validFrom: Date;
  validUntil: Date;
}