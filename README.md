
# VELOop Rewards App

A MERN-stack application for a daily streak and rewards system.

## Tech Stack

- Frontend: React, Vite, Bootstrap, CSS Modules
- Backend: Node.js, Express.js
- Database: MongoDB Atlas
- Authentication: JWT and bcrypt

## Current Features

- User registration and login
- JWT-based authentication middleware
- Seven-day reward configuration
- Daily streak rewards API
- Authenticated streak status API
- MongoDB models for users, wallets, streaks, claims, transactions, and audit logs

## Reward Schedule

| Day | Reward |
|---|---|
| 1 | 5 VEs |
| 2 | 10 VEs |
| 3 | 15 VEs |
| 4 | ₹1 Amazon gift card |
| 5 | ₹2 Amazon gift card |
| 6 | 30 VEs |
| 7 | ₹5 Amazon gift card |

## Run Locally

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

Open a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Configure the required environment variables in `backend/.env` and keep secrets out of version control.

## Project Status

The authentication and reward configuration APIs are implemented. The daily reward claim flow and deployment are still in progress.
