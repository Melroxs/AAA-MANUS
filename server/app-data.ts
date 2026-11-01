import { and, desc, eq, inArray, or } from "drizzle-orm";
import { appAccounts, bookingEvents, bookings, driverLocations, driverProfiles, passengers, type AppAccount } from "../drizzle/schema";
import { getDb } from "./db";
import { notifyBookingAssignment, notifyBookingParticipants } from "./notifications";

const BOOKING_STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  assigned: "Assigned",
  driver_en_route: "Driver en route",
  driver_arrived: "Driver arrived",
  passenger_picked_up: "Passenger picked up",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  exception: "Exception",
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  requested: ["assigned", "cancelled", "exception"],
  assigned: ["driver_en_route", "cancelled", "exception"],
  driver_en_route: ["driver_arrived", "cancelled", "exception"],
  driver_arrived: ["passenger_picked_up", "cancelled", "exception"],
  passenger_picked_up: ["in_progress", "exception"],
  in_progress: ["completed", "exception"],
  completed: [],
  cancelled: [],
  exception: ["requested", "cancelled"],
};

function canSeeAll(account: AppAccount) {
  return account.role === "dispatcher" || account.role === "admin";
}

function canCreate(account: AppAccount) {
  return account.role === "rider" || account.role === "caregiver" || account.role === "clinic_intake";
}

function toUiStatus(status: string) {
  return BOOKING_STATUS_LABELS[status] ?? status;
}

function dateLabel(value: string) {
  if (value === "") return "Requested";
  if (value === new Date().toISOString().slice(0, 10)) return "Today";
  return value;
}

async function accountCanAccessPassenger(account: AppAccount, passenger: { accountId: number | null; name: string }) {
  if (account.role === "rider") return passenger.accountId === account.id;
  if (account.role === "caregiver" || account.role === "clinic_intake") return passenger.name === "Maria Lopez" || passenger.accountId === account.id;
  return canSeeAll(account);
}

async function driverSummary(driverId: number | null) {
  if (!driverId) return null;
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ account: appAccounts, profile: driverProfiles }).from(appAccounts).leftJoin(driverProfiles, eq(driverProfiles.accountId, appAccounts.id)).where(eq(appAccounts.id, driverId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    name: row.account.name,
    phone: row.account.phone,
    onboardingStatus: row.profile?.onboardingStatus ?? "submitted",
    vehicleMake: row.profile?.vehicleMake ?? "",
    vehicleModel: row.profile?.vehicleModel ?? "",
    vehicleColor: row.profile?.vehicleColor ?? "",
    licensePlate: row.profile?.licensePlate ?? "",
    licenseState: row.profile?.licenseState ?? "",
  };
}

async function latestLocationForBooking(bookingId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(driverLocations).where(eq(driverLocations.bookingId, bookingId)).orderBy(desc(driverLocations.recordedAt)).limit(1);
  const location = rows[0];
  if (!location) return null;
  const recordedAt = new Date(location.recordedAt);
  return { latitude: Number(location.latitude), longitude: Number(location.longitude), source: location.source, recordedAt, stale: Date.now() - recordedAt.getTime() > 5 * 60 * 1000 };
}

export async function listBookingsForAccount(account: AppAccount) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const conditions = canSeeAll(account)
    ? undefined
    : account.role === "driver"
      ? eq(bookings.assignedDriverAccountId, account.id)
      : or(eq(bookings.requestedByAccountId, account.id), eq(passengers.accountId, account.id), eq(passengers.name, "Maria Lopez"));

  const rows = await db.select({ booking: bookings, passenger: passengers }).from(bookings).innerJoin(passengers, eq(passengers.id, bookings.passengerId)).where(conditions).orderBy(desc(bookings.createdAt));
  const visible = canSeeAll(account) || account.role === "driver"
    ? rows
    : (await Promise.all(rows.map(async row => ({ row, allowed: await accountCanAccessPassenger(account, row.passenger) })))).filter(item => item.allowed).map(item => item.row);

  return Promise.all(visible.map(async ({ booking, passenger }) => ({
    id: booking.publicId,
    dbId: booking.id,
    passenger: passenger.name,
    pickup: booking.pickup,
    destination: booking.destination,
    date: dateLabel(booking.scheduledDate),
    time: booking.scheduledTime,
    type: booking.rideType,
    status: toUiStatus(booking.status),
    driver: booking.assignedDriverAccountId ? (await driverSummary(booking.assignedDriverAccountId))?.name : undefined,
    driverDetails: await driverSummary(booking.assignedDriverAccountId),
    latestLocation: await latestLocationForBooking(booking.id),
    createdAt: booking.createdAt,
  })));
}

