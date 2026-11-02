import "server-only";

// API REST de Webpay Plus (v1.2). Se usa directo con fetch para no agregar el SDK.
const produccion = process.env.WEBPAY_AMBIENTE === "produccion";
const base = produccion ? "https://webpay3g.transbank.cl" : "https://webpay3gint.transbank.cl";

// Credenciales públicas del ambiente de integración de Transbank: no son secreto.
const comercio = process.env.WEBPAY_COMERCIO ?? "597055555532";
const llave = process.env.WEBPAY_LLAVE ?? "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C";

const cabeceras = {
  "Tbk-Api-Key-Id": comercio,
  "Tbk-Api-Key-Secret": llave,
  "Content-Type": "application/json",
};

async function leer<T>(respuesta: Response, operacion: string): Promise<T> {
  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Webpay ${operacion}: HTTP ${respuesta.status} · ${detalle.slice(0, 300)}`);
  }
  return (await respuesta.json()) as T;
}

export type TransaccionCreada = { token: string; url: string };

export type TransaccionConfirmada = {
  response_code: number;
  status: string;
  amount: number;
  buy_order: string;
  authorization_code?: string;
  transaction_date?: string;
  card_detail?: { card_number?: string };
};

export async function crearTransaccion(datos: { buyOrder: string; sessionId: string; monto: number; returnUrl: string }): Promise<TransaccionCreada> {
  const respuesta = await fetch(`${base}/rswebpaytransaction/api/webpay/v1.2/transactions`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({
      buy_order: datos.buyOrder,
      session_id: datos.sessionId,
      amount: datos.monto,
      return_url: datos.returnUrl,
    }),
    cache: "no-store",
  });
  return leer<TransaccionCreada>(respuesta, "crear");
}

export async function confirmarTransaccion(token: string): Promise<TransaccionConfirmada> {
  const respuesta = await fetch(`${base}/rswebpaytransaction/api/webpay/v1.2/transactions/${encodeURIComponent(token)}`, {
    method: "PUT",
    headers: cabeceras,
    cache: "no-store",
  });
  return leer<TransaccionConfirmada>(respuesta, "confirmar");
}
