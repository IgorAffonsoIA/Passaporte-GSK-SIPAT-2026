import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type CheckoutType =
  | "lecture-online"
  | "lecture-presential"
  | "activity";

type CheckoutBody = {
  passportId?: unknown;
  date?: unknown;
  checkout?: unknown;
};

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

function isUuid(
  value: string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isCheckoutType(
  value: string,
): value is CheckoutType {
  return (
    value ===
      "lecture-online" ||
    value ===
      "lecture-presential" ||
    value ===
      "activity"
  );
}

function isEventDate(
  value: string,
): value is keyof typeof columnsByDate {
  return (
    value in
    columnsByDate
  );
}

function generateRaffleNumber() {
  return (
    Math.floor(
      Math.random() *
        999,
    ) + 1
  );
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as CheckoutBody;

    const passportId =
      typeof body.passportId ===
      "string"
        ? body.passportId.trim()
        : "";

    const date =
      typeof body.date ===
      "string"
        ? body.date.trim()
        : "";

    const checkout =
      typeof body.checkout ===
      "string"
        ? body.checkout.trim()
        : "";

    /* =======================================================
       1. VALIDA O PASSAPORTE
    ======================================================= */

    if (
      !passportId ||
      !isUuid(
        passportId,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Passaporte inválido.",
        },
        {
          status: 400,
        },
      );
    }

    /* =======================================================
       2. VALIDA DATA
    ======================================================= */

    if (
      !date ||
      !isEventDate(
        date,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Data do evento inválida.",
        },
        {
          status: 400,
        },
      );
    }

    /* =======================================================
       3. VALIDA CHECKOUT
    ======================================================= */

    if (
      !checkout ||
      !isCheckoutType(
        checkout,
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

    const supabase =
      createSupabaseAdminClient();

    /* =======================================================
       4. CONSULTA SE O QR ESTÁ ATIVO
    ======================================================= */

    const {
      data: control,
      error:
        controlError,
    } = await supabase
      .from(
        "controle_checkouts",
      )
      .select(
        "data_evento, tipo, ativo",
      )
      .eq(
        "data_evento",
        date,
      )
      .eq(
        "tipo",
        checkout,
      )
      .maybeSingle();

    if (
      controlError
    ) {
      throw controlError;
    }

    if (!control) {
      return NextResponse.json(
        {
          error:
            "Este QR Code não está configurado.",
          code:
            "QR_NOT_CONFIGURED",
        },
        {
          status: 404,
        },
      );
    }

    /* =======================================================
       5. BLOQUEIA QR DESATIVADO
    ======================================================= */

    if (
      control.ativo !==
      true
    ) {
      return NextResponse.json(
        {
          error:
            "Este check-out não está disponível no momento.",
          code:
            "QR_DISABLED",
        },
        {
          status: 403,
        },
      );
    }

    /* =======================================================
       6. BUSCA O PASSAPORTE
    ======================================================= */

    const {
      data: passport,
      error:
        passportError,
    } = await supabase
      .from(
        "passaportes",
      )
      .select("*")
      .eq(
        "id",
        passportId,
      )
      .maybeSingle();

    if (
      passportError
    ) {
      throw passportError;
    }

    if (!passport) {
      return NextResponse.json(
        {
          error:
            "Passaporte não encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    const columns =
      columnsByDate[
        date
      ];

    /* =======================================================
       7. DESCOBRE QUAL COLUNA ATUALIZAR
    ======================================================= */

    let checkoutColumn:
      string;

    if (
      checkout ===
      "lecture-online"
    ) {
      /*
       * Não permite registrar
       * online se já fez presencial.
       */
      if (
        passport[
          columns.presential
        ] === true
      ) {
        return NextResponse.json(
          {
            error:
              "Sua participação na palestra deste dia já foi registrada como presencial.",
            code:
              "LECTURE_ALREADY_REGISTERED",
          },
          {
            status: 409,
          },
        );
      }

      checkoutColumn =
        columns.online;
    } else if (
      checkout ===
      "lecture-presential"
    ) {
      /*
       * Não permite registrar
       * presencial se já fez online.
       */
      if (
        passport[
          columns.online
        ] === true
      ) {
        return NextResponse.json(
          {
            error:
              "Sua participação na palestra deste dia já foi registrada como online.",
            code:
              "LECTURE_ALREADY_REGISTERED",
          },
          {
            status: 409,
          },
        );
      }

      checkoutColumn =
        columns.presential;
    } else {
      checkoutColumn =
        columns.activity;
    }

    /* =======================================================
       8. REGISTRA O CHECKOUT
    ======================================================= */

    let updatedPassport =
      passport;

    /*
     * Se já estiver true,
     * considera o checkout
     * como já realizado.
     */
    if (
      passport[
        checkoutColumn
      ] !== true
    ) {
      const {
        data,
        error,
      } = await supabase
        .from(
          "passaportes",
        )
        .update({
          [checkoutColumn]:
            true,
        })
        .eq(
          "id",
          passportId,
        )
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      updatedPassport =
        data;
    }

    /* =======================================================
       9. VERIFICA ELEGIBILIDADE
    ======================================================= */

    const lectureCompleted =
      updatedPassport[
        columns.online
      ] === true ||
      updatedPassport[
        columns.presential
      ] === true;

    const activityCompleted =
      updatedPassport[
        columns.activity
      ] === true;

    const eligible =
      lectureCompleted &&
      activityCompleted;

    const alreadyHasRaffle =
      updatedPassport[
        columns.raffle
      ] != null;

    let finalPassport =
      updatedPassport;

    /* =======================================================
       10. GERA O NÚMERO DO SORTEIO
    ======================================================= */

    if (
      eligible &&
      !alreadyHasRaffle
    ) {
      const MAX_ATTEMPTS =
        50;

      let raffleCreated =
        false;

      for (
        let attempt = 0;
        attempt <
        MAX_ATTEMPTS;
        attempt++
      ) {
        const raffleNumber =
          generateRaffleNumber();

        const {
          data:
            passportWithRaffle,

          error:
            raffleError,
        } = await supabase
          .from(
            "passaportes",
          )
          .update({
            [columns.raffle]:
              raffleNumber,
          })
          .eq(
            "id",
            passportId,
          )
          .is(
            columns.raffle,
            null,
          )
          .select("*")
          .maybeSingle();

        /*
         * Sucesso.
         */
        if (
          !raffleError &&
          passportWithRaffle
        ) {
          finalPassport =
            passportWithRaffle;

          raffleCreated =
            true;

          break;
        }

        /*
         * 23505 =
         * número duplicado.
         *
         * Gera outro.
         */
        if (
          raffleError?.code ===
          "23505"
        ) {
          continue;
        }

        /*
         * Outra requisição
         * pode ter gerado
         * o número ao mesmo
         * tempo.
         */
        if (
          !raffleError &&
          !passportWithRaffle
        ) {
          const {
            data:
              refreshedPassport,

            error:
              refreshError,
          } = await supabase
            .from(
              "passaportes",
            )
            .select("*")
            .eq(
              "id",
              passportId,
            )
            .single();

          if (
            refreshError
          ) {
            throw refreshError;
          }

          if (
            refreshedPassport[
              columns.raffle
            ] != null
          ) {
            finalPassport =
              refreshedPassport;

            raffleCreated =
              true;

            break;
          }
        }

        if (
          raffleError
        ) {
          throw raffleError;
        }
      }

      if (
        !raffleCreated
      ) {
        return NextResponse.json(
          {
            error:
              "Não foi possível gerar o número do sorteio.",
          },
          {
            status: 500,
          },
        );
      }
    }

    /* =======================================================
       11. RESPOSTA
    ======================================================= */

    return NextResponse.json({
      success: true,

      checkout: {
        date,
        type:
          checkout,
      },

      eligible,

      raffleNumber:
        finalPassport[
          columns.raffle
        ] ?? null,

      passport:
        finalPassport,
    });
  } catch (error) {
    console.error(
      "Erro ao registrar check-out:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível registrar o check-out agora.",
      },
      {
        status: 500,
      },
    );
  }
}