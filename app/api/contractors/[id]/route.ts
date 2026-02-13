import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/postgresql';

interface ExpenseItem {
  id: string;
  amount: number;
  project: { id: string; name: string } | null;
  [key: string]: any;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const contractor = await prisma.contractor.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const expenses = await prisma.expense.findMany({
      where: {
        type: 'labor',
        laborType: 'contractor',
        OR: [
          { contractorId: id },
          { contractorName: { equals: contractor.name, mode: 'insensitive' }, projectId: contractor.projectId ?? undefined },
        ],
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });

    const totalPaid = expenses.reduce((sum: number, e: ExpenseItem) => sum + e.amount, 0);

    return NextResponse.json({
      ...contractor,
      _id: contractor.id,
      projectId: contractor.project,
      totalPaid,
      balance: contractor.agreedAmount - totalPaid,
      expenses: expenses.map((e) => ({ ...e, _id: e.id, projectId: e.project })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const contractor = await prisma.contractor.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        phone: data.phone ?? undefined,
        agreedAmount: data.agreedAmount ?? undefined,
        status: data.status ?? undefined,
      },
      include: { project: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ ...contractor, _id: contractor.id, projectId: contractor.project });
  } catch (error: any) {
    if ((error as any).code === 'P2025') {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if ((session.user as any).role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can delete contractors' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const contractor = await prisma.contractor.findUnique({
      where: { id },
      select: { id: true, projectId: true, name: true },
    });
    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const expenseCount = await prisma.expense.count({
      where: {
        type: 'labor',
        laborType: 'contractor',
        OR: [
          { contractorId: id },
          { contractorName: { equals: contractor.name, mode: 'insensitive' }, projectId: contractor.projectId ?? undefined },
        ],
      },
    });

    if (expenseCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete contractor with existing labor expenses' },
        { status: 400 }
      );
    }

    await prisma.contractor.delete({ where: { id } });
    return NextResponse.json({ message: 'Contractor deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
