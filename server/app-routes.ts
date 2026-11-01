import type { Express, Request, Response } from "express";
import { z } from "zod";
import { appAccounts, documentRecords } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { authenticateAppRequest, clearAppSessionCookie, DEMO_ACCOUNTS, loginWithPassword, setAppSessionCookie, toPublicAccount } from "./app-auth";
import { assignBooking, cancelBooking, createBooking, getApprovedDrivers, getBookingEvents, getBookingLocation, listBookingsForAccount, listVehicles, recordDriverLocation, updateBookingStatus } from "./app-data";
import { createR2DownloadUrl, createR2UploadUrl, isR2Configured } from "./r2";
import { seedDemoData } from "./seed-demo";
import { completeDocumentUpload, getDriverOnboarding, isKycProviderConfigured, listVerificationQueue, reviewDriverVerification, submitDriverVerification } from "./kyc";
import { listNotifications, markNotificationRead } from "./notifications";

function sendError(res: Response, error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  const status = code === "FORBIDDEN" || code === "PASSENGER_FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "DATABASE_NOT_AVAILABLE" || code === "R2_NOT_CONFIGURED" ? 503 : code === "INVALID_TRANSITION" || code === "DRIVER_CONFLICT" || code === "DRIVER_NOT_APPROVED" || code === "VEHICLE_CONFLICT" || code === "VEHICLE_NOT_ELIGIBLE" ? 409 : 400;
  const safeMessage: Record<string, string> = {
    FORBIDDEN: "You do not have permission to perform this action.",
    PASSENGER_FORBIDDEN: "You do not have permission to manage this passenger.",
    NOT_FOUND: "The requested record was not found.",
    DATABASE_NOT_AVAILABLE: "The application database is not available.",
    R2_NOT_CONFIGURED: "Private document storage is not configured for this deployment.",
    INVALID_TRANSITION: "That trip status transition is not allowed.",
    DRIVER_CONFLICT: "The selected driver has a conflicting assignment.",
    DRIVER_NOT_APPROVED: "Only approved drivers can be assigned.",
    VEHICLE_CONFLICT: "The selected vehicle has a conflicting assignment.",
    VEHICLE_NOT_ELIGIBLE: "The selected vehicle is not active and associated with that driver.",
    TRIP_NOT_ELIGIBLE: "This trip is not eligible for location sharing.",
    INVALID_COORDINATES: "The supplied coordinates are invalid.",
  };
  res.status(status).json({ error: safeMessage[code] ?? "Request could not be completed." });
}

async function requireAccount(req: Request, res: Response) {
  const account = await authenticateAppRequest(req);
  if (!account) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }
  return account;
}

