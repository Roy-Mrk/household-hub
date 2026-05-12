-- settlements / settlement_items / household_invitations の DELETE ポリシーが欠落していたため追加。
-- households を削除する際のカスケード削除がRLSにブロックされる問題の根本対処。

-- settlements: 世帯メンバーが削除可
CREATE POLICY "settlements_delete" ON settlements
  FOR DELETE TO authenticated
  USING (
    household_id = public.get_my_household_id()
  );

-- settlement_items: 対応する settlement に所属する世帯メンバーが削除可
CREATE POLICY "settlement_items_delete" ON settlement_items
  FOR DELETE TO authenticated
  USING (
    settlement_id IN (
      SELECT id FROM settlements WHERE household_id = public.get_my_household_id()
    )
  );

-- household_invitations: オーナーが削除可
CREATE POLICY "household_invitations_delete" ON household_invitations
  FOR DELETE TO authenticated
  USING (
    household_id = public.get_my_household_id()
    AND public.get_my_household_role() = 'owner'
  );
