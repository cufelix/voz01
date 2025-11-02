import { db } from './firebase';
import {
  User,
  Trailer,
  Reservation,
  Pin,
  FilterOptions,
  SortOptions,
  Location
} from '@shared/types';

// User services
export const userService = {
  async createUser(userData: Partial<User>): Promise<void> {
    await db.collection('users').doc(userData.uid!).set(userData);
  },

  async getUser(uid: string): Promise<User | null> {
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? (doc.data() as User) : null;
  },

  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    await db.collection('users').doc(uid).update({
      ...data,
      updatedAt: new Date(),
    });
  },

  async deleteUser(uid: string): Promise<void> {
    await db.collection('users').doc(uid).delete();
  },

  async getUserReservations(uid: string): Promise<Reservation[]> {
    const snapshot = await db.collection('reservations')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
  },
};

// Trailer services
export const trailerService = {
  async getAllTrailers(): Promise<Trailer[]> {
    const snapshot = await db.collection('trailers')
      .where('status', 'in', ['available', 'reserved'])
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trailer));
  },

  async getTrailer(id: string): Promise<Trailer | null> {
    const doc = await db.collection('trailers').doc(id).get();
    return doc.exists ? (doc.data() as Trailer) : null;
  },

  async createTrailer(trailerData: Partial<Trailer>): Promise<string> {
    const docRef = await db.collection('trailers').add({
      ...trailerData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  },

  async updateTrailer(id: string, data: Partial<Trailer>): Promise<void> {
    await db.collection('trailers').doc(id).update({
      ...data,
      updatedAt: new Date(),
    });
  },

  async deleteTrailer(id: string): Promise<void> {
    await db.collection('trailers').doc(id).delete();
  },

  async getAvailableTrailersInBounds(
    northEast: Location,
    southWest: Location
  ): Promise<Trailer[]> {
    const snapshot = await db.collection('trailers')
      .where('status', '==', 'available')
      .where('location.lat', '<=', northEast.lat)
      .where('location.lat', '>=', southWest.lat)
      .where('location.lng', '<=', northEast.lng)
      .where('location.lng', '>=', southWest.lng)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trailer));
  },

  async searchTrailers(query: string): Promise<Trailer[]> {
    // Simple text search implementation
    const snapshot = await db.collection('trailers')
      .where('status', 'in', ['available', 'reserved'])
      .get();

    const trailers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trailer));

    // Filter by name or type containing the query
    return trailers.filter(trailer =>
      trailer.name.toLowerCase().includes(query.toLowerCase()) ||
      trailer.type.toLowerCase().includes(query.toLowerCase())
    );
  },
};

// Reservation services
export const reservationService = {
  async createReservation(reservationData: Partial<Reservation>): Promise<string> {
    const docRef = await db.collection('reservations').add({
      ...reservationData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  },

  async getReservation(id: string): Promise<Reservation | null> {
    const doc = await db.collection('reservations').doc(id).get();
    return doc.exists ? (doc.data() as Reservation) : null;
  },

  async updateReservation(id: string, data: Partial<Reservation>): Promise<void> {
    await db.collection('reservations').doc(id).update({
      ...data,
      updatedAt: new Date(),
    });
  },

  async getUserReservations(userId: string): Promise<Reservation[]> {
    const snapshot = await db.collection('reservations')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
  },

  async getTrailerReservations(trailerId: string): Promise<Reservation[]> {
    const snapshot = await db.collection('reservations')
      .where('trailerId', '==', trailerId)
      .where('status', 'in', ['confirmed', 'active'])
      .orderBy('startDate')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
  },

  async checkTrailerAvailability(
    trailerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const reservations = await this.getTrailerReservations(trailerId);

    return !reservations.some(reservation => {
      const resStart = reservation.startDate.toDate();
      const resEnd = reservation.endDate.toDate();

      // Check for date overlap
      return (startDate <= resEnd && endDate >= resStart);
    });
  },

  async getActiveReservations(): Promise<Reservation[]> {
    const snapshot = await db.collection('reservations')
      .where('status', '==', 'active')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
  },

  async getUpcomingReservations(userId?: string): Promise<Reservation[]> {
    let query = db.collection('reservations')
      .where('status', '==', 'confirmed')
      .where('startDate', '>=', new Date())
      .orderBy('startDate');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
  },

  async getReservationsWithFilters(
    filters: FilterOptions,
    sort: SortOptions
  ): Promise<Reservation[]> {
    let query: any = db.collection('reservations');

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.where('status', 'in', filters.status);
    }

    if (filters.dateRange) {
      query = query.where('startDate', '>=', filters.dateRange.start)
                  .where('endDate', '<=', filters.dateRange.end);
    }

    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }

    if (filters.trailerId) {
      query = query.where('trailerId', '==', filters.trailerId);
    }

    // Apply sorting
    const direction = sort.direction === 'desc' ? 'desc' : 'asc';
    query = query.orderBy(sort.field, direction);

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
  },
};

