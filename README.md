# 💊 Medicine Inventory Management System

## 📘 Overview

This project presents a complete **MERN stack** (MongoDB, Express, React, Node.js) application tailored for managing pharmacy and medical inventories efficiently. It is designed to simplify core operations like **stock management, sales processing**, and **report generation**, offering a clean and modern interface for pharmacy owners and staff.

With a responsive UI and role-based dashboards, the system enables seamless inventory control, streamlined multi-item sales, and detailed analytics. A standout feature is the **automated daily inventory check**, which sends **email alerts** about low-stock and near-expiry medicines, helping prevent losses and improve business efficiency.

🔗 **Live Frontend:** [medicine-inventory-frontend.netlify.app](https://medicine-inventory-frontend.netlify.app/)

---

## ✨ Features at a Glance

* 🔐 **Secure Authentication:** Full registration and login system using JWT.
* 👥 **Role-Based Access:** Owner vs. Staff roles with permissions; only owners can access sales reports.
* 📦 **Inventory Dashboard:** Add, edit, delete, and manage medicines via an intuitive CRUD interface.
* 🔍 **Real-Time Search:** Instantly filter medicines on inventory and sales pages.
* 🛒 **Multi-Item Sales:** Conduct sales involving multiple medicines in one transaction with live stock checks and running totals.
* 📈 **Comprehensive Reports:**

  * Daily, weekly, and monthly aggregated reports.
  * Detailed history of individual sales across custom date ranges.
* 📧 **Automated Alerts:**

  * A cron job runs daily (e.g., at 8:00 AM) to check for low stock or expiring medicines.
  * Sends email alerts to the pharmacy owner automatically.

---

## 🛠️ Tech Stack

### 🖥️ Frontend

* **React:** Building responsive, component-based UIs.
* **React Router:** Multi-page navigation.
* **Vite:** Fast and lightweight development build tool.
* **Tailwind CSS:** Rapid styling with utility-first classes.

### 🧪 Backend

* **Node.js & Express:** RESTful APIs and server-side logic.
* **MongoDB:** Document-oriented NoSQL database.
* **MongoDB Native Driver:** For efficient DB interactions.
* **JWT:** Secure token-based authentication.
* **bcrypt.js:** For password hashing.
* **Nodemailer:** For sending automated emails.
* **node-cron:** For scheduling background jobs.

### ☁️ Deployment

* **Frontend:** Netlify
* **Backend:** Render
* **Database:** MongoDB Atlas

---

## 🚀 Local Development Guide

### 🔧 Prerequisites

Ensure the following are installed on your machine:

* Node.js (v18+ recommended)
* npm (Node Package Manager)
* MongoDB (Local or Atlas cluster)

### 🛠️ Setup Instructions

#### 1. Clone the Repository

```bash
git clone [Your GitHub Repository URL]
cd medicine-inventory-system
```

#### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file with the following:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

Then run the backend:

```bash
npm run dev
# Runs on http://localhost:5000
```

#### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 🌍 Deployment Guide

### 🔙 Backend (Render)

1. Push your project to GitHub.
2. Create a **Web Service** on [Render](https://render.com).
3. Set the root directory to `backend/`.
4. Configure:

   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
5. Add environment variables from your `.env` file.
6. Deploy!

### 🌐 Frontend (Netlify)

1. Update the API endpoint in your frontend code (e.g., in `LoginPage.jsx`) to the deployed Render URL.
2. Push changes to GitHub.
3. Create a **New Site** on [Netlify](https://netlify.com) and link your repo.
4. Configure:

   * **Base Directory:** `frontend`
   * **Build Command:** `npm run build`
   * **Publish Directory:** `frontend/dist`
     
5. Deploy and enjoy!

---

Let me know if you'd like a **PDF version**, custom branding, or project logo added!
