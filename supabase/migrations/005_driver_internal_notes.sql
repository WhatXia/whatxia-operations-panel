-- WhatXia Operations Panel — PANEL-DRIVERS-003
-- Observaciones internas editables desde la Ficha del Conductor.

alter table public.drivers
  add column if not exists internal_notes text;

comment on column public.drivers.internal_notes is
  'Observaciones internas del Panel de Operaciones (no visibles al conductor vía bot).';
