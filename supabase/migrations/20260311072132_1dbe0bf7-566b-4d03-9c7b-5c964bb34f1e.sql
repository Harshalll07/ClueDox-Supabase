
-- Add file_status column for processing pipeline
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS file_status text NOT NULL DEFAULT 'ready';

-- Add multilingual support columns
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS original_language text;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS translated_text text;

-- Add tsvector column for full-text search
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to auto-update search vector on file changes
CREATE OR REPLACE FUNCTION update_file_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.file_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.ai_summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.ai_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.semantic_keywords, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.extracted_text, '')), 'D');
  RETURN NEW;
END;
$$;

-- Trigger for auto-updating search vector
CREATE TRIGGER files_search_vector_update
  BEFORE INSERT OR UPDATE OF file_name, ai_summary, ai_description, semantic_keywords, extracted_text
  ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION update_file_search_vector();

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS files_search_vector_idx ON public.files USING GIN (search_vector);

-- Trigram index for fuzzy file name matching
CREATE INDEX IF NOT EXISTS files_file_name_trgm_idx ON public.files USING GIN (file_name gin_trgm_ops);

-- Backfill search vectors for existing files
UPDATE public.files SET search_vector = 
  setweight(to_tsvector('english', coalesce(file_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(ai_summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(ai_description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(semantic_keywords, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(extracted_text, '')), 'D');

-- Hybrid search function combining FTS + trigram similarity
CREATE OR REPLACE FUNCTION search_files_hybrid(
  _user_id uuid,
  _query text,
  _expanded_terms text DEFAULT '',
  _limit int DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  file_name text,
  file_url text,
  file_type text,
  file_size bigint,
  ai_summary text,
  ai_description text,
  extracted_text text,
  semantic_keywords text,
  entities jsonb,
  expiry_date date,
  upload_date timestamptz,
  file_status text,
  original_language text,
  fts_rank real,
  name_similarity real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _tsquery tsquery;
BEGIN
  -- Build tsquery from user query
  BEGIN
    _tsquery := websearch_to_tsquery('english', _query);
  EXCEPTION WHEN OTHERS THEN
    _tsquery := plainto_tsquery('english', _query);
  END;

  -- Merge expanded terms if provided
  IF _expanded_terms != '' THEN
    BEGIN
      _tsquery := _tsquery || plainto_tsquery('english', _expanded_terms);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN QUERY
  SELECT 
    f.id, f.file_name, f.file_url, f.file_type, f.file_size,
    f.ai_summary, f.ai_description, f.extracted_text, f.semantic_keywords,
    f.entities, f.expiry_date, f.upload_date, f.file_status, f.original_language,
    COALESCE(ts_rank_cd(f.search_vector, _tsquery), 0)::real AS fts_rank,
    COALESCE(similarity(f.file_name, _query), 0)::real AS name_similarity
  FROM public.files f
  WHERE f.user_id = _user_id
    AND (
      f.search_vector @@ _tsquery
      OR similarity(f.file_name, _query) > 0.15
      OR f.file_name ILIKE '%' || _query || '%'
    )
  ORDER BY 
    COALESCE(ts_rank_cd(f.search_vector, _tsquery), 0) DESC,
    COALESCE(similarity(f.file_name, _query), 0) DESC
  LIMIT _limit;
END;
$$;

-- Entity exact match function for intent-based search (PAN, Aadhaar, dates, etc.)
CREATE OR REPLACE FUNCTION search_files_by_entity(
  _user_id uuid,
  _entity_value text,
  _limit int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  file_name text,
  file_url text,
  file_type text,
  ai_summary text,
  entities jsonb,
  expiry_date date,
  upload_date timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id, f.file_name, f.file_url, f.file_type,
    f.ai_summary, f.entities, f.expiry_date, f.upload_date
  FROM public.files f
  WHERE f.user_id = _user_id
    AND (
      f.extracted_text ILIKE '%' || _entity_value || '%'
      OR f.entities::text ILIKE '%' || _entity_value || '%'
      OR f.file_name ILIKE '%' || _entity_value || '%'
    )
  LIMIT _limit;
END;
$$;
