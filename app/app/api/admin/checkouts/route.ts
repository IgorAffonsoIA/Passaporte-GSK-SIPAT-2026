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

type CheckoutType =
  | "lecture-online"
  | "lecture-presential"
  | "activity";

type EventDate =
  | "2026-10-19"
  | "2026-10-20"
  | "2026-10-21"
  | "2026-10-22"
  | "2026-10-23";

type UpdateBody = {
  date?: unknown;
  type?: unknown;
  types?: unknown;
  active?: unknown;
};

const eventDates: EventDate[] = [
  "2026-10-19",
  "2026-10-20",
  "2026-10-21",
  "2026-10-22",
  "2026-10-23",
];

const checkoutTypes:
  CheckoutType[] = [
    "lecture-online",
    "lecture-presential",
    "activity",
  ];

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

/* =========================================================
   VALIDAÇÕES
========================================================= */

function isEventDate(
  value: string,
): value is EventDate {
  return eventDates.includes(
    value as EventDate,
  );
}

function isCheckoutType(
  value: string,
): value is CheckoutType {
  return checkoutTypes.includes(
    value as CheckoutType,
  );
}

/* =========================================================
   GET
   Lista os 15 controles
========================================================= */

export async function GET() {
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

    const supabase =
      createSupabaseAdminClient();

    const {
      data,
      error,
    } = await supabase
      .from(
        "controle_checkouts",
      )
      .select(
        "data_evento, tipo, ativo",
      )
      .order(
        "data_evento",
        {
          ascending: true,
        },
      )
      .order(
        "tipo",
        {
          ascending: true,
        },
      );

    if (error) {
      throw error;
    }

    return NextResponse.json({
      checkouts:
        data ?? [],
    });
  } catch (error) {
    console.error(
      "Erro ao listar controles:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível carregar os controles.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PATCH
   Ativa/desativa um ou vários checkouts
========================================================= */

export async function PATCH(
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

    const body =
      (await request.json()) as UpdateBody;

    const date =
      typeof body.date ===
      "string"
        ? body.date
        : "";

    if (
      !date ||
      !isEventDate(date)
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

    if (
      typeof body.active !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "O campo active deve ser true ou false.",
        },
        {
          status: 400,
        },
      );
    }

    let types:
      CheckoutType[] = [];

    /*
     * Um checkout.
     */
    if (
      typeof body.type ===
      "string"
    ) {
      if (
        !isCheckoutType(
          body.type,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Tipo de check-out inválido.",
          },
          {
            status: 400,
          },
        );
      }

      types = [
        body.type,
      ];
    }

    /*
     * Vários checkouts.
     */
    if (
      Array.isArray(
        body.types,
      )
    ) {
      const requestedTypes =
        body.types.filter(
          (
            value,
          ): value is string =>
            typeof value ===
            "string",
        );

      if (
        requestedTypes.some(
          (value) =>
            !isCheckoutType(
              value,
            ),
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Um dos tipos de check-out é inválido.",
          },
          {
            status: 400,
          },
        );
      }

      types =
        requestedTypes as CheckoutType[];
    }

    if (
      types.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Informe pelo menos um tipo de check-out.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      createSupabaseAdminClient();

    const {
      data,
      error,
    } = await supabase
      .from(
        "controle_checkouts",
      )
      .update({
        ativo:
          body.active,
      })
      .eq(
        "data_evento",
        date,
      )
      .in(
        "tipo",
        types,
      )
      .select(
        "data_evento, tipo, ativo",
      );

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      updated:
        data ?? [],
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar controles:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível atualizar os controles.",
      },
      {
        status: 500,
      },
    );
  }
}