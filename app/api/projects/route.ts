import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/postgresql';
import { normalizeNameList, projectToApiShape, projectFromBody } from '@/lib/api-helpers';
import { getErrorMessage } from '@/types';

async function syncProjectParties(
  projectId: string,
  contractorNames: string[],
  vendorNames: string[]
) {
  for (const name of contractorNames) {
    const existing = await prisma.contractor.findFirst({
      where: { projectId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (!existing) {
      await prisma.contractor.create({
        data: {
          projectId,
          name,
          agreedAmount: 0,
          totalPaid: 0,
          balance: 0,
          status: 'active',
        },
      });
    }
  }
  for (const name of vendorNames) {
    const existing = await prisma.vendor.findFirst({
      where: { projectId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (!existing) {
      await prisma.vendor.create({
        data: {
          projectId,
          name,
          totalPurchased: 0,
          totalPaid: 0,
          balance: 0,
          status: 'active',
        },
      });
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(projects.map(projectToApiShape));
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
    if (session.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can create projects' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const contractorNames = normalizeNameList(data?.contractors);
    const vendorNames = normalizeNameList(data?.vendors);

    const project = await prisma.project.create({
      data: projectFromBody({
        ...data,
        contractors: contractorNames,
        vendors: vendorNames,
      }),
    });

    await syncProjectParties(project.id, contractorNames, vendorNames);

    return NextResponse.json(projectToApiShape(project), { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
