# Cricket Scoring App Backend API

A comprehensive RESTful API for cricket match scoring and management built with Node.js, Express, and MongoDB.

## Features

- **User Authentication & Authorization**

  - JWT-based authentication
  - Role-based access control (Admin, Scorer, Viewer)

- **Team Management**

  - Create and manage cricket teams
  - Team statistics and player roster

- **Player Management**

  - Player profiles with detailed information
  - Performance statistics tracking

- **Match Management**

  - Schedule and manage cricket matches
  - Support for different formats (T20, ODI, Test, T10)
  - Toss management and match setup

- **Live Scoring**

  - Ball-by-ball scoring
  - Real-time match updates
  - Automatic scorecard generation

- **Statistics & Analytics**

  - Player performance metrics
  - Team statistics
  - Leaderboards for runs, wickets, etc.

- **API Documentation**
  - Interactive Swagger UI documentation
  - Comprehensive API testing interface

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Apurv3027/Cricket-Scoring-Api.git
   cd cricket-scoring-api
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:

   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cricket_scoring
   JWT_SECRET=your_super_secret_jwt_key
   NODE_ENV=development
   PORT=5000
   ```

4. **Start the server**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## MongoDB Atlas Setup

1. Create a MongoDB Atlas account at https://cloud.mongodb.com
2. Create a new cluster
3. Create a database user with read/write permissions
4. Whitelist your IP address
5. Get the connection string and update MONGODB_URI in .env

## API Documentation

Once the server is running, visit:

- **Swagger UI**: `http://localhost:5000/api-docs`
- **API Base URL**: `http://localhost:5000/api`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Teams

- `GET /api/teams` - Get all teams
- `POST /api/teams` - Create new team
- `GET /api/teams/:id` - Get team by ID
- `PUT /api/teams/:id` - Update team

### Players

- `GET /api/players` - Get all players
- `POST /api/players` - Create new player
- `GET /api/players/:id` - Get player by ID

### Matches

- `GET /api/matches` - Get all matches
- `POST /api/matches` - Create new match
- `GET /api/matches/:id` - Get match by ID
- `PATCH /api/matches/:id/start` - Start match with toss

### Scoring

- `POST /api/scoring/ball` - Record a ball
- `GET /api/scoring/match/:id/scorecard` - Get match scorecard
- `GET /api/scoring/live` - Get live matches

### Statistics

- `GET /api/stats/player/:id` - Get player statistics
- `GET /api/stats/team/:id` - Get team statistics
- `GET /api/stats/leaderboard` - Get leaderboards

## Usage Examples

### 1. Register a User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "scorer1",
    "email": "scorer@example.com",
    "password": "password123",
    "role": "scorer"
  }'
```

### 2. Create a Team

```bash
curl -X POST http://localhost:5000/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Mumbai Indians",
    "shortName": "MI",
    "homeGround": "Wankhede Stadium",
    "coach": "Mahela Jayawardene"
  }'
```

### 3. Create a Match

```bash
curl -X POST http://localhost:5000/api/matches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "team1": "TEAM1_ID",
    "team2": "TEAM2_ID",
    "matchType": "T20",
    "overs": 20,
    "venue": "Wankhede Stadium"
  }'
```

### 4. Record a Ball

```bash
curl -X POST http://localhost:5000/api/scoring/ball \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "match": "MATCH_ID",
    "bowler": "BOWLER_ID",
    "batsman": "BATSMAN_ID",
    "runs": 4,
    "commentary": "Beautiful cover drive for four!"
  }'
```

## Database Schema

### Collections:

- **users** - User authentication and roles
- **teams** - Team information and roster
- **players** - Player profiles and stats
- **matches** - Match details and results
- **balls** - Ball-by-ball scoring data

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting
- Input validation
- XSS protection with Helmet
- CORS enabled

## Error Handling

The API uses consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
