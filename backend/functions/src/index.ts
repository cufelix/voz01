import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Stripe } from 'stripe';
import * as nodemailer from 'nodemailer';
import * as cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe
const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: '2023-10-16',
});

// Initialize CORS
const corsHandler = cors({ origin: true });

// Email configuration
const transporter = nodemailer.createTransporter({
  host: functions.config().email.host,
  port: functions.config().email.port,
  secure: functions.config().email.port === 465,
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.password,
  },
});

// Helper Functions
const generatePinCode = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const getPinExpiry = (endDate: Date): Date => {
  const expiry = new Date(endDate);
  expiry.setHours(24, 0, 0, 0); // Set to 24:00 on return day
  return expiry;
};

// Create Stripe Payment Intent
export const createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { amount, currency, reservationId, userId } = data;

  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const stripeCustomerId = userDoc.data()?.stripeCustomerId;
    if (!stripeCustomerId) {
      throw new functions.https.HttpsError('not-found', 'Stripe customer not found');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: currency.toLowerCase(),
      customer: stripeCustomerId,
      metadata: {
        reservationId,
        userId,
      },
      payment_method_types: ['card'],
      capture_method: 'manual', // Manual capture for 0 Kč authorization
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create payment intent');
  }
});

// Capture Payment After Rental
export const capturePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { paymentIntentId, actualAmount } = data;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'requires_capture') {
      throw new functions.https.HttpsError('failed-precondition', 'Payment intent cannot be captured');
    }

    // Capture the payment with actual amount
    const capturedPayment = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: actualAmount * 100,
    });

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: paymentIntent.customer as string,
      payment_intent: paymentIntentId,
      auto_advance: true,
    });

    // Update reservation with payment info
    await admin.firestore().collection('reservations').doc(paymentIntent.metadata.reservationId).update({
      stripeInvoiceId: invoice.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      invoiceId: invoice.id,
    };
  } catch (error) {
    console.error('Error capturing payment:', error);
    throw new functions.https.HttpsError('internal', 'Failed to capture payment');
  }
});

// Generate PIN for Smart Lock
export const generatePinForLock = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { reservationId, lockId } = data;

  try {
    const reservationDoc = await admin.firestore().collection('reservations').doc(reservationId).get();
    if (!reservationDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Reservation not found');
    }

    const reservation = reservationDoc.data();
    if (!reservation) {
      throw new functions.https.HttpsError('not-found', 'Reservation data not found');
    }

    const pinCode = generatePinCode();
    const pinExpiry = getPinExpiry(reservation.endDate.toDate());

    // Store PIN in database
    await admin.firestore().collection('pins').add({
      lockId,
      reservationId,
      pinCode,
      isActive: true,
      validFrom: admin.firestore.Timestamp.now(),
      validUntil: admin.firestore.Timestamp.fromDate(pinExpiry),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update reservation with PIN
    await admin.firestore().collection('reservations').doc(reservationId).update({
      pinCode,
      pinExpiry: admin.firestore.Timestamp.fromDate(pinExpiry),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // TODO: Call Igloohome API to actually create PIN on the lock
    // await igloohomeAPI.createPin({ lockId, pinCode, validFrom: new Date(), validUntil: pinExpiry });

    return {
      pinCode,
      pinExpiry: pinExpiry.toISOString(),
    };
  } catch (error) {
    console.error('Error generating PIN:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate PIN');
  }
});

// Check Trailer Availability
export const checkAvailability = functions.https.onCall(async (data, context) => {
  const { trailerId, startDate, endDate } = data;

  try {
    const reservations = await admin.firestore()
      .collection('reservations')
      .where('trailerId', '==', trailerId)
      .where('status', 'in', ['confirmed', 'active'])
      .get();

    const start = new Date(startDate);
    const end = new Date(endDate);

    let isAvailable = true;
    reservations.forEach(doc => {
      const reservation = doc.data();
      if (!reservation) return;

      const resStart = reservation.startDate.toDate();
      const resEnd = reservation.endDate.toDate();

      // Check for date overlap
      if (start <= resEnd && end >= resStart) {
        isAvailable = false;
      }
    });

    return {
      available: isAvailable,
      conflictingReservations: isAvailable ? 0 : reservations.size,
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    throw new functions.https.HttpsError('internal', 'Failed to check availability');
  }
});

// Send Confirmation Email
export const sendConfirmationEmail = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    const { reservationId, userEmail } = req.body;

    try {
      const reservationDoc = await admin.firestore().collection('reservations').doc(reservationId).get();
      if (!reservationDoc.exists) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      const reservation = reservationDoc.data();
      if (!reservation) {
        return res.status(404).json({ error: 'Reservation data not found' });
      }

      const trailerDoc = await admin.firestore().collection('trailers').doc(reservation.trailerId).get();
      const trailer = trailerDoc.data();

      const mailOptions = {
        from: `"Pripoj.to" <${functions.config().email.from}>`,
        to: userEmail,
        subject: 'Potvrzení rezervace přívěsu',
        html: `
          <h1>Potvrzení rezervace</h1>
          <p>Děkujeme za Vaši rezervaci. Zde jsou detaily:</p>
          <ul>
            <li>Přívěs: ${trailer?.name || 'Neznámý'}</li>
            <li>Převzetí: ${reservation.startDate.toDate().toLocaleDateString('cs-CZ')}</li>
            <li>Vrácení: ${reservation.endDate.toDate().toLocaleDateString('cs-CZ')}</li>
            <li>Cena: ${reservation.totalPrice} Kč</li>
            <li>PIN kód: ${reservation.pinCode || 'Bude vygenerován'}</li>
          </ul>
          <p>Adresa přívěsu: ${trailer?.location?.address || 'Bude upřesněna'}</p>
          <p>Pokud máte nějaké otázky, kontaktujte nás na podpora@pripoj.to</p>
        `,
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }
  });
});

