/** Normalize request body array of names to string[] */
export function normalizeNameList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
    )
  );
}

/** Map Prisma project to API shape (agreement object for frontend compatibility) */
export function projectToApiShape(project: {
  id: string;
  agreementTotalAmount: number;
  agreementStartDate: Date;
  agreementEndDate: Date;
  agreementDescription?: string | null;
  [key: string]: unknown;
}) {
  return {
    ...project,
    _id: project.id,
    agreement: {
      totalAmount: project.agreementTotalAmount,
      startDate: project.agreementStartDate,
      endDate: project.agreementEndDate,
      description: project.agreementDescription ?? undefined,
    },
  };
}

/** Build Prisma project create/update data from API body */
export function projectFromBody(data: {
  name: string;
  type: string;
  customerName?: string;
  investorPercentage?: { customer?: number; company?: number };
  agreement: { totalAmount: number; startDate: string | Date; endDate: string | Date; description?: string };
  supervisor?: string;
  contractors?: unknown;
  vendors?: unknown;
  status?: string;
}) {
  return {
    name: data.name,
    type: data.type as 'customer' | 'company' | 'investor',
    customerName: data.customerName ?? null,
    investorCustomerPercentage: data.investorPercentage?.customer ?? null,
    investorCompanyPercentage: data.investorPercentage?.company ?? null,
    agreementTotalAmount: data.agreement.totalAmount,
    agreementStartDate: new Date(data.agreement.startDate),
    agreementEndDate: new Date(data.agreement.endDate),
    agreementDescription: data.agreement.description ?? null,
    supervisor: data.supervisor ?? null,
    contractors: normalizeNameList(data.contractors),
    vendors: normalizeNameList(data.vendors),
    status: (data.status === 'on-hold' ? 'on_hold' : (data.status as 'active' | 'completed' | 'on_hold')) ?? 'active',
  };
}
