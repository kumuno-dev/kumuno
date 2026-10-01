export class ApprovalError extends Error {
  constructor(code) {
    const errors = {
      INVALID_REQUEST: [400, "申請情報が不正です。"], INVALID_COMMAND: [400, "申請操作が不正です。"],
      FORBIDDEN: [403, "この申請を操作する権限がありません。"],
      CONFLICT: [409, "申請が更新されています。再読み込みしてください。"],
      INVALID_STATE: [409, "現在の状態ではこの操作を行えません。"],
    };
    const [status, message] = Object.hasOwn(errors, code) ? errors[code] : errors.INVALID_COMMAND;
    super(message); this.name = "ApprovalError"; this.code = code; this.status = status;
  }
}
const nonempty = value => typeof value === "string" && value.trim().length > 0;
export function transitionApproval({ request, actor, command, can }) {
  if (!request || !["DRAFT", "PENDING", "APPROVED", "RETURNED"].includes(request.status) ||
      ![request.id, request.organizationId, request.requestedById].every(nonempty) ||
      !Number.isSafeInteger(request.version) || request.version < 0 || request.version >= Number.MAX_SAFE_INTEGER) {
    throw new ApprovalError("INVALID_REQUEST");
  }
  if (!command || !["SUBMIT", "APPROVE", "RETURN"].includes(command.action) ||
      !Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 0) {
    throw new ApprovalError("INVALID_COMMAND");
  }
  const submitting = command.action === "SUBMIT";
  if (!actor || !nonempty(actor.id) || actor.isActive !== true ||
      !["ADMIN", "MANAGER", "USER"].includes(actor.role) || actor.organizationId !== request.organizationId ||
      (submitting ? actor.id !== request.requestedById : actor.id === request.requestedById) ||
      typeof can !== "function" || can(actor, submitting ? "approval:submit" : "approval:review", { organizationId: request.organizationId }) !== true) {
    throw new ApprovalError("FORBIDDEN");
  }
  if (command.expectedVersion !== request.version) throw new ApprovalError("CONFLICT");
  if (submitting ? !["DRAFT", "RETURNED"].includes(request.status) : request.status !== "PENDING") {
    throw new ApprovalError("INVALID_STATE");
  }
  let reason = null;
  if (command.action === "RETURN") {
    if (!nonempty(command.reason) || command.reason.trim().length > 1000) throw new ApprovalError("INVALID_COMMAND");
    reason = command.reason.trim();
  }
  return {
    request: { id: request.id, organizationId: request.organizationId, requestedById: request.requestedById,
      status: submitting ? "PENDING" : command.action === "APPROVE" ? "APPROVED" : "RETURNED", version: request.version + 1 },
    action: command.action, actorId: actor.id, reason,
  };
}
