// Render's egress network has no IPv6 route, yet the Supabase connection pooler host
// also publishes an AAAA (IPv6) record. dns.setDefaultResultOrder("ipv4first") orders
// IPv4 first, but Node 20+ Happy Eyeballs (autoSelectFamily, on by default) still races
// the IPv6 address and hits ENETUNREACH. Disabling autoSelectFamily makes sockets use
// only the first (IPv4) address.
//
// This is enforced at the PROCESS level because pg's JS driver opens sockets via
// socket.connect(port, host) (pg/lib/connection.js) and does not pass a lookup/family
// option through — a per-Pool lookup would be a no-op. Side-effect module, imported
// before anything opens a DB connection.
import dns from "node:dns";
import net from "node:net";

dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);
