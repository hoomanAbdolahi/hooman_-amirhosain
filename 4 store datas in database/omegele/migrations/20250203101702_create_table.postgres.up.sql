
CREATE TABLE chat_sessions (
    id SERIAL PRIMARY KEY,
    user1_id VARCHAR(255),
    user2_id VARCHAR(255),
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    duration INTEGER
);

CREATE TABLE user_connections (
    id SERIAL PRIMARY KEY,
    socket_id VARCHAR(255),
    ip_address VARCHAR(45),
    connection_time TIMESTAMP DEFAULT NOW(),
    disconnection_time TIMESTAMP,
    session_duration INTEGER
);

CREATE INDEX idx_chat_sessions_users ON chat_sessions(user1_id, user2_id);
CREATE INDEX idx_chat_sessions_time ON chat_sessions(start_time);
CREATE INDEX idx_user_connections_socket ON user_connections(socket_id);