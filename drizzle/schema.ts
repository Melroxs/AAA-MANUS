import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const appAccounts = mysqlTable("app_accounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  role: mysqlEnum("role", ["rider", "caregiver", "driver", "dispatcher", "admin", "clinic_intake"]).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  organization: varchar("organization", { length: 160 }),
  isDemo: varchar("isDemo", { length: 8 }).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export const appSessions = mysqlTable("app_sessions", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
});

export const passengers = mysqlTable("passengers", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId"),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  address: varchar("address", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const driverProfiles = mysqlTable("driver_profiles", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().unique(),
  onboardingStatus: mysqlEnum("onboardingStatus", ["draft", "submitted", "under_review", "approved", "rejected", "suspended"]).notNull(),
  phone: varchar("phone", { length: 32 }),
  vehicleMake: varchar("vehicleMake", { length: 80 }),
  vehicleModel: varchar("vehicleModel", { length: 80 }),
  vehicleColor: varchar("vehicleColor", { length: 40 }),
  licensePlate: varchar("licensePlate", { length: 32 }),
  licenseState: varchar("licenseState", { length: 8 }),
  photoUrl: varchar("photoUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  publicId: varchar("publicId", { length: 32 }).notNull().unique(),
  passengerId: int("passengerId").notNull(),
  requestedByAccountId: int("requestedByAccountId").notNull(),
  assignedDriverAccountId: int("assignedDriverAccountId"),
  pickup: varchar("pickup", { length: 255 }).notNull(),
  destination: varchar("destination", { length: 255 }).notNull(),
  scheduledDate: varchar("scheduledDate", { length: 32 }).notNull(),
  scheduledTime: varchar("scheduledTime", { length: 32 }).notNull(),
  rideType: varchar("rideType", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["requested", "assigned", "driver_en_route", "driver_arrived", "passenger_picked_up", "in_progress", "completed", "cancelled", "exception"]).default("requested").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const bookingEvents = mysqlTable("booking_events", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  actorAccountId: int("actorAccountId").notNull(),
  previousStatus: varchar("previousStatus", { length: 40 }),
  newStatus: varchar("newStatus", { length: 40 }).notNull(),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const documentRecords = mysqlTable("document_records", {
  id: int("id").autoincrement().primaryKey(),
  ownerAccountId: int("ownerAccountId").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  objectKey: varchar("objectKey", { length: 512 }).notNull().unique(),
  contentType: varchar("contentType", { length: 160 }).notNull(),
  status: varchar("status", { length: 40 }).default("uploaded").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const driverLocations = mysqlTable("driver_locations", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  driverAccountId: int("driverAccountId").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  source: varchar("source", { length: 24 }).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AppAccount = typeof appAccounts.$inferSelect;
export type AppSession = typeof appSessions.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
