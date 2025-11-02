# Pripoj.to - Kompletní systém pronájmu přívěsů

## Popis projektu

Pripoj.to je kompletní platforma pro pronájem přívěsů, která zahrnuje:
- Mobilní aplikaci (React Native) pro uživatele
- Webový admin panel (Next.js) pro správu
- Backend (Firebase Cloud Functions) pro logiku
- Integrované platební systémy (Stripe)
- Chytré zámky (Igloohome)

## Architektura

```
voz01/
├── mobile/                    # React Native mobilní aplikace
├── admin/                     # Next.js admin panel
├── shared/                    # Sdílené typy a utility funkce
└── backend/                   # Firebase Cloud Functions
```

## Funkce

### Mobilní aplikace (Uživatelé)
- ✅ Registrace přes telefonní číslo (Firebase Phone Auth)
- ✅ Ověření SMS kódu s automatickým vyplněním
- ✅ Vytvoření profilu s validací
- ✅ Interaktivní mapa s přívěsy (Google Maps)
- ✅ Vyhledávání a filtrování přívěsů
- ✅ Detailní informace o přívěsech
- ✅ Rezervační systém s kontrolou dostupnosti
- ✅ Platební brána (Stripe) s 3D Secure
- ✅ Správa aktivních pronájmů
- ✅ PIN kódy pro chytré zámky
- ✅ Check-in/Check-out proces
- ✅ Historie výpůjček a faktury
- ✅ Správa uživatelského profilu
- ✅ FAQ sekce

### Admin panel (Správa)
- ✅ Přihlášení administrátorů
- ✅ Dashboard se statistikami
- ✅ Správa uživatelů
- ✅ Mapa přívěsů s reálným stavem
- ✅ Správa přívěsů (CRUD operace)
- ✅ Správa rezervací
- ✅ Ceníková politika
- ✅ Real-time notifikace

### Backend (Cloud Functions)
- ✅ Platební integrace (Stripe)
- ✅ Emailové notifikace
- ✅ Generování PIN kódů pro zámky
- ✅ Automatické prodlužování pronájmů
- ✅ Čištění expirovaných PIN kódů
- ✅ Stripe webhook handlers
- ✅ Vytváření Stripe zákazníků

## Technologie

### Mobilní aplikace
- **React Native 0.73** - cross-platform mobilní vývoj
- **TypeScript** - typová bezpečnost
- **React Navigation** - navigace v aplikaci
- **Firebase (Auth, Firestore, Functions, Storage)** - backend services
- **Google Maps SDK** - mapová integrace
- **Stripe React Native** - platební procesy
- **React Hook Form** - formuláře a validace
- **React Native Elements** - UI komponenty

### Admin panel
- **Next.js 14** - React framework s App Router
- **TypeScript** - typová bezpečnost
- **Tailwind CSS** - styling framework
- **Firebase Admin SDK** - přístup k Firebase
- **Recharts** - grafy a statistiky
- **React Table** - datové tabulky

### Backend
- **Firebase Cloud Functions** - serverless backend
- **Node.js 18** - JavaScript runtime
- **Stripe API** - platební služby
- **Nodemailer** - emailové služby
- **Igloohome API** - chytré zámky

## Instalace a nastavení

### Předpoklady
- Node.js 18+
- npm nebo yarn
- Firebase CLI
- React Native CLI
- Android Studio (pro Android vývoj)
- Xcode (pro iOS vývoj)

### 1. Firebase nastavení
1. Vytvořte nový Firebase projekt
2. Přidejte aplikace (Android, iOS, Web)
3. Nastavte Firestore Database
4. Nastavte Authentication (Phone Auth)
5. Nastavte Storage
6. Nastavte Cloud Functions

### 2. Konfigurace proměnných
Zkopírujte `.env.example` soubory a upravte konfiguraci:

**Mobile (.env)**:
```
FIREBASE_API_KEY=váš_api_klíč
FIREBASE_AUTH_DOMAIN=váš_auth_domain
FIREBASE_PROJECT_ID=váš_project_id
FIREBASE_STORAGE_BUCKET=váš_bucket
FIREBASE_MESSAGING_SENDER_ID=váš_sender_id
FIREBASE_APP_ID=váš_app_id
STRIPE_PUBLISHABLE_KEY=váš_stripe_klíč
GOOGLE_MAPS_API_KEY=váš_google_maps_klíč
```

**Backend (.env)**:
```
STRIPE_SECRET_KEY=váš_stripe_secret_klíč
STRIPE_WEBHOOK_SECRET=váš_webhook_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=váš_email
EMAIL_PASSWORD=váš_heslo
```

