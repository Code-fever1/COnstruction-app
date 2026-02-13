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
    const projectId = searchParams.get('projectId');

    const where = projectId ? { projectId } : {};

    const income = await prisma.income.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
      },
    });

    const serialized = income.map((inc: { id: string; project: { id: string; name: string } | null; enteredBy: { id: string; name: string } | null }) => ({
      ...inc,
      _id: inc.id,
      projectId: inc.project,
      enteredBy: inc.enteredBy,
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

    const income = await prisma.income.create({
      data: {
        projectId: data.projectId,
        amount: Number(data.amount),
        date: new Date(data.date),
        description: data.description,
        mode: data.mode as 'bank' | 'cash',
        bankName: data.bankDetails?.bankName ?? null,
        accountNumber: data.bankDetails?.accountNumber ?? null,
        cashLocation: data.cashLocation ?? null,
        enteredById: userId,
      },
      include: {
        project: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { ...income, _id: income.id, projectId: income.project, enteredBy: income.enteredBy },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
