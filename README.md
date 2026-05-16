# 🏠 Integrated Home Services Provider Platform

A full-stack MERN web application connecting customers with verified home service professionals. Features role-based dashboards for Customers, Service Providers, and Admins — with real-time job tracking, secure payments, OTP authentication, and an AI-driven job assignment engine.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://home-service-provider-frontend.onrender.com)
[![Admin Panel](https://img.shields.io/badge/Admin-Panel-green?style=for-the-badge)](https://home-service-provider-admin.onrender.com/)
[![GitHub](https://img.shields.io/badge/GitHub-Repo-black?style=for-the-badge&logo=github)](https://github.com/bhavanishankar7075/HOME-SERVICE-PROVIDER)

---

## 📌 Project Overview

The platform solves a real problem: the home services market is fragmented, unreliable, and lacks transparency. This application provides a centralized digital marketplace for services like plumbing, electrical work, and cleaning — with verified providers, real-time tracking, and secure payments.

| Role | What they do |
|---|---|
| **Customer** | Browse services, book providers, track jobs, pay, rate |
| **Service Provider** | Manage jobs, set availability, track earnings, choose subscription |
| **Admin** | Oversee platform, manage users, assign jobs, view analytics |

---

## 🚀 Live Links

| Link | URL |
|---|---|
| 🛍️ Customer App | https://home-service-provider-frontend.onrender.com |
| 🔧 Admin Panel | https://home-service-provider-admin.onrender.com/ |

> **Note:** OTP verification uses an SMS gateway. For demo access, use the Admin Panel link above.

---

## 🛠️ Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-JS-61DAFB?logo=react)
![Redux](https://img.shields.io/badge/Redux-Toolkit-764ABC?logo=redux)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwindcss)

- **Framework:** React.js
- **State Management:** Redux Toolkit (`configureStore`, `createSlice`, `createAsyncThunk`)
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM
- **Real-time:** Socket.IO client (WebSocket notifications)
- **Payments:** Stripe.js + Razorpay
- **Maps:** Google Maps Places API (address autocomplete)
- **HTTP:** Axios

### Backend
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)

- **Runtime:** Node.js + Express.js
- **Database:** MongoDB with Mongoose ODM (geospatial queries)
- **Authentication:** JWT + OTP (SMS gateway, bcrypt hashing)
- **Real-time:** Socket.IO server
- **Payments:** Stripe + Razorpay
- **Maps:** Google Maps Geocoding API (coordinates for provider matching)
- **Security:** Role-Based Access Control (RBAC), rate limiting, HTTP-only cookies

---

## ✨ Key Features

### 🔐 Authentication (Multi-Factor)
- OTP-based registration via SMS — cryptographically secure 6-digit code
- OTP stored as bcrypt hash with 5-minute expiry (never plaintext)
- JWT session management — token sent in `Authorization: Bearer` header
- Rate limiting on OTP validation to prevent brute-force attacks

### 👤 Customer Features
- Browse and book services by category (Cleaning, Plumbing, Electrical, etc.)
- Schedule immediately or pick a future date/time
- Google Maps address autocomplete for accurate location input
- Real-time booking status updates via WebSocket notifications
- Multi-mode payments: **Stripe** (cards) + **Razorpay** (UPI, wallets) + **Cash on Delivery**
- Order history, invoicing, and post-service ratings

### 🔧 Service Provider Features
- Independent dashboard to manage incoming jobs (Accept / Reject)
- **Tiered subscription plans:** Free → Pro → Elite (higher tier = higher job priority)
- Real-time job notifications via Socket.IO
- Earnings tracker and revenue analytics
- Profile management with skills, service area, and availability settings

### 🛡️ Admin Features
- Platform KPIs: Total Revenue, Bookings, Active Users, Provider subscriptions
- Manual job assignment and re-assignment to handle exceptions
- User and provider management (verify, approve, suspend, delete)
- Service catalog management (add/edit/delete categories)
- Category distribution analytics and subscription plan tracking
- Transaction and payment oversight

### 🤖 AI-Driven Job Assignment Engine
When a booking is created, the backend matches the best provider using:
1. **Geospatial proximity** — MongoDB geospatial queries find providers near the customer
2. **Service expertise** — matches requested category to provider skills
3. **Availability** — checks provider schedule
4. **Subscription tier** — Elite > Pro > Free priority order

---

## 📁 Project Structure

```
HOME-SERVICE-PROVIDER/
├── frontend/                  # Customer React app
│   └── src/
│       ├── components/
│       ├── pages/             # Home, Booking, Profile, Orders
│       ├── redux/             # Redux Toolkit slices & store
│       └── utils/
│
├── admin/                     # Admin React app
│   └── src/
│       ├── components/
│       └── pages/             # Dashboard, Users, Providers, Bookings
│
└── backend/                   # Node.js + Express API
    ├── controllers/           # Business logic per module
    ├── middleware/            # Auth, error handling, rate limiting
    ├── models/                # Mongoose schemas
    ├── routes/                # API route definitions
    ├── socket/                # Socket.IO event handlers
    └── server.js
```

---

## 🔌 Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register + trigger OTP via SMS |
| POST | `/api/auth/verify-otp` | Verify OTP → activate account |
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/services` | Get all service categories |
| POST | `/api/bookings` | Create booking (triggers provider matching) |
| GET | `/api/bookings/my` | Get customer's bookings |
| PUT | `/api/bookings/:id/status` | Update booking status (Provider/Admin) |
| GET | `/api/providers` | List providers with filters |
| POST | `/api/subscriptions/purchase` | Provider subscribes to a plan |
| POST | `/api/payment/stripe` | Create Stripe Payment Intent |
| POST | `/api/payment/razorpay` | Create Razorpay order |
| GET | `/api/admin/dashboard` | Platform KPIs and analytics |

---

## ⚙️ Local Setup

### Prerequisites
- Node.js (LTS)
- MongoDB (local or Atlas)
- Stripe + Razorpay accounts
- Google Maps API key
- SMS Gateway API key (for OTP)

### 1. Clone the repo
```bash
git clone https://github.com/bhavanishankar7075/HOME-SERVICE-PROVIDER.git
cd HOME-SERVICE-PROVIDER
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/homeservices
JWT_SECRET=your_jwt_secret_key
STRIPE_SECRET_KEY=your_stripe_secret_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
SMS_GATEWAY_API_KEY=your_sms_api_key
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```

```bash
npm start   # Runs on http://localhost:5000
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm start   # Runs on http://localhost:3000
```

### 4. Admin setup
```bash
cd admin
npm install
npm start   # Runs on http://localhost:3001
```

---

## 🗄️ Database Schema

| Collection | Key Fields |
|---|---|
| **users** | name, email, password (bcrypt), phone, role (customer/provider), addresses (with GeoJSON coordinates) |
| **providers** | userId, skills[], subscriptionId, isVerified, rating, revenue, serviceArea |
| **services** | name, description, category, isActive |
| **bookings** | customerId, providerId, serviceId, scheduledAt, status (Pending/Accepted/Completed/Cancelled), payment {method, status, transactionId}, feedback {rating, comment} |
| **subscriptions** | planName (Free/Pro/Elite), price, features[] |

---

## 🔐 Authentication Flow

```
User submits registration form
        ↓
Backend generates secure 6-digit OTP (crypto module)
        ↓
OTP hashed with bcrypt → stored with 5-min expiry
        ↓
SMS Gateway sends OTP to user's phone
        ↓
User submits OTP → backend validates hash + expiry
        ↓
Account activated → JWT issued → User logged in
```

---

## 💳 Payment Flow

| Method | Flow |
|---|---|
| **Stripe** | Frontend tokenizes card via Stripe.js → token sent to backend → Payment Intent created → confirmed |
| **Razorpay** | Backend creates order → Frontend collects payment → webhook confirms |
| **Cash on Delivery** | Booking set to Pending → Provider marks Completed after collecting cash |

---

## 📊 Provider Subscription Tiers

| Plan | Job Priority | Categories | Price |
|---|---|---|---|
| Free | Lowest | Limited | ₹0/month |
| Pro | Medium | Extended | Paid |
| Elite | Highest | All | Premium |

---

## 🚀 Deployment

| Component | Platform |
|---|---|
| Backend | Render (Node.js) |
| Customer Frontend | Render (Static) |
| Admin Frontend | Render (Static) |
| Database | MongoDB Atlas |

---

## 🔮 Future Improvements

- GPS real-time tracking of provider during service
- In-app chat between customer and provider
- Product recommendation engine based on booking history
- Multi-language and multi-currency support
- Docker containerization + Kubernetes orchestration
- Comprehensive unit and integration tests (Jest + Supertest)
- PWA support for mobile installation

---

## 👨‍💻 Author

**Bhavani Shankar Mandala**  
[LinkedIn](https://www.linkedin.com/in/bhavani-shankar-mandala-b728782ba/) • [GitHub](https://github.com/bhavanishankar7075)
