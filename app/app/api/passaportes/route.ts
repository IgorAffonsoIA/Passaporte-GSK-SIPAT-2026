import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type CreatePassportBody = {
  name?: unknown;
  email?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePassportBody;
    const nome = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!nome || !email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Informe um nome e um e-mail válidos." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data: existing, error: findError } = await supabase
      .from("passaportes")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existing) {
      return NextResponse.json({ passport: existing, existing: true });
    }

    const { data: created, error: insertError } = await supabase
      .from("passaportes")
      .insert({ nome, email })
      .select("*")
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json(
      { passport: created, existing: false },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar passaporte:", error);

    return NextResponse.json(
      { error: "Não foi possível criar o passaporte agora." },
      { status: 500 },
    );
  }
}
