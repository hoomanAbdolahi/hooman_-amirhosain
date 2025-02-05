CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id VARCHAR(255) NOT NULL,
    receiver_id VARCHAR(255) NOT NULL,
    message_content TEXT NOT NULL,
    chat_session_id INTEGER REFERENCES chat_sessions(id),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);