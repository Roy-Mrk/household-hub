-- income/expense に category(text) と entry_date(date) を追加
alter table public.income
  add column if not exists category text not null default ''::text,
  add column if not exists entry_date date not null default (now()::date);

alter table public.expense
  add column if not exists category text not null default ''::text,
  add column if not exists entry_date date not null default (now()::date);