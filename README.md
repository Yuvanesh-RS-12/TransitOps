# 🚛 TransitOps

A modern Transport & Fleet Management System built for the **Odoo Hackathon 2026**.

TransitOps helps transport companies efficiently manage their fleet, drivers, trips, maintenance, fuel usage, operational expenses, and analytics through a clean dashboard interface.

---

## ✨ Features

### 📊 Dashboard & Analytics
- Real-time fleet KPIs
- Vehicle status distribution chart
- Operational cost analytics
- AI Fleet Insights
- Fleet utilization tracking
- CSV report export

### 🚚 Fleet Management
- Vehicle management
- Driver management
- Fleet health scoring
- License expiry monitoring
- Predictive maintenance alerts
- Search & filtering

### 🛣 Trip Management
- Create trips
- Dispatch trips
- Complete trips
- Cancel dispatched trips
- Vehicle & driver allocation
- Trip search
- Status tracking

### 🔧 Operations
- Maintenance management
- Fuel log management
- Expense tracking
- Maintenance due alerts
- Search across records

### 🔐 Authentication
- Secure login
- JWT authentication
- Protected routes

---

# 🛠 Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Recharts
- React Router
- Lucide Icons

### Backend
- Node.js
- Express.js
- PostgreSQL

---

# 📂 Project Structure

```
TransitOps/
│
├── backend/
│   ├── server.js               # Express backend APIs
│   ├── schema.sql              # PostgreSQL database schema
│   ├── package.json
│   ├── package-lock.json
│   └── .env                    # Environment variables (not committed)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Analytics.jsx
│   │   │   ├── Fleet.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Operations.jsx
│   │   │   └── Trips.jsx
│   │   │
│   │   ├── api.js              # API service functions
│   │   ├── App.jsx             # Main application component
│   │   ├── components.jsx      # Reusable UI components
│   │   ├── index.css           # Global styles
│   │   └── main.jsx            # React entry point
│   │
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

# 🚀 Getting Started

## 1. Clone Repository

```bash
git clone https://github.com/Yuvanesh-RS-12/TransitOps.git
```

---

## 2. Backend

```bash
cd backend
npm install
```

Configure PostgreSQL and update your `.env`.

Run:

```bash
npm start
```

---

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

# 👤 Demo Credentials

```
Email:
manager@transitops.com

Password:
password123
```

---

# 📈 Key Highlights

- Modern responsive UI
- AI-powered fleet insights
- Fleet health monitoring
- Predictive maintenance alerts
- Operational analytics dashboard
- Vehicle & driver management
- Search across modules
- CSV report export
- Clean component-based architecture

---

# 🎯 Future Enhancements

- Live GPS tracking
- Route optimization
- Driver mobile application
- Email/SMS notifications
- Role-based access control
- Real-time vehicle telemetry
- Predictive maintenance using Machine Learning

---

# 👨‍💻 Developed For

**Odoo Hackathon 2026**

Built with ❤️ using React, Node.js, Express, PostgreSQL, and Tailwind CSS.
