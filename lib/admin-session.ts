import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export async function isAdminAuthenticated(): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const received = (await cookies()).get("sipat-admin-session")?.value;
  if (!received) return false;
  const expected = createHmac("sha256", password).update("sipat-2026-admin-session").digest("hex");
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseEventDay(value: string | null): string | null {
  return value && ["19", "20", "21", "22", "23"].includes(value) ? value : null;
}
