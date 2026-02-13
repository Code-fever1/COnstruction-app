import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/postgresql';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email ?? '' },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requests = await prisma.editRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    const serialized = requests.map((r) => ({
      ...r,
      _id: r.id,
      requestedBy: r.requestedBy,
      projectId: r.project,
      originalId: r.originalId,
    }));
    return NextResponse.json(serialized);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email ?? '' },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = await request.json();

    const newRequest = await prisma.editRequest.create({
      data: {
        collectionName: data.collectionName as 'Expense' | 'Income' | 'Loan',
        originalId: data.originalId,
        newData: data.newData as object,
        status: 'pending',
        requestedById: user.id,
        projectId: data.projectId,
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { ...newRequest, _id: newRequest.id, requestedBy: newRequest.requestedBy, projectId: newRequest.project },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
