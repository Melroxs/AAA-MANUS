import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { appAccounts, appSessions, type AppAccount } from "../drizzle/schema";
import { getDb } from "./db";

export const APP_SESSION_COOKIE = "aaa_app_session";
export const DEMO_PASSWORD = "HomeRide2026!";
const SESSION_DAYS = 30;

export type PublicAccount = {
  id: number;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  initials: string;
  tone: string;
  destination: string;
  organization: string | null;
  phone: string | null;
};

export type DemoSeedAccount = {
  name: string;
  email: string;
  role: "rider" | "caregiver" | "driver" | "dispatcher" | "clinic_intake";
  phone: string;
  organization?: string;
  tone: string;
};

export const DEMO_ACCOUNTS: DemoSeedAccount[] = [
  { name: "Maria Lopez", email: "maria.lopez@example.com", role: "rider", phone: "+15713007806", tone: "coral" },
  { name: "James Lopez", email: "james.lopez@example.com", role: "caregiver", phone: "+15713007807", tone: "blue" },
  { name: "Andre Washington", email: "andre.washington@example.com", role: "driver", phone: "+15713007808", tone: "teal" },
  { name: "Priya Raman", email: "priya.raman@example.com", role: "driver", phone: "+15713007809", tone: "gold" },
  { name: "Denise Carter", email: "dispatch@example.com", role: "dispatcher", phone: "+15713007810", tone: "navy" },
  { name: "Alina Petrova", email: "intake@harborclinic.example", role: "clinic_intake", phone: "+15713007811", organization: "Harbor Clinic", tone: "plum" },
];

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, expected] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function initials(name: string) {
  return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function roleLabel(role: AppAccount["role"]) {
  if (role === "clinic_intake") return "Caregiver / Clinic Intake";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function destination(role: AppAccount["role"]) {
  if (role === "driver") return "/driver";
  if (role === "dispatcher") return "/dispatch";
  if (role === "admin") return "/dashboard";
  return "/rider";
}

export function toPublicAccount(account: AppAccount): PublicAccount {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    roleLabel: roleLabel(account.role),
    initials: initials(account.name),
    tone: DEMO_ACCOUNTS.find(item => item.email === account.email)?.tone ?? "navy",
    destination: destination(account.role),
    organization: account.organization,
    phone: account.phone,
  };
}

export async function seedDemoAccounts() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const passwordHash = hashPassword(DEMO_PASSWORD);

  for (const demo of DEMO_ACCOUNTS) {
    await db.insert(appAccounts).values({
      email: demo.email,
      name: demo.name,
      role: demo.role,
      passwordHash,
      phone: demo.phone,
      organization: demo.organization ?? null,
      isDemo: "true",
    }).onDuplicateKeyUpdate({
      set: {
        name: demo.name,
        role: demo.role,
        passwordHash,
        phone: demo.phone,
        organization: demo.organization ?? null,
        isDemo: "true",
      },
    });
  }

  return DEMO_ACCOUNTS.map(account => ({ email: account.email, name: account.name, role: account.role }));
}

export async function getAccountByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(appAccounts).where(eq(appAccounts.email, email.toLowerCase())).limit(1);
  return rows[0];
}

export async function getAccountById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(appAccounts).where(eq(appAccounts.id, id)).limit(1);
  return rows[0];
}

export async function createAppSession(account: AppAccount) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.delete(appSessions).where(eq(appSessions.accountId, account.id));
  await db.insert(appSessions).values({ accountId: account.id, tokenHash: tokenHash(token), expiresAt });
  await db.update(appAccounts).set({ lastSignedIn: new Date() }).where(eq(appAccounts.id, account.id));
  return { token, expiresAt };
}

export async function deleteAppSession(token: string | undefined) {
  if (!token) return;
  const db = await getDb();
  if (!db) return;
  await db.delete(appSessions).where(eq(appSessions.tokenHash, tokenHash(token)));
}

export async function authenticateAppRequest(req: Request) {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  let token = cookies[APP_SESSION_COOKIE];
  if (!token && typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7);
  }
  if (!token) return null;
  const db = await getDb();
  if (!db) return null;
  const sessions = await db.select().from(appSessions).where(
    and(eq(appSessions.tokenHash, tokenHash(token)), gt(appSessions.expiresAt, new Date()))
  ).limit(1);
  const session = sessions[0];
  if (!session) return null;
  const account = await getAccountById(session.accountId);
  if (!account) return null;
  await db.update(appSessions).set({ lastSeenAt: new Date() }).where(eq(appSessions.id, session.id));
  return account;
}

export function setAppSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(APP_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    expires: expiresAt,
  });
}

export function clearAppSessionCookie(res: Response) {
  res.clearCookie(APP_SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: "none", path: "/" });
}

export async function loginWithPassword(email: string, password: string) {
  const account = await getAccountByEmail(email);
  if (!account || !verifyPassword(password, account.passwordHash)) return null;
  return { account, ...(await createAppSession(account)) };
}
