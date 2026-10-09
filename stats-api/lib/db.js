// stats-api/lib/db.js: one `sql` tagged template, two drivers behind it.
//
// Production is Neon over HTTP: no connection pool to exhaust, which is the
// property that matters when every request is a cold-ish serverless function.
//
// Local development is node-postgres against a Postgres on the machine, because
// the Neon HTTP driver cannot talk to one. Without this the collector would be
// untestable outside production, and "deploy it and see" is not a way to find
// out whether the schema is right.
//
// Both paths expose the same interface, a tagged template that returns an
// array of rows, so api/*.js never learns which one it is using.
//
//   const rows = await sql`SELECT * FROM session WHERE id = ${id}`
//
// `query(text, params)` is the same thing for a statement assembled from
// parts, which a tagged template cannot express. Only static SQL goes in
// `text`; every value still travels as a $n parameter.
//
// The pg path builds a $1/$2 parameterised query from the template's static
// strings and interpolated values. Values are never concatenated into SQL, so
// the injection properties are identical to the Neon driver's.

const url = process.env.DATABASE_URL || "";
// "postgres://localhost/db" and "postgres://user@localhost:5433/db" alike.
const isLocal = /^postgres(ql)?:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|\[::1\])[:/]/i.test(url);

let sql;
let query;

if (isLocal) {
  const { default: pg } = await import("pg");
  // A small pool rather than a client: the dev server is long-lived and
  // handles overlapping requests.
  const pool = new pg.Pool({ connectionString: url, max: 4 });
  query = async (text, params = []) => (await pool.query(text, params)).rows;
  sql = (strings, ...values) =>
    query(
      strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""), ""),
      values,
    );
} else {
  const { neon } = await import("@neondatabase/serverless");
  sql = neon(url);
  query = (text, params = []) => sql.query(text, params);
}

export { sql, query };
export default sql;
