import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/postgresql';
import { getErrorMessage } from '@/types';

function mapExpenseToApi(exp: {
  id: string;
  projectId: string;
  vendorId: string | null;
  vendor: string | null;
  type: string;
  amount: number;
  date: Date;
  description: string;
  mode: string;
  paidBy: string;
  bankName: string | null;
  accountNumber: string | null;
  cashLocation: string | null;
  materialName: string | null;
  materialQuantity: number | null;
  materialUnit: string | null;
  vendorPaymentStatus: string | null;
  vendorPaidAmount: number | null;
  laborType: string | null;
  contractorId: string | null;
  contractorName: string | null;
  teamName: string | null;
  laborName: string | null;
  supervisorName: string | null;
  pettyCashSummary: string | null;
  weekEnding: Date | null;
  paymentsBySourceLocker1: number | null;
  paymentsBySourceLocker2: number | null;
  paymentsBySourceBank: number | null;
  enteredById: string;
  createdAt: Date;
  updatedAt: Date;
  project?: { id: string; name: string } | null;
  vendorRel?: { id: string; name: string } | null;
  contractor?: { id: string; name: string } | null;
  enteredBy?: { id: string; name: string } | null;
  paymentHistory?: Array<{ amount: number; date: Date; mode: string; cashLocation: string | null; bankName: string | null; accountNumber: string | null }>;
}) {
  return {
    _id: exp.id,
    projectId: exp.project ?? { _id: exp.projectId, name: (exp.project as { name?: string } | null)?.name },
    vendorId: exp.vendorRel?.id ?? exp.vendorId,
    vendor: exp.vendor,
    type: exp.type === 'factory_overhead' ? 'factory-overhead' : exp.type === 'petty_cash' ? 'petty-cash' : exp.type,
    amount: exp.amount,
    date: exp.date,
    description: exp.description,
    mode: exp.mode,
    paidBy: exp.paidBy,
    bankDetails: (exp.bankName || exp.accountNumber) ? { bankName: exp.bankName, accountNumber: exp.accountNumber } : undefined,
    cashLocation: exp.cashLocation,
    materialDetails: (exp.materialName || exp.materialQuantity != null) ? {
      materialName: exp.materialName,
      quantity: exp.materialQuantity ?? 0,
      unit: exp.materialUnit ?? '',
    } : undefined,
    vendorPaymentStatus: exp.vendorPaymentStatus ?? 'pending',
    vendorPaidAmount: exp.vendorPaidAmount ?? 0,
    laborDetails: (exp.laborType || exp.contractorId || exp.contractorName) ? {
      laborType: exp.laborType === 'contractor' ? 'contractor' : exp.laborType,
      contractorId: exp.contractor?.id ?? exp.contractorId,
      contractorName: exp.contractorName,
      teamName: exp.teamName,
      laborName: exp.laborName,
    } : undefined,
    pettyCashDetails: (exp.supervisorName || exp.pettyCashSummary) ? {
      supervisorName: exp.supervisorName,
      summary: exp.pettyCashSummary,
      weekEnding: exp.weekEnding,
    } : undefined,
    paymentsBySource: {
      locker1: exp.paymentsBySourceLocker1 ?? 0,
      locker2: exp.paymentsBySourceLocker2 ?? 0,
      bank: exp.paymentsBySourceBank ?? 0,
    },
    enteredBy: exp.enteredBy ?? exp.enteredById,
    paymentHistory: exp.paymentHistory ?? [],
    createdAt: exp.createdAt,
    updatedAt: exp.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const where = projectId ? { projectId } : {};

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        vendorRel: { select: { id: true, name: true } },
        contractor: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
        paymentHistory: true,
      },
    });

    return NextResponse.json(expenses.map(mapExpenseToApi));
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const userId = session.user.id;
    const numericAmount = Number(data.amount) || 0;
    const requestedPaidAmount = Number(data.vendorPaidAmount) || 0;
    const paymentStatus = data.vendorPaymentStatus || 'pending';

    let normalizedPaidAmount = 0;
    if (data.type === 'material') {
      if (paymentStatus === 'full') normalizedPaidAmount = numericAmount;
      else if (paymentStatus === 'partial') normalizedPaidAmount = Math.max(0, Math.min(requestedPaidAmount, numericAmount));
    }

    const effectiveAmount = data.type === 'material' ? normalizedPaidAmount : numericAmount;
    const paymentsBySourceLocker1 = data.mode === 'cash' && data.cashLocation === 'locker1' ? effectiveAmount : 0;
    const paymentsBySourceLocker2 = data.mode === 'cash' && data.cashLocation === 'locker2' ? effectiveAmount : 0;
    const paymentsBySourceBank = data.mode === 'bank' ? effectiveAmount : 0;

    const expense = await prisma.expense.create({
      data: {
        projectId: data.projectId,
        vendorId: data.vendorId || null,
        vendor: data.vendor ?? null,
        type: (data.type === 'factory-overhead' ? 'factory_overhead' : data.type === 'petty-cash' ? 'petty_cash' : data.type) as 'material' | 'labor' | 'factory_overhead' | 'petty_cash',
        amount: numericAmount,
        date: new Date(data.date),
        description: data.description,
        mode: data.mode as 'bank' | 'cash',
        paidBy: data.paidBy as 'customer' | 'company',
        bankName: data.bankDetails?.bankName ?? null,
        accountNumber: data.bankDetails?.accountNumber ?? null,
        cashLocation: data.cashLocation ?? null,
        materialName: data.materialDetails?.materialName ?? null,
        materialQuantity: data.materialDetails?.quantity ?? null,
        materialUnit: data.materialDetails?.unit ?? null,
        vendorPaymentStatus: data.type === 'material' ? (paymentStatus as 'pending' | 'partial' | 'full') : 'pending',
        vendorPaidAmount: data.type === 'material' ? normalizedPaidAmount : 0,
        laborType: data.laborDetails?.laborType ?? null,
        contractorId: data.laborDetails?.contractorId ?? null,
        contractorName: data.laborDetails?.contractorName ?? null,
        teamName: data.laborDetails?.teamName ?? null,
        laborName: data.laborDetails?.laborName ?? null,
        supervisorName: data.pettyCashDetails?.supervisorName ?? null,
        pettyCashSummary: data.pettyCashDetails?.summary ?? null,
        weekEnding: data.pettyCashDetails?.weekEnding ? new Date(data.pettyCashDetails.weekEnding) : null,
        paymentsBySourceLocker1,
        paymentsBySourceLocker2,
        paymentsBySourceBank,
        enteredById: userId,
      },
      include: {
        project: { select: { id: true, name: true } },
        vendorRel: { select: { id: true, name: true } },
        contractor: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
        paymentHistory: true,
      },
    });

    if (
      data.type === 'material' &&
      data.vendorId &&
      normalizedPaidAmount > 0 &&
      (paymentStatus === 'full' || paymentStatus === 'partial')
    ) {
      const paymentDescription =
        paymentStatus === 'full'
          ? `Full payment for material expense: ${data.description || ''}`.trim()
          : `Partial payment for material expense: ${data.description || ''}`.trim();

      await prisma.vendorPayment.create({
        data: {
          vendorId: data.vendorId,
          projectId: data.projectId || null,
          amount: normalizedPaidAmount,
          date: data.date ? new Date(data.date) : new Date(),
          description: paymentDescription,
          mode: (data.mode || 'cash') as 'bank' | 'cash',
          bankName: data.mode === 'bank' ? data.bankDetails?.bankName : null,
          accountNumber: data.mode === 'bank' ? data.bankDetails?.accountNumber : null,
          cashLocation: data.mode === 'cash' ? (data.cashLocation as 'locker1' | 'locker2') : null,
          sourceType: 'expense',
          sourceExpenseId: expense.id,
          enteredById: userId,
        },
      });
    }

    return NextResponse.json(mapExpenseToApi(expense), { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
