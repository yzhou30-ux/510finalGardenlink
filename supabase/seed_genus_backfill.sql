-- seed_genus_backfill.sql
-- Back-fill genus and family on existing pots whose name matches a common plant.
-- Safe to run multiple times: WHERE genus IS NULL prevents overwriting confirmed data.
-- Run after 004_plantnet_botanical.sql has been applied.
--
-- Matching is case-insensitive via ILIKE so 'rose', 'Rose', 'ROSE' all match.

UPDATE pots SET genus = 'Rosa',        family = 'Rosaceae'
  WHERE name ILIKE '%rose%'       AND genus IS NULL;

UPDATE pots SET genus = 'Ocimum',      family = 'Lamiaceae'
  WHERE name ILIKE '%basil%'      AND genus IS NULL;

UPDATE pots SET genus = 'Mentha',      family = 'Lamiaceae'
  WHERE name ILIKE '%mint%'       AND genus IS NULL;

UPDATE pots SET genus = 'Lavandula',   family = 'Lamiaceae'
  WHERE name ILIKE '%lavender%'   AND genus IS NULL;

UPDATE pots SET genus = 'Helianthus',  family = 'Asteraceae'
  WHERE name ILIKE '%sunflower%'  AND genus IS NULL;

UPDATE pots SET genus = 'Solanum',     family = 'Solanaceae'
  WHERE name ILIKE '%tomato%'     AND genus IS NULL;

UPDATE pots SET genus = 'Jasminum',    family = 'Oleaceae'
  WHERE name ILIKE '%jasmine%'    AND genus IS NULL;

UPDATE pots SET genus = 'Epipremnum', family = 'Araceae'
  WHERE name ILIKE '%pothos%'     AND genus IS NULL;

UPDATE pots SET genus = 'Echeveria',   family = 'Crassulaceae'
  WHERE name ILIKE '%succulent%'  AND genus IS NULL;

UPDATE pots SET genus = 'Opuntia',     family = 'Cactaceae'
  WHERE name ILIKE '%cactus%'     AND genus IS NULL;

UPDATE pots SET genus = 'Nephrolepis', family = 'Nephrolepidaceae'
  WHERE name ILIKE '%fern%'       AND genus IS NULL;

UPDATE pots SET genus = 'Phalaenopsis', family = 'Orchidaceae'
  WHERE name ILIKE '%orchid%'     AND genus IS NULL;

UPDATE pots SET genus = 'Paeonia',     family = 'Paeoniaceae'
  WHERE name ILIKE '%peony%'      AND genus IS NULL;

UPDATE pots SET genus = 'Hydrangea',   family = 'Hydrangeaceae'
  WHERE name ILIKE '%hydrangea%'  AND genus IS NULL;

UPDATE pots SET genus = 'Mangifera',   family = 'Anacardiaceae'
  WHERE name ILIKE '%mango%'      AND genus IS NULL;

UPDATE pots SET genus = 'Ficus',       family = 'Moraceae'
  WHERE name ILIKE '%ficus%'      AND genus IS NULL;

UPDATE pots SET genus = 'Monstera',    family = 'Araceae'
  WHERE name ILIKE '%monstera%'   AND genus IS NULL;

UPDATE pots SET genus = 'Chlorophytum', family = 'Asparagaceae'
  WHERE name ILIKE '%spider%'     AND genus IS NULL;

UPDATE pots SET genus = 'Aloe',        family = 'Asphodelaceae'
  WHERE name ILIKE '%aloe%'       AND genus IS NULL;

UPDATE pots SET genus = 'Bambusa',     family = 'Poaceae'
  WHERE (name ILIKE '%bamboo%' OR name ILIKE '%bambusa%') AND genus IS NULL;