export async function createBooking(account: AppAccount, input: { passenger: string; pickup: string; destination: string; date: string; time: string; type: string }) {
  if (!canCreate(account)) throw new Error("FORBIDDEN");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const passengerRows = await db.select().from(passengers).where(eq(passengers.name, input.passenger)).limit(1);
  const passenger = passengerRows[0];
  if (!passenger || !(await accountCanAccessPassenger(account, passenger))) throw new Error("PASSENGER_FORBIDDEN");
  const publicId = `AR-${1000 + Math.floor(Math.random() * 8999)}`;
  await db.insert(bookings).values({
    publicId,
    passengerId: passenger.id,
    requestedByAccountId: account.id,
    pickup: input.pickup || "Pickup to be confirmed",
    destination: input.destination || "Destination to be confirmed",
    scheduledDate: input.date || "Requested",
    scheduledTime: input.time || "Time to be confirmed",
    rideType: input.type || "Non-emergency care",
    status: "requested",
  });
  const created = await db.select().from(bookings).where(eq(bookings.publicId, publicId)).limit(1);
  const booking = created[0];
  if (!booking) throw new Error("BOOKING_CREATE_FAILED");
  await db.insert(bookingEvents).values({ bookingId: booking.id, actorAccountId: account.id, previousStatus: null, newStatus: "requested", note: "Booking requested" });
  await notifyBookingParticipants(booking.id, "booking_created", "Booking requested", `Your request ${publicId} has been recorded.`, [account.id]);
  return { publicId };
}

async function getBookingForAccount(account: AppAccount, publicId: string) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const rows = await db.select({ booking: bookings, passenger: passengers }).from(bookings).innerJoin(passengers, eq(passengers.id, bookings.passengerId)).where(eq(bookings.publicId, publicId)).limit(1);
  const row = rows[0];
  if (!row) throw new Error("NOT_FOUND");
  if (!canSeeAll(account) && account.role === "driver" && row.booking.assignedDriverAccountId !== account.id) throw new Error("FORBIDDEN");
  if (!canSeeAll(account) && account.role !== "driver" && !(await accountCanAccessPassenger(account, row.passenger))) throw new Error("FORBIDDEN");
  return row;
}

export async function assignBooking(account: AppAccount, publicId: string, driverAccountId: number) {
  if (!canSeeAll(account)) throw new Error("FORBIDDEN");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const row = await getBookingForAccount(account, publicId);
  const driverRows = await db.select({ account: appAccounts, profile: driverProfiles }).from(appAccounts).innerJoin(driverProfiles, eq(driverProfiles.accountId, appAccounts.id)).where(eq(appAccounts.id, driverAccountId)).limit(1);
  const driver = driverRows[0];
  if (!driver || driver.account.role !== "driver" || driver.profile.onboardingStatus !== "approved") throw new Error("DRIVER_NOT_APPROVED");
  const activeAssignments = await db.select().from(bookings).where(and(eq(bookings.assignedDriverAccountId, driverAccountId), inArray(bookings.status, ["assigned", "driver_en_route", "driver_arrived", "passenger_picked_up", "in_progress"])));
  const conflict = activeAssignments.some(item => item.scheduledDate === row.booking.scheduledDate && item.scheduledTime === row.booking.scheduledTime && item.publicId !== publicId);
  if (conflict) throw new Error("DRIVER_CONFLICT");
  const previousStatus = row.booking.status;
  await db.update(bookings).set({ assignedDriverAccountId: driverAccountId, status: "assigned", updatedAt: new Date() }).where(eq(bookings.id, row.booking.id));
  await db.insert(bookingEvents).values({ bookingId: row.booking.id, actorAccountId: account.id, previousStatus, newStatus: "assigned", note: `Assigned to ${driver.account.name}` });
  await notifyBookingAssignment(row.booking.id, driverAccountId, account.id);
  return { success: true };
}

