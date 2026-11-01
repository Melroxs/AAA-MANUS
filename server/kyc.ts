import { desc, eq } from "drizzle-orm";
import { appAccounts, documentRecords, driverProfiles, type AppAccount } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

export function isKycProviderConfigured() {
  return Boolean(ENV.kycProviderUrl && ENV.kycProviderKey);
}

export async function getDriverOnboarding(account: AppAccount, requestedAccountId?: number) {
  const targetId = requestedAccountId ?? account.id;
  if (targetId !== account.id && account.role !== "admin" && account.role !== "dispatcher") throw new Error("FORBIDDEN");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const rows = await db.select({ account: appAccounts, profile: driverProfiles }).from(appAccounts).leftJoin(driverProfiles, eq(driverProfiles.accountId, appAccounts.id)).where(eq(appAccounts.id, targetId)).limit(1);
  const row = rows[0];
  if (!row || row.account.role !== "driver") throw new Error("NOT_FOUND");
  const documents = await db.select().from(documentRecords).where(eq(documentRecords.ownerAccountId, targetId)).orderBy(desc(documentRecords.createdAt));
  return {
    account: { id: row.account.id, name: row.account.name, email: row.account.email },
    profile: row.profile ? {
      ...row.profile,
      verificationProviderConfigured: isKycProviderConfigured(),
      verificationStatus: row.profile.verificationStatus,
      verificationMessage: row.profile.verificationStatus === "verified" ? "Verified by the configured provider." : isKycProviderConfigured() ? "Identity review is pending provider completion and administrator review." : "Identity provider credentials are not configured; this driver is not verified.",
    } : null,
    documents,
  };
}

export async function submitDriverVerification(account: AppAccount, input: { provider?: string; reference?: string }) {
  if (account.role !== "driver") throw new Error("FORBIDDEN");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const status = isKycProviderConfigured() ? "under_review" : "provider_unconfigured";
  await db.update(driverProfiles).set({ onboardingStatus: "submitted", verificationStatus: status, verificationProvider: input.provider ?? (ENV.kycProviderUrl ? "configured_provider" : null), verificationReference: input.reference ?? null, verificationSubmittedAt: new Date(), updatedAt: new Date() }).where(eq(driverProfiles.accountId, account.id));
  return { status, providerConfigured: isKycProviderConfigured(), message: isKycProviderConfigured() ? "Verification submitted for provider review." : "Verification workflow is ready, but no identity provider credentials are configured." };
}

export async function listVerificationQueue(account: AppAccount) {
  if (account.role !== "admin") throw new Error("FORBIDDEN");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const rows = await db.select({ account: appAccounts, profile: driverProfiles }).from(driverProfiles).innerJoin(appAccounts, eq(appAccounts.id, driverProfiles.accountId)).orderBy(desc(driverProfiles.updatedAt));
  return rows.map(row => ({ account: { id: row.account.id, name: row.account.name, email: row.account.email }, profile: row.profile, providerConfigured: isKycProviderConfigured() }));
}

export async function reviewDriverVerification(account: AppAccount, driverAccountId: number, decision: "approve" | "reject", note?: string) {
  if (account.role !== "admin") throw new Error("FORBIDDEN");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  if (decision === "approve" && !isKycProviderConfigured()) throw new Error("KYC_PROVIDER_NOT_CONFIGURED");
  await db.update(driverProfiles).set({ verificationStatus: decision === "approve" ? "verified" : "rejected", onboardingStatus: decision === "approve" ? "approved" : "rejected", verificationReviewedAt: new Date(), verificationReviewNote: note ?? null, updatedAt: new Date() }).where(eq(driverProfiles.accountId, driverAccountId));
  return { success: true, verificationStatus: decision === "approve" ? "verified" : "rejected" };
}

export async function completeDocumentUpload(account: AppAccount, documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const rows = await db.select().from(documentRecords).where(eq(documentRecords.id, documentId)).limit(1);
  const document = rows[0];
  if (!document || (document.ownerAccountId !== account.id && account.role !== "admin")) throw new Error("FORBIDDEN");
  await db.update(documentRecords).set({ status: "uploaded" }).where(eq(documentRecords.id, documentId));
  return { success: true };
}
