// src/lib/oberon/client.ts
import soap, { Client } from "soap";

const WSDL_URL = process.env.OBERON_WSDL_URL;
const USER = process.env.OBERON_USER;
const PASSWORD = process.env.OBERON_PASSWORD;

let cachedClient: Client | null = null;

export async function getOberonClient(): Promise<Client> {
  if (!WSDL_URL || !USER || !PASSWORD) {
    throw new Error("Hiányzó OBERON env változók (WSDL_URL / USER / PASSWORD).");
  }

  if (cachedClient) {
    return cachedClient;
  }

  const client = await soap.createClientAsync(WSDL_URL);
  client.setSecurity(new soap.BasicAuthSecurity(USER, PASSWORD));

  cachedClient = client;
  return client;
}