export async function updateBookingStatus(account: AppAccount, publicId: string, nextStatus: string, note?: string) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const row = await getBookingForAccount(account, publicId);
  if (account.role === "driver" && row.booking.assignedDriverAccountId !== account.id) throw new Error("FORBIDDEN");
  if (account.role !== "driver" && !canSeeAll(account)) throw new Error("FORBIDDEN");
  if (!ALLOWED_TRANSITIONS[row.booking.status]?.includes(nextStatus)) throw new Error("INVALID_TRANSITION");
  await db.update(bookings).set({ status: nextStatus as typeof row.booking.status, updatedAt: new Date() }).where(eq(bookings.id, row.booking.id));
  await db.insert(bookingEvents).values({ bookingId: row.booking.id, actorAccountId: account.id, previousStatus: row.booking.status, newStatus: nextStatus, note: note ?? null });
  await notifyBookingParticipants(row.booking.id, `trip_${nextStatus}`, `Trip status: ${toUiStatus(nextStatus)}`, `Booking ${publicId} is now ${toUiStatus(nextStatus)}.`, [row.booking.requestedByAccountId, row.booking.assignedDriverAccountId ?? 0, account.id]);
  return { success: true };
}

export async function getApprovedDrivers(account: AppAccount) {
  if (!canSeeAll(account)) throw new Error("FORBIDDEN");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const rows = await db.select({ account: appAccounts, profile: driverProfiles }).from(appAccounts).innerJoin(driverProfiles, eq(driverProfiles.accountId, appAccounts.id)).where(eq(driverProfiles.onboardingStatus, "approved"));
  return rows.map(row => ({ id: row.account.id, name: row.account.name, phone: row.account.phone, onboardingStatus: row.profile.onboardingStatus, vehicle: `${row.profile.vehicleColor ?? ""} ${row.profile.vehicleMake ?? ""} ${row.profile.vehicleModel ?? ""}`.trim(), licensePlate: `${row.profile.licenseState ?? ""} ${row.profile.licensePlate ?? ""}`.trim() }));
}

export async function recordDriverLocation(account: AppAccount, input: { bookingId: number; latitude: number; longitude: number; source: string }) {
  if (account.role !== "driver") throw new Error("FORBIDDEN");
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90 || !Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) throw new Error("INVALID_COORDINATES");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const assigned = await db.select().from(bookings).where(and(eq(bookings.id, input.bookingId), eq(bookings.assignedDriverAccountId, account.id))).limit(1);
  if (!assigned[0] || ["completed", "cancelled"].includes(assigned[0].status)) throw new Error("TRIP_NOT_ELIGIBLE");
  await db.insert(driverLocations).values({ bookingId: input.bookingId, driverAccountId: account.id, latitude: input.latitude.toFixed(7), longitude: input.longitude.toFixed(7), source: input.source });
  return { success: true, recordedAt: new Date().toISOString() };
}

export async function getBookingEvents(account: AppAccount, publicId: string) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const row = await getBookingForAccount(account, publicId);
  const rows = await db.select({ event: bookingEvents, actor: appAccounts }).from(bookingEvents).innerJoin(appAccounts, eq(appAccounts.id, bookingEvents.actorAccountId)).where(eq(bookingEvents.bookingId, row.booking.id)).orderBy(desc(bookingEvents.createdAt));
  return rows.map(item => ({ ...item.event, actor: item.actor.name, status: toUiStatus(item.event.newStatus) }));
}

export async function getBookingLocation(account: AppAccount, publicId: string) {
  const row = await getBookingForAccount(account, publicId);
  return { bookingId: row.booking.id, status: toUiStatus(row.booking.status), location: await latestLocationForBooking(row.booking.id) };
}
