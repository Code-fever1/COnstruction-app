import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/postgresql';
import { getErrorMessage } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const projectId = searchParams.get('projectId');

    const where: { vendorId?: string; projectId?: string } = {};
    if (vendorId) where.vendorId = vendorId;
    if (projectId) where.projectId = projectId;

    const payments = await prisma.vendorPayment.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
      },
    });

    const serialized = payments.map((p) => ({
      ...p,
      _id: p.id,
      vendorId: p.vendor,
      projectId: p.project,
      enteredBy: p.enteredBy,
    }));
    return NextResponse.json(serialized);
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

    const vendor = await prisma.vendor.findUnique({
      where: { id: data.vendorId },
    });
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const paymentAmount = Number(data.amount) || 0;
    if (paymentAmount <= 0) {
      return NextResponse.json({ error: 'Payment amount must be greater than 0' }, { status: 400 });
    }

    const payment = await prisma.vendorPayment.create({
      data: {
        vendorId: data.vendorId,
        projectId: vendor.projectId ?? data.projectId ?? null,
        amount: paymentAmount,
        date: new Date(data.date),
        description: data.description,
        mode: data.mode as 'bank' | 'cash',
        bankName: data.mode === 'bank' ? data.bankDetails?.bankName : null,
        accountNumber: data.mode === 'bank' ? data.bankDetails?.accountNumber : null,
        cashLocation: data.mode === 'cash' ? (data.cashLocation as 'locker1' | 'locker2') : null,
        sourceType: 'manual',
        enteredById: userId,
      },
    });

    const baseWhere = {
      type: 'material' as const,
      OR: [
        { vendorId: vendor.id },
        { vendor: { equals: vendor.name, mode: 'insensitive' as const } },
      ],
      ...(data.projectId ? { projectId: data.projectId } : {}),
    };

    const expenses = await prisma.expense.findMany({
      where: baseWhere,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    let remainingToApply = paymentAmount;
    for (const expense of expenses) {
      if (remainingToApply <= 0) break;

      const currentPaid = expense.vendorPaidAmount ?? 0;
      const remainingOnExpense = Math.max(0, expense.amount - currentPaid);
      if (remainingOnExpense <= 0) continue;

      const applied = Math.min(remainingOnExpense, remainingToApply);
      const nextPaid = currentPaid + applied;
      const nextStatus = nextPaid >= expense.amount ? 'full' : 'partial';

      await prisma.expensePaymentHistory.create({
        data: {
          expenseId: expense.id,
          amount: applied,
          date: new Date(),
          mode: data.mode as 'bank' | 'cash',
          cashLocation: data.mode === 'cash' ? (data.cashLocation as 'locker1' | 'locker2') : null,
          bankName: data.mode === 'bank' ? data.bankDetails?.bankName : null,
          accountNumber: data.mode === 'bank' ? data.bankDetails?.accountNumber : null,
        },
      });

      const inc: { paymentsBySourceLocker1?: number; paymentsBySourceLocker2?: number; paymentsBySourceBank?: number } = {};
      if (data.mode === 'bank') inc.paymentsBySourceBank = (expense.paymentsBySourceBank ?? 0) + applied;
      else if (data.cashLocation === 'locker1') inc.paymentsBySourceLocker1 = (expense.paymentsBySourceLocker1 ?? 0) + applied;
      else if (data.cashLocation === 'locker2') inc.paymentsBySourceLocker2 = (expense.paymentsBySourceLocker2 ?? 0) + applied;

      await prisma.expense.update({
        where: { id: expense.id },
        data: {
          vendorPaidAmount: nextPaid,
          vendorPaymentStatus: nextStatus,
          ...inc,
        },
      });

      remainingToApply -= applied;
    }

    if (remainingToApply < paymentAmount) {
      await prisma.vendorPayment.update({
        where: { id: payment.id },
        data: { appliedToExpenses: true },
      });
    }

    const created = await prisma.vendorPayment.findUnique({
      where: { id: payment.id },
      include: {
        vendor: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(
      { ...created, _id: created!.id, vendorId: created!.vendor, projectId: created!.project, enteredBy: created!.enteredBy },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
