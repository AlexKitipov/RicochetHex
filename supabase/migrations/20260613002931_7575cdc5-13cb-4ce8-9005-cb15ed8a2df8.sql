REVOKE EXECUTE ON FUNCTION public.join_room(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.request_rematch(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_rematch(uuid) TO authenticated;