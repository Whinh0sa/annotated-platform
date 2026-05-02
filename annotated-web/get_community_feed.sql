CREATE OR REPLACE FUNCTION get_community_feed(
  viewer_id UUID, 
  page_limit INT DEFAULT 20, 
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  annotation_id UUID,
  media_url TEXT,
  commentary TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  author_username TEXT,
  author_avatar TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.media_url,
    a.commentary,
    a.created_at,
    u.username,
    u.avatar_url
  FROM public.annotations a
  JOIN public.users u ON a.user_id = u.id
  -- The Graph Traversal: Only select where an edge exists in the 'follows' table
  JOIN public.follows f ON a.user_id = f.following_id
  WHERE f.follower_id = viewer_id
  ORDER BY a.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;
