export interface InviteForm {
  defaultRole: 'member' | 'admin';
  expiresInDays: string;
  maxUses: string;
  allowedEmail: string;
  allowedEmailDomain: string;
}
