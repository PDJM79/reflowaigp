import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dns from "node:dns";
import net from "node:net";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Belt-and-braces IPv4 pinning, re-asserted right before the Pool is created (mirrors
// server/ipv4-first.ts, which runs first). Render has no IPv6 egress; without this the
// Supabase pooler's AAAA record causes ENETUNREACH. pg's JS driver opens sockets via
// socket.connect(port, host) with no lookup/family passthrough, so this must be
// process-level rather than a Pool option.
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Supabase's connection pooler serves a TLS certificate that chains to Supabase's
// private root CA (below), which Node/pg does not trust out of the box. A bare Pool
// therefore fails the TLS handshake ("self-signed certificate in certificate chain")
// and every query throws a generic failure. Supplying the CA lets TLS verify the
// chain AND hostname properly (verification stays ON — not disabled). Applied only
// for Supabase hosts, so a local/other Postgres URL is unaffected.
const SUPABASE_ROOT_CA_2021 = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----`;

// Strip any sslmode from the URL so our explicit ssl config below is authoritative
// (recent pg treats sslmode=require as verify-full, which fails on the private CA).
const dbUrl = process.env.DATABASE_URL
  .replace(/([?&])sslmode=[^&]*&/gi, "$1")
  .replace(/[?&]sslmode=[^&]*$/gi, "");

const isSupabase = /supabase\.(co|com)/i.test(dbUrl);

export const pool = new Pool({
  connectionString: dbUrl,
  ...(isSupabase ? { ssl: { ca: SUPABASE_ROOT_CA_2021 } } : {}),
});
export const db = drizzle(pool, { schema });
