import postgres from "postgres";

// One postgres.js client per read-only role, through the Supabase transaction pooler.
// Used by api/ytd.js (site_reader) and api/wrap-private.js (wrap_owner_reader).

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function openReader(url, applicationName) {
  const options = {
    // The transaction pooler hands each transaction to any backend, so no named prepared statements.
    prepare: false,
    // The one column read is jsonb, which postgres.js parses without the type lookup query.
    fetch_types: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { application_name: applicationName },
    onnotice: () => {},
  };
  // TLS for anything but a local database, unless the URL sets sslmode itself.
  const parsed = new URL(url);
  if (!parsed.searchParams.has("sslmode")) {
    options.ssl = LOCAL_HOSTS.has(parsed.hostname) ? false : "require";
  }
  return postgres(url, options);
}