// Auto Extend Rentals (Scheduled Function)
export const autoExtendRental = functions.pubsub
  .schedule('0 0 * * *') // Daily at midnight
  .timeZone('Europe/Prague')
  .onRun(async (context) => {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const activeReservations = await admin.firestore()
        .collection('reservations')
        .where('status', '==', 'active')
        .where('endDate', '<=', admin.firestore.Timestamp.fromDate(tomorrow))
        .get();

      const batch = admin.firestore().batch();

      activeReservations.forEach(doc => {
        const reservation = doc.data();
        if (!reservation) return;

        const newEndDate = new Date(reservation.endDate.toDate());
        newEndDate.setDate(newEndDate.getDate() + 1);

        const reservationRef = admin.firestore().collection('reservations').doc(doc.id);
        batch.update(reservationRef, {
          endDate: admin.firestore.Timestamp.fromDate(newEndDate),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();

      console.log(`Auto-extended ${activeReservations.size} rentals`);
      return null;
    } catch (error) {
      console.error('Error auto-extending rentals:', error);
      return null;
    }
  });

// Cleanup Expired PINs (Scheduled Function)
export const cleanupExpiredPins = functions.pubsub
  .schedule('0 * * * *') // Every hour
  .timeZone('Europe/Prague')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();

      const expiredPins = await admin.firestore()
        .collection('pins')
        .where('isActive', '==', true)
        .where('validUntil', '<=', now)
        .get();

      const batch = admin.firestore().batch();

      expiredPins.forEach(doc => {
        const pinRef = admin.firestore().collection('pins').doc(doc.id);
        batch.update(pinRef, {
          isActive: false,
          deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();

      // TODO: Call Igloohome API to remove PINs from locks
      console.log(`Deactivated ${expiredPins.size} expired PINs`);
      return null;
    } catch (error) {
      console.error('Error cleaning up expired PINs:', error);
      return null;
    }
  });

// Stripe Webhook Handler
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = functions.config().stripe.webhook_secret;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.sendStatus(400);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const reservationId = paymentIntent.metadata.reservationId;

        if (reservationId) {
          await admin.firestore().collection('reservations').doc(reservationId).update({
            status: 'confirmed',
            stripePaymentIntentId: paymentIntent.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Generate PIN for confirmed reservation
          await generatePinForLock({
            reservationId,
            lockId: 'mock-lock-id', // This would come from trailer data
          }, { auth: null } as any);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        const failedReservationId = failedPayment.metadata.reservationId;

        if (failedReservationId) {
          await admin.firestore().collection('reservations').doc(failedReservationId).update({
            status: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Create Stripe Customer for New User
export const createStripeCustomer = functions.auth.user().onCreate(async (user) => {
  try {
    const userDoc = await admin.firestore().collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      console.log('User document not found for:', user.uid);
      return null;
    }

    const userData = userDoc.data();
    if (!userData) {
      console.log('User data not found for:', user.uid);
      return null;
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: `${userData.firstName} ${userData.lastName}`,
      phone: userData.phone,
      address: {
        line1: userData.address.street,
        city: userData.address.city,
        postal_code: userData.address.postalCode,
        country: 'CZ',
      },
      metadata: {
        firebaseUid: user.uid,
      },
    });

    await admin.firestore().collection('users').doc(user.uid).update({
      stripeCustomerId: customer.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Created Stripe customer for user: ${user.uid}`);
    return null;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    return null;
  }
});