import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CheckoutInput = {
  date?: unknown;
  lecture?: unknown;
  activity?: unknown;
};

type UpdatePassportBody = {
  checkouts?: unknown;
};

const columnsByDate = {
  "2026-10-19": {
    lecture: "checkout_palestra_dia19",
    activity: "checkout_atividade_dia19",
  },
  "2026-10-20": {
    lecture: "checkout_palestra_dia20",
    activity: "checkout_atividade_dia20",
  },
  "2026-10-21": {
    lecture: "checkout_palestra_dia21",
    activity: "checkout_atividade_dia21",
  },
  "2026-10-22": {
    lecture: "checkout_palestra_dia22",
    activity: "checkout_atividade_dia22",
  },
  "2026-10-23": {
    lecture: "checkout_palestra_dia23",
    activity: "checkout_atividade_dia23",
  },
} as const;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Passaporte inválido." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("passaportes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json({ error: "Passaporte não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ passport: data });
  } catch (error) {
    console.error("Erro ao carregar passaporte:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar o passaporte agora." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Passaporte inválido." }, { status: 400 });
    }

    const body = (await request.json()) as UpdatePassportBody;
    const checkouts = Array.isArray(body.checkouts)
      ? (body.checkouts as CheckoutInput[])
      : [];
    const updates: Record<string, boolean> = {};

    for (const checkout of checkouts) {
      if (typeof checkout.date !== "string") {
        continue;
      }

      const columns = columnsByDate[
        checkout.date as keyof typeof columnsByDate
      ];

      if (!columns) {
        continue;
      }

      updates[columns.lecture] = checkout.lecture === true;
      updates[columns.activity] = checkout.activity === true;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum visto válido foi informado." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("passaportes")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ passport: data });
  } catch (error) {
    console.error("Erro ao salvar vistos:", error);

    return NextResponse.json(
      { error: "Não foi possível salvar os vistos agora." },
      { status: 500 },
    );
  }
}
