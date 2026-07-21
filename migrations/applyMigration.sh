#!/bin/bash
set -euo pipefail

/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C -Q "IF DB_ID('${DB_NAME}') IS NULL CREATE DATABASE [${DB_NAME}]"
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C -d "${DB_NAME}" -i /migrations/createBankMovements.sql

echo "Database migration completed"
