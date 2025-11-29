import React, { useState } from 'react';
import { 
  HelpCircle, ChevronDown, ChevronUp, Users, Calendar, 
  Trophy, ArrowUpDown, Target, CheckCircle, Award,
  ClipboardList, TrendingUp, Zap
} from 'lucide-react';
import { LEAGUE_DEFAULTS } from '../../utils/constants.js';

export default function LeagueHelp({ league }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  // Use league config or defaults
  const maxPlayers = league?.maxPlayers || LEAGUE_DEFAULTS.maxPlayers;
  const maxPlayersPerDay = league?.maxPlayersPerDay || LEAGUE_DEFAULTS.maxPlayersPerDay;
  const totalEventDays = league?.totalEventDays || LEAGUE_DEFAULTS.totalEventDays;
  const courtsCount = Math.ceil(maxPlayersPerDay / 5);
  const playersPerCourt = Math.floor(maxPlayersPerDay / courtsCount);

  const sections = [
    {
      id: 'overview',
      icon: HelpCircle,
      title: 'What is a Ladder League?',
      content: `
A Ladder League is a multi-day pickleball competition where players compete across several event days, 
moving up or down a "ladder" based on their performance. Unlike single-day tournaments, your position 
and points accumulate over the entire league season.

**Key Features:**
• Up to ${maxPlayers} registered players in the league
• ${maxPlayersPerDay} players can check in per event day (first-come-first-served)
• ${courtsCount} courts with ${playersPerCourt} players each
• Players move between courts based on daily performance
• Cumulative points determine final standings
      `
    },
    {
      id: 'registration',
      icon: Users,
      title: 'Player Registration',
      content: `
**Registering Players:**
• Add up to ${maxPlayers} players to your league
• Each player needs a name and DUPR rating (2.000-8.000)
• Import players via CSV file or add individually
• DUPR ratings are used for initial court assignments on Day 1

**Player Data Tracked:**
• Cumulative points across all event days
• Total wins and losses
• Win percentage
• Points scored and allowed
• Event days attended
• Court and ladder position history
      `
    },
    {
      id: 'checkin',
      icon: CheckCircle,
      title: 'Event Day Check-In',
      content: `
**How Check-In Works:**
• Before each event day, players must check in
• Maximum ${maxPlayersPerDay} players per event day (first-come-first-served)
• Players not checked in retain their stats for future days
• Check-in closes when admin starts the matches

**Check-In Tips:**
• Arrive early to secure your spot
• Players who check in are assigned to courts
• Those who don't check in still keep their league stats
      `
    },
    {
      id: 'courts',
      icon: Target,
      title: 'Court Assignment',
      content: `
**Day 1 - DUPR-Based Assignment:**
• Players sorted by DUPR rating (highest to lowest)
• Top 5 rated players go to Court 4 (Highest)
• Next 5 go to Court 3, then Court 2
• Lowest 5 rated players start on Court 1 (Lowest)

**Day 2+ - Points-Based Assignment:**
• Players sorted by cumulative league points
• Top 5 point earners go to Court 4
• Assignment continues down by points
• New players start based on DUPR within available spots
      `
    },
    {
      id: 'roundrobin',
      icon: ClipboardList,
      title: 'Round-Robin Format',
      content: `
**5-Player Round-Robin:**
Each court runs a social doubles round-robin where every player partners with every other player exactly once.

**Match Structure:**
• 5 rounds per court
• Each round: 4 players play doubles, 1 sits out
• By end of day: You've partnered with all 4 other players
• Total: 5 matches per player per court

**Example Schedule (Court with players A,B,C,D,E):**
• Round 1: A+B vs C+D (E sits)
• Round 2: A+C vs D+E (B sits)
• Round 3: A+D vs B+E (C sits)
• Round 4: A+E vs B+C (D sits)
• Round 5: B+D vs C+E (A sits)
      `
    },
    {
      id: 'ladder',
      icon: ArrowUpDown,
      title: 'Ladder Movement',
      content: `
**End of Each Event Day:**
Players are ranked within their court based on performance. Movement rules:

**Standard Movement:**
• Top 2 players on each court → Move UP one court
• Bottom 2 players on each court → Move DOWN one court
• Middle player → Stays on same court

**Edge Cases:**
• Court 4 (Highest): Top 2 stay, bottom 2 move down
• Court 1 (Lowest): Bottom 2 stay, top 2 move up

**Movement Takes Effect:**
• Applied at the START of the next event day
• Only applies to players who check in for that day
      `
    },
    {
      id: 'scoring',
      icon: Zap,
      title: 'Scoring Systems',
      content: `
**Simple Scoring:**
• Win: +1 point
• Loss: -1 point
• Easy to understand, doesn't consider court difficulty

**Court Weighted:**
• Court 1 win: +1 point
• Court 2 win: +2 points
• Court 3 win: +3 points
• Court 4 win: +4 points
• Losses: No point deduction
• Rewards winning on higher courts

**Smart Points:**
• Base points from court level
• Bonus for beating stronger opponents
• Bonus for winning by larger margin
• Most sophisticated, rewards quality wins
      `
    },
    {
      id: 'standings',
      icon: TrendingUp,
      title: 'Standings & Leaders',
      content: `
**League Standings:**
• Ranked by cumulative points (primary)
• Can sort by win percentage, total wins, etc.
• Filter by minimum games played

**Leader Badges:**
• 🏆 Points Leader: Most cumulative points
• 🥇 Win % Leader: Highest win percentage (min. games required)

**Final League Champion:**
• If same player leads both → Overall League Champion
• Otherwise: Separate Points Champion and Win % Champion
      `
    },
    {
      id: 'moneyround',
      icon: Zap,
      title: 'Money Round (Optional)',
      content: `
**What is the Money Round?**
The Money Round is an optional second phase after the regular League Round. Players compete on their NEW court assignments (after ladder movement) to determine prize pool contributions.

**Two-Phase Event Day Structure:**
1. **Phase 1 - League Round:** Regular round-robin determining points and ladder movement
2. **Phase 2 - Money Round:** Optional round-robin on new courts for prize pool

**How Contributions Work:**
• After Money Round, each player contributes based on their court rank
• 1st place pays least (default $1), 5th place pays most (default $5)
• Per court total: $15 ($1+$2+$3+$4+$5)
• Per event day: $60 (4 courts × $15)
• Full league: Up to $600+ depending on event days

**Tied Rankings:**
• Tied players split the contribution amounts
• Example: Tied 2nd/3rd each pay $2.50 instead of $2 and $3

**Key Points:**
• Money Round scores do NOT affect league standings
• All checked-in players must participate if enabled
• Admin tracks paid/unpaid contributions
• Prize pool can be distributed at league end or per event
      `
    },
    {
      id: 'tips',
      icon: Award,
      title: 'Strategy Tips',
      content: `
**For New Players:**
• Check in early to guarantee your spot
• Play consistently to build points over time
• Lower courts are easier to accumulate wins

**For Competitive Players:**
• Winning on Court 4 earns maximum points
• Strong partners help, but you face them next round
• Balance aggression with consistency

**For League Admins:**
• Export data regularly for backup
• Use Smart Points for most balanced competition
• Close event days promptly to apply ladder movement
• Configure Money Round for added competition

**Money Round Strategy:**
• Perform well in League Round to move up before Money Round
• Win in Money Round to minimize your contribution
• Court 4 winners contribute least overall
      `
    }
  ];

  const toggleSection = (id) => {
    setActiveSection(activeSection === id ? null : id);
  };

  return (
    <section className="card league-help">
      <h2 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
          margin: 0, 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle size={20} />
          Ladder League Guide
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </h2>

      {isExpanded && (
        <div className="league-help-content" style={{ marginTop: '20px' }}>
          {/* Quick Overview */}
          <div className="help-overview" style={{ 
            background: 'var(--surface)', 
            padding: '20px', 
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Quick Overview</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px' 
            }}>
              <div className="overview-item">
                <strong>{maxPlayers}</strong> max registered players
              </div>
              <div className="overview-item">
                <strong>{maxPlayersPerDay}</strong> players per event day
              </div>
              <div className="overview-item">
                <strong>{courtsCount}</strong> courts with {playersPerCourt} players each
              </div>
              <div className="overview-item">
                <strong>{playersPerCourt}</strong> matches per player per day
              </div>
            </div>
          </div>

          {/* Accordion Sections */}
          <div className="help-sections">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <div 
                  key={section.id} 
                  className={`help-section ${isActive ? 'active' : ''}`}
                  style={{
                    background: isActive ? 'var(--surface)' : 'var(--bg)',
                    borderRadius: '10px',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`
                  }}
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      color: isActive ? 'var(--primary)' : 'var(--text)',
                      fontWeight: isActive ? '600' : '500',
                      fontSize: '15px'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Icon size={18} />
                      {section.title}
                    </span>
                    {isActive ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  
                  {isActive && (
                    <div 
                      className="help-section-content"
                      style={{ 
                        padding: '0 20px 20px 52px',
                        lineHeight: '1.7',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {section.content.split('**').map((part, i) => (
                        i % 2 === 1 
                          ? <strong key={i} style={{ color: 'var(--text)' }}>{part}</strong>
                          : <span key={i}>{part}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Visual Ladder Diagram */}
          <div style={{ 
            marginTop: '24px',
            background: 'var(--surface)',
            padding: '24px',
            borderRadius: '12px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowUpDown size={18} />
              Ladder Movement Visualization
            </h3>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              textAlign: 'center'
            }}>
              {[4, 3, 2, 1].map((court) => (
                <div 
                  key={court}
                  style={{
                    background: court === 4 ? 'linear-gradient(135deg, #f59e0b, #ea580c)' :
                               court === 3 ? 'linear-gradient(135deg, #3b82f6, #2563eb)' :
                               court === 2 ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' :
                               'linear-gradient(135deg, #64748b, #475569)',
                    color: 'white',
                    padding: '16px 12px',
                    borderRadius: '10px'
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>Court {court}</div>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>
                    {court === 4 ? '(Highest)' : court === 1 ? '(Lowest)' : ''}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    marginTop: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ color: '#86efac' }}>↑ Top 2 move up</span>
                    <span style={{ opacity: 0.8 }}>— Middle stays</span>
                    <span style={{ color: '#fca5a5' }}>↓ Bottom 2 move down</span>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ 
              margin: '16px 0 0', 
              fontSize: '13px', 
              color: 'var(--text-secondary)',
              textAlign: 'center'
            }}>
              Exception: Court 4 top 2 stay (can't go higher), Court 1 bottom 2 stay (can't go lower)
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

