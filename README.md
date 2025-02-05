# hooman_-amirhosain
# Chat Application

## 📌 Introduction
This is a real-time chat application using **Node.js, Express, Socket.io**, and **WebRTC** to enable peer-to-peer video chat. The application includes a simple matchmaking system for connecting users to chat with each other.

## 🚀 Features
- Real-time text chat
- WebRTC video/audio chat
- User matchmaking system
- Chat message logging in PostgreSQL database
- Express API endpoints for managing chats

## 🛠️ Installation & Setup
### Prerequisites
Make sure you have the following installed:
- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)

### Step 1: Clone Repository
```sh
git clone https://github.com/hoomanAbdolahi/hooman_-amirhosain.git
cd chat-app
```

### Step 2: Install Dependencies
```sh
npm install
```

### Step 3: Configure Database
Modify the `db.js` file with your PostgreSQL credentials:
```js
const pool = new Pool({
    user: "your_user",
    password: "your_password",
    host: "localhost",
    port: 5432,
    database: "your_database"
});
```
Run database migrations if needed.

### Step 4: Run the Server
```sh
npm start
```
By default, the server runs on **http://localhost:3000**

## 📁 Project Structure
```
├── public/            # Static assets (HTML, CSS, JS)
├── server.js         # Express server & Socket.io logic
├── db.js             # PostgreSQL database operations
├── client.js         # Frontend socket handling
├── package.json      # Dependencies & scripts
└── README.md         # Documentation
```

## 📝 API Endpoints
### Log Chat Message
**POST** `/api/chat-message`
#### Request Body
```json
{
  "senderId": "user1",
  "receiverId": "user2",
  "message": "Hello!",
  "chatSessionId": 123
}
```
#### Response
```json
{
  "success": true,
  "messageId": 456
}
```

## 🎥 WebRTC Signaling Events
| Event Name  | Description |
|------------|------------|
| `offer`    | Sent when a user creates an offer |
| `answer`   | Sent when a user responds to an offer |
| `iceCandidate` | Sent when an ICE candidate is available |
| `chatStarted` | Emitted when two users are matched |
| `chatEnded` | Emitted when a chat session ends |

## 🏆 Contributors
- **Your Name** ([GitHub Profile](https://github.com/YOUR_USERNAME))

## 📝 License
This project is licensed under the MIT License.

