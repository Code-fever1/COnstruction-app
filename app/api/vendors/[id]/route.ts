import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/postgresql';
import { getErrorMessage } from '@/types';

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

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const expenses = await prisma.expense.findMany({
      where: {
        type: 'material',
        OR: [
          { vendorId: id },
          { vendor: { equals: vendor.name, mode: 'insensitive' }, projectId: vendor.projectId ?? undefined },
        ],
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });

    const payments = await prisma.vendorPayment.findMany({
      where: { vendorId: id },
      include: { enteredBy: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });

    const totalPurchased = expenses.reduce((sum: number, e) => sum + e.amount, 0);
    const totalPaid = payments.reduce((sum: number, p) => sum + p.amount, 0);

    return NextResponse.json({
      ...vendor,
      _id: vendor.id,
      projectId: vendor.project,
      totalPurchased,
      totalPaid,
      balance: totalPurchased - totalPaid,
      expenses: expenses.map((e) => ({ ...e, _id: e.id, projectId: e.project })),
      payments: payments.map((p) => ({ ...p, _id: p.id, enteredBy: p.enteredBy })),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
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

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        phone: data.phone ?? undefined,
        address: data.address ?? undefined,
        status: data.status ?? undefined,
      },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    return NextResponse.json({ ...vendor, _id: vendor.id, projectId: vendor.project });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
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
    if (session.user.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can delete vendors' }, { status: 403 });
    }

    const { id } = await params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { id: true, projectId: true, name: true },
    });
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const expenseCount = await prisma.expense.count({
      where: {
        type: 'material',
        OR: [
          { vendorId: id },
          { vendor: { equals: vendor.name, mode: 'insensitive' }, projectId: vendor.projectId ?? undefined },
        ],
      },
    });
    const paymentCount = await prisma.vendorPayment.count({
      where: { vendorId: id },
    });

    if (expenseCount > 0 || paymentCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor with existing transactions' },
        { status: 400 }
      );
    }

    await prisma.vendor.delete({ where: { id } });
    return NextResponse.json({ message: 'Vendor deleted successfully' });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
