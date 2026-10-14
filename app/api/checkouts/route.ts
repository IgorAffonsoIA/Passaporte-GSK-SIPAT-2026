import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type CheckoutType =
  | "lecture-online"
  | "lecture-presential"
  | "activity";

type CheckoutBody = {
  passportId?: unknown;
  checkout?: unknown;
};

const columnsByDate = {
  "2026-10-19": {
    online: "checkout_palestra_online_dia19",
    presential: "checkout_palestra_presencial_dia19",
    activity: "checkout_atividade_dia19",
    raffle: "numero_sorteio_dia19",
  },

  "2026-10-20": {
    online: "checkout_palestra_online_dia20",
    presential: "checkout_palestra_presencial_dia20",
    activity: "checkout_atividade_dia20",
    raffle: "numero_sorteio_dia20",
  },

  "2026-10-21": {
    online: "checkout_palestra_online_dia21",
    presential: "checkout_palestra_presencial_dia21",
    activity: "checkout_atividade_dia21",
    raffle: "numero_sorteio_dia21",
  },

  "2026-10-22": {
    online: "checkout_palestra_online_dia22",
    presential: "checkout_palestra_presencial_dia22",
    activity: "checkout_atividade_dia22",
    raffle: "numero_sorteio_dia22",
  },

  "2026-10-23": {
    online: "checkout_palestra_online_dia23",
    presential: "checkout_palestra_presencial_dia23",
    activity: "checkout_atividade_dia23",
    raffle: "numero_sorteio_dia23",
  },
} as const;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isCheckoutType(
  value: string,
): value is CheckoutType {
  return (
    value === "lecture-online" ||
    value === "lecture-presential" ||
    value === "activity"
  );
}

function generateRaffleNumber() {
  return Math.floor(Math.random() * 999) + 1;
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

    const checkout =
      typeof body.checkout ===
      "string"
        ? body.checkout.trim()
        : "";

    /* =======================================================
       1. VALIDA DADOS RECEBIDOS
    ======================================================= */

    if (
      !passportId ||
      !isUuid(passportId)
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

    if (
      !checkout ||
      !isCheckoutType(checkout)
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
       2. CONSULTA O CONTROLE DO QR
    ======================================================= */

    const {
      data: control,
      error: controlError,
    } = await supabase
      .from("controle_checkouts")
      .select(
        "tipo, ativo, data_evento",
      )
      .eq("tipo", checkout)
      .maybeSingle();

    if (controlError) {
      throw controlError;
    }

    if (!control) {
      return NextResponse.json(
        {
          error:
            "Este QR Code não está configurado.",
          code: "QR_NOT_CONFIGURED",
        },
        {
          status: 404,
        },
      );
    }

    /* =======================================================
       3. VERIFICA SE O QR ESTÁ ATIVO
    ======================================================= */

    if (control.ativo !== true) {
      return NextResponse.json(
        {
          error:
            "Este check-out não está disponível no momento.",
          code: "QR_DISABLED",
        },
        {
          status: 403,
        },
      );
    }

    /* =======================================================
       4. VERIFICA A DATA CONFIGURADA
    ======================================================= */

    if (!control.data_evento) {
      return NextResponse.json(
        {
          error:
            "Este check-out ainda não possui uma data configurada.",
          code: "DATE_NOT_CONFIGURED",
        },
        {
          status: 400,
        },
      );
    }

    const eventDate =
      String(
        control.data_evento,
      ) as keyof typeof columnsByDate;

    const columns =
      columnsByDate[eventDate];

    if (!columns) {
      return NextResponse.json(
        {
          error:
            "A data configurada não pertence à SIPAT 2026.",
          code: "INVALID_EVENT_DATE",
        },
        {
          status: 400,
        },
      );
    }

    /* =======================================================
       5. BUSCA O PARTICIPANTE
    ======================================================= */

    const {
      data: passport,
      error: passportError,
    } = await supabase
      .from("passaportes")
      .select("*")
      .eq("id", passportId)
      .maybeSingle();

    if (passportError) {
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

    /* =======================================================
       6. DESCOBRE QUAL COLUNA DEVE SER ALTERADA
    ======================================================= */

    let checkoutColumn: string;

    if (
      checkout ===
      "lecture-online"
    ) {
      /*
       * Se já participou presencialmente,
       * não deixamos trocar a modalidade.
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
       * Se já participou online,
       * não deixamos trocar a modalidade.
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
       7. REGISTRA O CHECK-OUT
    ======================================================= */

    let updatedPassport =
      passport;

    /*
     * Se já estava true, não precisamos
     * fazer update novamente.
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
        .from("passaportes")
        .update({
          [checkoutColumn]:
            true,
        })
        .eq("id", passportId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      updatedPassport = data;
    }

    /* =======================================================
       8. VERIFICA SE A PESSOA ESTÁ APTA AO SORTEIO
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
       9. GERA O NÚMERO DO SORTEIO
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
          .from("passaportes")
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
         * Salvou o número.
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
         * número já existe
         * naquele dia.
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
         * Pode acontecer de duas
         * requisições chegarem quase
         * juntas.
         *
         * Nesse caso verificamos
         * novamente o passaporte.
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
            .from("passaportes")
            .select("*")
            .eq(
              "id",
              passportId,
            )
            .single();

          if (refreshError) {
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

        if (raffleError) {
          throw raffleError;
        }
      }

      if (!raffleCreated) {
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
       10. RETORNA PARA O PAGE.TSX
    ======================================================= */

    return NextResponse.json({
      success: true,

      checkout: {
        date: eventDate,
        type: checkout,
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