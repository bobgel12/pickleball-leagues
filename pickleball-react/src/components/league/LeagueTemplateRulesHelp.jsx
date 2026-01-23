import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { LEAGUE_TEMPLATES } from '../../data/leagueTemplates.js';
import { EVENT_DAY_RULES, formatSchedule } from '../../utils/constants.js';

const LABELS = {
  initialAssignment: {
    [EVENT_DAY_RULES.initialAssignment.BLIND_DRAW]: 'Blind Draw (random)',
    [EVENT_DAY_RULES.initialAssignment.DUPR_BASED]: 'DUPR Based',
    [EVENT_DAY_RULES.initialAssignment.RANDOM]: 'Random',
    [EVENT_DAY_RULES.initialAssignment.POINTS_BASED]: 'Points Based'
  },
  ladderMovement: {
    [EVENT_DAY_RULES.ladderMovement.WINNERS_UP_LOSERS_DOWN]: 'Winners Up / Losers Down',
    [EVENT_DAY_RULES.ladderMovement.ONE_PLAYER_UP_DOWN]: 'One Player Up / Down',
    [EVENT_DAY_RULES.ladderMovement.STANDARD_LADDER]: 'Standard Ladder',
    [EVENT_DAY_RULES.ladderMovement.PARTNER_BASED]: 'Partner Based (Mixed Doubles)'
  },
  poolFormat: {
    [EVENT_DAY_RULES.poolFormat.POOLS_OF_4]: 'Pools of 4',
    [EVENT_DAY_RULES.poolFormat.POOLS_OF_5]: 'Pools of 5',
    [EVENT_DAY_RULES.poolFormat.POOLS_OF_4_OR_5]: 'Pools of 4 or 5'
  },
  startingMethod: {
    [EVENT_DAY_RULES.startingMethod.BLIND_DRAW]: 'Blind Draw',
    [EVENT_DAY_RULES.startingMethod.LADDER_POSITION]: 'Ladder Position',
    [EVENT_DAY_RULES.startingMethod.RANDOM_START]: 'Random Start'
  },
  divisibilityRequirement: {
    [EVENT_DAY_RULES.divisibilityRequirement.DIVISIBLE_BY_4]: 'Divisible by 4',
    [EVENT_DAY_RULES.divisibilityRequirement.DIVISIBLE_BY_5]: 'Divisible by 5',
    [EVENT_DAY_RULES.divisibilityRequirement.FLEXIBLE]: 'Flexible'
  },
  roundRobinType: {
    [EVENT_DAY_RULES.roundRobinType.FULL_ROUND_ROBIN]: 'Full Round Robin',
    [EVENT_DAY_RULES.roundRobinType.POOL_PLAY]: 'Pool Play',
    [EVENT_DAY_RULES.roundRobinType.MIX_AND_SPLIT]: 'Mix and Split'
  }
};

const ruleEntries = [
  { key: 'initialAssignment', label: 'Initial Court Assignment' },
  { key: 'ladderMovement', label: 'Ladder Movement' },
  { key: 'poolFormat', label: 'Pool Format' },
  { key: 'startingMethod', label: 'Starting Method' },
  { key: 'divisibilityRequirement', label: 'Divisibility Requirement' },
  { key: 'roundRobinType', label: 'Round Robin Type' }
];

export default function LeagueTemplateRulesHelp() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="card" style={{ marginTop: '16px' }}>
      <button
        className="btn"
        onClick={() => setIsExpanded((prev) => !prev)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <HelpCircle size={16} />
        League Template Day Rules
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
          {LEAGUE_TEMPLATES.map((template) => (
            <div key={template.id} style={{ padding: '12px 16px', background: 'var(--surface)', borderRadius: '8px' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>{template.name}</div>
              {template.schedule && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Schedule: {formatSchedule(template.schedule)}
                </div>
              )}
              <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
                {ruleEntries.map((entry) => {
                  const value = template.eventDayRules?.[entry.key];
                  const label = LABELS[entry.key]?.[value] || value || 'Not set';
                  return (
                    <div key={entry.key} style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontWeight: '600', minWidth: '180px' }}>{entry.label}:</span>
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
