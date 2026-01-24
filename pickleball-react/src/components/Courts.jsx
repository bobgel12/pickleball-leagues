import React, { useState, useEffect } from 'react';
import { parseScore } from '../utils/csvParser.js';
import { CheckCircle2, Edit, Send, Trophy, Award, Undo2 } from 'lucide-react';

export default function Courts({ tournament, getPlayerById, onSubmitRound, onSubmitCourt, onRevertRound, updateTournament, toast }) {
  // Initialize scores from tournament state (persisted scores) or empty array
  const [scores, setScores] = useState(() => {
    return tournament.pendingScores || ['', '', '', ''];
  });

  // Update scores when tournament changes (e.g., switching tournaments)
  useEffect(() => {
    setScores(tournament.pendingScores || ['', '', '', '']);
  }, [tournament.id, tournament.pendingScores]);

  const handleScoreChange = (courtIndex, value) => {
    const newScores = [...scores];
    newScores[courtIndex] = value;
    setScores(newScores);
    
    // Persist score to tournament state immediately
    if (updateTournament) {
      updateTournament(tournament.id, (t) => ({
        ...t,
        pendingScores: newScores
      }));
    }
  };

  const handleSubmitCourt = (courtIndex) => {
    const score = scores[courtIndex];
    if (!score || !score.trim()) {
      if (toast) toast.warning(`Please enter a score for Court ${courtIndex + 1}`);
      return;
    }

    // Validate score format
    const parsed = parseScore(score);
    if (!parsed) {
      if (toast) toast.error(`Court ${courtIndex + 1}: Invalid score format. Please use format like "11-7".`);
      return;
    }

    if (parsed.a === parsed.b) {
      if (toast) toast.error(`Court ${courtIndex + 1}: Ties are not supported.`);
      return;
    }

    // Mark this court as submitted (just save the score, don't process yet)
    if (onSubmitCourt) {
      onSubmitCourt(courtIndex, score);
      if (toast) toast.success(`Court ${courtIndex + 1} submitted`);
    }
  };

  const handleSubmit = () => {
    // Call onSubmitRound - it will return true on success, false on failure
    const success = onSubmitRound(scores);
    
    // Only update local state if submission is successful
    // The onSubmitRound function already clears scores in tournament state on success
    // If it returns false, scores will remain for retry
    if (success === true) {
      // Sync local state with tournament state (which was already cleared by onSubmitRound)
      const emptyScores = ['', '', '', ''];
      setScores(emptyScores);
    }
    // If success is false, scores remain unchanged in both local and tournament state
  };

  const slotHTML = (player) => {
    if (!player) {
      return (
        <div className="slot">
          <span className="muted">Empty</span>
          <span className="tag">—</span>
        </div>
      );
    }
    return (
      <div className="slot">
        <span>{player.name}</span>
        <span className="tag mono">{player.points ?? 0} pts</span>
      </div>
    );
  };

  const handleEditCourt = (courtIndex) => {
    // Remove from submitted courts to allow editing
    if (updateTournament) {
      const submittedCourts = tournament.submittedCourts || [];
      updateTournament(tournament.id, (t) => ({
        ...t,
        submittedCourts: submittedCourts.filter(idx => idx !== courtIndex)
      }));
    }
  };

  const courtEntryHTML = (courtIndex, A, B) => {
    const hasValidCourt = A.length >= 2 && B.length >= 2;
    const hasScore = scores[courtIndex] && scores[courtIndex].trim();
    const isSubmitted = tournament.submittedCourts && tournament.submittedCourts.includes(courtIndex);
    
    return (
      <>
        <div className="teams">
          <div className="team">
            {slotHTML(A[0])}
            {slotHTML(A[1])}
          </div>
          <div className="vs">
            <span style={{ fontSize: '18px', fontWeight: 700 }}>VS</span>
          </div>
          <div className="team">
            {slotHTML(B[0])}
            {slotHTML(B[1])}
          </div>
        </div>
        <div className="row" style={{ alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9\\-:x ]*"
            placeholder="Score e.g., 11-7"
            value={scores[courtIndex] || ''}
            onChange={(e) => handleScoreChange(courtIndex, e.target.value)}
            style={{ 
              width: '140px',
              opacity: isSubmitted ? 0.7 : 1,
              backgroundColor: isSubmitted ? '#f0f0f0' : 'white',
              borderColor: isSubmitted ? '#4CAF50' : undefined
            }}
            disabled={!hasValidCourt || isDisabled}
          />
          {hasValidCourt && !isSubmitted && (
            <button
              className="btn"
              onClick={() => handleSubmitCourt(courtIndex)}
              disabled={!hasScore || isDisabled}
              style={{ 
                fontSize: '14px', 
                padding: '6px 12px',
                opacity: hasScore ? 1 : 0.5
              }}
            >
              <Send size={14} />
              Submit Court {courtIndex + 1}
            </button>
          )}
          {isSubmitted && (
            <>
              <span className="muted" style={{ fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} />
                Submitted
              </span>
              <button
                className="btn"
                onClick={() => handleEditCourt(courtIndex)}
                disabled={isDisabled}
                style={{ 
                  fontSize: '12px', 
                  padding: '4px 8px',
                  marginLeft: '4px'
                }}
                title="Edit score"
              >
                <Edit size={14} />
                Edit
              </button>
            </>
          )}
          {!hasValidCourt && !isSubmitted && (
            <span className="muted">Enter score for this court</span>
          )}
        </div>
      </>
    );
  };

  const isDisabled = tournament.matchLimit && tournament.matchesPlayed >= tournament.matchLimit;
  
  // Check if all courts with players have been submitted
  const submittedCourts = tournament.submittedCourts || [];
  const allCourtsSubmitted = [0, 1, 2, 3].every(idx => {
    const court = tournament.courts[idx] || [];
    const A = court.slice(0, 2);
    const B = court.slice(2, 4);
    // If court has 4 players, it must be submitted
    if (A.length >= 2 && B.length >= 2) {
      return submittedCourts.includes(idx);
    }
    // Empty courts don't need to be submitted
    return true;
  });
  
  const canSubmitRound = allCourtsSubmitted && !isDisabled;

  return (
    <section className="card rightcol">
      <h2>Courts</h2>
      <div className="courts" id="courts">
        {tournament.courts.map((court, idx) => {
          const courtNo = idx + 1;
          const courtLabels = {
            1: { label: 'Highest', icon: Trophy, color: 'var(--warning)' },
            2: { label: '', icon: Award, color: 'var(--text-secondary)' },
            3: { label: '', icon: Award, color: 'var(--text-secondary)' },
            4: { label: 'Lowest', icon: Award, color: 'var(--text-secondary)' }
          };
          const courtInfo = courtLabels[courtNo] || { label: '', icon: Award, color: 'var(--text-secondary)' };
          const Icon = courtInfo.icon;
          const title = `Court ${courtNo} ${courtInfo.label ? `(${courtInfo.label})` : ''}`;
          // Normalize IDs to numbers for consistent lookup
          const players = court.map(id => getPlayerById(Number(id))).filter(Boolean);
          const A = players.slice(0, 2);
          const B = players.slice(2, 4);

          return (
            <div key={idx} className="court">
              <header>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon size={18} style={{ color: courtInfo.color }} />
                  {title}
                </strong>
                <span className="muted">On court: {court.length}</span>
              </header>
              <div className="body">
                {courtEntryHTML(idx, A, B)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="section">
        <div className="row" style={{ justifyContent: 'center', marginTop: '15px', gap: '12px' }}>
          <button
            className="btn primary"
            onClick={handleSubmit}
            disabled={!canSubmitRound}
            style={{ 
              fontSize: '16px', 
              padding: '12px 24px',
              opacity: canSubmitRound ? 1 : 0.5
            }}
          >
            <Send size={18} />
            Submit Round
          </button>
          {tournament.lastRoundSnapshot && onRevertRound && (
            <button
              className="btn"
              onClick={onRevertRound}
              style={{ 
                fontSize: '16px', 
                padding: '12px 24px',
                borderColor: 'var(--warning)',
                color: 'var(--warning)'
              }}
              title="Revert the last submitted round"
            >
              <Undo2 size={18} />
              Revert Last Round
            </button>
          )}
        </div>
        <div className="muted" style={{ textAlign: 'center', marginTop: '8px' }}>
          {!allCourtsSubmitted 
            ? 'Submit all courts individually before submitting the round.'
            : 'Submit each court individually, then click "Submit Round" to process all matches and move players.'}
        </div>
      </div>
    </section>
  );
}

