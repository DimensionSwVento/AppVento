import { NextResponse } from "next/server";
import { requireAdmin } from "../route";

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const payload = await request.json();

  const email = payload.mail;
  const username = payload.name;
  if (!email || !username) {
    return NextResponse.json(
      { error: "Faltan campos requeridos para notificar" },
      { status: 400 },
    );
  }

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    return NextResponse.json(
      { error: "Configuracion de SendGrid incompleta" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
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

    if (!res.ok) {
      const body = await res.text();
      console.error("Post /users/notify Error:", body);
      return NextResponse.json(
        { error: "Error enviando email de aviso al usuario" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { message: "Usuario notificado exitosamente" },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Post /users/notify Error:", message);
    return NextResponse.json(
      { error: "Error enviando email de aviso al usuario" },
      { status: 500 },
    );
  }
}
