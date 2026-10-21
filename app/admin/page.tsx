"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Check,
  LoaderCircle,
  Download,
  RefreshCw,
  LockKeyhole,
  LogOut,
  Radio,
  ShieldCheck,
  X,
} from "lucide-react";

import Image from "next/image";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

type CheckoutType =
  | "lecture-online"
  | "lecture-presential"
  | "activity";

type ControlRow = {
  data_evento: string;
  tipo: CheckoutType;
  ativo: boolean;
};

type DayConfig = {
  date: string;
  label: string;
};

const days:
  DayConfig[] = [
    {
      date:
        "2026-10-19",
      label: "19/10",
    },
    {
      date:
        "2026-10-20",
      label: "20/10",
    },
    {
      date:
        "2026-10-21",
      label: "21/10",
    },
    {
      date:
        "2026-10-22",
      label: "22/10",
    },
    {
      date:
        "2026-10-23",
      label: "23/10",
    },
  ];

const checkoutLabels:
  Record<
    CheckoutType,
    string
  > = {
  "lecture-online":
    "Palestra Online",

  "lecture-presential":
    "Palestra Presencial",

  activity:
    "Atividade",
};

const allTypes:
  CheckoutType[] = [
    "lecture-online",
    "lecture-presential",
    "activity",
  ];

const lectureTypes:
  CheckoutType[] = [
    "lecture-online",
    "lecture-presential",
  ];

type DaySummary = {
  total_passaportes_criados: number;
  total_checkouts_online: number;
  total_checkouts_presenciais: number;
  total_checkouts_atividade: number;
  total_aptos_sorteio: number;
};

