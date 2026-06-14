ALTER TABLE public.chat_messages ADD CONSTRAINT message_max_length CHECK (length(message) <= 1000);
ALTER TABLE public.profiles ADD CONSTRAINT display_name_max_length CHECK (length(display_name) <= 50);

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, is_guest)
  VALUES (
    NEW.id,
    left(COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player'), 50),
    COALESCE((NEW.raw_user_meta_data->>'is_guest')::boolean, false)
  );
  RETURN NEW;
END;
$function$;