# Construction CMS

A comprehensive construction project management system for tracking projects, expenses, income, and financial summaries.

## Features

- **Role-based Access**: Owner and Accountant roles with different permissions
- **Project Management**: Support for Customer, Company, and Investor project types with investment percentage splits
- **Financial Tracking**: 
  - Income tracking (bank transfers with account details, cash in Locker 1 and Locker 2)
  - Expense tracking (materials with quantities, labor teams, factory overhead, petty cash)
- **Loan Management**: Track loans given from project funds with return tracking
- **Comprehensive Reports**: 
  - Income/Expense summaries by project or all projects
  - Cash positions (bank, locker 1, locker 2)
  - Material usage summaries with quantities
  - Profit/Loss calculations
  - Loan summaries

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory with:
```
NEXTAUTH_SECRET=your-secret-key-here-change-this-in-production
NEXTAUTH_URL=http://localhost:3000

# PostgreSQL (Prisma)
DATABASE_URL="postgresql://postgres:12345678@localhost:5000/construction-cms?schema=public"
```

3. Create the PostgreSQL database and run migrations:
```bash
# Create database (e.g. in psql: CREATE DATABASE "construction-cms";)
npx prisma migrate dev --name init
# Or push schema without migrations:
npx prisma db push
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

6. Register your first user:
   - Go to `/register`
   - Create an Owner account first
   - Then create Accountant accounts as needed

## User Roles

### Owner
- Create and manage projects
- View all project summaries
- View combined financial summaries across all projects
- Access to profit/loss calculations
- View cash positions

### Accountant
- Add income records (with date, description, amount, payment mode)
- Add expense records (materials, labor, overhead, petty cash)
- Manage loans (add loans, record returns)
- View project-specific data

## Tech Stack

- **Next.js** – App Router
- **PostgreSQL** – Database
- **Prisma** – ORM
- **NextAuth** – Authentication
- **Tailwind CSS** – Styling

## Prisma Commands

- `npx prisma generate` – Generate Prisma client
- `npx prisma migrate dev` – Create and apply migrations
- `npx prisma db push` – Push schema to database (no migration files)
- `npx prisma studio` – Open Prisma Studio to view/edit data
