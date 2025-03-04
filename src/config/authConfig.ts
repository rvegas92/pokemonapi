import { ClientSecretCredential } from "@azure/identity";
import * as dotenv from 'dotenv';

dotenv.config();

const tenantId = process.env.TENANT_ID as string;
const clientId = process.env.CLIENT_ID as string;
const clientSecret = process.env.CLIENT_SECRET as string;

if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Faltan variables de entorno: TENANT_ID, CLIENT_ID, CLIENT_SECRET");
}

export const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
