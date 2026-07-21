// Render's egress network has no IPv6 route. The Supabase connection pooler publishes
// an AAAA (IPv6) record, and Node's default DNS result order can return it first, so pg
// tries to connect over IPv6 and fails with ENETUNREACH. Forcing IPv4-first (globally,
// via a side-effect import placed before anything that opens a DB connection) makes all
// DNS lookups in this process prefer the pooler's A (IPv4) record.
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");
