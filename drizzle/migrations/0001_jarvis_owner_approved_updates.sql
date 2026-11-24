CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_role_read ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated,service_role;
CREATE FUNCTION public.jarvis_owner_email_matches(p_email text,p_confirmed timestamptz) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT p_confirmed IS NOT NULL AND lower(p_email)='lucas.bessa.clezar@gmail.com' $$;
REVOKE ALL ON FUNCTION public.jarvis_owner_email_matches(text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.jarvis_owner_email_matches(text,timestamptz) TO service_role;
CREATE FUNCTION public.enroll_jarvis_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF public.jarvis_owner_email_matches(NEW.email,NEW.email_confirmed_at) THEN INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'admin') ON CONFLICT DO NOTHING;
 ELSE DELETE FROM public.user_roles WHERE user_id=NEW.id AND role='admin'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.enroll_jarvis_owner() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER jarvis_verified_owner AFTER INSERT OR UPDATE OF email,email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.enroll_jarvis_owner();
INSERT INTO public.user_roles(user_id,role) SELECT id,'admin'::public.app_role FROM auth.users WHERE public.jarvis_owner_email_matches(email,email_confirmed_at) ON CONFLICT DO NOTHING;
CREATE TABLE public.jarvis_runtime (id boolean PRIMARY KEY DEFAULT true CHECK(id), voice_rate numeric NOT NULL DEFAULT 1 CHECK(voice_rate BETWEEN 0.9 AND 1.05), focus_layout boolean NOT NULL DEFAULT false, revision integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.jarvis_runtime TO anon,authenticated; GRANT ALL ON public.jarvis_runtime TO service_role;
ALTER TABLE public.jarvis_runtime ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_runtime_read ON public.jarvis_runtime FOR SELECT TO anon,authenticated USING(true);
CREATE TABLE public.jarvis_update_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL,patch_id text NOT NULL CHECK(patch_id IN ('voice-calm-v1','focus-layout-v1')),before_rate numeric NOT NULL,before_focus boolean NOT NULL,revision integer NOT NULL,rolled_back boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.jarvis_update_history TO authenticated; GRANT ALL ON public.jarvis_update_history TO service_role;
ALTER TABLE public.jarvis_update_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_history_read ON public.jarvis_update_history FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.install_jarvis_update(p_update text,p_rollback boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE current_row public.jarvis_runtime; last_update public.jarvis_update_history; BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Somente a conta autorizada pode instalar atualizações.' USING ERRCODE='42501'; END IF;
 IF p_update NOT IN ('voice-calm-v1','focus-layout-v1') THEN RAISE EXCEPTION 'Atualização não reconhecida.'; END IF;
 INSERT INTO public.jarvis_runtime(id) VALUES(true) ON CONFLICT DO NOTHING;
 SELECT * INTO current_row FROM public.jarvis_runtime WHERE id=true FOR UPDATE;
 IF p_rollback THEN
  SELECT * INTO last_update FROM public.jarvis_update_history ORDER BY created_at DESC,id DESC LIMIT 1;
  IF last_update.id IS NULL OR last_update.rolled_back OR last_update.patch_id<>p_update OR last_update.revision<>current_row.revision THEN RAISE EXCEPTION 'Só a última instalação pode ser desfeita.'; END IF;
  UPDATE public.jarvis_runtime SET voice_rate=last_update.before_rate,focus_layout=last_update.before_focus,revision=revision+1,updated_at=now() WHERE id=true;
  UPDATE public.jarvis_update_history SET rolled_back=true WHERE id=last_update.id;
 ELSE
  IF (p_update='voice-calm-v1' AND current_row.voice_rate=0.96) OR (p_update='focus-layout-v1' AND current_row.focus_layout) THEN RETURN to_jsonb(current_row); END IF;
  INSERT INTO public.jarvis_update_history(actor_id,patch_id,before_rate,before_focus,revision) VALUES(auth.uid(),p_update,current_row.voice_rate,current_row.focus_layout,current_row.revision+1);
  UPDATE public.jarvis_runtime SET voice_rate=CASE WHEN p_update='voice-calm-v1' THEN 0.96 ELSE voice_rate END,focus_layout=CASE WHEN p_update='focus-layout-v1' THEN true ELSE focus_layout END,revision=revision+1,updated_at=now() WHERE id=true;
 END IF;
 SELECT * INTO current_row FROM public.jarvis_runtime WHERE id=true;
 RETURN to_jsonb(current_row);
END $$;
REVOKE ALL ON FUNCTION public.install_jarvis_update(text,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.install_jarvis_update(text,boolean) TO authenticated;
DO $$ BEGIN
 IF NOT public.jarvis_owner_email_matches('lucas.bessa.clezar@gmail.com',now()) THEN RAISE EXCEPTION 'Confirmed owner enrollment test failed'; END IF;
 IF public.jarvis_owner_email_matches('lucas.bessa.clezar@gmail.com',NULL) THEN RAISE EXCEPTION 'Unconfirmed account enrollment test failed'; END IF;
 IF public.jarvis_owner_email_matches('other@gmail.com',now()) THEN RAISE EXCEPTION 'Other account enrollment test failed'; END IF;
END $$;