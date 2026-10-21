import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isAdminAuthenticated, parseEventDay } from "@/lib/admin-session";
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const day = parseEventDay(new URL(request.url).searchParams.get("dia"));
  if (!day) return NextResponse.json({ error: "Dia inválido." }, { status: 400 });
  try {
    const supabase = createSupabaseAdminClient();
    const field = `numero_sorteio_dia${day}`;
    const rows: string[] = ["Número do sorteio;Nome;E-mail"];
    const size = 1000;
    for (let offset = 0; ; offset += size) {
      const { data, error } = await supabase.from("passaportes")
        .select(`id,nome,email,${field}`)
        .not(field, "is", null)
        .order(field, { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + size - 1);
      if (error) throw error;
      for (const item of data ?? []) {
        const record = item as unknown as Record<string, unknown>;
        rows.push([record[field], record.nome, record.email].map(csvCell).join(";"));
      }
      if (!data || data.length < size) break;
    }
    return new Response("\uFEFF" + rows.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sorteio_sipat_dia${day}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao exportar sorteio:", error);
    return NextResponse.json({ error: "Falha ao exportar participantes." }, { status: 500 });
  }
}
