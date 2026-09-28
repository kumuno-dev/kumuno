export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

export function parseDatabaseUrl(value: string | undefined, name = "DATABASE_URL") {
  if (!value?.trim()) {
    throw new DatabaseConfigurationError(`${name}を設定してください。`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DatabaseConfigurationError(`${name}の接続URLが不正です。`);
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    !url.username ||
    url.pathname.length <= 1 ||
    url.hash
  ) {
    throw new DatabaseConfigurationError(
      `${name}にはPostgreSQLのホスト・ユーザー・DB名を含むURLを設定してください。`,
    );
  }

  return value;
}

export function getDatabaseConfig(env: Readonly<Record<string, string | undefined>> = process.env) {
  return {
    connectionString: parseDatabaseUrl(env.DATABASE_URL),
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    statement_timeout: 30_000,
    lock_timeout: 10_000,
    application_name: "kumuno",
  };
}
