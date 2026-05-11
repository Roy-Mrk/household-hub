-- settlements の UPDATE ポリシーが欠落していたため追加
-- PATCH /api/settlement/[id] でキャンセル時に cancelled_at が更新できない問題を修正

CREATE POLICY "settlements_update" ON settlements
  FOR UPDATE TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );
