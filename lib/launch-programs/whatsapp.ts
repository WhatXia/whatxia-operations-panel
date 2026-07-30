/**
 * Envío opcional de WhatsApp desde el panel (misma Graph API que el bot).
 * Si faltan credenciales, la cola queda para que el bot la drene.
 */

export function hasWhatsAppCredentials(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}

export async function sendWhatsAppText(
  to: string,
  body: string,
): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";

  if (!token || !phoneNumberId) {
    throw new Error("WhatsApp no configurado en el panel");
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WhatsApp API ${response.status}: ${errorBody}`);
  }
}
