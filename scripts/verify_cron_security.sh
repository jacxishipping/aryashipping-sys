#!/bin/bash

# This script demonstrates how to verify the security of the cron endpoints.
# It requires the application to be running.

BASE_URL=${1:-"http://localhost:3000"}
CRON_SECRET=${2:-"your-cron-secret-here"}

ENDPOINTS=(
  "/api/cron/auto-generate-invoices"
  "/api/cron/sync-tracking"
  "/api/cron/check-delivery-alerts"
)

echo "Testing Cron Endpoints Security at $BASE_URL"
echo "------------------------------------------"

for endpoint in "${ENDPOINTS[@]}"; do
  echo "Testing endpoint: $endpoint"

  # 1. Test without Authorization header
  echo "  - Testing without Authorization header..."
  status_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL$endpoint")
  if [ "$status_code" == "401" ]; then
    echo "    ✅ Blocked as expected (401)"
  else
    echo "    ❌ FAILED: Received $status_code, expected 401"
  fi

  # 2. Test with incorrect Authorization header
  echo "  - Testing with incorrect Authorization header..."
  status_code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer wrong-secret" -X POST "$BASE_URL$endpoint")
  if [ "$status_code" == "401" ]; then
    echo "    ✅ Blocked as expected (401)"
  else
    echo "    ❌ FAILED: Received $status_code, expected 401"
  fi

  # 3. Test with correct Authorization header
  # Note: This might return 200, 500 (if DB is not ready), but not 401
  echo "  - Testing with correct Authorization header..."
  status_code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CRON_SECRET" -X POST "$BASE_URL$endpoint")
  if [ "$status_code" != "401" ]; then
    echo "    ✅ Passed authentication (Received $status_code)"
  else
    echo "    ❌ FAILED: Received $status_code, expected NOT 401"
  fi

  echo ""
done
