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

# ImageKit Configuration (Required for image/video uploads)
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key_here
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key_here
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint_here
```

3. **ImageKit Setup** (Required for base64 image uploads):
   - Sign up at [ImageKit.io](https://imagekit.io/)
   - Go to your dashboard and get your credentials
   - Add them to your `.env` file
   - Test the connection: `GET /api/upload/test-imagekit`

4. Start the development server:
```bash
npm run dev
```

## ImageKit Configuration

This application uses ImageKit for handling base64 image and video uploads. All media files are automatically compressed and uploaded to ImageKit when creating or updating workshops.

### Required Environment Variables:
- `IMAGEKIT_PUBLIC_KEY`: Your ImageKit public key
- `IMAGEKIT_PRIVATE_KEY`: Your ImageKit private key  
- `IMAGEKIT_URL_ENDPOINT`: Your ImageKit URL endpoint

### Testing ImageKit Connection:
```bash
# Test ImageKit configuration
curl http://localhost:5000/api/upload/test-imagekit

# Test base64 upload
curl -X POST http://localhost:5000/api/upload/test-base64 \
  -H "Content-Type: application/json" \
  -d '{"base64Data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="}'
```

### Troubleshooting Base64 Uploads:
1. Ensure all ImageKit environment variables are set
2. Check server logs for detailed error messages
3. Verify base64 data format: `data:image/jpeg;base64,/9j/4AAQ...`
4. Test with the provided test endpoints

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