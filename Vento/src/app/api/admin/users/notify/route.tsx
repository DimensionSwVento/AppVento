import type { NextApiRequest, NextApiResponse } from "next";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../route";
import {
  getUserRoles,
  KeycloakAdminError,
} from "../../../../Utils/keycloakAdmin";

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const payload = await request.json();

  const email = payload.mail;
  const username = payload.name;
  let res: any;
  let error: any;

  try {
    res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: process.env.SENDGRID_FROM_EMAIL },
        subject: "Ahora sos administrador",
        content: [
          {
            type: "text/html",
            value: `
            <h2>Hola ${username}</h2>
            <p>Tu cuenta ha sido promovida a <strong>administrador</strong>.</p>
            <p>Ya podés acceder a las funciones administrativas.</p>
          `,
          },
        ],
      }),
    });

    return NextResponse.json(
      { message: "Usuario notificado exitosamente" },
      { status: 200 },
    );
  } catch (err: any) {
    error = await res.json();
    console.error(`Post /users/notify Error:`, error);

    const status = err instanceof KeycloakAdminError ? err.status : 500;
    return NextResponse.json(
      { error: "Error enviando email de aviso al usuario" },
      { status },
    );
  }
}
