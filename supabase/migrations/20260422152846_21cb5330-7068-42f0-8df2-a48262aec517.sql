ALTER TABLE public.schedules
ADD COLUMN run_on_holidays boolean NOT NULL DEFAULT false;