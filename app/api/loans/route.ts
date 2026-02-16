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
    const direction = searchParams.get('direction');

    const where: { projectId?: string; direction?: 'payable' | 'receivable'; loanType?: 'inter_project' } = {};
    if (projectId) where.projectId = projectId;
    if (direction) {
      where.direction = direction as 'payable' | 'receivable';
      where.loanType = 'inter_project';
    }

    const loans = await prisma.loan.findMany({
      where,
      orderBy: { dateGiven: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        linkedProject: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
      },
    });

    const serialized = loans.map((loan: { id: string; project: { id: string; name: string } | null; linkedProject: { id: string; name: string } | null; enteredBy: { id: string; name: string } | null }) => ({
      ...loan,
      _id: loan.id,
      projectId: loan.project ? { _id: loan.project.id, name: loan.project.name } : null,
      linkedProjectId: loan.linkedProject ? { _id: loan.linkedProject.id, name: loan.linkedProject.name } : null,
      enteredBy: loan.enteredBy,
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

    if (data.loanType === 'inter-project') {
      const payableLoan = await prisma.loan.create({
        data: {
          projectId: data.projectId,
          borrowerName: '',
          amountGiven: data.amountGiven,
          dateGiven: new Date(data.dateGiven),
          description: data.description ?? null,
          loanType: 'inter_project',
          direction: 'payable',
          linkedProjectId: data.linkedProjectId,
          enteredById: userId,
        },
      });

      const receivableLoan = await prisma.loan.create({
        data: {
          projectId: data.linkedProjectId,
          borrowerName: '',
          amountGiven: data.amountGiven,
          dateGiven: new Date(data.dateGiven),
          description: data.description ?? null,
          loanType: 'inter_project',
          direction: 'receivable',
          linkedProjectId: data.projectId,
          linkedLoanId: payableLoan.id,
          enteredById: userId,
        },
      });

      await prisma.loan.update({
        where: { id: payableLoan.id },
        data: { linkedLoanId: receivableLoan.id },
      });

      const payWithRelations = await prisma.loan.findUnique({
        where: { id: payableLoan.id },
        include: {
          project: { select: { id: true, name: true } },
          linkedProject: { select: { id: true, name: true } },
          enteredBy: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json(
        { ...payWithRelations, _id: payWithRelations!.id, projectId: payWithRelations!.project ? { _id: payWithRelations!.project.id, name: payWithRelations!.project.name } : null, linkedProjectId: payWithRelations!.linkedProject ? { _id: payWithRelations!.linkedProject.id, name: payWithRelations!.linkedProject.name } : null, enteredBy: payWithRelations!.enteredBy },
        { status: 201 }
      );
    }

    const loan = await prisma.loan.create({
      data: {
        projectId: data.projectId,
        borrowerName: data.borrowerName ?? '',
        amountGiven: data.amountGiven,
        dateGiven: new Date(data.dateGiven),
        amountReturned: data.amountReturned ?? 0,
        dateReturned: data.dateReturned ? new Date(data.dateReturned) : null,
        description: data.description ?? null,
        loanType: 'external',
        enteredById: userId,
      },
      include: {
        project: { select: { id: true, name: true } },
        enteredBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(
      { ...loan, _id: loan.id, projectId: loan.project ? { _id: loan.project.id, name: loan.project.name } : null, enteredBy: loan.enteredBy },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, amountReturned, dateReturned } = await request.json();

    const loan = await prisma.loan.findUnique({
      where: { id },
    });
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const newAmountReturned = amountReturned ?? loan.amountReturned;
    const newDateReturned = dateReturned ? new Date(dateReturned) : loan.dateReturned;
    let status: 'active' | 'returned' | 'partial' = loan.status;
    if (newAmountReturned >= loan.amountGiven) status = 'returned';
    else if (newAmountReturned > 0) status = 'partial';

    const updated = await prisma.loan.update({
      where: { id },
      data: {
        amountReturned: newAmountReturned,
        dateReturned: newDateReturned,
        status,
      },
    });

    if (loan.loanType === 'inter_project' && loan.linkedLoanId) {
      await prisma.loan.update({
        where: { id: loan.linkedLoanId },
        data: {
          amountReturned: newAmountReturned,
          dateReturned: newDateReturned,
          status,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
