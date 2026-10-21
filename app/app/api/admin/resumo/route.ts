import {
  createHmac,
  timingSafeEqual,
} from "crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
} from "@/lib/supabase-admin";

const COOKIE_NAME =
  "sipat-admin-session";

const columnsByDate = {
  "2026-10-19": {
    online:
      "checkout_palestra_online_dia19",
    presential:
      "checkout_palestra_presencial_dia19",
    activity:
      "checkout_atividade_dia19",
    raffle:
      "numero_sorteio_dia19",
  },

  "2026-10-20": {
    online:
      "checkout_palestra_online_dia20",
    presential:
      "checkout_palestra_presencial_dia20",
    activity:
      "checkout_atividade_dia20",
    raffle:
      "numero_sorteio_dia20",
  },

  "2026-10-21": {
    online:
      "checkout_palestra_online_dia21",
    presential:
      "checkout_palestra_presencial_dia21",
    activity:
      "checkout_atividade_dia21",
    raffle:
      "numero_sorteio_dia21",
  },

  "2026-10-22": {
    online:
      "checkout_palestra_online_dia22",
    presential:
      "checkout_palestra_presencial_dia22",
    activity:
      "checkout_atividade_dia22",
    raffle:
      "numero_sorteio_dia22",
  },

  "2026-10-23": {
    online:
      "checkout_palestra_online_dia23",
    presential:
      "checkout_palestra_presencial_dia23",
    activity:
      "checkout_atividade_dia23",
    raffle:
      "numero_sorteio_dia23",
  },
} as const;

type EventDate =
  keyof typeof columnsByDate;

/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function getAdminPassword() {
  const password =
    process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD não está configurada.",
    );
  }

  return password;
}

function createSessionToken() {
  return createHmac(
    "sha256",
    getAdminPassword(),
  )
    .update(
      "sipat-2026-admin-session",
    )
    .digest("hex");
}

function safeCompare(
  first: string,
  second: string,
) {
  const firstBuffer =
    Buffer.from(first);

  const secondBuffer =
    Buffer.from(second);

  if (
    firstBuffer.length !==
    secondBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    firstBuffer,
    secondBuffer,
  );
}

async function isAuthenticated() {
  const cookieStore =
    await cookies();

  const session =
    cookieStore.get(
      COOKIE_NAME,
    )?.value;

  if (!session) {
    return false;
  }

  return safeCompare(
    session,
    createSessionToken(),
  );
}

function isEventDate(
  value: string,
): value is EventDate {
  return (
    value in
    columnsByDate
  );
}

/* =========================================================
   GET
   /api/admin/resumo?date=2026-10-20
========================================================= */

export async function GET(
  request: Request,
) {
  try {
    if (
      !(await isAuthenticated())
    ) {
      return NextResponse.json(
        {
          error:
            "Não autorizado.",
        },
        {
          status: 401,
        },
      );
    }

    const url =
      new URL(
        request.url,
      );

    const date =
      url.searchParams.get(
        "date",
      );

    if (
      !date ||
      !isEventDate(
        date,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Data inválida.",
        },
        {
          status: 400,
        },
      );
    }

    const columns =
      columnsByDate[
        date
      ];

    const supabase =
      createSupabaseAdminClient();

    /*
     * Faz as cinco contagens
     * em paralelo.
     */
    const [
      totalPassaportes,
      online,
      presencial,
      atividade,
      sorteio,
    ] =
      await Promise.all([
        supabase
          .from(
            "passaportes",
          )
          .select(
            "id",
            {
              count:
                "exact",
              head: true,
            },
          ),

        supabase
          .from(
            "passaportes",
          )
          .select(
            "id",
            {
              count:
                "exact",
              head: true,
            },
          )
          .eq(
            columns.online,
            true,
          ),

        supabase
          .from(
            "passaportes",
          )
          .select(
            "id",
            {
              count:
                "exact",
              head: true,
            },
          )
          .eq(
            columns.presential,
            true,
          ),

        supabase
          .from(
            "passaportes",
          )
          .select(
            "id",
            {
              count:
                "exact",
              head: true,
            },
          )
          .eq(
            columns.activity,
            true,
          ),

        supabase
          .from(
            "passaportes",
          )
          .select(
            "id",
            {
              count:
                "exact",
              head: true,
            },
          )
          .not(
            columns.raffle,
            "is",
            null,
          ),
      ]);

    const results = [
      totalPassaportes,
      online,
      presencial,
      atividade,
      sorteio,
    ];

    const queryError =
      results.find(
        (result) =>
          result.error,
      )?.error;

    if (queryError) {
      throw queryError;
    }

    return NextResponse.json({
      date,

      resumo: {
        totalPassaportes:
          totalPassaportes.count ??
          0,

        checkoutOnline:
          online.count ??
          0,

        checkoutPresencial:
          presencial.count ??
          0,

        checkoutAtividade:
          atividade.count ??
          0,

        participantesSorteio:
          sorteio.count ??
          0,
      },
    });
  } catch (error) {
    console.error(
      "Erro ao carregar resumo:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível carregar o resumo do dia.",
      },
      {
        status: 500,
      },
    );
  }
}