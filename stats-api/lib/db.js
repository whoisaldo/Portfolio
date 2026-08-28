// stats-api/lib/db.js — one `sql` tagged template, two drivers behind it.
//
// Production is Neon over HTTP: no connection pool to exhaust, which is the
// property that matters when every request is a cold-ish serverless function.
//
// Local development is node-postgres against a Postgres on the machine, because
// the Neon HTTP driver cannot talk to one. Without this the collector would be
// untestable outside production, and "deploy it and see" is not a way to find
// out whether the schema is right.
//
// Both paths expose the same interface — a tagged template that returns an
// array of rows — so api/*.js never learns which one it is using.
//
//   const rows = await sql`SELECT * FROM session WHERE id = ${id}`
//
// The pg path builds a $1/$2 parameterised query from the template's static
// strings and interpolated values. Values are never concatenated into SQL, so
// the injection properties are identical to the Neon driver's.

const url = process.env.DATABASE_URL || "";
const isLocal = /^postgres(ql)?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(url);

let sql;

if (isLocal) {
  const { default: pg } = await import("pg");
  // A small pool rather than a client: the dev server is long-lived and
  // handles overlapping requests.
  const pool = new pg.Pool({ connectionString: url, max: 4 });
  sql = async (strings, ...values) => {
    const text = strings.reduce(
      (acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""),
      "",
    );
    const { rows } = await pool.query(text, values);
    return rows;
  };
} else {
  const { neon } = await import("@neondatabase/serverless");
  sql = neon(url);
}

export { sql };
export default sql;
