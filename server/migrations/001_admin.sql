CREATE TABLE owner_account (
  id smallint PRIMARY KEY CHECK (id = 1),
  username text NOT NULL UNIQUE,
  email text NOT NULL,
  password_hash text NOT NULL,
  auth_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE admin_sessions (
  token_hash text PRIMARY KEY,
  owner_id smallint NOT NULL REFERENCES owner_account(id) ON DELETE CASCADE,
  csrf_hash text NOT NULL,
  auth_version integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX admin_sessions_expiry ON admin_sessions(expires_at);
CREATE TABLE password_reset_tokens (
  token_hash text PRIMARY KEY,
  owner_id smallint NOT NULL REFERENCES owner_account(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX password_reset_expiry ON password_reset_tokens(expires_at);
CREATE TABLE analytics_events (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('page_view','book_open','boosty_click')),
  visitor_id uuid,
  session_id uuid NOT NULL,
  referrer_host text,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_time ON analytics_events(received_at);
CREATE INDEX analytics_session ON analytics_events(session_id,received_at);
CREATE TABLE feedback_messages (
  id uuid PRIMARY KEY,
  payload_hash text NOT NULL,
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
  name text CHECK (char_length(name) <= 80),
  email text CHECK (char_length(email) <= 254),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX feedback_inbox ON feedback_messages(status,created_at DESC,id DESC);
CREATE INDEX feedback_all ON feedback_messages(created_at DESC,id DESC);
CREATE TABLE rate_limits (
  scope text NOT NULL,
  key_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (scope,key_hash,window_start)
);
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