// PIN services
export const pinService = {
  async createPin(pinData: Partial<Pin>): Promise<string> {
    const docRef = await db.collection('pins').add({
      ...pinData,
      createdAt: new Date(),
    });
    return docRef.id;
  },

  async getActivePinForReservation(reservationId: string): Promise<Pin | null> {
    const snapshot = await db.collection('pins')
      .where('reservationId', '==', reservationId)
      .where('isActive', '==', true)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Pin;
  },

  async deactivatePin(pinId: string): Promise<void> {
    await db.collection('pins').doc(pinId).update({
      isActive: false,
    });
  },

  async getExpiredPins(): Promise<Pin[]> {
    const snapshot = await db.collection('pins')
      .where('isActive', '==', true)
      .where('validUntil', '<', new Date())
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pin));
  },

  async cleanupExpiredPins(): Promise<void> {
    const expiredPins = await this.getExpiredPins();

    const batch = db.batch();
    expiredPins.forEach(pin => {
      const pinRef = db.collection('pins').doc(pin.id);
      batch.update(pinRef, { isActive: false });
    });

    await batch.commit();
  },
};

// Real-time listeners
export const realTimeService = {
  onUserChange(uid: string, callback: (user: User | null) => void) {
    return db.collection('users').doc(uid).onSnapshot((doc) => {
      callback(doc.exists ? (doc.data() as User) : null);
    });
  },

  onReservationChange(reservationId: string, callback: (reservation: Reservation | null) => void) {
    return db.collection('reservations').doc(reservationId).onSnapshot((doc) => {
      callback(doc.exists ? (doc.data() as Reservation) : null);
    });
  },

  onActiveReservationsChange(callback: (reservations: Reservation[]) => void) {
    return db.collection('reservations')
      .where('status', '==', 'active')
      .onSnapshot((snapshot) => {
        const reservations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Reservation));
        callback(reservations);
      });
  },

  onTrailerChange(trailerId: string, callback: (trailer: Trailer | null) => void) {
    return db.collection('trailers').doc(trailerId).onSnapshot((doc) => {
      callback(doc.exists ? (doc.data() as Trailer) : null);
    });
  },
};

// Batch operations
export const batchService = {
  async updateMultipleTrailerStatus(trailerIds: string[], status: string): Promise<void> {
    const batch = db.batch();

    trailerIds.forEach(id => {
      const trailerRef = db.collection('trailers').doc(id);
      batch.update(trailerRef, {
        status,
        updatedAt: new Date()
      });
    });

    await batch.commit();
  },

  async createMultiplePins(pins: Partial<Pin>[]): Promise<void> {
    const batch = db.batch();

    pins.forEach(pinData => {
      const pinRef = db.collection('pins').doc();
      batch.set(pinRef, {
        ...pinData,
        createdAt: new Date(),
      });
    });

    await batch.commit();
  },
};