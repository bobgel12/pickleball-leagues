export function exportMatchHistoryToCSV(tournament, getPlayerById) {
  if (!tournament || !tournament.matches || tournament.matches.length === 0) {
    return null;
  }

  const headers = ['Date', 'Time', 'Court', 'Team A Player 1', 'Team A Player 2', 'Team B Player 1', 'Team B Player 2', 'Score A', 'Score B', 'Total Score', 'Winner'];
  const rows = tournament.matches.map(match => {
    const date = new Date(match.ts || Date.now());
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString();
    
    const teamA = match.A.map(id => {
      const player = getPlayerById(Number(id));
      return player?.name || `Player ${id}`;
    });
    const teamB = match.B.map(id => {
      const player = getPlayerById(Number(id));
      return player?.name || `Player ${id}`;
    });

    const scoreA = match.scoreA || 0;
    const scoreB = match.scoreB || 0;
    const totalScore = scoreA + scoreB;
    const winner = match.winner === 'A' ? 'Team A' : 'Team B';

    return [
      dateStr,
      timeStr,
      `Court ${match.court || ''}`,
      teamA[0] || '',
      teamA[1] || '',
      teamB[0] || '',
      teamB[1] || '',
      scoreA,
      scoreB,
      totalScore,
      winner
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `match-history-${tournament.name || 'tournament'}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportLeaderboardToCSV(tournament, getPlayerById) {
  if (!tournament || !tournament.players || tournament.players.length === 0) {
    return null;
  }

  const sorted = [...tournament.players].sort((a, b) => (b.points || 0) - (a.points || 0));

  const headers = ['Rank', 'Player Name', 'DUPR Rating', 'Points', 'Matches Played', 'Win Rate'];
  
  // Calculate matches played and win rate
  const playerStats = {};
  tournament.matches?.forEach(match => {
    const winners = match.winner === 'A' ? match.A : match.B;
    const losers = match.winner === 'A' ? match.B : match.A;
    [...winners, ...losers].forEach(playerId => {
      if (!playerStats[playerId]) {
        playerStats[playerId] = { wins: 0, losses: 0 };
      }
      if (winners.includes(playerId)) {
        playerStats[playerId].wins++;
      } else {
        playerStats[playerId].losses++;
      }
    });
  });

  const rows = sorted.map((player, idx) => {
    const stats = playerStats[player.id] || { wins: 0, losses: 0 };
    const totalMatches = stats.wins + stats.losses;
    const winRate = totalMatches > 0 ? ((stats.wins / totalMatches) * 100).toFixed(1) : '0.0';

    return [
      idx + 1,
      player.name,
      player.seed?.toFixed(3) || 'N/A',
      player.points || 0,
      totalMatches,
      `${winRate}%`
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `leaderboard-${tournament.name || 'tournament'}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


