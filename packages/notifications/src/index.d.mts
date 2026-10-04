export type NotificationPrincipal = { id: string; organizationId: string; isActive: boolean };
export type NotificationEvent = { key: string; title: string; message: string; href: string };
export type NotificationEntry = NotificationEvent & { organizationId: string; recipientId: string };
export function publishNotification<T>(write: (entry: NotificationEntry) => Promise<T>, actor: NotificationPrincipal, recipient: NotificationPrincipal, event: NotificationEvent): Promise<T>;
