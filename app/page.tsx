"use client";

import type React from "react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BadgeCheck,
  Check,
  CircleUserRound,
  LoaderCircle,
  Stamp,
} from "lucide-react";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* =========================================================
   TIPOS
========================================================= */

type Profile = {
  name: string;
  email: string;
};

type LectureMode =
  | "online"
  | "presential"
  | null;

type CheckoutType =
  | "lecture-online"
  | "lecture-presential"
  | "activity";

type DayCheckout = {
  date: string;
  label: string;

  lectureName: string;
  activityName: string;

  lecture: boolean;
  lectureMode: LectureMode;

  activity: boolean;

  raffleNumber: string | null;
};

type SavedPassport = {
  profile: Profile;
  checkouts: DayCheckout[];
};

type PassportRow = {
  id: string;
  nome: string;
  email: string;

  [column: string]: unknown;
};

type CheckoutResponse = {
  success?: boolean;

  checkout?: {
    date: string;
    type: CheckoutType;
  };

  passport?: PassportRow;

  eligible?: boolean;

  raffleNumber?: number | null;

  error?: string;

  code?: string;
};

type CheckoutStatus =
  | "idle"
  | "registering"
  | "success"
  | "error";

/* =========================================================
   PERFIL INICIAL
========================================================= */

const emptyProfile: Profile = {
  name: "",
  email: "",
};

/* =========================================================
   DIAS DO EVENTO
========================================================= */

const initialCheckouts: DayCheckout[] = [
  {
    date: "2026-10-19",
    label: "19/10",

    lectureName:
      "Cultura de segurança: aprendendo com nossos incidentes",

    activityName:
      "Quiz SIPAT",

    lecture: false,
    lectureMode: null,

    activity: false,

    raffleNumber: null,
  },

  {
    date: "2026-10-20",
    label: "20/10",

    lectureName:
      "Ver antes que acontece: percepção de risco no site e no trabalho remoto",

    activityName:
      "Escape SIPAT",

    lecture: false,
    lectureMode: null,

    activity: false,

    raffleNumber: null,
  },

  {
    date: "2026-10-21",
    label: "21/10",

    lectureName:
      "Segurança no trânsito: prevenindo acidentes no trajeto",

    activityName:
      "Desafio das cores",

    lecture: false,
    lectureMode: null,

    activity: false,

    raffleNumber: null,
  },

  {
    date: "2026-10-22",
    label: "22/10",

    lectureName:
      "HIV hoje: prevenção, tratamento e combate ao estigma",

    activityName:
      "Desafio da Percepção",

    lecture: false,
    lectureMode: null,

    activity: false,

    raffleNumber: null,
  },

  {
    date: "2026-10-23",
    label: "23/10",

    lectureName:
      "O Ciclo Invível: Do Vazio aos Excessos",

    activityName:
      "Quiz SIPAT",

    lecture: false,
    lectureMode: null,

    activity: false,

    raffleNumber: null,
  },
];

/* =========================================================
   COLUNAS DO SUPABASE
========================================================= */

