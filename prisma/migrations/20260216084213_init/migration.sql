-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'accountant');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('customer', 'company', 'investor');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'completed', 'on-hold');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('bank', 'cash');

-- CreateEnum
CREATE TYPE "CashLocation" AS ENUM ('locker1', 'locker2');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('material', 'labor', 'factory-overhead', 'petty-cash');

-- CreateEnum
CREATE TYPE "PaidBy" AS ENUM ('customer', 'company');

-- CreateEnum
CREATE TYPE "VendorPaymentStatus" AS ENUM ('pending', 'partial', 'full');

-- CreateEnum
CREATE TYPE "LaborType" AS ENUM ('direct', 'contractor');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('active', 'settled');

-- CreateEnum
CREATE TYPE "ContractorStatus" AS ENUM ('active', 'completed');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('active', 'returned', 'partial');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('external', 'inter-project');

-- CreateEnum
CREATE TYPE "LoanDirection" AS ENUM ('payable', 'receivable');

-- CreateEnum
CREATE TYPE "PaymentSourceType" AS ENUM ('manual', 'expense');

-- CreateEnum
CREATE TYPE "CollectionName" AS ENUM ('Expense', 'Income', 'Loan');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "ProjectType" NOT NULL,
    "customer_name" VARCHAR(255),
    "investor_customer_percentage" DOUBLE PRECISION,
    "investor_company_percentage" DOUBLE PRECISION,
    "agreement_total_amount" DOUBLE PRECISION NOT NULL,
    "agreement_start_date" TIMESTAMP(3) NOT NULL,
    "agreement_end_date" TIMESTAMP(3) NOT NULL,
    "agreement_description" TEXT,
    "supervisor" VARCHAR(255),
    "contractors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vendors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incomes" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "bank_name" VARCHAR(255),
    "account_number" VARCHAR(255),
    "cash_location" "CashLocation",
    "entered_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "vendor_id" TEXT,
    "vendor" VARCHAR(255),
    "type" "ExpenseType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "paid_by" "PaidBy" NOT NULL,
    "bank_name" VARCHAR(255),
    "account_number" VARCHAR(255),
    "cash_location" "CashLocation",
    "material_name" VARCHAR(255),
    "material_quantity" DOUBLE PRECISION,
    "material_unit" VARCHAR(50),
    "vendor_payment_status" "VendorPaymentStatus" DEFAULT 'pending',
    "vendor_paid_amount" DOUBLE PRECISION DEFAULT 0,
    "labor_type" "LaborType",
    "contractor_id" TEXT,
    "contractor_name" VARCHAR(255),
    "team_name" VARCHAR(255),
    "labor_name" VARCHAR(255),
    "supervisor_name" VARCHAR(255),
    "petty_cash_summary" TEXT,
    "week_ending" TIMESTAMP(3),
    "payments_by_source_locker1" DOUBLE PRECISION DEFAULT 0,
    "payments_by_source_locker2" DOUBLE PRECISION DEFAULT 0,
    "payments_by_source_bank" DOUBLE PRECISION DEFAULT 0,
    "entered_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_payment_history" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "cash_location" "CashLocation",
    "bank_name" VARCHAR(255),
    "account_number" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_payment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "address" TEXT,
    "total_purchased" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "VendorStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractors" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "agreed_amount" DOUBLE PRECISION NOT NULL,
    "total_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ContractorStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "borrower_name" VARCHAR(255) NOT NULL DEFAULT '',
    "amount_given" DOUBLE PRECISION NOT NULL,
    "date_given" TIMESTAMP(3) NOT NULL,
    "amount_returned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "date_returned" TIMESTAMP(3),
    "description" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'active',
    "loan_type" "LoanType" NOT NULL DEFAULT 'external',
    "direction" "LoanDirection",
    "linked_project_id" TEXT,
    "linked_loan_id" TEXT,
    "entered_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_payments" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "project_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "bank_name" VARCHAR(255),
    "account_number" VARCHAR(255),
    "cash_location" "CashLocation",
    "source_type" "PaymentSourceType" NOT NULL DEFAULT 'manual',
    "source_expense_id" TEXT,
    "applied_to_expenses" BOOLEAN NOT NULL DEFAULT false,
    "entered_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edit_requests" (
    "id" TEXT NOT NULL,
    "collection_name" "CollectionName" NOT NULL,
    "original_id" TEXT NOT NULL,
    "new_data" JSONB NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "requested_by_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "incomes_project_id_idx" ON "incomes"("project_id");

-- CreateIndex
CREATE INDEX "incomes_date_idx" ON "incomes"("date");

-- CreateIndex
CREATE INDEX "expenses_project_id_idx" ON "expenses"("project_id");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_vendor_id_idx" ON "expenses"("vendor_id");

-- CreateIndex
CREATE INDEX "expenses_contractor_id_idx" ON "expenses"("contractor_id");

-- CreateIndex
CREATE INDEX "expense_payment_history_expense_id_idx" ON "expense_payment_history"("expense_id");

-- CreateIndex
CREATE INDEX "vendors_project_id_name_idx" ON "vendors"("project_id", "name");

-- CreateIndex
CREATE INDEX "contractors_project_id_name_idx" ON "contractors"("project_id", "name");

-- CreateIndex
CREATE INDEX "loans_project_id_idx" ON "loans"("project_id");

-- CreateIndex
CREATE INDEX "loans_date_given_idx" ON "loans"("date_given");

-- CreateIndex
CREATE INDEX "vendor_payments_vendor_id_date_idx" ON "vendor_payments"("vendor_id", "date" DESC);

-- CreateIndex
CREATE INDEX "vendor_payments_project_id_idx" ON "vendor_payments"("project_id");

-- CreateIndex
CREATE INDEX "edit_requests_status_idx" ON "edit_requests"("status");

-- CreateIndex
CREATE INDEX "edit_requests_project_id_idx" ON "edit_requests"("project_id");

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payment_history" ADD CONSTRAINT "expense_payment_history_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_linked_project_id_fkey" FOREIGN KEY ("linked_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_linked_loan_id_fkey" FOREIGN KEY ("linked_loan_id") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_requests" ADD CONSTRAINT "edit_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_requests" ADD CONSTRAINT "edit_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
