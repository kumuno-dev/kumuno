export type ApprovalStatus = "DRAFT" | "PENDING" | "APPROVED" | "RETURNED";
export type ApprovalPermission = "approval:submit" | "approval:review";
export type ApprovalActor = { id: string; organizationId: string; departmentId: string | null;
  role: "ADMIN" | "MANAGER" | "USER"; isActive: boolean };
export type ApprovalRequest = { id: string; organizationId: string; requestedById: string;
  status: ApprovalStatus; version: number };
export type ApprovalCommand = { action: "SUBMIT" | "APPROVE"; expectedVersion: number } |
  { action: "RETURN"; expectedVersion: number; reason: string };
export type ApprovalTransition = { request: ApprovalRequest; action: ApprovalCommand["action"];
  actorId: string; reason: string | null };
export type ApprovalErrorCode = "INVALID_REQUEST" | "INVALID_COMMAND" | "FORBIDDEN" | "CONFLICT" | "INVALID_STATE";
export class ApprovalError extends Error { readonly code: ApprovalErrorCode; readonly status: number; constructor(code: ApprovalErrorCode); }
export function transitionApproval(input: { request: ApprovalRequest; actor: ApprovalActor | null;
  command: ApprovalCommand;
  can: (actor: ApprovalActor, permission: ApprovalPermission, scope: { organizationId: string }) => boolean;
}): ApprovalTransition;
