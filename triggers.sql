
CREATE OR REPLACE FUNCTION notify_update_event() RETURNS TRIGGER AS $$
DECLARE
  channel TEXT := 'updates_channel';
  payload JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'table', lower(TG_TABLE_NAME),
      'action', TG_OP,
      'data', to_jsonb(OLD)
    );
  ELSE
    payload := jsonb_build_object(
      'table', lower(TG_TABLE_NAME),
      'action', TG_OP,
      'data', to_jsonb(NEW)
    );
  END IF;

  RAISE NOTICE 'Notify %: %', channel, payload;
  PERFORM pg_notify(channel, payload::text);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_notify_trigger ON "User";
DROP TRIGGER IF EXISTS project_notify_trigger ON "Project";
DROP TRIGGER IF EXISTS chain_notify_trigger ON "Chain";
DROP TRIGGER IF EXISTS task_notify_trigger ON "Task";
DROP TRIGGER IF EXISTS taskuser_notify_trigger ON "TaskUser";
DROP TRIGGER IF EXISTS comment_notify_trigger ON "Comment";
DROP TRIGGER IF EXISTS file_notify_trigger ON "File";


CREATE TRIGGER user_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON "User"
FOR EACH ROW EXECUTE FUNCTION notify_update_event();

CREATE TRIGGER project_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Project"
FOR EACH ROW EXECUTE FUNCTION notify_update_event();

CREATE TRIGGER chain_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Chain"
FOR EACH ROW EXECUTE FUNCTION notify_update_event();

CREATE TRIGGER task_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Task"
FOR EACH ROW EXECUTE FUNCTION notify_update_event();

CREATE TRIGGER taskuser_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON "TaskUser"
FOR EACH ROW EXECUTE FUNCTION notify_update_event();

CREATE TRIGGER comment_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON "Comment"
FOR EACH ROW EXECUTE FUNCTION notify_update_event();

CREATE TRIGGER file_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON "File"
FOR EACH ROW EXECUTE FUNCTION notify_update_event();
