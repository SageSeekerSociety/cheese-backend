#!/bin/sh
# wait-for-flyway.sh

set -e

# --- Configuration (Use Environment Variables) ---
DB_HOST="${POSTGRES_HOST:-db}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD}"
DB_NAME="${POSTGRES_DB:-cheese_prod}"
REQUIRED_FLYWAY_VERSION="${FLYWAY_BASELINE_VERSION:-20240729100000}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-120}"
WAIT_INTERVAL="${WAIT_INTERVAL:-5}"
# --- CI / Skip Configuration ---
# Skip wait if CI=true (common in CI envs) OR if SKIP_FLYWAY_WAIT is set to true
SKIP_WAIT="${CI:-false}" # Default to false if CI is not set
if [ "${SKIP_FLYWAY_WAIT:-false}" = "true" ]; then
  SKIP_WAIT="true"
fi


# --- Conditional Wait Logic ---
if [ "${SKIP_WAIT}" = "true" ]; then
  echo "CI environment detected or SKIP_FLYWAY_WAIT=true. Skipping Flyway wait."
else
  # --- PGPASSWORD for psql ---
  export PGPASSWORD="${DB_PASSWORD}"

  echo "Waiting for Flyway migration ${REQUIRED_FLYWAY_VERSION} on ${DB_HOST}:${DB_PORT}..."

  start_time=$(date +%s)

  # Loop until the required migration is found and successful, or timeout
  while true; do
    current_time=$(date +%s)
    elapsed_time=$((current_time - start_time))

    if [ ${elapsed_time} -ge ${WAIT_TIMEOUT} ]; then
      echo "Error: Timeout waiting for Flyway migration ${REQUIRED_FLYWAY_VERSION} after ${WAIT_TIMEOUT} seconds."
      exit 1
    fi

    migration_status=$(psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A -c \
      "SELECT success FROM flyway_schema_history WHERE version = '${REQUIRED_FLYWAY_VERSION}' ORDER BY installed_rank DESC LIMIT 1;" 2>/dev/null || echo "error")

    if [ "${migration_status}" = "t" ] || [ "${migration_status}" = "true" ] || [ "${migration_status}" = "1" ]; then
      echo "Flyway migration ${REQUIRED_FLYWAY_VERSION} found and successful."
      break # Exit the loop
    elif [ "${migration_status}" = "error" ]; then
       echo "Waiting for database connection or flyway_schema_history table..."
    else
      echo "Waiting... Flyway migration ${REQUIRED_FLYWAY_VERSION} not found or not successful yet. Status: [${migration_status}]"
    fi

    sleep ${WAIT_INTERVAL}
  done

  # Unset PGPASSWORD for security after use (optional)
  unset PGPASSWORD
fi # End of conditional wait block

# --- Execute the original command ---
echo "Proceeding to execute command: $@"
exec "$@"
