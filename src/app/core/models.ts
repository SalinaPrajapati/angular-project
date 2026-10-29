export type Role = 'sales' | 'reviewer' | 'admin';

export interface User {
  readonly id: string;
  readonly name: string;
  readonly role: Role;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface Session extends Tokens {
  user: User;
}

export type ApplicationStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Decision = 'approved' | 'rejected';

/** What the wizard form edits. Strings are '' and numbers are null until filled in. */
export interface ApplicationFormValue {
  business: {
    legalName: string;
    registrationNumber: string;
    businessType: string;
    website: string;
  };
  contact: {
    fullName: string;
    email: string;
    phone: string;
  };
  financial: {
    monthlyVolume: number | null;
    averageTicket: number | null;
    bankAccountNumber: string;
    taxId: string;
  };
}

export interface ApplicationSummary {
  id: string;
  businessName: string;
  status: ApplicationStatus;
  ownerName: string;
  assignedToName: string | null;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListQuery {
  page: number;
  pageSize: number;
  status: ApplicationStatus | '';
  search: string;
}

/** Number of applications the caller can see, per status. */
export type StatusCounts = Record<ApplicationStatus | 'total', number>;

export interface RiskEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  riskLevel?: RiskLevel;
  note?: string;
}

export interface Person {
  id: string;
  name: string;
}

export interface SensitiveFields {
  bankAccountNumber: string;
  taxId: string;
}

export interface ApplicationDetail {
  id: string;
  status: ApplicationStatus;
  owner: Person;
  assignedTo: Person | null;
  createdAt: string;
  updatedAt: string;
  business: ApplicationFormValue['business'];
  contact: ApplicationFormValue['contact'];
  financial: {
    monthlyVolume: number | null;
    averageTicket: number | null;
    /** Already masked by the server, for example "••••••6789". */
    bankAccountNumber: string;
    taxId: string;
  };
  /** null when the caller's role may not see risk history (Sales). */
  riskHistory: RiskEvent[] | null;
  permissions: {
    canEdit: boolean;
    canReveal: boolean;
    canDecide: boolean;
    canAssign: boolean;
  };
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  in_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const ROLE_LABELS: Record<Role, string> = {
  sales: 'Sales',
  reviewer: 'Reviewer',
  admin: 'Admin',
};
