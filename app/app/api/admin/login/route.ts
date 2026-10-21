import {
  createHmac,
  timingSafeEqual,
} from "crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME =
  "sipat-admin-session";

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
  const password =
    getAdminPassword();

  return createHmac(
    "sha256",
    password,
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

/* =========================================================
   GET
   Verifica se já existe uma sessão válida
========================================================= */

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const session =
      cookieStore.get(
        COOKIE_NAME,
      )?.value;

    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        {
          status: 401,
        },
      );
    }

    const expectedToken =
      createSessionToken();

    if (
      !safeCompare(
        session,
        expectedToken,
      )
    ) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json({
      authenticated: true,
    });
  } catch (error) {
    console.error(
      "Erro ao verificar sessão administrativa:",
      error,
    );

    return NextResponse.json(
      {
        authenticated: false,
        error:
          "Não foi possível verificar a sessão administrativa.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST
   Login
========================================================= */

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as {
        password?: unknown;
      };

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    if (!password) {
      return NextResponse.json(
        {
          error:
            "Informe a senha administrativa.",
        },
        {
          status: 400,
        },
      );
    }

    const adminPassword =
      getAdminPassword();

    if (
      !safeCompare(
        password,
        adminPassword,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Senha incorreta.",
        },
        {
          status: 401,
        },
      );
    }

    const cookieStore =
      await cookies();

    cookieStore.set({
      name: COOKIE_NAME,
      value:
        createSessionToken(),

      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "strict",

      path: "/",

      maxAge:
        60 * 60 * 12,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erro no login administrativo:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível realizar o login.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   DELETE
   Logout
========================================================= */

export async function DELETE() {
  const cookieStore =
    await cookies();

  cookieStore.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({
    success: true,
  });
}