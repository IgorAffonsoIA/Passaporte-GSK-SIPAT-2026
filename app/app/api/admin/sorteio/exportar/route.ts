import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "sipat-admin-session";
const raffleColumns = {
  "2026-10-19": "numero_sorteio_dia19",
  "2026-10-20": "numero_sorteio_dia20",
  "2026-10-21": "numero_sorteio_dia21",
  "2026-10-22": "numero_sorteio_dia22",
  "2026-10-23": "numero_sorteio_dia23",
} as const;

type EventDate = keyof typeof raffleColumns;

async function isAuthenticated() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD não configurada.");

  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!session) return false;

  const expected = createHmac("sha256", password)
    .update("sipat-2026-admin-session")
    .digest("hex");
  const received = Buffer.from(session);
  const correct = Buffer.from(expected);

  return received.length === correct.length && timingSafeEqual(received, correct);
}

function csvCell(value: string | number | null | undefined) {
  // Quote every field, escaping embedded quotes and neutralizing CSV formula injection.
  const raw = String(value ?? "");
  const safe = /^[\s\u0000-\u001f]*[=+@\-]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const date = new URL(request.url).searchParams.get("date");
    if (!date || !Object.prototype.hasOwnProperty.call(raffleColumns, date)) {
      return NextResponse.json({ error: "Data inválida." }, { status: 400 });
    }

    const column = raffleColumns[date as EventDate];
    const supabase = createSupabaseAdminClient();
    const rows: string[] = ['"Número do sorteio","Nome","E-mail"'];
    const PAGE_SIZE = 1000;
    let start = 0;

    // Supabase/PostgREST normally limits each response to 1000 rows.
    // Retrieve pages until no records remain, with deterministic ordering.
    while (true) {
      const { data, error } = await supabase
        .from("passaportes")
        .select(`id,nome,email,${column}`)
        .not(column, "is", null)
        .order(column, { ascending: true })
        .order("id", { ascending: true })
        .range(start, start + PAGE_SIZE - 1);

      if (error) throw error;
      const page = (data ?? []) as unknown as Array<Record<string, string | number | null>>;

      for (const person of page) {
        rows.push([
          csvCell(person[column]),
          csvCell(person.nome),
          csvCell(person.email),
        ].join(","));
      }

      if (page.length < PAGE_SIZE) break;
      start += PAGE_SIZE;
    }

    // UTF-8 BOM improves opening accented Portuguese text in Microsoft Excel.
    return new Response(`\uFEFF${rows.join("\r\n")}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sipat-sorteio-${date}.csv"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Erro ao exportar sorteio:", error);
    return NextResponse.json(
      { error: "Não foi possível exportar os participantes do sorteio." },
      { status: 500 },
    );
  }
}