const databaseColumnsByDate = {
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

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

function isCheckoutType(
  value: string | null,
): value is CheckoutType {
  return (
    value === "lecture-online" ||
    value ===
      "lecture-presential" ||
    value === "activity"
  );
}

function isEventDate(
  value: string | null,
): value is keyof typeof databaseColumnsByDate {
  if (!value) {
    return false;
  }

  return (
    value in databaseColumnsByDate
  );
}

function formatRaffleNumber(
  value: unknown,
) {
  if (
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    return null;
  }

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return String(
    number,
  ).padStart(3, "0");
}

/* =========================================================
   CONVERTE O BANCO PARA A TELA
========================================================= */

function checkoutsFromDatabase(
  row: PassportRow,
) {
  return initialCheckouts.map(
    (day) => {
      const columns =
        databaseColumnsByDate[
          day.date as keyof typeof databaseColumnsByDate
        ];

      const online =
        row[
          columns.online
        ] === true;

      const presential =
        row[
          columns.presential
        ] === true;

      let lectureMode:
        LectureMode = null;

      if (online) {
        lectureMode =
          "online";
      } else if (
        presential
      ) {
        lectureMode =
          "presential";
      }

      return {
        ...day,

        lecture:
          online ||
          presential,

        lectureMode,

        activity:
          row[
            columns.activity
          ] === true,

        raffleNumber:
          formatRaffleNumber(
            row[
              columns.raffle
            ],
          ),
      };
    },
  );
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function Home() {
  const [
    profile,
    setProfile,
  ] =
    useState<Profile>(
      emptyProfile,
    );

  const [
    passportCreated,
    setPassportCreated,
  ] =
    useState(false);

  const [
    checkouts,
    setCheckouts,
  ] =
    useState<
      DayCheckout[]
    >(
      initialCheckouts,
    );

  const [
    checkoutType,
    setCheckoutType,
  ] =
    useState<
      CheckoutType | null
    >(null);

  const [
    checkoutDate,
    setCheckoutDate,
  ] =
    useState<
      string | null
    >(null);

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      initialCheckouts[0]
        .date,
    );

  const [
    ready,
    setReady,
  ] =
    useState(false);

  const [
    passportId,
    setPassportId,
  ] =
    useState<
      string | null
    >(null);

  const [
    savingPassport,
    setSavingPassport,
  ] =
    useState(false);

  const [
    formError,
    setFormError,
  ] =
    useState<
      string | null
    >(null);

  const [
    checkoutStatus,
    setCheckoutStatus,
  ] =
    useState<CheckoutStatus>(
      "idle",
    );

  const [
    checkoutMessage,
    setCheckoutMessage,
  ] =
    useState<
      string | null
    >(null);

  /*
   * Evita duplicação de
   * requisição durante renders.
   */
  const checkoutAttemptRef =
    useRef<
      string | null
    >(null);

  /* =========================================================
     1. LÊ O QR CODE
  =========================================================

     Exemplos:

     /?date=2026-10-19&checkout=lecture-online

     /?date=2026-10-19&checkout=lecture-presential

     /?date=2026-10-19&checkout=activity
  ========================================================= */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const checkout =
      params.get(
        "checkout",
      );

    const date =
      params.get(
        "date",
      );

    if (
      isCheckoutType(
        checkout,
      )
    ) {
      setCheckoutType(
        checkout,
      );
    }

    if (
      isEventDate(
        date,
      )
    ) {
      setCheckoutDate(
        date,
      );

      setSelectedDate(
        date,
      );
    }
  }, []);

  /* =========================================================
     2. RECUPERA O PASSAPORTE
  ========================================================= */

  useEffect(() => {
    let cancelled =
      false;

    async function restorePassport() {
      const storedId =
        window.localStorage.getItem(
          "passaporte-gsk-sipat-id",
        );

      /*
       * Sem UUID salvo:
       * mostra o cadastro.
       */
      if (!storedId) {
        if (!cancelled) {
          setReady(
            true,
          );
        }

        return;
      }

      try {
        const response =
          await fetch(
            `/api/passaportes/${storedId}`,
            {
              cache:
                "no-store",
            },
          );

        /*
         * O usuário foi apagado
         * do Supabase.
         */
        if (
          response.status ===
          404
        ) {
          window.localStorage.removeItem(
            "passaporte-gsk-sipat-id",
          );

          window.localStorage.removeItem(
            "passaporte-gsk-sipat-2026",
          );

          if (
            !cancelled
          ) {
            setPassportId(
              null,
            );

            setProfile(
              emptyProfile,
            );

            setCheckouts(
              initialCheckouts,
            );

            setPassportCreated(
              false,
            );

            setCheckoutStatus(
              "idle",
            );

            setCheckoutMessage(
              null,
            );
          }

          return;
        }

        if (
          !response.ok
        ) {
          const result =
            (await response.json()) as {
              error?: string;
            };

          throw new Error(
            result.error ??
              "Não foi possível recuperar o passaporte.",
          );
        }

        const result =
          (await response.json()) as {
            passport:
              PassportRow;
          };

        const row =
          result.passport;

        if (cancelled) {
          return;
        }

        setPassportId(
          row.id,
        );

        setProfile({
          name:
            row.nome,
          email:
            row.email,
        });

        setCheckouts(
          checkoutsFromDatabase(
            row,
          ),
        );

        setPassportCreated(
          true,
        );
      } catch (error) {
        console.error(
          "Erro ao recuperar passaporte:",
          error,
        );

        /*
         * Não confia no localStorage
         * como fonte oficial.
         */
        if (
          !cancelled
        ) {
          setPassportCreated(
            false,
          );

          setPassportId(
            null,
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setReady(
            true,
          );
        }
      }
    }

    void restorePassport();

    return () => {
      cancelled =
        true;
    };
  }, []);

  /* =========================================================
     3. REGISTRA O QR CODE
  ========================================================= */

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (
      !passportCreated
    ) {
      return;
    }

    if (!passportId) {
      return;
    }

    if (
      !checkoutType ||
      !checkoutDate
    ) {
      return;
    }

    const attemptKey =
      `${passportId}:${checkoutDate}:${checkoutType}`;

    /*
     * Evita request duplicado.
     */
    if (
      checkoutAttemptRef
        .current ===
      attemptKey
    ) {
      return;
    }

    checkoutAttemptRef.current =
      attemptKey;

    async function registerCheckout() {
      setCheckoutStatus(
        "registering",
      );

      setCheckoutMessage(
        "Registrando seu check-out...",
      );

      try {
        const response =
          await fetch(
            "/api/checkouts",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  passportId,
                  date:
                    checkoutDate,
                  checkout:
                    checkoutType,
                }),
            },
          );

        const result =
          (await response.json()) as CheckoutResponse;

        if (
          !response.ok ||
          !result.passport
        ) {
          setCheckoutStatus(
            "error",
          );

          setCheckoutMessage(
            result.error ??
              "Não foi possível registrar este check-out.",
          );

          return;
        }

        /*
         * Atualiza a tela
         * usando os dados oficiais.
         */
        setCheckouts(
          checkoutsFromDatabase(
            result.passport,
          ),
        );

        if (
          result.checkout
            ?.date
        ) {
          setSelectedDate(
            result.checkout
              .date,
          );
        }

        setCheckoutStatus(
          "success",
        );

        if (
          result.eligible &&
          result.raffleNumber !=
            null
        ) {
          setCheckoutMessage(
            `Check-out registrado! Seu número para o sorteio é ${String(
              result.raffleNumber,
            ).padStart(
              3,
              "0",
            )}.`,
          );
        } else {
          setCheckoutMessage(
            "Check-out registrado com sucesso!",
          );
        }

        /*
         * Remove date e checkout
         * após sucesso.
         *
         * Evita registrar novamente
         * ao atualizar a página.
         */
        window.history.replaceState(
          {},
          "",
          window.location
            .pathname,
        );

        setCheckoutType(
          null,
        );

        setCheckoutDate(
          null,
        );
      } catch (error) {
        console.error(
          "Erro ao registrar check-out:",
          error,
        );

        setCheckoutStatus(
          "error",
        );

        setCheckoutMessage(
          "Não foi possível registrar o check-out agora.",
        );
      }
    }

    void registerCheckout();
  }, [
    ready,
    passportCreated,
    passportId,
    checkoutType,
    checkoutDate,
  ]);

  /* =========================================================
     4. SALVA CÓPIA LOCAL
  ========================================================= */

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (
      !passportCreated
    ) {
      return;
    }

    const data:
      SavedPassport = {
      profile,
      checkouts,
    };

    window.localStorage.setItem(
      "passaporte-gsk-sipat-2026",
      JSON.stringify(
        data,
      ),
    );
  }, [
    ready,
    passportCreated,
    profile,
    checkouts,
  ]);

  /* =========================================================
     5. CRIA OU RECUPERA CADASTRO
  ========================================================= */

  async function createPassport(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSavingPassport(
      true,
    );

    setFormError(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/passaportes",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                profile,
              ),
          },
        );

      const result =
        (await response.json()) as {
          passport?:
            PassportRow;
          error?: string;
        };

      if (
        !response.ok ||
        !result.passport
      ) {
        throw new Error(
          result.error ??
            "Não foi possível criar o passaporte.",
        );
      }

      const row =
        result.passport;

      window.localStorage.setItem(
        "passaporte-gsk-sipat-id",
        row.id,
      );

      setPassportId(
        row.id,
      );

      setProfile({
        name:
          row.nome,

        email:
          row.email,
      });

      setCheckouts(
        checkoutsFromDatabase(
          row,
        ),
      );

      setPassportCreated(
        true,
      );
    } catch (error) {
      setFormError(
        error instanceof
          Error
          ? error.message
          : "Não foi possível criar o passaporte.",
      );
    } finally {
      setSavingPassport(
        false,
      );
    }
  }

  /* =========================================================
     CARREGAMENTO
  ========================================================= */

  if (!ready) {
    return null;
  }

  const selectedDay =
    checkouts.find(
      (day) =>
        day.date ===
        selectedDate,
    ) ??
    checkouts[0];

  /* =========================================================
     INTERFACE
  ========================================================= */

  return (
    <main className="min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="passport-grid fixed inset-0 -z-10 opacity-60" />

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <header className="mx-auto flex w-full max-w-6xl items-center px-4 py-5 sm:px-8 lg:px-10">
        <div
          className="flex min-w-0 items-center"
          aria-label="Passaporte SIPAT 2026"
        >
          {/* LOGO SIPAT */}
          <div className="flex w-16 shrink-0 justify-center sm:w-24">
            <div className="relative size-12 sm:size-16">
              <Image
                src="/SIPAT logo.png"
                alt="Logo SIPAT"
                fill
                priority
                sizes="(max-width: 640px) 48px, 64px"
                className="object-contain"
              />
            </div>
          </div>

          {/* LINHA PRETA */}
          <div className="mx-2 h-10 w-px shrink-0 bg-black sm:mx-4 sm:h-12" />

          {/* LOGO GSK */}
          <div className="flex w-20 shrink-0 justify-center sm:w-28">
            <div className="relative h-14 w-20 sm:h-20 sm:w-28">
              <Image
                src="/GSK logo.png"
                alt="Logo GSK"
                fill
                priority
                sizes="(max-width: 640px) 80px, 112px"
                className="object-contain"
              />
            </div>
          </div>

          {/* TÍTULO */}
          <div className="ml-3 min-w-0 sm:ml-5">
            <p className="font-display text-[0.8rem] font-extrabold leading-tight tracking-[-.02em] sm:text-[1.05rem]">
              PASSAPORTE
              <br className="sm:hidden" />
              <span className="sm:ml-1"> SIPAT 2026</span>
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================
          CADASTRO
      ====================================================== */}

      {!passportCreated ? (
        <section className="mx-auto flex min-h-[calc(100dvh-96px)] w-full max-w-6xl items-center justify-center px-5 pb-16 pt-4 sm:px-8 md:py-10 lg:px-10">
          <div className="relative w-full max-w-xl">
            <div className="absolute -inset-8 -z-10 rounded-[48px] bg-[radial-gradient(circle_at_center,rgba(0,153,153,.18),transparent_66%)] blur-xl" />

            <form
              onSubmit={
                createPassport
              }
              className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(42,31,54,.12)] backdrop-blur-xl sm:p-8"
            >
              <div className="mb-7 flex items-center justify-between gap-4">
                <h1 className="font-display text-3xl font-extrabold tracking-[-.04em]">
                  Cadastro
                </h1>

                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                  <CircleUserRound className="size-6" />
                </div>
              </div>

              {/* AVISO DE QR */}

              {checkoutType &&
                checkoutDate && (
                  <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <p className="font-bold text-primary">
                      Check-out identificado
                    </p>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Faça seu cadastro para registrar este check-out. Após o cadastro, ele será registrado automaticamente.
                    </p>
                  </div>
                )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome completo
                  </Label>

                  <Input
                    id="name"
                    required
                    autoComplete="name"
                    placeholder="Digite seu nome completo"
                    value={
                      profile.name
                    }
                    onChange={(
                      event,
                    ) =>
                      setProfile(
                        {
                          ...profile,

                          name:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    className="h-12 rounded-xl bg-white px-4"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    E-mail corporativo ou pessoal
                  </Label>

                  <Input
                    id="email"
                    required
                    type="email"
                    autoComplete="email"
                    placeholder="nome@email.com"
                    value={
                      profile.email
                    }
                    onChange={(
                      event,
                    ) =>
                      setProfile(
                        {
                          ...profile,

                          email:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    className="h-12 rounded-xl bg-white px-4"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  savingPassport
                }
                size="lg"
                className="mt-7 h-13 w-full rounded-xl bg-primary text-base font-bold shadow-[0_10px_25px_rgba(236,73,36,.22)] hover:bg-primary/90"
              >
                {savingPassport
                  ? "Criando passaporte..."
                  : "Criar meu passaporte"}
              </Button>

              {formError && (
                <p className="mt-3 text-center text-sm font-medium text-red-600">
                  {formError}
                </p>
              )}
            </form>
          </div>
        </section>
      ) : (
        /* =====================================================
            PASSAPORTE
        ====================================================== */

        <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-4 sm:px-8 lg:px-10 lg:pt-8">
          {/* PARTICIPANTE */}

          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[.2em] text-primary">
                Meu passaporte
              </p>

              <h1 className="font-display mt-2 text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">
                Olá,{" "}
                {
                  profile.name.split(
                    " ",
                  )[0]
                }
                !
              </h1>

              <p className="mt-2 text-muted-foreground">
                Acompanhe seus check-outs durante os 5 dias do evento.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border bg-white/75 px-4 py-3 shadow-sm">
              <div className="grid size-10 place-items-center rounded-full bg-secondary font-extrabold text-white">
                {profile.name
                  .slice(0, 1)
                  .toUpperCase()}
              </div>

              <div>
                <p className="text-sm font-bold">
                  {profile.name}
                </p>

                <p className="text-xs text-muted-foreground">
                  {profile.email}
                </p>
              </div>
            </div>
          </div>

          {/* STATUS QR */}

          {checkoutStatus ===
            "registering" && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <LoaderCircle className="size-5 animate-spin text-primary" />

              <p className="font-semibold">
                {checkoutMessage}
              </p>
            </div>
          )}

          {checkoutStatus ===
            "success" && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-secondary/25 bg-secondary/10 p-4">
              <BadgeCheck className="mt-0.5 size-5 shrink-0 text-secondary" />

              <div>
                <p className="font-bold">
                  Check-out realizado
                </p>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {checkoutMessage}
                </p>
              </div>
            </div>
          )}

          {checkoutStatus ===
            "error" && (
            <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <p className="font-bold text-amber-950">
                Check-out não realizado
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-900">
                {checkoutMessage}
              </p>
            </div>
          )}

          {/* DIAS */}

          <div className="mb-6 overflow-x-auto">
            <div className="flex min-w-max gap-3">
              {checkouts.map(
                (day) => {
                  const selected =
                    day.date ===
                    selectedDate;

                  const completed =
                    day.lecture &&
                    day.activity;

                  return (
                    <button
                      key={
                        day.date
                      }
                      type="button"
                      onClick={() =>
                        setSelectedDate(
                          day.date,
                        )
                      }
                      className={`min-w-24 rounded-2xl border px-4 py-3 text-center transition ${
                        selected
                          ? "border-primary bg-primary text-white shadow-md"
                          : "border-border bg-white"
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-[.12em]">
                        Dia
                      </p>

                      <p className="mt-1 text-lg font-extrabold">
                        {day.label}
                      </p>

                      {completed && (
                        <p
                          className={`mt-1 text-xs font-semibold ${
                            selected
                              ? "text-white/80"
                              : "text-secondary"
                          }`}
                        >
                          Completo
                        </p>
                      )}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* DIA */}

          <div className="mb-6">
            <p className="text-sm font-extrabold uppercase tracking-[.2em] text-primary">
              Check-outs do dia
            </p>

            <h2 className="font-display mt-1 text-3xl font-extrabold">
              {selectedDay.label}
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* PALESTRA */}

            <div className="rounded-[30px] border border-border bg-white p-6 shadow-[0_20px_60px_rgba(42,31,54,.10)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.2em] text-primary">
                    Check-out
                  </p>

                  <h3 className="font-display mt-2 text-2xl font-extrabold">
                    Palestra
                  </h3>

                  <p className="mt-2 max-w-md text-lg font-bold leading-6 text-foreground">
                    {
                      selectedDay.lectureName
                    }
                  </p>
                </div>

                <div
                  className={`grid size-12 shrink-0 place-items-center rounded-full ${
                    selectedDay.lecture
                      ? "bg-secondary text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {selectedDay.lecture ? (
                    <Check className="size-6" />
                  ) : (
                    <Stamp className="size-6" />
                  )}
                </div>
              </div>

              {!selectedDay.lecture ? (
                <div className="rounded-2xl border border-border bg-muted/40 p-5">
                  <p className="font-bold">
                    Check-out ainda não realizado
                  </p>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Escaneie o QR Code da palestra para registrar sua participação.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-secondary/25 bg-secondary/10 p-5">
                  <div className="flex gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-white">
                      <BadgeCheck className="size-5" />
                    </div>

                    <div>
                      <p className="font-bold">
                        Participação registrada!
                      </p>

                      {selectedDay.lectureMode && (
                        <p className="mt-2 text-xs font-extrabold uppercase tracking-[.15em] text-primary">
                          {selectedDay.lectureMode ===
                          "online"
                            ? "Modalidade online"
                            : "Modalidade presencial"}
                        </p>
                      )}

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {selectedDay.lectureMode ===
                        "online" ? (
                          <>
                            Obrigado por participar{" "}
                            <span className="font-semibold">
                              online
                            </span>{" "}
                            da palestra{" "}
                            <span className="font-semibold">
                              {
                                selectedDay.lectureName
                              }
                            </span>
                            .
                          </>
                        ) : (
                          <>
                            Obrigado por participar{" "}
                            <span className="font-semibold">
                              presencialmente
                            </span>{" "}
                            da palestra{" "}
                            <span className="font-semibold">
                              {
                                selectedDay.lectureName
                              }
                            </span>
                            .
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ATIVIDADE */}

            <div className="rounded-[30px] border border-border bg-white p-6 shadow-[0_20px_60px_rgba(42,31,54,.10)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.2em] text-primary">
                    Check-out
                  </p>

                  <h3 className="font-display mt-2 text-2xl font-extrabold">
                    Atividade
                  </h3>

                  <p className="mt-2 max-w-md text-lg font-bold leading-6 text-foreground">
                    {
                      selectedDay.activityName
                    }
                  </p>
                </div>

                <div
                  className={`grid size-12 shrink-0 place-items-center rounded-full ${
                    selectedDay.activity
                      ? "bg-secondary text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {selectedDay.activity ? (
                    <Check className="size-6" />
                  ) : (
                    <Stamp className="size-6" />
                  )}
                </div>
              </div>

              {!selectedDay.activity ? (
                <div className="rounded-2xl border border-border bg-muted/40 p-5">
                  <p className="font-bold">
                    Check-out ainda não realizado
                  </p>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Escaneie o QR Code ao final da atividade para registrar seu check-out.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-secondary/25 bg-secondary/10 p-5">
                    <div className="flex gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-white">
                        <BadgeCheck className="size-5" />
                      </div>

                      <div>
                        <p className="font-bold">
                          Parabéns!
                        </p>

                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Você ganhou um brinde. Favor retirar em frente ao elevador.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SORTEIO */}

                  {selectedDay.raffleNumber ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
                      <p className="text-sm font-semibold text-muted-foreground">
                        Você completou os dois check-outs deste dia.
                      </p>

                      <p className="mt-3 text-sm font-bold">
                        Seu número para o sorteio é:
                      </p>

                      <p className="font-display mt-2 text-5xl font-black text-primary">
                        {
                          selectedDay.raffleNumber
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
                      <p className="font-bold text-amber-950">
                        Número de sorteio não liberado
                      </p>

                      <p className="mt-2 text-sm leading-6 text-amber-900">
                        {selectedDay.lecture
                          ? "O número do sorteio ainda não foi liberado."
                          : "Você não realizou o check-out da palestra deste dia. Por isso, ainda não foi liberado um número para o sorteio."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}