### 3. Mobilní aplikace
```bash
cd mobile
npm install
# Pro Android
npx react-native run-android
# Pro iOS
npx react-native run-ios
```

### 4. Admin panel
```bash
cd admin
npm install
npm run dev
```

### 5. Backend (Cloud Functions)
```bash
cd backend/functions
npm install
npm run build
firebase deploy --only functions
```

## Database struktura (Firestore)

### Users kolekce
```
/users/{uid}
{
  uid: string,
  firstName: string,
  lastName: string,
  phone: string,
  email: string,
  address: {
    street: string,
    city: string,
    postalCode: string
  },
  ico?: string,
  stripeCustomerId: string,
  isActive: boolean,
  role: 'user' | 'admin',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Trailers kolekce
```
/trailers/{trailerId}
{
  name: string,
  type: string,
  manufacturer: string,
  licensePlate: string,
  specs: {
    loadArea: string,
    height: string,
    maxWeight: number,
    operatingWeight: number
  },
  location: {
    lat: number,
    lng: number,
    address: string
  },
  pricing: {
    oneDay: number,
    twoDays: number,
    additionalDays: number
  },
  lockId: string,
  status: 'available' | 'reserved' | 'maintenance',
  documentsLink: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Reservations kolekce
```
/reservations/{reservationId}
{
  userId: string,
  trailerId: string,
  status: 'pending_payment' | 'confirmed' | 'active' | 'completed' | 'cancelled',
  startDate: timestamp,
  endDate: timestamp,
  totalPrice: number,
  pinCode: string,
  pinExpiry: timestamp,
  stripePaymentIntentId: string,
  stripeInvoiceId?: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Pins kolekce
```
/pins/{pinId}
{
  lockId: string,
  reservationId: string,
  pinCode: string,
  isActive: boolean,
  validFrom: timestamp,
  validUntil: timestamp,
  createdAt: timestamp
}
```

## Bezpečnost

### Firestore Security Rules
- Implementována role-based access control
- Validace datových struktur
- Ochrana proti neautorizovanému přístupu

### Platební bezpečnost
- Stripe PCI compliance
- 3D Secure ověření
- Webhook signature verification
- Secure handling platebních dat

### Autentizace
- Firebase Phone Auth s SMS ověřením
- JWT tokens pro admin sessions
- Role-based access control

## Deployment

### Mobilní aplikace
**Android**: Google Play Store
- Vytvořte signed APK/AAB
- Nahrajte do Google Play Console

**iOS**: App Store
- Vytvořte build přes Xcode
- Nahrajte do App Store Connect

### Admin panel
**Platforma**: Vercel (doporučeno)
- Automatické deployments z GitHub
- Separate environments (staging/production)

### Backend
**Firebase**: Automatické deployments
```bash
firebase deploy --only functions
firebase deploy --only firestore:rules
```

## Testing

### Testování mobilní aplikace
1. **Authentication Flow**
   - Phone number validation
   - SMS kód verification
   - Profile creation

2. **Map Functionality**
   - Location permissions
   - Marker display
   - Search and filtering

3. **Reservation Flow**
   - Date selection
   - Price calculation
   - Payment processing

4. **Rental Management**
   - PIN display
   - Check-in/out process

### Admin panel testing
1. **Authentication**
2. **Data Management**
3. **Dashboard Statistics**
4. **Real-time Updates**

### Integration testing
1. **End-to-end rental flow**
2. **Payment processing**
3. **Email notifications**
4. **Smart lock PIN generation**

## Monitoring

### Firebase Console
- Firestore usage
- Cloud Functions performance
- Authentication events
- Crashlytics (mobilní aplikace)

### Custom monitoring
- Payment success rates
- Smart lock access logs
- User engagement metrics
- System performance monitoring

## Support

### Technická podpora
- Email: podpora@pripoj.to
- Telefon: +420 123 456 789
- Otevírací doba: Po-Pá 8:00-18:00

### Dokumentace
- [API Documentation](./docs/api.md)
- [User Guide](./docs/user-guide.md)
- [Admin Guide](./docs/admin-guide.md)

## Licence

Všechna práva vyhrazena © 2024 Pripoj.to

## Tým

- **Vývoj**: Pripoj.to Development Team
- **Design**: Pripoj.to Design Team
- **Product Management**: Pripoj.to PM Team

---

## Poznámky k vývoji

Tento projekt byl vyvinut v souladu s nejlepšími praktikami pro:
- React Native vývoj
- Firebase integrace
- Stripe payment processing
- Bezpečnostní standardy
- Czech market specifika

Systém je připraven pro produkční nasazení a škálování.