export function registerApplicationRoutes(app: Express) {
  app.get("/api/auth/demo-accounts", (_req, res) => {
    res.json({ accounts: DEMO_ACCOUNTS.map(account => ({ name: account.name, email: account.email, role: account.role === "clinic_intake" ? "Caregiver / Clinic Intake" : account.role.charAt(0).toUpperCase() + account.role.slice(1) })) });
  });

  app.post("/api/auth/demo-login", async (req, res) => {
    const email = z.string().email().safeParse(req.body?.email);
    const password = z.string().min(1).safeParse(req.body?.password);
    if (!email.success || !password.success) {
      res.status(400).json({ error: "Enter a valid email and password." });
      return;
    }
    try {
      const result = await loginWithPassword(email.data, password.data);
      if (!result) {
        res.status(401).json({ error: "Email or password is incorrect." });
        return;
      }
      setAppSessionCookie(res, result.token, result.expiresAt);
      res.json({ account: toPublicAccount(result.account) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const account = await authenticateAppRequest(req);
      res.json({ account: account ? toPublicAccount(account) : null });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.patch("/api/account", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    const input = z.object({ name: z.string().min(2).max(160).optional(), phone: z.string().max(32).nullable().optional() }).safeParse(req.body);
    if (!input.success || (!input.data.name && input.data.phone === undefined)) {
      res.status(400).json({ error: "Provide a valid name or phone number." });
      return;
    }
    try {
      const db = await getDb();
      if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
      await db.update(appAccounts).set({ ...(input.data.name ? { name: input.data.name } : {}), ...(input.data.phone !== undefined ? { phone: input.data.phone } : {}) }).where(eq(appAccounts.id, account.id));
      const updated = await (await import("./app-auth")).getAccountById(account.id);
      res.json({ account: updated ? toPublicAccount(updated) : null });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const account = await authenticateAppRequest(req);
    if (account) {
      const { deleteAppSession } = await import("./app-auth");
      const rawCookie = req.headers.cookie?.split(";").find(value => value.trim().startsWith("aaa_app_session="));
      const cookieToken = rawCookie?.split("=").slice(1).join("=");
      const bearerToken = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
      await deleteAppSession(cookieToken ?? bearerToken);
    }
    clearAppSessionCookie(res);
    res.json({ success: true });
  });

  app.post("/api/auth/seed-demo", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    if (account.role !== "admin") {
      res.status(403).json({ error: "Administrator access is required." });
      return;
    }
    try {
      res.json(await seedDemoData());
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/bookings", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    try {
      res.json({ bookings: await listBookingsForAccount(account) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/bookings", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    const input = z.object({ passenger: z.string().min(1).max(160), pickup: z.string().max(255), destination: z.string().max(255), date: z.string().max(32), time: z.string().max(32), type: z.string().max(80) }).safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: "Booking details are incomplete." });
      return;
    }
    try {
      res.status(201).json(await createBooking(account, input.data));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/bookings/:publicId/assign", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    const driverAccountId = z.number().int().positive().safeParse(req.body?.driverAccountId);
    if (!driverAccountId.success) {
      res.status(400).json({ error: "A valid approved driver is required." });
      return;
    }
    try {
      const vehicleId = req.body?.vehicleId === undefined ? undefined : z.number().int().positive().parse(req.body.vehicleId);
      res.json(await assignBooking(account, req.params.publicId, driverAccountId.data, vehicleId, typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : undefined));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/bookings/:publicId/status", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    const nextStatus = z.string().min(1).safeParse(req.body?.status);
    if (!nextStatus.success) {
      res.status(400).json({ error: "A valid next status is required." });
      return;
    }
    try {
      res.json(await updateBookingStatus(account, req.params.publicId, nextStatus.data, req.body?.note));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/bookings/:publicId/cancel", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    try {
      res.json(await cancelBooking(account, req.params.publicId, typeof req.body?.note === "string" ? req.body.note.slice(0, 500) : undefined));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/bookings/:publicId/events", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    try {
      res.json({ events: await getBookingEvents(account, req.params.publicId) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/bookings/:publicId/location", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    try {
      res.json(await getBookingLocation(account, req.params.publicId));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/notifications", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    try {
      res.json({ notifications: await listNotifications(account) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    const id = z.coerce.number().int().positive().safeParse(req.params.id);
    if (!id.success) {
      res.status(400).json({ error: "A valid notification id is required." });
      return;
    }
    try {
      res.json(await markNotificationRead(account, id.data));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/driver/onboarding", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    try {
      res.json(await getDriverOnboarding(account));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/driver/verification/submit", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    const input = z.object({ provider: z.string().max(80).optional(), reference: z.string().max(160).optional() }).safeParse(req.body ?? {});
    if (!input.success) {
      res.status(400).json({ error: "Verification submission details are invalid." });
      return;
    }
    try {
      res.json(await submitDriverVerification(account, input.data));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/admin/verification-queue", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    try {
      res.json({ providerConfigured: isKycProviderConfigured(), queue: await listVerificationQueue(account) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/admin/verifications/:driverAccountId/review", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    const driverAccountId = z.coerce.number().int().positive().safeParse(req.params.driverAccountId);
    const input = z.object({ decision: z.enum(["approve", "reject"]), note: z.string().max(500).optional() }).safeParse(req.body);
    if (!driverAccountId.success || !input.success) {
      res.status(400).json({ error: "A valid driver and review decision are required." });
      return;
    }
    try {
      res.json(await reviewDriverVerification(account, driverAccountId.data, input.data.decision, input.data.note));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/drivers", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    try {
      res.json({ drivers: await getApprovedDrivers(account) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/vehicles", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    try {
      res.json({ vehicles: await listVehicles(account) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/tracking/location", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    const input = z.object({ bookingId: z.number().int().positive(), latitude: z.number(), longitude: z.number(), source: z.enum(["browser", "simulated"]) }).safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: "Valid location coordinates and source are required." });
      return;
    }
    try {
      res.json(await recordDriverLocation(account, input.data));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/documents/presign-upload", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    if (account.role !== "driver" && account.role !== "admin") {
      res.status(403).json({ error: "Only drivers and administrators can upload driver documents." });
      return;
    }
    const input = z.object({ filename: z.string().min(1).max(200), contentType: z.string().min(1).max(160), size: z.number().int().positive().max(10 * 1024 * 1024), category: z.string().min(1).max(80) }).safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: "File type, size, category and filename are required." });
      return;
    }
    if (!isR2Configured()) {
      res.status(503).json({ error: "Private Cloudflare R2 storage is not configured for this deployment." });
      return;
    }
    try {
      const presigned = await createR2UploadUrl(account.id, input.data.filename, input.data.contentType);
      const db = await getDb();
      if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
      await db.insert(documentRecords).values({ ownerAccountId: account.id, category: input.data.category, objectKey: presigned.key, contentType: input.data.contentType, status: "upload_pending" });
      const created = await db.select({ id: documentRecords.id }).from(documentRecords).where(eq(documentRecords.objectKey, presigned.key)).limit(1);
      res.json({ ...presigned, documentId: created[0]?.id ?? null });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/documents/:id/download", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    try {
      const db = await getDb();
      if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
      const documentId = z.coerce.number().int().positive().safeParse(req.params.id);
      if (!documentId.success) {
        res.status(400).json({ error: "A valid document id is required." });
        return;
      }
      const records = await db.select().from(documentRecords).where(eq(documentRecords.id, documentId.data)).limit(1);
      const record = records[0];
      if (!record || (record.ownerAccountId !== account.id && account.role !== "admin" && account.role !== "dispatcher")) {
        res.status(404).json({ error: "Document not found." });
        return;
      }
      if (!isR2Configured()) {
        res.status(503).json({ error: "Private Cloudflare R2 storage is not configured for this deployment." });
        return;
      }
      res.json(await createR2DownloadUrl(record.objectKey));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/documents/:id/complete", async (req, res) => {
    const account = await requireAccount(req, res);
    if (!account) return;
    const documentId = z.coerce.number().int().positive().safeParse(req.params.id);
    if (!documentId.success) {
      res.status(400).json({ error: "A valid document id is required." });
      return;
    }
    try {
      res.json(await completeDocumentUpload(account, documentId.data));
    } catch (error) {
      sendError(res, error);
    }
  });
}
