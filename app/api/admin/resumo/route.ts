import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isAdminAuthenticated, parseEventDay } from "@/lib/admin-session";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const day = parseEventDay(new URL(request.url).searchParams.get("dia"));
  if (!day) return NextResponse.json({ error: "Dia inválido." }, { status: 400 });
  try {
    const supabase = createSupabaseAdminClient();
    const fields = [`checkout_palestra_online_dia${day}`, `checkout_palestra_presencial_dia${day}`, `checkout_atividade_dia${day}`] as const;
    const [total, online, presencial, atividade, sorteio] = await Promise.all([
      supabase.from("passaportes").select("id", { count: "exact", head: true }),
      ...fields.map(field => supabase.from("passaportes").select("id", { count: "exact", head: true }).eq(field, true)),
      supabase.from("passaportes").select("id", { count: "exact", head: true }).not(`numero_sorteio_dia${day}`, "is", null),
    ]);
    for (const response of [total, online, presencial, atividade, sorteio]) if (response.error) throw response.error;
    return NextResponse.json({
      total_passaportes_criados: total.count ?? 0,
      total_checkouts_online: online.count ?? 0,
      total_checkouts_presenciais: presencial.count ?? 0,
      total_checkouts_atividade: atividade.count ?? 0,
      total_aptos_sorteio: sorteio.count ?? 0,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro ao buscar resumo administrativo:", error);
    return NextResponse.json({ error: "Falha ao consultar os indicadores." }, { status: 500 });
  }
}
