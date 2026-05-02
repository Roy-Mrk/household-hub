-- 未分類カテゴリをマスタに追加（income / expense 両方）
do $$
declare
  cat_id uuid;
begin
  -- expense: 未分類
  insert into public.categories (name, type, sort_order)
  values ('未分類', 'expense', 99)
  returning id into cat_id;
  insert into public.subcategories (category_id, name, sort_order)
  values (cat_id, '未分類', 1);

  -- income: 未分類
  insert into public.categories (name, type, sort_order)
  values ('未分類', 'income', 99)
  returning id into cat_id;
  insert into public.subcategories (category_id, name, sort_order)
  values (cat_id, '未分類', 1);
end;
$$;

-- subcategory_id を nullable に変更（任意入力対応）
alter table public.income  alter column subcategory_id drop not null;
alter table public.expense alter column subcategory_id drop not null;
