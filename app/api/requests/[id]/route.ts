import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/postgresql';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email ?? '' },
    });
    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action } = await request.json();

    const editRequest = await prisma.editRequest.findUnique({
      where: { id },
    });
    if (!editRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    if (editRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    let newStatus: 'pending' | 'approved' | 'rejected' = editRequest.status;
    if (action === 'approve') {
      newStatus = 'approved';
      const updateData = editRequest.newData as Record<string, unknown>;

      if (editRequest.collectionName === 'Expense' && updateData.type !== 'material') {
        updateData.vendor = '';
        updateData.vendorId = undefined;
      }

      if (editRequest.collectionName === 'Expense') {
        await prisma.expense.update({
          where: { id: editRequest.originalId },
          data: {
            amount: updateData.amount as number,
            date: updateData.date ? new Date(updateData.date as string) : undefined,
            description: updateData.description as string,
            mode: updateData.mode as 'bank' | 'cash',
            paidBy: updateData.paidBy as 'customer' | 'company',
            bankName: (updateData.bankDetails as any)?.bankName ?? null,
            accountNumber: (updateData.bankDetails as any)?.accountNumber ?? null,
            cashLocation: (updateData.cashLocation as 'locker1' | 'locker2') ?? null,
            vendorId: updateData.vendorId ?? null,
            vendor: (updateData.vendor as string) ?? null,
            materialName: (updateData.materialDetails as any)?.materialName ?? null,
            materialQuantity: (updateData.materialDetails as any)?.quantity ?? null,
            materialUnit: (updateData.materialDetails as any)?.unit ?? null,
            laborType: (updateData.laborDetails as any)?.laborType ?? null,
            contractorId: (updateData.laborDetails as any)?.contractorId ?? null,
            contractorName: (updateData.laborDetails as any)?.contractorName ?? null,
            teamName: (updateData.laborDetails as any)?.teamName ?? null,
            laborName: (updateData.laborDetails as any)?.laborName ?? null,
            supervisorName: (updateData.pettyCashDetails as any)?.supervisorName ?? null,
            pettyCashSummary: (updateData.pettyCashDetails as any)?.summary ?? null,
            weekEnding: (updateData.pettyCashDetails as any)?.weekEnding ? new Date((updateData.pettyCashDetails as any).weekEnding) : null,
          },
        });
      } else if (editRequest.collectionName === 'Income') {
        await prisma.income.update({
          where: { id: editRequest.originalId },
          data: {
            amount: updateData.amount as number,
            date: new Date(updateData.date as string),
            description: updateData.description as string,
            mode: updateData.mode as 'bank' | 'cash',
            bankName: (updateData.bankDetails as any)?.bankName ?? null,
            accountNumber: (updateData.bankDetails as any)?.accountNumber ?? null,
            cashLocation: (updateData.cashLocation as 'locker1' | 'locker2') ?? null,
          },
        });
      } else if (editRequest.collectionName === 'Loan') {
        await prisma.loan.update({
          where: { id: editRequest.originalId },
          data: {
            borrowerName: updateData.borrowerName as string,
            amountGiven: updateData.amountGiven as number,
            dateGiven: new Date(updateData.dateGiven as string),
            amountReturned: (updateData.amountReturned as number) ?? 0,
            dateReturned: updateData.dateReturned ? new Date(updateData.dateReturned as string) : null,
            description: updateData.description as string ?? null,
          },
        });
      }
    } else if (action === 'reject') {
      newStatus = 'rejected';
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.editRequest.update({
      where: { id },
      data: { status: newStatus },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
