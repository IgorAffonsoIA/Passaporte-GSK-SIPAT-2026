"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Check,
  CircleUserRound,
  RotateCcw,
  Stamp,
} from "lucide-react";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  numero_sorteio: number | null;
  [column: string]: unknown;
};

const emptyProfile: Profile = {
  name: "",
  email: "",
};

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
      "Escape SIPAT",

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
      "Jogo da Memória",

    lecture: false,
    lectureMode: null,

    activity: false,

    raffleNumber: null,
  },
];

function formatRaffleNumber(
  number: number | null | undefined
) {
  if (number == null) {
    return null;
  }

  return String(number).padStart(3, "0");
}

const databaseColumnsByDate = {
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

function checkoutsFromDatabase(
  row: PassportRow,
  base: DayCheckout[] = initialCheckouts,
) {
  const raffleNumber =
    formatRaffleNumber(
      row.numero_sorteio
    );

  return base.map((day) => {
    const columns =
      databaseColumnsByDate[
        day.date as keyof typeof databaseColumnsByDate
      ];

    if (!columns) {
      return day;
    }

    const lecture =
      row[columns.lecture] === true;

    const activity =
      row[columns.activity] === true;

    return {
      ...day,

      lecture,
      activity,

      raffleNumber:
        lecture && activity
          ? raffleNumber
          : null,
    };
  });
}

export default function Home() {
  const [profile, setProfile] =
    useState<Profile>(emptyProfile);

  const [passportCreated, setPassportCreated] =
    useState(false);

  const [checkouts, setCheckouts] =
    useState<DayCheckout[]>(initialCheckouts);

  const [checkoutType, setCheckoutType] =
    useState<CheckoutType | null>(null);

  const [checkoutDate, setCheckoutDate] =
    useState<string | null>(null);

  const [selectedDate, setSelectedDate] =
    useState(initialCheckouts[0].date);

  const [ready, setReady] =
    useState(false);

  const [passportId, setPassportId] =
    useState<string | null>(null);

  const [
    participantRaffleNumber,
    setParticipantRaffleNumber,
  ] = useState<string | null>(null);

  const [savingPassport, setSavingPassport] =
    useState(false);

  const [formError, setFormError] =
    useState<string | null>(null);

  /*
   * =========================================================
   * 1. LÊ O QR CODE PELA URL
   * =========================================================
   *
   * PALESTRA ONLINE:
   * /?date=2026-10-19&checkout=lecture-online
   *
   * PALESTRA PRESENCIAL:
   * /?date=2026-10-19&checkout=lecture-presential
   *
   * ATIVIDADE:
   * /?date=2026-10-19&checkout=activity
   */
  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const checkout =
      params.get("checkout");

    const date =
      params.get("date");

    if (
      checkout === "lecture-online" ||
      checkout === "lecture-presential" ||
      checkout === "activity"
    ) {
      setCheckoutType(checkout);
    }

    if (date) {
      const validDate =
        initialCheckouts.some(
          (day) =>
            day.date === date
        );

      if (validDate) {
        setCheckoutDate(date);
        setSelectedDate(date);
      }
    }
  }, []);

  /*
   * =========================================================
   * 2. RECUPERA O PASSAPORTE SALVO
   * =========================================================
   */
  useEffect(() => {
    let cancelled = false;

    async function restorePassport() {
      let localPassport: SavedPassport | null = null;

      const saved =
        window.localStorage.getItem(
          "passaporte-gsk-sipat-2026"
        );

      if (saved) {
        try {
          localPassport =
            JSON.parse(saved) as SavedPassport;
        } catch {
          window.localStorage.removeItem(
            "passaporte-gsk-sipat-2026"
          );
        }
      }

      const localProfile = {
        ...emptyProfile,
        ...localPassport?.profile,
      };

      const localCheckouts =
        initialCheckouts.map(
          (currentDay) => {
            const savedDay =
              localPassport?.checkouts?.find(
                (day) =>
                  day.date ===
                  currentDay.date
              );

            if (!savedDay) {
              return currentDay;
            }

            return {
              ...currentDay,

              lecture:
                savedDay.lecture ??
                false,

              lectureMode:
                savedDay.lectureMode ??
                null,

              activity:
                savedDay.activity ??
                false,

              raffleNumber:
                savedDay.raffleNumber ??
                null,
            };
          }
        );

      let storedId =
        window.localStorage.getItem(
          "passaporte-gsk-sipat-id"
        );

      try {
        let response: Response | null =
          null;

        if (storedId) {
          response = await fetch(
            `/api/passaportes/${storedId}`
          );
        } else if (
          localProfile.name &&
          localProfile.email
        ) {
          response = await fetch(
            "/api/passaportes",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                localProfile
              ),
            }
          );
        }

        if (response?.ok) {
          const result =
            (await response.json()) as {
              passport: PassportRow;
            };

          const row =
            result.passport;

          storedId =
            row.id;

          window.localStorage.setItem(
            "passaporte-gsk-sipat-id",
            row.id,
          );

          if (!cancelled) {
            setPassportId(
              row.id
            );

            setParticipantRaffleNumber(
              formatRaffleNumber(
                row.numero_sorteio
              )
            );

            setProfile({
              name: row.nome,
              email: row.email,
            });

            setCheckouts(
              checkoutsFromDatabase(
                row,
                localCheckouts
              )
            );

            setPassportCreated(
              true
            );
          }
        } else if (!cancelled) {
          if (storedId) {
            window.localStorage.removeItem(
              "passaporte-gsk-sipat-id"
            );
          }

          if (localPassport) {
            setProfile(
              localProfile
            );

            setCheckouts(
              localCheckouts
            );

            setPassportCreated(
              true
            );
          }
        }
      } catch {
        if (
          !cancelled &&
          localPassport
        ) {
          setProfile(
            localProfile
          );

          setCheckouts(
            localCheckouts
          );

          setPassportCreated(
            true
          );
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void restorePassport();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * =========================================================
   * 3. REGISTRA O CHECK-OUT DO QR CODE
   * =========================================================
   */
  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!passportCreated) {
      return;
    }

    if (
      !checkoutType ||
      !checkoutDate
    ) {
      return;
    }

    setCheckouts((current) =>
      current.map((day) => {
        /*
         * Só altera o dia correspondente
         * ao QR Code.
         */
        if (
          day.date !==
          checkoutDate
        ) {
          return day;
        }

        /*
         * =====================================================
         * PALESTRA ONLINE OU PRESENCIAL
         * =====================================================
         */
        if (
          checkoutType ===
            "lecture-online" ||
          checkoutType ===
            "lecture-presential"
        ) {
          const mode: LectureMode =
            checkoutType ===
            "lecture-online"
              ? "online"
              : "presential";

          /*
           * Se a palestra já estiver registrada,
           * não troca a modalidade.
           *
           * Se for um registro antigo sem modalidade,
           * preenche a modalidade atual.
           */
          if (day.lecture) {
            if (!day.lectureMode) {
              return {
                ...day,

                lectureMode:
                  mode,

                raffleNumber:
                  day.activity
                    ? participantRaffleNumber
                    : day.raffleNumber,
              };
            }

            return day;
          }

          /*
           * Se a atividade já tiver sido feita,
           * ao registrar a palestra o número
           * também é liberado.
           */
          return {
            ...day,

            lecture: true,

            lectureMode:
              mode,

            raffleNumber:
              day.activity
                ? participantRaffleNumber
                : day.raffleNumber,
          };
        }

        /*
         * =====================================================
         * ATIVIDADE
         * =====================================================
         */
        if (
          checkoutType ===
          "activity"
        ) {
          if (day.activity) {
            return day;
          }

          let raffleNumber =
            day.raffleNumber;

          /*
           * Se a palestra já tiver sido feita,
           * usa o número único do Supabase.
           */
          if (
            day.lecture &&
            !raffleNumber
          ) {
            raffleNumber =
              participantRaffleNumber;
          }

          return {
            ...day,

            activity: true,

            raffleNumber,
          };
        }

        return day;
      })
    );
  }, [
    ready,
    passportCreated,
    checkoutType,
    checkoutDate,
    participantRaffleNumber,
  ]);

  /*
   * =========================================================
   * 4. SALVA O PASSAPORTE NO NAVEGADOR
   * E NO SUPABASE
   * =========================================================
   */
  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!passportCreated) {
      return;
    }

    const data: SavedPassport = {
      profile,
      checkouts,
    };

    window.localStorage.setItem(
      "passaporte-gsk-sipat-2026",
      JSON.stringify(data)
    );

    if (!passportId) {
      return;
    }

    const timeout =
      window.setTimeout(() => {
        void fetch(
          `/api/passaportes/${passportId}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              checkouts,
            }),
          }
        );
      }, 300);

    return () =>
      window.clearTimeout(
        timeout
      );
  }, [
    ready,
    passportCreated,
    passportId,
    profile,
    checkouts,
  ]);

  /*
   * =========================================================
   * 5. CRIA O PASSAPORTE
   * =========================================================
   */
  async function createPassport(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSavingPassport(true);
    setFormError(null);

    try {
      const response =
        await fetch(
          "/api/passaportes",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                profile
              ),
          }
        );

      const result =
        (await response.json()) as {
          passport?: PassportRow;
          error?: string;
        };

      if (
        !response.ok ||
        !result.passport
      ) {
        throw new Error(
          result.error ??
            "Não foi possível criar o passaporte."
        );
      }

      const row =
        result.passport;

      window.localStorage.setItem(
        "passaporte-gsk-sipat-id",
        row.id,
      );

      setPassportId(
        row.id
      );

      setParticipantRaffleNumber(
        formatRaffleNumber(
          row.numero_sorteio
        )
      );

      setProfile({
        name: row.nome,
        email: row.email,
      });

      setCheckouts(
        checkoutsFromDatabase(
          row
        )
      );

      setPassportCreated(
        true
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o passaporte.",
      );
    } finally {
      setSavingPassport(
        false
      );
    }
  }

  /*
   * =========================================================
   * 6. REINICIA A DEMONSTRAÇÃO
   * =========================================================
   */
  function resetDemo() {
    window.localStorage.removeItem(
      "passaporte-gsk-sipat-2026"
    );

    window.localStorage.removeItem(
      "passaporte-gsk-sipat-id"
    );

    setPassportId(
      null
    );

    setParticipantRaffleNumber(
      null
    );

    setFormError(
      null
    );

    setProfile(
      emptyProfile
    );

    setCheckouts(
      initialCheckouts
    );

    setPassportCreated(
      false
    );

    setCheckoutType(
      null
    );

    setCheckoutDate(
      null
    );

    setSelectedDate(
      initialCheckouts[0].date
    );
  }

  if (!ready) {
    return null;
  }

  const selectedDay =
    checkouts.find(
      (day) =>
        day.date ===
        selectedDate
    ) ?? checkouts[0];

  return (
    <main className="min-h-dvh overflow-hidden bg-background text-foreground">

      <div className="passport-grid fixed inset-0 -z-10 opacity-60" />

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">

        <div
          className="flex items-center gap-3"
          aria-label="Passaporte SIPAT 2026"
        >

          <div className="relative size-16 shrink-0">

            <Image
              src="/SIPAT logo.png"
              alt="Logo SIPAT"
              fill
              priority
              className="object-contain"
            />

          </div>

          <div>

            <p className="font-display text-[1.05rem] font-extrabold leading-none tracking-[-.02em]">
              PASSAPORTE SIPAT 2026
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-[.24em] text-primary">
              GSK
            </p>

          </div>

        </div>

        {passportCreated && (

          <Button
            type="button"
            variant="ghost"
            onClick={resetDemo}
            className="rounded-full text-muted-foreground hover:bg-white hover:text-foreground"
          >

            <RotateCcw className="size-4" />

            <span className="hidden sm:inline">
              Recomeçar demonstração
            </span>

          </Button>

        )}

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

              <div className="space-y-5">

                {/* NOME */}

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
                      profile.name ??
                      ""
                    }
                    onChange={(e) =>
                      setProfile({
                        ...profile,

                        name:
                          e.target
                            .value,
                      })
                    }
                    className="h-12 rounded-xl bg-white px-4"
                  />

                </div>

                {/* EMAIL */}

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
                      profile.email ??
                      ""
                    }
                    onChange={(e) =>
                      setProfile({
                        ...profile,

                        email:
                          e.target
                            .value,
                      })
                    }
                    className="h-12 rounded-xl bg-white px-4"
                  />

                </div>

              </div>

              <Button
                type="submit"
                disabled={savingPassport}
                size="lg"
                className="mt-7 h-13 w-full rounded-xl bg-primary text-base font-bold shadow-[0_10px_25px_rgba(236,73,36,.22)] hover:bg-primary/90"
              >
                {savingPassport
                  ? "Criando passaporte..."
                  : "Criar meu passaporte"}
              </Button>

              {formError ? (
                <p className="mt-3 text-center text-sm font-medium text-red-600">
                  {formError}
                </p>
              ) : null}

            </form>

          </div>

        </section>

      ) : (

        /* =====================================================
            PASSAPORTE
        ====================================================== */

        <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-4 sm:px-8 lg:px-10 lg:pt-8">

          {/* =================================================
              PARTICIPANTE
          ================================================== */}

          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

            <div>

              <p className="text-sm font-extrabold uppercase tracking-[.2em] text-primary">
                Meu passaporte
              </p>

              <h1 className="font-display mt-2 text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">
                Olá,{" "}
                {
                  profile.name.split(
                    " "
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

          {/* =================================================
              DIAS
          ================================================== */}

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
                          day.date
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
                        {
                          day.label
                        }
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
                }
              )}

            </div>

          </div>

          {/* =================================================
              DIA SELECIONADO
          ================================================== */}

          <div className="mb-6">

            <p className="text-sm font-extrabold uppercase tracking-[.2em] text-primary">
              Check-outs do dia
            </p>

            <h2 className="font-display mt-1 text-3xl font-extrabold">
              {selectedDay.label}
            </h2>

          </div>

          <div className="grid gap-6 lg:grid-cols-2">

            {/* =================================================
                PALESTRA
            ================================================== */}

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

                      {/* MODALIDADE */}

                      {selectedDay.lectureMode && (

                        <p className="mt-2 text-xs font-extrabold uppercase tracking-[.15em] text-primary">

                          {selectedDay.lectureMode ===
                          "online"
                            ? "Modalidade online"
                            : "Modalidade presencial"}

                        </p>

                      )}

                      {/* MENSAGEM PERSONALIZADA */}

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
                        ) : selectedDay.lectureMode ===
                          "presential" ? (
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
                        ) : (
                          <>

                            Obrigado por participar da palestra{" "}

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

            {/* =================================================
                ATIVIDADE
            ================================================== */}

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

                  {/* BRINDE */}

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

                  {/* =================================================
                      SORTEIO
                  ================================================== */}

                  {selectedDay.raffleNumber ? (

                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">

                      <p className="text-sm font-semibold text-muted-foreground">
                        Obrigado por participar!
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
                          ? "O número de sorteio não foi liberado para este check-out."
                          : "Você não realizou o check-out da palestra deste dia. Por isso, não foi liberado número para o sorteio."}

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