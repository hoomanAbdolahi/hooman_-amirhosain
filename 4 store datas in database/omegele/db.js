const { Pool } = require('pg');
// require('dotenv').config();

const pool = new Pool({
    user: "postgres",
    password: "13488431",
    host: "localhost",
    port: 5432,
    database: "omegle"
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Database connected successfully');
    release();
});

// Helper functions for common database operations
const dbOperations = {
    // Log chat sessions
    async logChatSession(user1Id, user2Id) {
        const query = `
            INSERT INTO chat_sessions (user1_id, user2_id, start_time)
            VALUES ($1, $2, NOW())
            RETURNING id;
        `;
        try {
            const result = await pool.query(query, [user1Id, user2Id]);
            return result.rows[0];
        } catch (err) {
            console.error('Error logging chat session:', err);
            throw err;
        }
    },

    // Log user connections
    async logUserConnection(socketId, ipAddress) {
        const query = `
            INSERT INTO user_connections (socket_id, ip_address, connection_time)
            VALUES ($1, $2, NOW())
            RETURNING id;
        `;
        try {
            const result = await pool.query(query, [socketId, ipAddress]);
            return result.rows[0];
        } catch (err) {
            console.error('Error logging user connection:', err);
            throw err;
        }
    },

    // Log chat messages
    async logChatMessage(senderId, receiverId, message, chatSessionId) {
        const query = `
            INSERT INTO chat_messages (sender_id, receiver_id, message_content, chat_session_id, timestamp)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id;
        `;
        try {
            const result = await pool.query(query, [senderId, receiverId, message, chatSessionId]);
            return result.rows[0];
        } catch (err) {
            console.error('Error logging chat message:', err);
            throw err;
        }
    },
};

module.exports = {
    pool,
    dbOperations
}; 