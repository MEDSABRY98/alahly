# Football Database Desktop Application

A comprehensive desktop application for managing football match data, player statistics, and team analytics using React, Electron, and Google Sheets as the data source.

## Features

- **Match Registration**: Complete match data entry with multiple tabs for different aspects
  - Basic match information (teams, scores, date, venue)
  - Goalkeeper performance tracking
  - Goals and assists recording
  - Penalty statistics (earned and missed)
- **Match Management**: View, search, and filter all matches
- **Team Statistics**: Comprehensive team performance analytics
- **Player Statistics**: Individual player performance tracking
- **Data Export**: Export data to CSV format
- **Offline Support**: Local caching with Google Sheets synchronization

## Technology Stack

- **Frontend**: React 18 with modern hooks
- **Desktop**: Electron for cross-platform desktop app
- **State Management**: Zustand for lightweight state management
- **Data Source**: Google Sheets API
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React for consistent iconography
- **Styling**: CSS3 with modern flexbox/grid layouts

## Project Structure

```
├─ /electron/                      # Electron main process
├─ /src/
│  ├─ /pages/
│  │  ├─ /MatchRegister/           # Match registration with tabs
│  │  ├─ /MatchesList/             # Match listing and management
│  │  ├─ /TeamStats/               # Team statistics and analytics
│  │  └─ /PlayerStats/             # Player statistics and analytics
│  ├─ /components/                  # Reusable UI components
│  ├─ /services/
│  │  ├─ sheetsService.js          # Google Sheets API integration
│  │  └─ syncService.js            # Data synchronization and caching
│  ├─ /store/                      # Zustand state management
│  ├─ /utils/                      # Utility functions and constants
│  └─ App.jsx                      # Main application component
├─ /public/                        # Static assets
├─ package.json
└─ README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Cloud Platform account
- Google Sheets with proper structure

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Footballdatabase
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Google Sheets API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Sheets API
   - Create credentials (API Key)
   - Create a Google Sheet with the following structure:

   **Sheets needed:**
   - `Matches`: Date, Time, Home Team, Away Team, Home Score, Away Score, Competition, Venue, Referee, Notes
   - `Players`: Name, Team, Position, Jersey Number, Date of Birth, Nationality
   - `Teams`: Name, League, Country, Founded, Stadium
   - `Goals`: Match ID, Player ID, Team, Minute, Assist Player ID, Goal Type, Is Own Goal
   - `GoalkeeperStats`: Match ID, Player ID, Team, Saves, Goals Conceded, Clean Sheet
   - `Penalties`: Match ID, Player ID, Team, Minute, Type, Converted, Saved

4. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your Google API credentials:
   ```
   REACT_APP_GOOGLE_API_KEY=your_api_key_here
   REACT_APP_GOOGLE_SHEET_ID=your_sheet_id_here
   ```

### Running the Application

#### Development Mode
```bash
# Start React development server
npm start

# In another terminal, start Electron
npm run electron-dev
```

#### Production Build
```bash
# Build the React app
npm run build

