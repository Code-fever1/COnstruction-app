import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/postgresql';
import { getErrorMessage } from '@/types';

type ExpenseRow = {
  type: string;
  mode: string;
  cashLocation: string | null;
  amount: number;
  vendorPaymentStatus: string | null;
  vendorPaidAmount: number | null;
  paymentsBySourceLocker1: number | null;
  paymentsBySourceLocker2: number | null;
  paymentsBySourceBank: number | null;
  materialName: string | null;
  materialQuantity: number | null;
  materialUnit: string | null;
};

function getEffectiveExpenseForCashPosition(exp: ExpenseRow, location: 'locker1' | 'locker2' | 'bank') {
  if (exp.type === 'material') {
    const src = location === 'bank' ? exp.paymentsBySourceBank : location === 'locker1' ? exp.paymentsBySourceLocker1 : exp.paymentsBySourceLocker2;
    if (src != null && src > 0) return src;
    if (exp.vendorPaymentStatus === 'pending') return 0;
    if (exp.vendorPaymentStatus === 'partial' && exp.vendorPaidAmount) {
      if (location === 'bank' && exp.mode === 'bank') return Math.min(exp.vendorPaidAmount, exp.amount);
      if (location !== 'bank' && exp.mode === 'cash' && exp.cashLocation === location) return Math.min(exp.vendorPaidAmount, exp.amount);
      return 0;
    }
    if (exp.vendorPaymentStatus === 'full') {
      if (location === 'bank' && exp.mode === 'bank') return exp.amount;
      if (location !== 'bank' && exp.mode === 'cash' && exp.cashLocation === location) return exp.amount;
      return 0;
    }
    return 0;
  }
  if (location === 'bank') return exp.mode === 'bank' ? exp.amount : 0;
  return exp.mode === 'cash' && exp.cashLocation === location ? exp.amount : 0;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can view summary' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const where = projectId ? { projectId } : {};

    const [allIncome, allExpenses, allLoans] = await Promise.all([
      prisma.income.findMany({ where }),
      prisma.expense.findMany({ where }),
      prisma.loan.findMany({ where }),
    ]);

    const totalIncome = allIncome.reduce((sum: number, inc: { amount: number }) => sum + inc.amount, 0);
    const bankIncome = allIncome.filter((inc) => inc.mode === 'bank').reduce((sum: number, inc: { amount: number }) => sum + inc.amount, 0);
    const cashIncome = allIncome.filter((inc) => inc.mode === 'cash').reduce((sum: number, inc: { amount: number }) => sum + inc.amount, 0);

    const totalExpenses = allExpenses.reduce((sum: number, exp: ExpenseRow) => {
      if (exp.type === 'material' && exp.vendorPaymentStatus === 'pending') return sum;
      if (exp.type === 'material' && exp.vendorPaymentStatus === 'partial' && exp.vendorPaidAmount) return sum + exp.vendorPaidAmount;
      return sum + exp.amount;
    }, 0);

    const materialExpenses = allExpenses
      .filter((exp) => exp.type === 'material')
      .reduce((sum: number, exp: ExpenseRow) => {
        if (exp.vendorPaymentStatus === 'pending') return sum;
        if (exp.vendorPaymentStatus === 'partial' && exp.vendorPaidAmount) return sum + exp.vendorPaidAmount;
        return sum + exp.amount;
      }, 0);
    const laborExpenses = allExpenses.filter((exp) => exp.type === 'labor').reduce((sum: number, exp: { amount: number }) => sum + exp.amount, 0);
    const overheadExpenses = allExpenses.filter((exp) => exp.type === 'factory_overhead').reduce((sum: number, exp: { amount: number }) => sum + exp.amount, 0);
    const pettyCashExpenses = allExpenses.filter((exp) => exp.type === 'petty_cash').reduce((sum: number, exp: { amount: number }) => sum + exp.amount, 0);

    const bankExpenses = allExpenses.filter((exp) => exp.mode === 'bank').reduce((sum: number, exp: { amount: number }) => sum + exp.amount, 0);
    const cashExpenses = allExpenses.filter((exp) => exp.mode === 'cash').reduce((sum: number, exp: { amount: number }) => sum + exp.amount, 0);

    const cashAtBank = bankIncome - allExpenses.reduce((sum: number, exp: ExpenseRow) => sum + getEffectiveExpenseForCashPosition(exp, 'bank'), 0);
    const cashInLocker1 =
      allIncome.filter((inc) => inc.mode === 'cash' && inc.cashLocation === 'locker1').reduce((sum: number, inc: { amount: number }) => sum + inc.amount, 0) -
      allExpenses.reduce((sum: number, exp: ExpenseRow) => sum + getEffectiveExpenseForCashPosition(exp, 'locker1'), 0);
    const cashInLocker2 =
      allIncome.filter((inc) => inc.mode === 'cash' && inc.cashLocation === 'locker2').reduce((sum: number, inc: { amount: number }) => sum + inc.amount, 0) -
      allExpenses.reduce((sum: number, exp: ExpenseRow) => sum + getEffectiveExpenseForCashPosition(exp, 'locker2'), 0);

    const totalLoansGiven = allLoans.reduce((sum: number, loan: { amountGiven: number }) => sum + loan.amountGiven, 0);
    const totalLoansReturned = allLoans.reduce((sum: number, loan: { amountReturned: number }) => sum + loan.amountReturned, 0);
    const activeLoans = allLoans.filter((loan) => loan.status === 'active');

    const materialSummary: Record<string, { quantity: number; totalCost: number; unit: string }> = {};
    allExpenses
      .filter((exp) => exp.type === 'material' && (exp.materialName || exp.materialQuantity != null))
      .forEach((exp) => {
        const name = exp.materialName ?? '';
        if (!materialSummary[name]) {
          materialSummary[name] = { quantity: 0, totalCost: 0, unit: exp.materialUnit ?? '' };
        }
        materialSummary[name].quantity += exp.materialQuantity ?? 0;
        materialSummary[name].totalCost += exp.amount;
      });

    const profit = totalIncome - totalExpenses;

    let project: { name: string; type: string } | null = null;
    if (projectId) {
      const p = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, type: true },
      });
      if (p) project = { name: p.name, type: p.type };
    }

    return NextResponse.json({
      project,
      income: {
        total: totalIncome,
        bank: bankIncome,
        cash: cashIncome,
        transactions: allIncome.length,
      },
      expenses: {
        total: totalExpenses,
        byType: {
          material: materialExpenses,
          labor: laborExpenses,
          overhead: overheadExpenses,
          pettyCash: pettyCashExpenses,
        },
        byMode: {
          bank: bankExpenses,
          cash: cashExpenses,
        },
        transactions: allExpenses.length,
      },
      materialSummary,
      cashPosition: {
        bank: cashAtBank,
        locker1: cashInLocker1,
        locker2: cashInLocker2,
        total: cashAtBank + cashInLocker1 + cashInLocker2,
      },
      loans: {
        totalGiven: totalLoansGiven,
        totalReturned: totalLoansReturned,
        outstanding: totalLoansGiven - totalLoansReturned,
        activeCount: activeLoans.length,
      },
      profit,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
