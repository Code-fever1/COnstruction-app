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
    const includeGeneral = searchParams.get('includeGeneral') === 'true';

    const where: { projectId?: string | null } = {};
    if (projectId) {
      if (includeGeneral) {
        // Fetch vendors for this project OR without project
        const vendors = await prisma.vendor.findMany({
          where: {
            OR: [
              { projectId },
              { projectId: null },
            ],
          },
          include: { project: { select: { id: true, name: true } } },
          orderBy: { name: 'asc' },
        });
        const withBalances = await Promise.all(
          vendors.map(async (v: { id: string; name: string; projectId: string | null; project: { id: string; name: string } | null }) => {
            const totalPurchased = await prisma.expense.aggregate({
              where: {
                type: 'material',
                OR: [{ vendorId: v.id }, { vendor: { equals: v.name, mode: 'insensitive' }, projectId: v.projectId ?? undefined }],
              },
              _sum: { amount: true },
            });
            const totalPaidFromExpenses = await prisma.expense.aggregate({
              where: {
                type: 'material',
                OR: [{ vendorId: v.id }, { vendor: { equals: v.name, mode: 'insensitive' }, projectId: v.projectId ?? undefined }],
              },
              _sum: { vendorPaidAmount: true },
            });
            const manualPayments = await prisma.vendorPayment.aggregate({
              where: {
                vendorId: v.id,
                sourceType: 'manual',
                appliedToExpenses: false,
              },
              _sum: { amount: true },
            });
            const totalPurchasedVal = totalPurchased._sum.amount ?? 0;
            const totalPaidFromExpensesVal = totalPaidFromExpenses._sum.vendorPaidAmount ?? 0;
            const manualVal = manualPayments._sum.amount ?? 0;
            const totalPaid = totalPaidFromExpensesVal + manualVal;
            return {
              ...v,
              _id: v.id,
              projectId: v.project,
              totalPurchased: totalPurchasedVal,
              totalPaid,
              balance: totalPurchasedVal - totalPaid,
            };
          })
        );
        return NextResponse.json(withBalances);
      }
      where.projectId = projectId;
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });

    const withBalances = await Promise.all(
      vendors.map(async (v: { id: string; name: string; projectId: string | null; project: { id: string; name: string } | null }) => {
        const totalPurchased = await prisma.expense.aggregate({
          where: {
            type: 'material',
            OR: [{ vendorId: v.id }, { vendor: { equals: v.name, mode: 'insensitive' }, projectId: v.projectId ?? undefined }],
          },
          _sum: { amount: true },
        });
        const totalPaidFromExpenses = await prisma.expense.aggregate({
          where: {
            type: 'material',
            OR: [{ vendorId: v.id }, { vendor: { equals: v.name, mode: 'insensitive' }, projectId: v.projectId ?? undefined }],
          },
          _sum: { vendorPaidAmount: true },
        });
        const manualPayments = await prisma.vendorPayment.aggregate({
          where: {
            vendorId: v.id,
            sourceType: 'manual',
            appliedToExpenses: false,
          },
          _sum: { amount: true },
        });
        const totalPurchasedVal = totalPurchased._sum.amount ?? 0;
        const totalPaidFromExpensesVal = totalPaidFromExpenses._sum.vendorPaidAmount ?? 0;
        const manualVal = manualPayments._sum.amount ?? 0;
        const totalPaid = totalPaidFromExpensesVal + manualVal;
        return {
          ...v,
          _id: v.id,
          projectId: v.project,
          totalPurchased: totalPurchasedVal,
          totalPaid,
          balance: totalPurchasedVal - totalPaid,
        };
      })
    );
    return NextResponse.json(withBalances);
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
    const projectId =
      typeof data.projectId === 'string' && data.projectId.trim()
        ? data.projectId.trim()
        : undefined;

    if (!data.name || !data.phone) {
      return NextResponse.json(
        { error: 'Vendor name and phone are required' },
        { status: 400 }
      );
    }

    const trimmedName = String(data.name).trim();
    const trimmedPhone = String(data.phone).trim();

    const existing = await prisma.vendor.findFirst({
      where: {
        ...(projectId ? { projectId } : { projectId: null }),
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A vendor with this name already exists for this project' },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.create({
      data: {
        ...(projectId ? { projectId } : {}),
        name: trimmedName,
        phone: trimmedPhone,
        address: data.address ?? null,
        totalPurchased: 0,
        totalPaid: 0,
        balance: 0,
        status: 'active',
      },
      include: { project: { select: { id: true, name: true } } },
    });

    if (projectId) {
      const proj = await prisma.project.findUnique({ where: { id: projectId }, select: { vendors: true } });
      const current = proj?.vendors ?? [];
      if (!current.includes(trimmedName)) {
        await prisma.project.update({
          where: { id: projectId },
          data: { vendors: [...current, trimmedName] },
        });
      }
    }

    return NextResponse.json(
      { ...vendor, _id: vendor.id, projectId: vendor.project },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
