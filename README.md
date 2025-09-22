# Pickleball League Tournament Manager

A comprehensive web application for managing 4-court pickleball league tournaments with offline-first design and local data persistence.

## 🏓 Features

### Player Management
- **Add Players**: Register players with custom names and seed scores (rating system)
- **Random Player Generation**: Quick testing feature with auto-generated names and seed scores
- **Player Controls**: Adjust seed scores, remove players, and track league points
- **Real-time Player List**: View all players with current standings

### Tournament System
- **4-Court Hierarchy**: Courts 1-4 with Court 4 being the "Highest" and Court 1 being the "Lowest"
- **2v2 Team Play**: 4 players per court organized into Team A vs Team B
- **Smart Seeding**: Higher seed scores start on higher courts
- **Court Progression**: Winners move up courts, losers move down after each match

### Scoring & Points
- **Flexible Score Input**: Enter match scores in format like "11-7"
- **Automatic Winner Detection**: Determines winner based on score input
- **Point System**:
  - Win: +1 point (Court 4: +2 points)
  - Loss: -1 point
  - Defending highest court: +2 points

### League Management
- **Match Limits**: Set maximum number of matches for the league
- **Progress Tracking**: Visual progress bar showing matches played vs limit
- **League Reset**: Start new league while keeping players and seeding
- **New League**: Reset points and matches while preserving player data

### Statistics & Reporting
- **Leaderboard**: Ranked by points (displayed when match limit reached)
- **Summary Table**: Shows wins, losses, win percentage, and points for each player
- **Match History**: Complete record with timestamps, teams, scores, and winners
- **Advanced Filtering**: Filter by court (1-4) or specific player

### Data Management
- **Offline-First**: Works without internet connection
- **Data Persistence**: Uses cookies with localStorage fallback
- **Export/Import**: Save and load league state as JSON files
- **Data Reset**: Clear all saved data option

## 🚀 Getting Started

1. **Open the App**: Simply open `index.html` in any modern web browser
2. **Add Players**: Enter player names and seed scores, or use "Add Random Player" for testing
3. **Seed Courts**: Click "Seed Courts" to organize players by their seed scores
4. **Start Playing**: Enter match scores and submit results
5. **Track Progress**: Monitor league progress, statistics, and match history

## 🎯 Perfect For

- Local pickleball clubs running tournaments
- Recreational leagues with 4+ players
- Round-robin style competitions
- Leagues wanting to track player progression and statistics
- Offline tournament management

## 🛠️ Technical Details

- **Pure HTML/CSS/JavaScript**: No external dependencies
- **Responsive Design**: Works on desktop and mobile devices
- **Local Storage**: Data persists between sessions
- **Modern UI**: Clean, professional interface with intuitive controls

## 📱 Usage Tips

- **Seeding**: Higher seed scores (e.g., 1200) start on higher courts
- **Court Progression**: Winners automatically move up, losers move down
- **Score Format**: Use format like "11-7" or "15-13"
- **Data Backup**: Use Export/Import to backup your league data
- **Mobile Friendly**: Works great on tablets and phones for on-court use

## 🔧 Advanced Features

- **Shuffle Pairs**: Randomize team pairings while keeping court assignments
- **Player Filtering**: View match history for specific players
- **Court Filtering**: Focus on matches from specific courts
- **Score Validation**: Prevents ties and validates score format
- **Real-time Updates**: All displays update automatically after actions

---

## ⚠️ Legal Disclaimer

**USE AT YOUR OWN RISK**

This software is provided "as is" without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

The user assumes all responsibility and liability for the use of this application. The developers make no guarantees about the accuracy, reliability, or suitability of this software for any particular purpose.

---

*Built for pickleball enthusiasts who want a simple, powerful tournament management solution.*
