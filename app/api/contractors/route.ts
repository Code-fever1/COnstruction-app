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
        const contractors = await prisma.contractor.findMany({
          where: { OR: [{ projectId }, { projectId: null }] },
          include: { project: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        });
        const withBalances = await Promise.all(
          contractors.map(async (c: { id: string; name: string; projectId: string | null; agreedAmount: number; project: { id: string; name: string } | null }) => {
            const paid = await prisma.expense.aggregate({
              where: {
                type: 'labor',
                laborType: 'contractor',
                OR: [
                  { contractorId: c.id },
                  { contractorName: { equals: c.name, mode: 'insensitive' }, projectId: c.projectId ?? undefined },
                ],
              },
              _sum: { amount: true },
            });
            const totalPaid = paid._sum.amount ?? 0;
            return {
              ...c,
              _id: c.id,
              projectId: c.project,
              totalPaid,
              balance: c.agreedAmount - totalPaid,
            };
          })
        );
        return NextResponse.json(withBalances);
      }
      where.projectId = projectId;
    }

    const contractors = await prisma.contractor.findMany({
      where,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const withBalances = await Promise.all(
      contractors.map(async (c: { id: string; name: string; projectId: string | null; agreedAmount: number; project: { id: string; name: string } | null }) => {
        const paid = await prisma.expense.aggregate({
          where: {
            type: 'labor',
            laborType: 'contractor',
            OR: [
              { contractorId: c.id },
              { contractorName: { equals: c.name, mode: 'insensitive' }, projectId: c.projectId ?? undefined },
            ],
          },
          _sum: { amount: true },
        });
        const totalPaid = paid._sum.amount ?? 0;
        return {
          ...c,
          _id: c.id,
          projectId: c.project,
          totalPaid,
          balance: c.agreedAmount - totalPaid,
        };
      })
    );
    return NextResponse.json(withBalances);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
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
        { error: 'Contractor name and phone are required' },
        { status: 400 }
      );
    }

    const trimmedName = String(data.name).trim();
    const trimmedPhone = String(data.phone).trim();
    const agreedAmount = Number(data.agreedAmount) || 0;

    const existing = await prisma.contractor.findFirst({
      where: {
        ...(projectId ? { projectId } : { projectId: null }),
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A contractor with this name already exists for this project' },
        { status: 400 }
      );
    }

    const contractor = await prisma.contractor.create({
      data: {
        ...(projectId ? { projectId } : {}),
        name: trimmedName,
        phone: trimmedPhone,
        agreedAmount,
        totalPaid: 0,
        balance: agreedAmount,
        status: 'active',
      },
      include: { project: { select: { id: true, name: true } } },
    });

    if (projectId) {
      const proj = await prisma.project.findUnique({ where: { id: projectId }, select: { contractors: true } });
      const current = proj?.contractors ?? [];
      if (!current.includes(trimmedName)) {
        await prisma.project.update({
          where: { id: projectId },
          data: { contractors: [...current, trimmedName] },
        });
      }
    }

    return NextResponse.json(
      { ...contractor, _id: contractor.id, projectId: contractor.project },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