export default function AdminPage() {
  const [
    authenticated,
    setAuthenticated,
  ] = useState<
    boolean | null
  >(null);

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    controls,
    setControls,
  ] = useState<
    ControlRow[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loggingIn,
    setLoggingIn,
  ] = useState(false);

  const [
    updating,
    setUpdating,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    return days.some((day) => day.date === today) ? today : "2026-10-21";
  });
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (authenticated !== true) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = await fetch(`/api/admin/resumo?dia=${selectedDay.slice(-2)}`, { cache: "no-store" });
      if (response.status === 401) { setAuthenticated(false); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Erro ao consultar resumo.");
      setSummary(result as DaySummary);
    } catch (err) {
      setSummary(null);
      setSummaryError(err instanceof Error ? err.message : "Erro ao consultar resumo.");
    } finally { setSummaryLoading(false); }
  }, [authenticated, selectedDay]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);

  async function exportCsv() {
    setExporting(true);
    setSummaryError(null);
    try {
      const response = await fetch(`/api/admin/sorteio/exportar?dia=${selectedDay.slice(-2)}`, { cache: "no-store" });
      if (response.status === 401) { setAuthenticated(false); return; }
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Não foi possível exportar o CSV.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `sorteio_sipat_dia${selectedDay.slice(-2)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Não foi possível exportar o CSV.");
    } finally { setExporting(false); }
  }

  /* =========================================================
     CARREGA CONTROLES
  ========================================================= */

  const loadControls =
    useCallback(
      async () => {
        try {
          setLoading(
            true,
          );

          setError(
            null,
          );

          const response =
            await fetch(
              "/api/admin/checkouts",
              {
                cache:
                  "no-store",
              },
            );

          if (
            response.status ===
            401
          ) {
            setAuthenticated(
              false,
            );

            return;
          }

          const result =
            (await response.json()) as {
              checkouts?:
                ControlRow[];

              error?:
                string;
            };

          if (
            !response.ok
          ) {
            throw new Error(
              result.error ??
                "Erro ao carregar controles.",
            );
          }

          setControls(
            result.checkouts ??
              [],
          );

          setAuthenticated(
            true,
          );
        } catch (
          err
        ) {
          console.error(
            err,
          );

          setError(
            err instanceof
              Error
              ? err.message
              : "Não foi possível carregar o painel.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void loadControls();
  }, [loadControls]);

  /* =========================================================
     LOGIN
  ========================================================= */

  async function login(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoggingIn(
      true,
    );

    setError(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/admin/login",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                password,
              }),
          },
        );

      const result =
        (await response.json()) as {
          success?:
            boolean;

          error?:
            string;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Não foi possível entrar.",
        );
      }

      setPassword("");

      setAuthenticated(
        true,
      );

      await loadControls();
    } catch (
      err
    ) {
      setError(
        err instanceof
          Error
          ? err.message
          : "Não foi possível entrar.",
      );
    } finally {
      setLoggingIn(
        false,
      );
    }
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  async function logout() {
    await fetch(
      "/api/admin/login",
      {
        method:
          "DELETE",
      },
    );

    setControls([]);

    setAuthenticated(
      false,
    );
  }

  /* =========================================================
     ATUALIZA UM OU VÁRIOS
  ========================================================= */

  async function updateControls(
    date: string,
    types:
      CheckoutType[],
    active: boolean,
  ) {
    const key =
      `${date}:${types.join(
        ",",
      )}:${active}`;

    setUpdating(
      key,
    );

    setError(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/admin/checkouts",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                date,
                types,
                active,
              }),
          },
        );

      const result =
        (await response.json()) as {
          success?:
            boolean;

          error?:
            string;
        };

      if (
        response.status ===
        401
      ) {
        setAuthenticated(
          false,
        );

        return;
      }

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Não foi possível atualizar.",
        );
      }

      /*
       * Atualiza imediatamente
       * a interface.
       */
      setControls(
        (
          current,
        ) =>
          current.map(
            (
              control,
            ) => {
              if (
                control.data_evento ===
                  date &&
                types.includes(
                  control.tipo,
                )
              ) {
                return {
                  ...control,
                  ativo:
                    active,
                };
              }

              return control;
            },
          ),
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          Error
          ? err.message
          : "Não foi possível atualizar.",
      );
    } finally {
      setUpdating(
        null,
      );
    }
  }

  function isActive(
    date: string,
    type:
      CheckoutType,
  ) {
    return (
      controls.find(
        (
          control,
        ) =>
          control.data_evento ===
            date &&
          control.tipo ===
            type,
      )?.ativo ??
      false
    );
  }

  /* =========================================================
     CARREGAMENTO
  ========================================================= */

  if (
    authenticated ===
      null &&
    loading
  ) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <LoaderCircle className="size-8 animate-spin text-primary" />
      </main>
    );
  }

  /* =========================================================
     LOGIN
  ========================================================= */

  if (
    authenticated ===
    false
  ) {
    return (
      <main className="min-h-dvh bg-background px-5 py-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <div className="relative size-24">
              <Image
                src="/SIPAT logo.png"
                alt="Logo SIPAT"
                fill
                sizes="96px"
                priority
                className="object-contain"
              />
            </div>
          </div>

          <form
            onSubmit={
              login
            }
            className="rounded-[30px] border bg-white p-7 shadow-xl"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary text-white">
                <LockKeyhole className="size-6" />
              </div>

              <div>
                <h1 className="text-2xl font-extrabold">
                  Administração
                </h1>

                <p className="text-sm text-muted-foreground">
                  Controle de check-outs
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Senha administrativa
              </Label>

              <Input
                id="password"
                type="password"
                required
                autoFocus
                value={
                  password
                }
                onChange={(
                  event,
                ) =>
                  setPassword(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="Digite a senha"
                className="h-12"
              />
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={
                loggingIn
              }
              className="mt-6 h-12 w-full font-bold"
            >
              {loggingIn ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>
      </main>
    );
  }

  /* =========================================================
     PAINEL
  ========================================================= */

  return (
    <main className="min-h-dvh bg-background px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* CABEÇALHO */}

        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="relative size-16">
              <Image
                src="/SIPAT logo.png"
                alt="Logo SIPAT"
                fill
                sizes="64px"
                priority
                className="object-contain"
              />
            </div>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-primary">
                SIPAT 2026
              </p>

              <h1 className="text-3xl font-black tracking-tight">
                Controle de Check-outs
              </h1>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={
              logout
            }
          >
            <LogOut className="mr-2 size-4" />
            Sair
          </Button>
        </header>

        {/* ERRO */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* RESUMO DIÁRIO E EXPORTAÇÃO */}
        <section className="mb-7 rounded-[28px] border bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-primary">Dashboard</p>
              <h2 className="mt-2 text-3xl font-black">Resumo do dia</h2>
              <p className="mt-1 text-sm text-muted-foreground">Acompanhe os registros da SIPAT.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadSummary()} disabled={summaryLoading}>
              <RefreshCw className={`mr-2 size-4 ${summaryLoading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2" aria-label="Selecionar dia do resumo">
            {days.map(day => (
              <button type="button" key={day.date} onClick={() => setSelectedDay(day.date)}
                aria-pressed={selectedDay === day.date}
                className={`rounded-full border px-5 py-3 text-sm font-bold transition ${selectedDay === day.date ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-slate-50"}`}>
                {day.label}
              </button>
            ))}
          </div>
          {summaryError && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{summaryError}</p>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {([
              ["Passaportes criados", "total_passaportes_criados"],
              ["Palestra online", "total_checkouts_online"],
              ["Palestra presencial", "total_checkouts_presenciais"],
              ["Atividade", "total_checkouts_atividade"],
              ["Participantes do sorteio", "total_aptos_sorteio"],
            ] as const).map(([label, key]) => (
              <div key={key} className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-3 text-4xl font-black tabular-nums">{summaryLoading || !summary ? "—" : summary[key]}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
            <div>
              <h3 className="font-bold">Lista de participantes aptos ao sorteio</h3>
              <p className="text-sm text-muted-foreground">Número do sorteio, nome e e-mail • {selectedDay.slice(-2)}/10</p>
            </div>
            <Button type="button" onClick={() => void exportCsv()} disabled={exporting || summaryLoading}>
              {exporting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
              {exporting ? "Exportando..." : "Exportar lista CSV"}
            </Button>
          </div>
        </section>

        {/* EXPLICAÇÃO */}

        <div className="mb-7 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />

            <div>
              <p className="font-bold">
                Controle em tempo real
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Um QR Code só registra participação enquanto seu check-out estiver ativo.
              </p>
            </div>
          </div>
        </div>

        {/* DIAS */}

        <div className="space-y-6">
          {days.map(
            (day) => {
              const allActive =
                allTypes.every(
                  (type) =>
                    isActive(
                      day.date,
                      type,
                    ),
                );

              const lecturesActive =
                lectureTypes.every(
                  (type) =>
                    isActive(
                      day.date,
                      type,
                    ),
                );

              const activityActive =
                isActive(
                  day.date,
                  "activity",
                );

              return (
                <section
                  key={
                    day.date
                  }
                  className="rounded-[28px] border bg-white p-5 shadow-sm sm:p-6"
                >
                  {/* CABEÇALHO DO DIA */}

                  <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[.2em] text-primary">
                        Dia
                      </p>

                      <h2 className="mt-1 text-3xl font-black">
                        {day.label}
                      </h2>
                    </div>

                    <div
                      className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                        allActive
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Radio className="size-4" />

                      {allActive
                        ? "Todos ativos"
                        : "Controle individual"}
                    </div>
                  </div>

                  {/* CHECKOUTS */}

                  <div className="grid gap-3 lg:grid-cols-3">
                    {allTypes.map(
                      (
                        type,
                      ) => {
                        const active =
                          isActive(
                            day.date,
                            type,
                          );

                        const key =
                          `${day.date}:${type}:${!active}`;

                        const isUpdating =
                          updating ===
                          key;

                        return (
                          <button
                            key={
                              type
                            }
                            type="button"
                            disabled={
                              updating !==
                              null
                            }
                            onClick={() =>
                              updateControls(
                                day.date,
                                [
                                  type,
                                ],
                                !active,
                              )
                            }
                            className={`flex min-h-24 items-center justify-between gap-4 rounded-2xl border p-4 text-left transition ${
                              active
                                ? "border-green-300 bg-green-50"
                                : "border-border bg-slate-50"
                            }`}
                          >
                            <div>
                              <p className="font-bold">
                                {
                                  checkoutLabels[
                                    type
                                  ]
                                }
                              </p>

                              <p
                                className={`mt-1 text-sm font-semibold ${
                                  active
                                    ? "text-green-700"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {active
                                  ? "Ativo"
                                  : "Desativado"}
                              </p>
                            </div>

                            <div
                              className={`grid size-11 shrink-0 place-items-center rounded-full ${
                                active
                                  ? "bg-green-600 text-white"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {isUpdating ? (
                                <LoaderCircle className="size-5 animate-spin" />
                              ) : active ? (
                                <Check className="size-5" />
                              ) : (
                                <X className="size-5" />
                              )}
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>

                  {/* AÇÕES RÁPIDAS */}

                  <div className="mt-6 border-t pt-5">
                    <p className="mb-3 text-sm font-bold text-muted-foreground">
                      Ações rápidas
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          updating !==
                          null
                        }
                        onClick={() =>
                          updateControls(
                            day.date,
                            lectureTypes,
                            !lecturesActive,
                          )
                        }
                      >
                        {lecturesActive
                          ? "Desativar palestras"
                          : "Ativar palestras"}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={
                          updating !==
                          null
                        }
                        onClick={() =>
                          updateControls(
                            day.date,
                            [
                              "activity",
                            ],
                            !activityActive,
                          )
                        }
                      >
                        {activityActive
                          ? "Desativar atividade"
                          : "Ativar atividade"}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={
                          allActive
                            ? "destructive"
                            : "outline"
                        }
                        disabled={
                          updating !==
                          null
                        }
                        onClick={() =>
                          updateControls(
                            day.date,
                            allTypes,
                            !allActive,
                          )
                        }
                      >
                        {allActive
                          ? "Desativar tudo"
                          : "Ativar tudo"}
                      </Button>
                    </div>
                  </div>
                </section>
              );
            },
          )}
        </div>
      </div>
    </main>
  );
}