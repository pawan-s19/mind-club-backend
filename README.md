# Mind Club Backend

A Node.js backend with Express and MongoDB for the Mind Club application.

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mind-club
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=30d
```

3. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user (Protected)

### Users (Admin Only)
- GET `/api/users` - Get all users
- GET `/api/users/:id` - Get single user
- PUT `/api/users/:id` - Update user
- DELETE `/api/users/:id` - Delete user

## Project Structure

```
Backend/
├── controllers/         # Route controllers
├── middleware/         # Custom middleware
├── models/            # Mongoose models
├── routes/            # Routes
├── .env              # Environment variables
├── package.json      # Project dependencies
├── server.js         # Entry point
└── README.md         # Project documentation
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Protected routes require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Error Handling

The API uses a centralized error handling mechanism. All errors are returned in the following format:

```json
{
    "success": false,
    "message": "Error message"
}
```

## Success Response Format

Successful responses follow this format:

```json
{
    "success": true,
    "data": {
        // Response data
    }
}
``` 