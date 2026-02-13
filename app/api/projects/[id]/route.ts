import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/postgresql';
import { normalizeNameList, projectToApiShape } from '@/lib/api-helpers';
import { getErrorMessage } from '@/types';

interface InvestorPercentage {
  customer?: number | null;
  company?: number | null;
}

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(projectToApiShape(project));
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
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can update projects' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const contractorNames = normalizeNameList(data?.contractors);
    const vendorNames = normalizeNameList(data?.vendors);

    const updatePayload: Record<string, unknown> = { ...data };
    if (data.agreement) {
      updatePayload.agreementTotalAmount = data.agreement.totalAmount;
      updatePayload.agreementStartDate = new Date(data.agreement.startDate);
      updatePayload.agreementEndDate = new Date(data.agreement.endDate);
      updatePayload.agreementDescription = data.agreement.description ?? null;
    }
    updatePayload.contractors = contractorNames;
    updatePayload.vendors = vendorNames;

    const investorPercentage = updatePayload.investorPercentage as InvestorPercentage | undefined;

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: updatePayload.name as string,
        type: updatePayload.type as 'customer' | 'company' | 'investor',
        customerName: (updatePayload.customerName as string) ?? null,
        investorCustomerPercentage: investorPercentage?.customer ?? null,
        investorCompanyPercentage: investorPercentage?.company ?? null,
        agreementTotalAmount: updatePayload.agreementTotalAmount as number,
        agreementStartDate: updatePayload.agreementStartDate ? new Date(updatePayload.agreementStartDate as string) : undefined,
        agreementEndDate: updatePayload.agreementEndDate ? new Date(updatePayload.agreementEndDate as string) : undefined,
        agreementDescription: (updatePayload.agreementDescription as string) ?? null,
        supervisor: (updatePayload.supervisor as string) ?? null,
        contractors: contractorNames,
        vendors: vendorNames,
        status: (updatePayload.status === 'on-hold' ? 'on_hold' : (updatePayload.status as 'active' | 'completed' | 'on_hold')) ?? 'active',
      },
    });

    await syncProjectParties(project.id, contractorNames, vendorNames);
    return NextResponse.json(projectToApiShape(project));
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can delete projects' },
        { status: 403 }
      );
    }

    await prisma.project.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
