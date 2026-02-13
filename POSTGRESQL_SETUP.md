# Database Setup (PostgreSQL)

This project uses **PostgreSQL** with **Prisma ORM** as the only database.

## Prerequisites

- **PostgreSQL** running at:
  - Host: `localhost`
  - Port: `5000`
  - User: `postgres`
  - Password: `12345678`
  - Database: `construction-cms`

## Setup

1. **Environment**

   In `.env.local`:
   ```
   DATABASE_URL="postgresql://postgres:12345678@localhost:5000/construction-cms?schema=public"
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   ```

2. **Create database**
   ```bash
   psql -U postgres -h localhost -p 5000
   CREATE DATABASE "construction-cms";
   \q
   ```

3. **Apply schema**
   ```bash
   npx prisma migrate dev --name init
   # or
   npx prisma db push
   ```

4. **Generate client** (after schema changes)
   ```bash
   npx prisma generate
   ```

## Prisma commands

- `npx prisma generate` – Generate client
- `npx prisma migrate dev` – Create and run migrations
- `npx prisma db push` – Push schema (no migration files)
- `npx prisma studio` – Open DB UI

## Schema

Models: User, Project, Income, Expense, Vendor, Contractor, Loan, VendorPayment, EditRequest (see `prisma/schema.prisma`).
