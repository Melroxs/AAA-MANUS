import { desc, eq, and } from "drizzle-orm";
import { appAccounts, appNotifications, bookings, type AppAccount } from "../drizzle/schema";
import { getDb } from "./db";

export async function createInAppNotification(input: { recipientAccountId: number; bookingId?: number; type: string; title: string; body: string; status?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  await db.insert(appNotifications).values({ recipientAccountId: input.recipientAccountId, bookingId: input.bookingId ?? null, type: input.type, channel: "in_app", status: input.status ?? "delivered", title: input.title, body: input.body });
}

export async function notifyBookingParticipants(bookingId: number, type: string, title: string, body: string, recipients: number[]) {
  for (const recipientAccountId of Array.from(new Set(recipients.filter(Boolean)))) {
    await createInAppNotification({ recipientAccountId, bookingId, type, title, body });
  }
}

export async function listNotifications(account: AppAccount) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const rows = await db.select({ notification: appNotifications, booking: bookings }).from(appNotifications).leftJoin(bookings, eq(bookings.id, appNotifications.bookingId)).where(eq(appNotifications.recipientAccountId, account.id)).orderBy(desc(appNotifications.createdAt)).limit(50);
  return rows.map(row => ({ ...row.notification, bookingPublicId: row.booking?.publicId ?? null }));
}

export async function markNotificationRead(account: AppAccount, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  await db.update(appNotifications).set({ readAt: new Date(), status: "read" }).where(and(eq(appNotifications.id, notificationId), eq(appNotifications.recipientAccountId, account.id)));
  return { success: true };
}

export async function notifyBookingAssignment(bookingId: number, driverAccountId: number, dispatcherAccountId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const row = (await db.select({ booking: bookings, passenger: appAccounts }).from(bookings).leftJoin(appAccounts, eq(appAccounts.id, bookings.requestedByAccountId)).where(eq(bookings.id, bookingId)).limit(1))[0];
  if (!row) return;
  await notifyBookingParticipants(bookingId, "assignment", "Driver assigned", `A driver has been assigned to booking ${row.booking.publicId}.`, [driverAccountId, row.passenger?.id ?? 0, dispatcherAccountId]);
}
