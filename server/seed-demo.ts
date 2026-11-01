import { and, eq } from "drizzle-orm";
import { appAccounts, bookingEvents, bookings, driverProfiles, passengers } from "../drizzle/schema";
import { getDb } from "./db";
import { DEMO_ACCOUNTS, seedDemoAccounts } from "./app-auth";

export async function seedDemoData() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  await seedDemoAccounts();
  const accountRows = await db.select().from(appAccounts).where(eq(appAccounts.isDemo, "true"));
  const byEmail = new Map(accountRows.map(account => [account.email, account]));
  const maria = byEmail.get("maria.lopez@example.com");
  const james = byEmail.get("james.lopez@example.com");
  const andre = byEmail.get("andre.washington@example.com");
  const priya = byEmail.get("priya.raman@example.com");
  const alina = byEmail.get("intake@harborclinic.example");
  if (!maria || !james || !andre || !priya || !alina) throw new Error("DEMO_SEED_ACCOUNT_MISSING");

  let passenger = (await db.select().from(passengers).where(eq(passengers.accountId, maria.id)).limit(1))[0];
  if (!passenger) {
    await db.insert(passengers).values({ accountId: maria.id, name: "Maria Lopez", phone: "+15713007806", address: "7906 Andrus Road, Alexandria, VA 22306", notes: "Fictional demonstration passenger; mobility assistance requested." });
    passenger = (await db.select().from(passengers).where(eq(passengers.accountId, maria.id)).limit(1))[0];
  }
  if (!passenger) throw new Error("DEMO_SEED_PASSENGER_MISSING");

  const driverProfilesToSeed = [
    { accountId: andre.id, phone: andre.phone, vehicleMake: "Toyota", vehicleModel: "Sienna", vehicleColor: "Blue", licensePlate: "HMR-2048", licenseState: "VA" },
    { accountId: priya.id, phone: priya.phone, vehicleMake: "Ford", vehicleModel: "Transit Connect", vehicleColor: "Silver", licensePlate: "HMR-3116", licenseState: "VA" },
  ];
  for (const profile of driverProfilesToSeed) {
    await db.insert(driverProfiles).values({ ...profile, onboardingStatus: "approved" }).onDuplicateKeyUpdate({ set: { ...profile, onboardingStatus: "approved", updatedAt: new Date() } });
  }

  const demoBookings = [
    { publicId: "AR-1048", requestedByAccountId: james.id, assignedDriverAccountId: andre.id, pickup: "7906 Andrus Road, Alexandria", destination: "Alexandria Dialysis Center", scheduledDate: "2026-11-04", scheduledTime: "10:30 AM", rideType: "Dialysis", status: "driver_en_route" as const },
    { publicId: "AR-1052", requestedByAccountId: james.id, assignedDriverAccountId: andre.id, pickup: "7906 Andrus Road, Alexandria", destination: "Inova Mount Vernon Hospital", scheduledDate: "2026-11-07", scheduledTime: "9:00 AM", rideType: "Follow-up", status: "assigned" as const },
    { publicId: "AR-1056", requestedByAccountId: alina.id, assignedDriverAccountId: null, pickup: "Harbor Clinic", destination: "Springfield Therapy Partners", scheduledDate: "2026-11-08", scheduledTime: "2:15 PM", rideType: "Therapy", status: "requested" as const },
  ];
  for (const demo of demoBookings) {
    await db.insert(bookings).values({ ...demo, passengerId: passenger.id }).onDuplicateKeyUpdate({ set: { passengerId: passenger.id, requestedByAccountId: demo.requestedByAccountId, assignedDriverAccountId: demo.assignedDriverAccountId, pickup: demo.pickup, destination: demo.destination, scheduledDate: demo.scheduledDate, scheduledTime: demo.scheduledTime, rideType: demo.rideType, status: demo.status, updatedAt: new Date() } });
    const booking = (await db.select().from(bookings).where(eq(bookings.publicId, demo.publicId)).limit(1))[0];
    if (!booking) continue;
    const events = await db.select().from(bookingEvents).where(and(eq(bookingEvents.bookingId, booking.id), eq(bookingEvents.newStatus, demo.status))).limit(1);
    if (!events[0]) await db.insert(bookingEvents).values({ bookingId: booking.id, actorAccountId: demo.requestedByAccountId, previousStatus: null, newStatus: demo.status, note: "Seeded fictional demonstration booking" });
  }

  return { accounts: DEMO_ACCOUNTS.length, bookings: demoBookings.length };
}
