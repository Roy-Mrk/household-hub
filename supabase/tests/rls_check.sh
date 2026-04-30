#!/bin/bash
# RLS 動作検証スクリプト
# 使い方: bash supabase/tests/rls_check.sh

set -euo pipefail

CONTAINER="supabase_db_household-hub"
SQL_FILE="$(dirname "$0")/rls_check.sql"

echo ""
echo "========================================"
echo "  RLS 動作検証"
echo "========================================"
echo ""

output=$(docker exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 \
  < "$SQL_FILE" 2>&1)

# PASS / FAIL カウント
pass=$(echo "$output" | grep -c '\[PASS\]' || true)
fail=$(echo "$output" | grep -c '\[FAIL\]' || true)
errors=$(echo "$output" | grep -c 'ERROR\|ASSERT' || true)

# 結果を整形して表示
echo "$output" | grep -E '\[PASS\]|\[FAIL\]|ERROR|ASSERT' | \
  sed 's/.*NOTICE: //' | \
  sed 's/\[PASS\]/✓/' | \
  sed 's/\[FAIL\]/✗/'

echo ""
echo "----------------------------------------"

if [ "$fail" -eq 0 ] && [ "$errors" -eq 0 ]; then
  echo "  結果: ${pass} 件すべてパス"
  echo "========================================"
  echo ""
  exit 0
else
  echo "  結果: ${pass} パス / $((fail + errors)) 失敗"
  echo ""
  echo "--- 詳細 ---"
  echo "$output"
  echo "========================================"
  echo ""
  exit 1
fi
