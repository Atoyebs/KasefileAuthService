-- V2__Create_session_table.sql

CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES "user" (id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
