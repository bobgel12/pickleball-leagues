import React, { useState, useMemo } from 'react';
import { 
  DollarSign, CheckCircle, XCircle, ArrowLeft, 
  TrendingUp, Users, Calendar, Award, Filter
} from 'lucide-react';

/**
 * PrizePoolDashboard - Manage prize pool contributions and payouts
 */
export default function PrizePoolDashboard({
  league,
  getPrizePoolBalance,
  getTotalUnpaid,
  getPlayerBalance,
  markContributionPaid,
  markContributionUnpaid,
  recordPayout,
  getPlayerById,
  onNavigate,
  toast
}) {
  const [filter, setFilter] = useState('all'); // 'all', 'unpaid', 'paid'
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutReason, setPayoutReason] = useState('');

  const prizePoolBalance = getPrizePoolBalance();
  const totalUnpaid = getTotalUnpaid();
  const contributions = league.prizePool?.contributions || [];
  const payouts = league.prizePool?.payouts || [];

  // Filter contributions
  const filteredContributions = useMemo(() => {
    let filtered = [...contributions];
    
    if (filter === 'unpaid') {
      filtered = filtered.filter(c => !c.paid);
    } else if (filter === 'paid') {
      filtered = filtered.filter(c => c.paid);
    }
    
    // Sort by date descending
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    return filtered;
  }, [contributions, filter]);

  // Group contributions by player
  const playerSummaries = useMemo(() => {
    const summaries = {};
    
    contributions.forEach(c => {
      if (!summaries[c.playerId]) {
        const player = getPlayerById(c.playerId);
        summaries[c.playerId] = {
          playerId: c.playerId,
          playerName: player?.name || `Player ${c.playerId}`,
          totalOwed: 0,
          totalPaid: 0,
          contributionCount: 0
        };
      }
      
      summaries[c.playerId].contributionCount++;
      if (c.paid) {
        summaries[c.playerId].totalPaid += c.amount;
      } else {
        summaries[c.playerId].totalOwed += c.amount;
      }
    });
    
    return Object.values(summaries).sort((a, b) => b.totalOwed - a.totalOwed);
  }, [contributions, getPlayerById]);

  const handleTogglePaid = (contribution) => {
    if (contribution.paid) {
      markContributionUnpaid(contribution.id);
      if (toast) toast.info('Marked as unpaid');
    } else {
      markContributionPaid(contribution.id);
      if (toast) toast.success('Marked as paid');
    }
  };

  const handleRecordPayout = () => {
    if (!selectedPlayer || !payoutAmount) {
      if (toast) toast.warning('Select a player and enter amount');
      return;
    }

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      if (toast) toast.error('Invalid payout amount');
      return;
    }

    if (amount > prizePoolBalance) {
      if (toast) toast.error('Payout exceeds prize pool balance');
      return;
    }

    recordPayout(parseInt(selectedPlayer), amount, payoutReason || 'Prize payout');
    setSelectedPlayer('');
    setPayoutAmount('');
    setPayoutReason('');
    if (toast) toast.success(`$${amount} payout recorded`);
  };

  const getEventDayLabel = (eventDayId) => {
    const eventDay = league.eventDays?.find(d => d.id === eventDayId);
    return eventDay ? `Day ${eventDay.dayNumber}` : `Event ${eventDayId}`;
  };

  return (
    <div className="prize-pool-dashboard">
      {/* Back Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button className="btn" onClick={() => onNavigate('dashboard')}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>

      {/* Prize Pool Summary Cards */}
      <div className="prize-pool-summary">
        <div className="prize-pool-card balance">
          <DollarSign size={24} />
          <div>
            <div className="card-value">${prizePoolBalance.toFixed(2)}</div>
            <div className="card-label">Current Balance</div>
          </div>
        </div>
        <div className="prize-pool-card unpaid">
          <XCircle size={24} />
          <div>
            <div className="card-value">${totalUnpaid.toFixed(2)}</div>
            <div className="card-label">Unpaid Contributions</div>
          </div>
        </div>
        <div className="prize-pool-card paid">
          <CheckCircle size={24} />
          <div>
            <div className="card-value">${(prizePoolBalance + totalUnpaid).toFixed(2)}</div>
            <div className="card-label">Total Collected</div>
          </div>
        </div>
        <div className="prize-pool-card payouts">
          <Award size={24} />
          <div>
            <div className="card-value">${payouts.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</div>
            <div className="card-label">Total Payouts</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="prize-pool-content">
        {/* Contributions Section */}
        <section className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <TrendingUp size={20} />
            Contributions
          </h2>

          {/* Filter */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button 
              className={`btn ${filter === 'all' ? 'primary' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({contributions.length})
            </button>
            <button 
              className={`btn ${filter === 'unpaid' ? 'primary' : ''}`}
              onClick={() => setFilter('unpaid')}
            >
              Unpaid ({contributions.filter(c => !c.paid).length})
            </button>
            <button 
              className={`btn ${filter === 'paid' ? 'primary' : ''}`}
              onClick={() => setFilter('paid')}
            >
              Paid ({contributions.filter(c => c.paid).length})
            </button>
          </div>

          {/* Contributions List */}
          <div className="contributions-list">
            {filteredContributions.length > 0 ? (
              filteredContributions.map(c => {
                const player = getPlayerById(c.playerId);
                return (
                  <div key={c.id} className={`contribution-item ${c.paid ? 'paid' : 'unpaid'}`}>
                    <div className="contribution-info">
                      <div className="contribution-player">{player?.name || 'Unknown'}</div>
                      <div className="contribution-meta">
                        {getEventDayLabel(c.eventDayId)} • Court {(c.courtIndex || 0) + 1} • Rank #{c.rank || '?'}
                      </div>
                    </div>
                    <div className="contribution-amount">${c.amount.toFixed(2)}</div>
                    <button
                      className={`btn ${c.paid ? 'success' : 'warn'}`}
                      onClick={() => handleTogglePaid(c)}
                      title={c.paid ? 'Mark as unpaid' : 'Mark as paid'}
                    >
                      {c.paid ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      {c.paid ? 'Paid' : 'Unpaid'}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <DollarSign size={32} style={{ opacity: 0.5 }} />
                <p>No contributions yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Player Balances Section */}
        <section className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Users size={20} />
            Player Balances
          </h2>

          <div className="player-balances-list">
            {playerSummaries.length > 0 ? (
              playerSummaries.map(summary => (
                <div key={summary.playerId} className="player-balance-item">
                  <div className="player-name">{summary.playerName}</div>
                  <div className="player-balance-details">
                    {summary.totalOwed > 0 && (
                      <span className="balance-owed">${summary.totalOwed.toFixed(2)} owed</span>
                    )}
                    {summary.totalPaid > 0 && (
                      <span className="balance-paid">${summary.totalPaid.toFixed(2)} paid</span>
                    )}
                    <span className="balance-count">{summary.contributionCount} entries</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Users size={32} style={{ opacity: 0.5 }} />
                <p>No player data yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Record Payout Section */}
        <section className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Award size={20} />
            Record Payout
          </h2>

          <div className="payout-form">
            <div className="form-group">
              <label>Player</label>
              <select 
                value={selectedPlayer} 
                onChange={(e) => setSelectedPlayer(e.target.value)}
              >
                <option value="">Select player...</option>
                {league.registeredPlayers?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={prizePoolBalance}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>Reason</label>
              <input
                type="text"
                value={payoutReason}
                onChange={(e) => setPayoutReason(e.target.value)}
                placeholder="League champion, etc."
              />
            </div>
            <button 
              className="btn primary"
              onClick={handleRecordPayout}
              disabled={!selectedPlayer || !payoutAmount || parseFloat(payoutAmount) > prizePoolBalance}
            >
              <DollarSign size={16} />
              Record Payout
            </button>
          </div>

          {/* Payout History */}
          {payouts.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Payout History</h3>
              <div className="payouts-list">
                {payouts.map(p => {
                  const player = getPlayerById(p.playerId);
                  return (
                    <div key={p.id} className="payout-item">
                      <div>
                        <div className="payout-player">{player?.name || 'Unknown'}</div>
                        <div className="payout-reason">{p.reason}</div>
                      </div>
                      <div className="payout-amount">${p.amount.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

