
REVOKE EXECUTE ON FUNCTION public.join_room(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_rematch(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.join_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_rematch(uuid) TO authenticated;
