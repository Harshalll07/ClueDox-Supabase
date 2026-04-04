
-- 1. Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add an embedding column to the files table
-- OpenAI text-embedding-3-small uses 1536 dimensions
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Create a function to match documents using cosine similarity
CREATE OR REPLACE FUNCTION public.match_files (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id_param uuid
)
RETURNS TABLE (
  id uuid,
  score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    1 - (f.embedding <=> query_embedding) AS score
  FROM public.files f
  WHERE f.user_id = user_id_param 
    AND f.embedding IS NOT NULL
    AND (1 - (f.embedding <=> query_embedding) > match_threshold)
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Re-rank/Hybrid search helper
-- Combine FTS rank with vector similarity if needed
CREATE OR REPLACE FUNCTION public.search_files_multilingual (
  _user_id uuid,
  _query_text text,
  _query_embedding vector(1536),
  _match_threshold float DEFAULT 0.3,
  _limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  file_name text,
  file_url text,
  file_type text,
  file_size bigint,
  ai_summary text,
  ai_description text,
  entities jsonb,
  expiry_date date,
  upload_date timestamptz,
  semantic_score float,
  fts_rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.file_name,
    f.file_url,
    f.file_type,
    f.file_size,
    f.ai_summary,
    f.ai_description,
    f.entities,
    f.expiry_date,
    f.upload_date,
    (1 - (f.embedding <=> _query_embedding))::float AS semantic_score,
    ts_rank_cd(f.search_vector, websearch_to_tsquery('english', _query_text))::float AS fts_rank
  FROM public.files f
  WHERE f.user_id = _user_id
    AND (
      (f.embedding IS NOT NULL AND (1 - (f.embedding <=> _query_embedding) > _match_threshold))
      OR
      (f.search_vector @@ websearch_to_tsquery('english', _query_text))
    )
  ORDER BY 
    (1 - (f.embedding <=> _query_embedding)) DESC,
    ts_rank_cd(f.search_vector, websearch_to_tsquery('english', _query_text)) DESC
  LIMIT _limit;
END;
$$;