# Package as desktop application
npm run electron-pack
```

## Google Sheets Setup

### Required Sheet Structure

1. **Matches Sheet** (A1:J1 headers):
   - A: Date
   - B: Time
   - C: Home Team
   - D: Away Team
   - E: Home Score
   - F: Away Score
   - G: Competition
   - H: Venue
   - I: Referee
   - J: Notes

2. **Players Sheet** (A1:F1 headers):
   - A: Name
   - B: Team
   - C: Position
   - D: Jersey Number
   - E: Date of Birth
   - F: Nationality

3. **Teams Sheet** (A1:E1 headers):
   - A: Name
   - B: League
   - C: Country
   - D: Founded
   - E: Stadium

4. **Goals Sheet** (A1:G1 headers):
   - A: Match ID
   - B: Player ID
   - C: Team
   - D: Minute
   - E: Assist Player ID
   - F: Goal Type
   - G: Is Own Goal

5. **GoalkeeperStats Sheet** (A1:F1 headers):
   - A: Match ID
   - B: Player ID
   - C: Team
   - D: Saves
   - E: Goals Conceded
   - F: Clean Sheet

6. **Penalties Sheet** (A1:G1 headers):
   - A: Match ID
   - B: Player ID
   - C: Team
   - D: Minute
   - E: Type
   - F: Converted
   - G: Saved

## Usage

### Match Registration
1. Navigate to "Register Match" from the sidebar
2. Fill in basic match information in the first tab
3. Add goalkeeper statistics in the "Goalkeepers" tab
4. Record goals and assists in the "Goals" tab
5. Track missed penalties in the "Missed Penalties" tab
6. Record earned penalties in the "Earned Penalties" tab
7. Click "Save Match" to store the data

### Viewing Matches
1. Go to "Matches List" to see all registered matches
2. Use the search bar to find specific matches
3. Filter by team or competition using the dropdown filters
4. Click "View Details" on any match card for more information

### Team Statistics
1. Navigate to "Team Statistics"
2. Select a team from the dropdown
3. View comprehensive team performance metrics
4. Analyze team performance with interactive charts

### Player Statistics
1. Go to "Player Statistics"
2. Select a player from the dropdown
3. View individual player performance data
4. Track goals, assists, and other statistics

## Data Export

The application supports exporting data to CSV format:
- Match data can be exported with all relevant columns
- Player statistics can be exported for analysis
- Team performance data can be exported for reporting

## Development

### Adding New Features
1. Create new components in `/src/components/`
2. Add new pages in `/src/pages/`
3. Update the routing in `App.jsx`
4. Add new services in `/src/services/` if needed
5. Update the store in `/src/store/` for state management

### Styling
- Use CSS modules for component-specific styles
- Follow the existing design system and color scheme
- Ensure responsive design for different screen sizes

### State Management
- Use Zustand store for global state
- Keep component state local when possible
- Use the sync service for data persistence

## Troubleshooting

### Common Issues

1. **Google Sheets API Errors**
   - Verify API key is correct
   - Check if Google Sheets API is enabled
   - Ensure sheet ID is correct
   - Verify sheet structure matches requirements

2. **Electron Build Issues**
   - Make sure all dependencies are installed
   - Check Node.js version compatibility
   - Clear npm cache if needed

3. **Data Sync Issues**
   - Check internet connection
   - Verify Google Sheets permissions
   - Clear application cache

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Deployment on Render

This application can be deployed on Render.com as a web service:

### Prerequisites for Render Deployment

1. **Google Service Account Setup**
   - Create a Google Cloud Project
   - Enable Google Sheets API
   - Create a Service Account
   - Download the service account JSON file
   - Share your Google Sheet with the service account email

2. **Environment Variables on Render**
   Set these environment variables in your Render service:
   ```
   NODE_ENV=production
   PORT=5000
   GOOGLE_SHEET_ID=1xNBqgK5q5GRAfMn-teH64WFLvGNVtBXppxLgzWi8GeY
   GOOGLE_PROJECT_ID=your-project-id
   GOOGLE_PRIVATE_KEY_ID=your-private-key-id
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   GOOGLE_CLIENT_ID=your-client-id
   ```

### Deploy Steps

1. **Connect Repository**
   - Connect your GitHub repository to Render
   - Select the repository: `MEDSABRY98/alahly`

2. **Create Web Service**
   - Service Type: Web Service
   - Build Command: `npm install && npm run build && cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Environment: Node

3. **Configure Environment Variables**
   - Add all the required environment variables listed above
   - Make sure to use the exact format for GOOGLE_PRIVATE_KEY

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application

### Important Notes for Render Deployment

- The application uses the backend server to serve both API endpoints and the React frontend
- Make sure your Google Sheet ID is correct: `1xNBqgK5q5GRAfMn-teH64WFLvGNVtBXppxLgzWi8GeY`
- The service account must have edit permissions on the Google Sheet
- The application will be available at your Render URL (e.g., `https://your-app-name.onrender.com`)

## Support

For support and questions, please open an issue in the repository or contact the development team.
