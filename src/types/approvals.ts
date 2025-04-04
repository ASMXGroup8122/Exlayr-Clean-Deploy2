export interface PendingOrganization {
  id: string;
  status: string;
}

export interface PendingSponsor extends PendingOrganization {
  sponsor_name: string;
}

export interface PendingIssuer extends PendingOrganization {
  name: string;
}

export interface PendingExchange extends PendingOrganization {
  name: string;
}

export interface PendingApprovals {
  sponsors: PendingSponsor[];
  issuers: PendingIssuer[];
  exchanges: PendingExchange[];
} 