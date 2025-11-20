import React, { useState } from 'react';

export default function Help() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="card rightcol">
      <h2
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        Help & Guide
        <span style={{ fontSize: '12px', color: '#666' }}>{isOpen ? '▲' : '▼'}</span>
      </h2>
      {isOpen && (
        <div className="section" id="helpContent">
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#155ee7' }}>🎯 Scoring Systems</h3>
            <div style={{ marginBottom: '15px', padding: '10px', background: '#f8faff', borderRadius: '8px', borderLeft: '3px solid #155ee7' }}>
              <strong>Simple Scoring:</strong> Win +1, Loss -1. Perfect for casual leagues. Easy to understand and track. No court difficulty consideration.
            </div>
            <div style={{ marginBottom: '15px', padding: '10px', background: '#f8faff', borderRadius: '8px', borderLeft: '3px solid #155ee7' }}>
              <strong>Court Weighted:</strong> Higher courts give more points. Court 1=1 pt, Court 2=2 pts, Court 3=3 pts, Court 4=4 pts. Losses do not deduct points.
            </div>
            <div style={{ marginBottom: '15px', padding: '10px', background: '#f8faff', borderRadius: '8px', borderLeft: '3px solid #155ee7' }}>
              <strong>Smart Points:</strong> Most sophisticated system. Considers court difficulty, opponent strength, and margin of victory. Base 10 points + bonuses.
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#155ee7' }}>🌱 Seeding Methods</h3>
            <div style={{ marginBottom: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '8px', borderLeft: '3px solid #155ee7' }}>
              <strong>Fair Seed Courts (Recommended):</strong><br />
              • Adapts to any group size (1-20+ players)<br />
              • 1-4 players: All on Court 4<br />
              • 5-8 players: Split across Courts 3-4<br />
              • 9-12 players: Use Courts 2-4<br />
              • 13+ players: Use all 4 courts<br />
              • Balanced teams within each court
            </div>
            <div style={{ marginBottom: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '8px', borderLeft: '3px solid #155ee7' }}>
              <strong>Gradual Start:</strong><br />
              • Starts with top 8 players on highest courts<br />
              • Others join as players are eliminated<br />
              • Prevents system overwhelm with large groups<br />
              • Perfect for 16+ player tournaments
            </div>
            <div style={{ marginBottom: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '8px', borderLeft: '3px solid #155ee7' }}>
              <strong>Classic Seed:</strong><br />
              • Original simple seeding method<br />
              • Top 4 on Court 4, next 4 on Court 3, etc.<br />
              • Familiar to existing users<br />
              • Good for consistent skill levels
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#155ee7' }}>📊 How to Use</h3>
            <div style={{ padding: '10px', background: '#f9f9f9', borderRadius: '8px', fontSize: '12px', lineHeight: '1.4' }}>
              <strong>Step 1:</strong> Add players with DUPR ratings (2.000-8.000, 3 decimal places)<br />
              <strong>Step 2:</strong> Select your preferred scoring system<br />
              <strong>Step 3:</strong> Choose a seeding method that fits your group<br />
              <strong>Step 4:</strong> Set match limit and start playing!<br />
              <strong>Step 5:</strong> Enter scores and watch rankings update automatically
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#155ee7' }}>💡 Tips & Recommendations</h3>
            <div style={{ padding: '10px', background: '#fff8f0', borderRadius: '8px', fontSize: '12px', lineHeight: '1.4' }}>
              <strong>For Beginners:</strong> Use Simple scoring + Classic seed<br />
              <strong>For Mixed Skill:</strong> Use Court Weighted + Fair seed<br />
              <strong>For Competitive:</strong> Use Smart Points + Fair seed<br />
              <strong>For Large Groups:</strong> Use any scoring + Gradual start<br />
              <strong>DUPR Ratings:</strong> 6.000+ Elite, 4.500-5.999 Advanced, 3.000-4.499 Intermediate, 2.000-2.999 Beginner
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

