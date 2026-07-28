export type ClientEnvironment = {
  browser: string;
  os: string;
  device: string;
};

export function parseUserAgent(ua: string | null | undefined): ClientEnvironment {
  const value = ua?.trim() || "";
  if (!value) {
    return { browser: "Desconocido", os: "Desconocido", device: "Desconocido" };
  }

  let browser = "Desconocido";
  if (/Edg\//i.test(value)) browser = "Edge";
  else if (/Chrome\//i.test(value) && !/Edg\//i.test(value)) browser = "Chrome";
  else if (/Firefox\//i.test(value)) browser = "Firefox";
  else if (/Safari\//i.test(value) && !/Chrome\//i.test(value)) browser = "Safari";
  else if (/OPR\//i.test(value) || /Opera/i.test(value)) browser = "Opera";

  let os = "Desconocido";
  if (/Windows NT/i.test(value)) os = "Windows";
  else if (/Mac OS X/i.test(value)) os = "macOS";
  else if (/Android/i.test(value)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(value)) os = "iOS";
  else if (/Linux/i.test(value)) os = "Linux";

  let device = "Desktop";
  if (/Mobile|Android|iPhone/i.test(value)) device = "Mobile";
  else if (/iPad|Tablet/i.test(value)) device = "Tablet";

  return { browser, os, device };
}

export function getIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-client-ip") ||
    null
  );
}
