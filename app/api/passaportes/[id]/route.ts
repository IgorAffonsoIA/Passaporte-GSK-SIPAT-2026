import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type LectureMode =
  | "online"
  | "presential"
  | null;

type CheckoutInput = {
  date?: unknown;
  lecture?: unknown;
  lectureMode?: unknown;
  activity?: unknown;
};

type UpdatePassportBody = {
  checkouts?: unknown;
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

/*
 * Gera números entre 1 e 999.
 *
 * No frontend eles podem ser exibidos como:
 *
 * 1   -> 001
 * 37  -> 037
 * 528 -> 528
 */
function generateRaffleNumber() {
  return Math.floor(Math.random() * 999) + 1;
}

/*
 * ============================================================
 * GET
 * ============================================================
 *
 * Recupera o passaporte pelo UUID.
 */
export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!isUuid(id)) {
      return NextResponse.json(
        {
          error: "Passaporte inválido.",
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
      .from("passaportes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
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

    return NextResponse.json({
      passport: data,
    });
  } catch (error) {
    console.error(
      "Erro ao carregar passaporte:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível carregar o passaporte agora.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * ============================================================
 * PUT
 * ============================================================
 *
 * Recebe o estado dos check-outs do frontend.
 *
 * Exemplo:
 *
 * {
 *   "checkouts": [
 *     {
 *       "date": "2026-10-19",
 *       "lecture": true,
 *       "lectureMode": "online",
 *       "activity": true
 *     }
 *   ]
 * }
 */
export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!isUuid(id)) {
      return NextResponse.json(
        {
          error: "Passaporte inválido.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      (await request.json()) as UpdatePassportBody;

    const checkouts =
      Array.isArray(body.checkouts)
        ? (body.checkouts as CheckoutInput[])
        : [];

    if (checkouts.length === 0) {
      return NextResponse.json(
        {
          error:
            "Nenhum check-out válido foi informado.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      createSupabaseAdminClient();

    /*
     * ========================================================
     * 1. BUSCA O PASSAPORTE ATUAL
     * ========================================================
     */

    const {
      data: currentPassport,
      error: currentPassportError,
    } = await supabase
      .from("passaportes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (currentPassportError) {
      throw currentPassportError;
    }

    if (!currentPassport) {
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

    /*
     * ========================================================
     * 2. PREPARA AS ALTERAÇÕES
     * ========================================================
     */

    const updates: Record<
      string,
      boolean | number | null
    > = {};

    for (const checkout of checkouts) {
      if (
        typeof checkout.date !==
        "string"
      ) {
        continue;
      }

      const columns =
        columnsByDate[
          checkout.date as keyof typeof columnsByDate
        ];

      if (!columns) {
        continue;
      }

      /*
       * ======================================================
       * PALESTRA
       * ======================================================
       */

      const lecture =
        checkout.lecture === true;

      const lectureMode: LectureMode =
        checkout.lectureMode ===
        "online"
          ? "online"
          : checkout.lectureMode ===
              "presential"
            ? "presential"
            : null;

      /*
       * Se ainda não participou da palestra:
       *
       * online = false
       * presencial = false
       */
      if (!lecture) {
        updates[columns.online] =
          false;

        updates[
          columns.presential
        ] = false;
      }

      /*
       * Se participou online:
       *
       * online = true
       * presencial = false
       */
      if (
        lecture &&
        lectureMode === "online"
      ) {
        updates[columns.online] =
          true;

        updates[
          columns.presential
        ] = false;
      }

      /*
       * Se participou presencialmente:
       *
       * online = false
       * presencial = true
       */
      if (
        lecture &&
        lectureMode ===
          "presential"
      ) {
        updates[columns.online] =
          false;

        updates[
          columns.presential
        ] = true;
      }

      /*
       * ======================================================
       * ATIVIDADE
       * ======================================================
       */

      updates[columns.activity] =
        checkout.activity === true;
    }

    if (
      Object.keys(updates).length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Nenhum check-out válido foi informado.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ========================================================
     * 3. SALVA OS CHECK-OUTS
     * ========================================================
     */

    const {
      data: updatedPassport,
      error: updateError,
    } = await supabase
      .from("passaportes")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    /*
     * ========================================================
     * 4. VERIFICA O SORTEIO DE CADA DIA
     * ========================================================
     *
     * Para participar:
     *
     * palestra online OU presencial
     *
     * +
     *
     * atividade
     *
     * Se cumprir isso e ainda não tiver número,
     * gera um número aleatório.
     */

    let finalPassport =
      updatedPassport;

    for (
      const columns of Object.values(
        columnsByDate,
      )
    ) {
      const lectureCompleted =
        finalPassport[
          columns.online
        ] === true ||
        finalPassport[
          columns.presential
        ] === true;

      const activityCompleted =
        finalPassport[
          columns.activity
        ] === true;

      const currentRaffleNumber =
        finalPassport[
          columns.raffle
        ];

      if (
        !lectureCompleted ||
        !activityCompleted ||
        currentRaffleNumber != null
      ) {
        continue;
      }

      /*
       * ======================================================
       * 5. GERA NÚMERO ALEATÓRIO ÚNICO
       * ======================================================
       *
       * O índice UNIQUE do banco é quem garante
       * que duas pessoas não tenham o mesmo
       * número no mesmo dia.
       */

      const MAX_ATTEMPTS = 50;

      let raffleCreated =
        false;

      for (
        let attempt = 0;
        attempt < MAX_ATTEMPTS;
        attempt++
      ) {
        const raffleNumber =
          generateRaffleNumber();

        const {
          data: passportWithRaffle,
          error: raffleError,
        } = await supabase
          .from("passaportes")
          .update({
            [columns.raffle]:
              raffleNumber,
          })
          .eq("id", id)
          .is(
            columns.raffle,
            null,
          )
          .select("*")
          .maybeSingle();

        /*
         * Número salvo com sucesso.
         */
        if (
          !raffleError &&
          passportWithRaffle
        ) {
          finalPassport =
            passportWithRaffle;

          raffleCreated = true;

          break;
        }

        /*
         * Código PostgreSQL 23505:
         *
         * violação de UNIQUE.
         *
         * Significa que esse número
         * já foi utilizado por outra
         * pessoa naquele dia.
         *
         * Então simplesmente tenta
         * outro número.
         */
        if (
          raffleError?.code ===
          "23505"
        ) {
          continue;
        }

        /*
         * Pode acontecer de outra
         * requisição ter criado o
         * número ao mesmo tempo.
         *
         * Nesse caso buscamos o
         * passaporte novamente.
         */
        if (
          !passportWithRaffle &&
          !raffleError
        ) {
          const {
            data:
              refreshedPassport,
            error:
              refreshError,
          } = await supabase
            .from("passaportes")
            .select("*")
            .eq("id", id)
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

    /*
     * ========================================================
     * 6. RETORNA O PASSAPORTE ATUALIZADO
     * ========================================================
     */

    return NextResponse.json({
      passport: finalPassport,
    });
  } catch (error) {
    console.error(
      "Erro ao salvar check-outs:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível salvar os check-outs agora.",
      },
      {
        status: 500,
      },
    );
  }
}