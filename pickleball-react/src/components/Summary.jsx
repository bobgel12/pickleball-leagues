import React from 'react';
import { computeSummary } from '../utils/scoring.js';

export default function Summary({ tournament, getPlayerById }) {
  if (!tournament) return null;

  const data = computeSummary(tournament, getPlayerById);
  
  if (!data || data.length === 0) {
    return (
      <section className="card rightcol">
        <h2>Summary (Wins/Losses, Points%)</h2>
        <div className="section" style={{ overflow: 'auto' }}>
          <div className="muted">No players yet. Add players to see statistics.</div>
        </div>
      </section>
    );
  }

  const pointsLeader = data[0];
  let pctLeader = data[0];
  data.forEach(entry => {
    if (entry.winPct > (pctLeader?.winPct ?? -Infinity)) {
      pctLeader = entry;
    }
  });

  const scoringSystem = tournament.scoringSystem || 'simple';
  const percentageExplanation = scoringSystem === 'smart'
    ? 'Points % = Weighted Points ÷ Total Weighted Points<br>Weighted by: Court difficulty + Opponent strength'
    : 'Points % = Points Scored ÷ Total Points in All Games';

  let highlightHTML;
  if (pointsLeader && pointsLeader.id === (pctLeader?.id ?? null)) {
    highlightHTML = (
      <span className="chip active">
        Overall Leader: {pointsLeader.name} ({pointsLeader.points} pts · {pctLeader.winPct}% points)
      </span>
    );
  } else if (pointsLeader) {
    highlightHTML = (
      <>
        <span className="chip active">
          Points Leader: {pointsLeader.name} ({pointsLeader.points} pts)
        </span>
        <span className="chip leader-secondary">
          Points % Leader: {pctLeader?.name ?? pointsLeader.name} ({pctLeader?.winPct ?? pointsLeader.winPct}%)
        </span>
      </>
    );
  } else {
    highlightHTML = null;
  }

  return (
    <section className="card rightcol">
      <h2>Summary (Wins/Losses, Points%)</h2>
      <div className="section" style={{ overflow: 'auto' }}>
        <div id="leaderHighlights" className="chips" style={{ marginBottom: '8px' }}>
          {highlightHTML}
        </div>
        <table id="summaryTable">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Points %</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => {
              const isPointsLeader = pointsLeader && s.id === pointsLeader.id;
              const isPctLeader = s.id === pctLeader?.id;
              return (
                <tr
                  key={`summary-${s.id}-${i}-${s.name}`}
                  className={`${isPointsLeader ? 'points-leader' : ''} ${isPctLeader ? 'pct-leader' : ''}`}
                >
                  <td className="mono">{i + 1}</td>
                  <td>{s.name}</td>
                  <td className="mono">{s.wins}</td>
                  <td className="mono">{s.losses}</td>
                  <td className="mono">{s.winPct}%</td>
                  <td className="mono">{s.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="muted" style={{ marginTop: '8px', fontSize: '11px' }} dangerouslySetInnerHTML={{ __html: percentageExplanation }} />
      </div>
    </section>
  );
}

