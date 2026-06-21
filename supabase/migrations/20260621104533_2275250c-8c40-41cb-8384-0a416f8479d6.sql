REVOKE EXECUTE ON FUNCTION public.join_room(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_rematch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_rematch(uuid) TO authenticated;