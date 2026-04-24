/**
 * When true, all *InitService onModuleInit hooks no-op (no DDL / hasTable round-trips).
 * Use after the database schema is stable (migrations or one-time setup), especially on
 * serverless cold starts where 20+ sequential schema checks add seconds of latency.
 *
 * Set: DATABASE_SKIP_RUNTIME_SCHEMA_INIT=true
 */
export function shouldSkipRuntimeSchemaInit(): boolean {
  return process.env.DATABASE_SKIP_RUNTIME_SCHEMA_INIT === 'true';
}
