import { appSettings, type AppAccount } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "./db";

export type ServiceType = "wheelchair" | "ambulatory" | "stretcher";
export type TripDirection = "one_way" | "round_trip";
export type RateSchedule = "weekday" | "after_hours" | "holiday";

export const DEFAULT_RATES = {
  wheelchair: { weekday: { one_way: 100, round_trip: 185 }, after_hours: { one_way: 150, round_trip: 250 }, holiday: { one_way: 175, round_trip: 300 } },
  ambulatory: { weekday: { one_way: 30, round_trip: 60 }, after_hours: { one_way: 45, round_trip: 90 }, holiday: { one_way: 50, round_trip: 100 } },
  stretcher: { weekday: { one_way: 200, round_trip: 370 }, after_hours: { one_way: 300, round_trip: 450 }, holiday: { one_way: 250, round_trip: 500 } },
  addOn: { mileage: 5, holidayMileage: 10, waitingPerMinute: 1, additionalAttendantPer15Minutes: 10 },
};

export const SERVICE_DESCRIPTIONS = {
  ambulatory: "For passengers who can walk independently or need minimal assistance.",
  wheelchair: "Accessible transportation with appropriate wheelchair equipment, subject to vehicle availability.",
  stretcher: "For passengers who cannot travel seated upright, subject to suitable vehicle and staffing availability.",
  flight_escort: "Assistance for eligible passengers travelling by air; eligibility and staffing require confirmation.",
};

export async function getRates() {
  const db = await getDb();
  if (!db) return DEFAULT_RATES;
  const rows = await db.select().from(appSettings).where(eq(appSettings.settingKey, "pricing_rates")).limit(1);
  if (!rows[0]) return DEFAULT_RATES;
  try { return JSON.parse(rows[0].settingValue); } catch { return DEFAULT_RATES; }
}

export async function saveRates(account: AppAccount, rates: unknown) {
  if (account.role !== "admin") throw new Error("FORBIDDEN");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_NOT_AVAILABLE");
  const value = JSON.stringify(rates);
  await db.insert(appSettings).values({ settingKey: "pricing_rates", settingValue: value, updatedByAccountId: account.id }).onDuplicateKeyUpdate({ set: { settingValue: value, updatedByAccountId: account.id, updatedAt: new Date() } });
  return { rates };
}

export function estimateFare(input: { serviceType: ServiceType; tripDirection: TripDirection; schedule: RateSchedule; additionalAttendants?: number }, rates = DEFAULT_RATES) {
  const base = rates[input.serviceType]?.[input.schedule]?.[input.tripDirection];
  if (typeof base !== "number") return null;
  const attendantCharge = Math.max(0, input.additionalAttendants ?? 0) * rates.addOn.additionalAttendantPer15Minutes;
  return Math.round((base + attendantCharge) * 100);
}

export function scheduleForDate(date: string, time: string): RateSchedule {
  const day = new Date(`${date}T${time || "12:00"}`).getDay();
  if (day === 0 || day === 6) return "holiday";
  const hour = Number((time || "12:00").split(":")[0]);
  return hour < 7 || hour >= 19 ? "after_hours" : "weekday";
}
