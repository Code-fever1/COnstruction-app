import { DefaultSession } from 'next-auth';

/** Extend NextAuth session with custom user fields */
declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role: string;
        } & DefaultSession['user'];
    }

    interface User {
        role: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: string;
    }
}

/** Sub-object interfaces used across request handlers */
export interface BankDetails {
    bankName?: string | null;
    accountNumber?: string | null;
}

export interface MaterialDetails {
    materialName?: string | null;
    quantity?: number | null;
    unit?: string | null;
}

export interface LaborDetails {
    laborType?: string | null;
    contractorId?: string | null;
    contractorName?: string | null;
    teamName?: string | null;
    laborName?: string | null;
}

export interface PettyCashDetails {
    supervisorName?: string | null;
    summary?: string | null;
    weekEnding?: string | null;
}

/** Helper to extract error message from unknown catch value */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Internal server error';
}
