-- Migration: Interest scale from 0-10 to 0-100
-- Date: 2026-03-01
-- Description: Converts all interest scores from 0-10 scale to 0-100 scale

UPDATE conversations SET
  base_interest_score = LEAST(base_interest_score * 10, 100),
  effective_interest = LEAST(effective_interest * 10, 100);
