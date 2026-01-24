// @ts-check
import { test, expect } from '@playwright/test';
import { LEAGUE_TEMPLATES } from '../src/data/leagueTemplates.js';

const EVENT_DAY_RULE_SELECTORS = {
  initialAssignment: 'Initial Court Assignment',
  ladderMovement: 'Ladder Movement',
  poolFormat: 'Pool Format',
  startingMethod: 'Starting Method',
  divisibilityRequirement: 'Divisibility Requirement',
  roundRobinType: 'Round Robin Type'
};

const TEST_CLUB_SLUG = 'test-club';
let storedLeagues = [];
let leagueCounter = 1;

async function resetToLeague(page, { skipEnsure = false } = {}) {
  storedLeagues = [];
  leagueCounter = 1;

  await page.route('**/api/clubs/**', async route => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    const parsedUrl = new URL(url);

    if (url.match(/\/api\/clubs\/[^/]+$/)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ club: { slug: TEST_CLUB_SLUG, name: 'Test Club' } })
      });
    }

    if (url.includes('/league')) {
      if (method === 'GET') {
        const leagueId = parsedUrl.searchParams.get('leagueId');
        if (leagueId) {
          const league = storedLeagues.find(item => String(item.leagueId) === String(leagueId));
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ league: league || null })
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ leagues: storedLeagues })
        });
      }
      if (method === 'POST') {
        const body = request.postDataJSON?.() || {};
        const leagueId = `league-${leagueCounter++}`;
        const league = {
          id: leagueId,
          leagueId,
          leagueName: body.leagueName || `Test League ${leagueCounter}`,
          status: 'active',
          description: body.description || null,
          data: body.data || {}
        };
        storedLeagues = [...storedLeagues, league];
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ league })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    }

    if (url.includes('/players')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ players: [] })
      });
    }

    if (url.includes('/matches')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  await page.addInitScript((slug) => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.sessionStorage.setItem('pickleball_club_slug', slug);
    window.localStorage.setItem('pickleball_club_slug', slug);
    window.sessionStorage.setItem(`pickleball_admin_auth_${slug}`, JSON.stringify({
      authenticated: true,
      masterKey: 'test-master-key',
      timestamp: Date.now()
    }));
  }, TEST_CLUB_SLUG);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('.section-tab:has-text("Ladder League")').click();
  await page.waitForTimeout(300);
  if (!skipEnsure) {
    await ensureLeagueDashboard(page);
  }
}

async function openSetup(page) {
  await ensureLeagueDashboard(page);
  await page.locator('button:has-text("Manage Players")').click();
  await page.waitForTimeout(300);
}

async function ensureLeagueDashboard(page) {
  const managePlayers = page.locator('button:has-text("Manage Players")');
  if (await managePlayers.count()) {
    return;
  }

  const createButton = page.locator('main').getByRole('button', { name: 'Create New League' });
  if (await createButton.count()) {
    await createButton.waitFor({ timeout: 10000 });
    await createButton.click();
    await page.getByPlaceholder('e.g., Spring 2024 League').fill('Test League');
    await page.locator('button:has-text("Create League")').click();
    await managePlayers.waitFor({ timeout: 10000 });
    return;
  }

  const leagueCard = page.locator('.league-card').first();
  if (await leagueCard.count()) {
    await leagueCard.click();
    await managePlayers.waitFor({ timeout: 10000 });
  }
}

async function goToLeaguesDashboard(page) {
  const allLeaguesButton = page.locator('button:has-text("All Leagues")');
  if (await allLeaguesButton.count()) {
    await allLeaguesButton.click();
  }
  await expect(page.getByRole('heading', { name: 'Leagues' })).toBeVisible();
}

async function createLeagueFromTemplate(page, template) {
  await goToLeaguesDashboard(page);
  const createButton = page.locator('main').getByRole('button', { name: 'Create New League' });
  await createButton.click();
  const templateSelect = page.locator('label', { hasText: 'Template (optional)' }).locator('..').locator('select');
  await templateSelect.selectOption(template.id);
  const nameInput = page.getByPlaceholder('e.g., Spring 2024 League');
  if (!(await nameInput.inputValue())) {
    await nameInput.fill(template.name);
  }
  await page.locator('button:has-text("Create League")').click();
  await expect(page.locator('button:has-text("Manage Players")')).toBeVisible();
}

async function saveSettings(page) {
  await page.locator('button:has-text("Save Settings")').click();
  await page.waitForTimeout(300);
}

async function setSelectByLabel(page, label, value) {
  const select = page.locator('label', { hasText: label }).locator('..').locator('select');
  await expect(select).toBeVisible();
  await select.selectOption(value);
}

async function setEventDayRules(page, rules) {
  if (rules.initialAssignment) {
    await setSelectByLabel(page, EVENT_DAY_RULE_SELECTORS.initialAssignment, rules.initialAssignment);
  }
  if (rules.ladderMovement) {
    await setSelectByLabel(page, EVENT_DAY_RULE_SELECTORS.ladderMovement, rules.ladderMovement);
  }
  if (rules.poolFormat) {
    await setSelectByLabel(page, EVENT_DAY_RULE_SELECTORS.poolFormat, rules.poolFormat);
  }
  if (rules.startingMethod) {
    await setSelectByLabel(page, EVENT_DAY_RULE_SELECTORS.startingMethod, rules.startingMethod);
  }
  if (rules.divisibilityRequirement) {
    await setSelectByLabel(page, EVENT_DAY_RULE_SELECTORS.divisibilityRequirement, rules.divisibilityRequirement);
  }
  if (rules.roundRobinType) {
    await setSelectByLabel(page, EVENT_DAY_RULE_SELECTORS.roundRobinType, rules.roundRobinType);
  }
}

async function setLeagueMode(page, mode) {
  const select = page.locator('label', { hasText: 'League Mode' }).locator('..').locator('select');
  await expect(select).toBeVisible();
  await select.selectOption(mode);
}

async function addPlayer(page, { name, rating, gender }) {
  await page.locator('input[placeholder="Enter player name"]').fill(name);
  await page.locator('input[placeholder="4.500"]').fill(String(rating));
  if (gender) {
    const genderSelect = page.locator('label', { hasText: 'Gender' }).locator('..').locator('select');
    await genderSelect.selectOption(gender);
  }
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.waitForTimeout(100);
}

async function addPlayers(page, players) {
  for (const player of players) {
    await addPlayer(page, player);
  }
}

async function addRandomPlayers(page, count) {
  for (let i = 0; i < count; i++) {
    await page.locator('button:has-text("Add Random")').click();
    await page.waitForTimeout(30);
  }
}

async function goToDashboard(page) {
  await page.locator('button:has-text("Back to Dashboard")').click();
  await page.waitForTimeout(300);
}

async function startEventDay(page) {
  await page.locator('button:has-text("Start Event Day")').click();
  await page.waitForTimeout(300);
  await expect(page.getByText('Player Check-In')).toBeVisible();
}

async function checkInPlayers(page, count) {
  const available = page.locator('.checkin-column--available .checkin-player');
  const checkedInBadge = page.locator('.checkin-column--checkedin .count-badge');
  await expect(page.getByText('Player Check-In')).toBeVisible();
  await expect.poll(async () => await available.count()).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const beforeText = await checkedInBadge.textContent();
    const beforeCount = beforeText ? parseInt(beforeText.split('/')[0], 10) : i;
    const player = available.first();
    await player.evaluate(el => el.click());
    await expect.poll(async () => {
      const afterText = await checkedInBadge.textContent();
      return afterText ? parseInt(afterText.split('/')[0], 10) : beforeCount;
    }).toBeGreaterThan(beforeCount);
    await page.waitForTimeout(30);
  }
}

async function closeCheckIn(page) {
  page.once('dialog', dialog => dialog.accept());
  const closeButton = page.locator('button:has-text("Close Check-In")');
  await expect(closeButton).toBeEnabled();
  await closeButton.click();
  await page.waitForTimeout(800);
}

function getCourtByLabel(page, label) {
  return page.locator('.league-court').filter({
    has: page.locator('.court-label', { hasText: label })
  });
}

async function getCourtPlayerNames(page, label) {
  const court = getCourtByLabel(page, label);
  return court.locator('.league-court-player .player-name').allTextContents();
}

async function completeVisibleMatches(page) {
  const matchCards = page.locator('.match-card');
  const count = await matchCards.count();
  for (let i = 0; i < count; i++) {
    const card = matchCards.nth(i);
    const input = card.locator('.match-score-input input');
    if (await input.isVisible()) {
      await input.fill('11-7');
      await card.locator('.match-score-input button').click();
      await page.waitForTimeout(50);
    }
  }
  await page.waitForTimeout(200);
}

async function completeCourtMatchWithTeamAWin(page, label) {
  const court = getCourtByLabel(page, label);
  const match = court.locator('.match-card').first();
  const input = match.locator('.match-score-input input');
  await input.fill('11-7');
  await match.locator('.match-score-input button').click();
  await page.waitForTimeout(100);
}

async function openMovementPreview(page) {
  const previewButton = page.locator('button:has-text("Preview Ladder Movement")');
  await previewButton.scrollIntoViewIfNeeded();
  await expect(previewButton).toBeVisible();
  await previewButton.click();
  await page.waitForTimeout(200);
}

async function finishAndStartNextEventDay(page) {
  const completeBanner = page.getByText('All Matches Completed');
  await expect(completeBanner).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  const finishButton = page.locator('button:has-text("Finish & Start Next Event Day")');
  await finishButton.scrollIntoViewIfNeeded();
  await expect(finishButton).toBeVisible();
  await finishButton.click();
  await page.waitForTimeout(400);
}

async function closeEventDayAndStartNext(page, nextDayNumber) {
  const closeButton = page.locator('button:has-text("Close Event Day & Apply Movement")');
  await closeButton.scrollIntoViewIfNeeded();
  await expect(closeButton).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await closeButton.click();
  await page.waitForTimeout(400);

  const startButton = page.locator(`button:has-text("Start Event Day ${nextDayNumber}")`);
  await expect(startButton).toBeVisible();
  await startButton.click();
  await page.waitForTimeout(300);
  await expect(page.getByText('Player Check-In')).toBeVisible();
}

async function playMultipleRounds(page, totalRounds) {
  for (let round = 1; round <= totalRounds; round += 1) {
    await completeVisibleMatches(page);
    const submitButton = page.locator('button:has-text("Submit Round")');
    if (await submitButton.isVisible()) {
      await submitButton.scrollIntoViewIfNeeded();
      await submitButton.click();
      await page.waitForTimeout(300);
    }
    if (round < totalRounds) {
      await expect(
        page.locator('.league-court-header').first().getByText(`Round ${round + 1}`)
      ).toBeVisible({ timeout: 10000 });
    }
  }
}

async function setupLeagueWithRules(page, rules, options = {}) {
  await resetToLeague(page);
  await openSetup(page);
  if (options.leagueMode) {
    await setLeagueMode(page, options.leagueMode);
  }
  await setEventDayRules(page, rules);
  await saveSettings(page);
}

async function setupActiveEventDay(page, {
  rules,
  players,
  randomPlayers = 0,
  checkInCount,
  leagueMode
}) {
  await setupLeagueWithRules(page, rules, { leagueMode });
  if (players?.length) {
    await addPlayers(page, players);
  }
  if (randomPlayers > 0) {
    await addRandomPlayers(page, randomPlayers);
  }
  await goToDashboard(page);
  await startEventDay(page);
  await checkInPlayers(page, checkInCount);
  await closeCheckIn(page);
}

test.describe('Event Day Settings - Initial Assignment', () => {
  test('DUPR-based assignment places top players on Court 4', async ({ page }) => {
    const topPlayers = [
      { name: 'Alpha Ace', rating: 7.5 },
      { name: 'Bravo Blaze', rating: 7.4 },
      { name: 'Charlie Court', rating: 7.3 },
      { name: 'Delta Drive', rating: 7.2 },
      { name: 'Echo Edge', rating: 7.1 }
    ];

    await setupActiveEventDay(page, {
      rules: {
        initialAssignment: 'dupr_based',
        poolFormat: 'pools_of_5'
      },
      players: topPlayers,
      randomPlayers: 15,
      checkInCount: 20
    });

    await expect(page.getByText('Courts & Matches')).toBeVisible();
    const court4Names = await getCourtPlayerNames(page, 'Court 4');
    for (const player of topPlayers) {
      expect(court4Names).toContain(player.name);
    }
  });

  test('Points-based initial assignment generates courts', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        initialAssignment: 'points_based',
        poolFormat: 'pools_of_5'
      },
      randomPlayers: 20,
      checkInCount: 20
    });

    await expect(page.locator('.league-court')).toHaveCount(4);
    await expect(page.locator('.league-court-player')).toHaveCount(20);
  });

  test('Blind draw initial assignment generates courts', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        initialAssignment: 'blind_draw',
        poolFormat: 'pools_of_5'
      },
      randomPlayers: 20,
      checkInCount: 20
    });

    await expect(page.locator('.league-court')).toHaveCount(4);
    await expect(page.locator('.league-court-player')).toHaveCount(20);
  });

  test('Random initial assignment generates courts', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        initialAssignment: 'random',
        poolFormat: 'pools_of_5'
      },
      randomPlayers: 20,
      checkInCount: 20
    });

    await expect(page.locator('.league-court')).toHaveCount(4);
    await expect(page.locator('.league-court-player')).toHaveCount(20);
  });
});

test.describe('Event Day Settings - Starting Method', () => {
  test('Ladder position starts Day 2 based on points', async ({ page }) => {
    const players = [
      { name: 'Top One', rating: 7.0 },
      { name: 'Top Two', rating: 6.9 },
      { name: 'Top Three', rating: 6.8 },
      { name: 'Top Four', rating: 6.7 },
      { name: 'Mid One', rating: 5.0 },
      { name: 'Mid Two', rating: 4.9 },
      { name: 'Mid Three', rating: 4.8 },
      { name: 'Mid Four', rating: 4.7 }
    ];

    await setupActiveEventDay(page, {
      rules: {
        initialAssignment: 'dupr_based',
        startingMethod: 'ladder_position',
        poolFormat: 'pools_of_4'
      },
      players,
      checkInCount: 8
    });

    await completeCourtMatchWithTeamAWin(page, 'Court 4');
    await completeCourtMatchWithTeamAWin(page, 'Court 3');
    await expect(page.locator('.match-card.completed')).toHaveCount(2);

    await closeEventDayAndStartNext(page, 2);
    await checkInPlayers(page, 8);
    await closeCheckIn(page);

    await expect(page.getByText('Courts & Matches')).toBeVisible();
    const court4Names = await getCourtPlayerNames(page, 'Court 4');
    expect(court4Names).toEqual(expect.arrayContaining(['Top One', 'Top Two']));
  });

  test('Blind draw starting method generates courts on Day 2', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        initialAssignment: 'dupr_based',
        startingMethod: 'blind_draw',
        poolFormat: 'pools_of_4'
      },
      randomPlayers: 8,
      checkInCount: 8
    });

    await completeCourtMatchWithTeamAWin(page, 'Court 4');
    await completeCourtMatchWithTeamAWin(page, 'Court 3');
    await closeEventDayAndStartNext(page, 2);
    await checkInPlayers(page, 8);
    await closeCheckIn(page);
    await expect(page.locator('.league-court-player')).toHaveCount(8);
  });

  test('Random start method generates courts on Day 2', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        initialAssignment: 'dupr_based',
        startingMethod: 'random_start',
        poolFormat: 'pools_of_4'
      },
      randomPlayers: 8,
      checkInCount: 8
    });

    await completeCourtMatchWithTeamAWin(page, 'Court 4');
    await completeCourtMatchWithTeamAWin(page, 'Court 3');
    await closeEventDayAndStartNext(page, 2);
    await checkInPlayers(page, 8);
    await closeCheckIn(page);
    await expect(page.locator('.league-court-player')).toHaveCount(8);
  });
});

test.describe('Event Day Settings - Pool Format', () => {
  test('Pools of 4 assign four players per court', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        poolFormat: 'pools_of_4'
      },
      randomPlayers: 16,
      checkInCount: 16
    });

    for (const label of ['Court 4', 'Court 3', 'Court 2', 'Court 1']) {
      const count = await getCourtByLabel(page, label).locator('.league-court-player').count();
      expect(count).toBe(4);
    }
  });

  test('Pools of 5 assign five players per court', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        poolFormat: 'pools_of_5'
      },
      randomPlayers: 20,
      checkInCount: 20
    });

    for (const label of ['Court 4', 'Court 3', 'Court 2', 'Court 1']) {
      const count = await getCourtByLabel(page, label).locator('.league-court-player').count();
      expect(count).toBe(5);
    }
  });

  test('Pools of 4 or 5 choose 4 when count is not divisible by 5', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        poolFormat: 'pools_of_4_or_5'
      },
      randomPlayers: 16,
      checkInCount: 16
    });

    for (const label of ['Court 4', 'Court 3', 'Court 2', 'Court 1']) {
      const count = await getCourtByLabel(page, label).locator('.league-court-player').count();
      expect(count).toBe(4);
    }
  });
});

test.describe('Event Day Settings - Divisibility Requirement', () => {
  test('Divisible by 4 disables close check-in for non-multiples', async ({ page }) => {
    await setupLeagueWithRules(page, {
      divisibilityRequirement: 'divisible_by_4',
      poolFormat: 'pools_of_4'
    });
    await addRandomPlayers(page, 10);
    await goToDashboard(page);
    await startEventDay(page);
    await checkInPlayers(page, 10);

    const closeButton = page.locator('button:has-text("Close Check-In")');
    await expect(closeButton).toBeDisabled();
  });

  test('Divisible by 5 prevents closing when count is invalid', async ({ page }) => {
    await setupLeagueWithRules(page, {
      divisibilityRequirement: 'divisible_by_5',
      poolFormat: 'pools_of_5'
    });
    await addRandomPlayers(page, 12);
    await goToDashboard(page);
    await startEventDay(page);
    await checkInPlayers(page, 12);
    await closeCheckIn(page);
    await expect(page.getByText('Player Check-In')).toBeVisible();
    await expect(page.getByText('Courts & Matches')).toHaveCount(0);
  });

  test('Flexible requirement allows mixed doubles to close with 10 players', async ({ page }) => {
    const players = [
      { name: 'M1', rating: 4.5, gender: 'male' },
      { name: 'M2', rating: 4.4, gender: 'male' },
      { name: 'M3', rating: 4.3, gender: 'male' },
      { name: 'M4', rating: 4.2, gender: 'male' },
      { name: 'M5', rating: 4.1, gender: 'male' },
      { name: 'F1', rating: 4.0, gender: 'female' },
      { name: 'F2', rating: 3.9, gender: 'female' },
      { name: 'F3', rating: 3.8, gender: 'female' },
      { name: 'F4', rating: 3.7, gender: 'female' },
      { name: 'F5', rating: 3.6, gender: 'female' }
    ];

    await setupLeagueWithRules(page, {
      divisibilityRequirement: 'flexible',
      poolFormat: 'pools_of_4_or_5'
    }, { leagueMode: 'mixed_doubles' });

    await addPlayers(page, players);
    await page.locator('button:has-text("Auto-Assign Partners")').click();
    await saveSettings(page);
    await goToDashboard(page);
    await startEventDay(page);
    await checkInPlayers(page, 10);
    await closeCheckIn(page);

    await expect(page.getByText('Courts & Matches')).toBeVisible();
  });
});

test.describe('Event Day Settings - Ladder Movement', () => {
  test('Winners up/losers down produces expected movement counts', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        ladderMovement: 'winners_up_losers_down',
        poolFormat: 'pools_of_4'
      },
      randomPlayers: 8,
      checkInCount: 8
    });

    await completeCourtMatchWithTeamAWin(page, 'Court 4');
    await completeCourtMatchWithTeamAWin(page, 'Court 3');
    await openMovementPreview(page);

    const upCount = await page.locator('.movement-section.up .movement-item').count();
    const downCount = await page.locator('.movement-section.down .movement-item').count();
    expect(upCount).toBe(2);
    expect(downCount).toBe(4);
  });

  test('One player up/down produces expected movement counts', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        ladderMovement: 'one_player_up_down',
        poolFormat: 'pools_of_4'
      },
      randomPlayers: 8,
      checkInCount: 8
    });

    await completeCourtMatchWithTeamAWin(page, 'Court 4');
    await completeCourtMatchWithTeamAWin(page, 'Court 3');
    await openMovementPreview(page);

    const upCount = await page.locator('.movement-section.up .movement-item').count();
    const downCount = await page.locator('.movement-section.down .movement-item').count();
    expect(upCount).toBe(1);
    expect(downCount).toBe(2);
  });

  test('Standard ladder produces expected movement counts', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        ladderMovement: 'standard_ladder',
        poolFormat: 'pools_of_4'
      },
      randomPlayers: 8,
      checkInCount: 8
    });

    await completeCourtMatchWithTeamAWin(page, 'Court 4');
    await completeCourtMatchWithTeamAWin(page, 'Court 3');
    await openMovementPreview(page);

    const upCount = await page.locator('.movement-section.up .movement-item').count();
    const downCount = await page.locator('.movement-section.down .movement-item').count();
    expect(upCount).toBe(2);
    expect(downCount).toBe(4);
  });

  test('Partner-based movement moves winning partners together', async ({ page }) => {
    const players = [
      { name: 'Man A', rating: 5.5, gender: 'male' },
      { name: 'Man B', rating: 5.2, gender: 'male' },
      { name: 'Man C', rating: 4.9, gender: 'male' },
      { name: 'Man D', rating: 4.6, gender: 'male' },
      { name: 'Woman A', rating: 5.4, gender: 'female' },
      { name: 'Woman B', rating: 5.1, gender: 'female' },
      { name: 'Woman C', rating: 4.8, gender: 'female' },
      { name: 'Woman D', rating: 4.5, gender: 'female' }
    ];

    await setupLeagueWithRules(page, {
      ladderMovement: 'partner_based',
      poolFormat: 'pools_of_4'
    }, { leagueMode: 'mixed_doubles' });
    await addPlayers(page, players);
    await page.locator('button:has-text("Auto-Assign Partners")').click();
    await saveSettings(page);
    await goToDashboard(page);
    await startEventDay(page);
    await checkInPlayers(page, 8);
    await closeCheckIn(page);

    const matchCard = page.locator('.match-card').first();
    const winningTeamNames = await matchCard.locator('.team-players').first().textContent();
    await completeVisibleMatches(page);
    await expect(page.locator('.round-header', { hasText: 'Round 2' }).first()).toBeVisible();

    const expectedNames = (winningTeamNames || '')
      .replace(/👥\s*Partner/g, '')
      .split('&')
      .map(name => name.trim())
      .filter(Boolean);
    expect(expectedNames.length).toBeGreaterThanOrEqual(2);

    const courts = ['Court 4', 'Court 3', 'Court 2', 'Court 1'];
    const playerCourts = {};
    for (const label of courts) {
      const names = await getCourtPlayerNames(page, label);
      names.forEach(name => {
        playerCourts[name] = label;
      });
    }

    const [firstPartner, secondPartner] = expectedNames;
    expect(playerCourts[firstPartner]).toBeTruthy();
    expect(playerCourts[secondPartner]).toBeTruthy();
    expect(playerCourts[firstPartner]).not.toBe(playerCourts[secondPartner]);
  });
});

test.describe('Event Day Settings - Round Robin Type', () => {
  const types = [
    { label: 'Full', value: 'full_round_robin' },
    { label: 'Pool Play', value: 'pool_play' },
    { label: 'Mix and Split', value: 'mix_and_split' }
  ];

  for (const type of types) {
    test(`${type.label} round robin generates matches`, async ({ page }) => {
      await setupActiveEventDay(page, {
        rules: {
          roundRobinType: type.value,
          poolFormat: 'pools_of_4'
        },
        randomPlayers: 8,
        checkInCount: 8
      });

      await expect(page.locator('.match-card')).toHaveCount(2);
      await expect(page.locator('.round-header').first()).toBeVisible();
    });
  }
});

test.describe('Event Day Settings - Integration Flow', () => {
  test('Multi-day flow works with configured rules', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        initialAssignment: 'dupr_based',
        startingMethod: 'ladder_position',
        poolFormat: 'pools_of_5',
        ladderMovement: 'standard_ladder'
      },
      randomPlayers: 20,
      checkInCount: 20
    });

    await playMultipleRounds(page, 2);
    await closeEventDayAndStartNext(page, 2);

    await checkInPlayers(page, 20);
    await closeCheckIn(page);
    await expect(page.locator('.league-court-player')).toHaveCount(20);
  });
});

test.describe('League Templates', () => {
  for (const template of LEAGUE_TEMPLATES) {
    test(`template ${template.name} runs multiple rounds`, async ({ page }) => {
      await resetToLeague(page, { skipEnsure: true });
      await createLeagueFromTemplate(page, template);

      await openSetup(page);
      if (template.leagueMode === 'mixed_doubles') {
        const players = [];
        for (let i = 1; i <= 8; i += 1) {
          players.push({ name: `Man ${i}`, rating: 4 + i * 0.1, gender: 'male' });
          players.push({ name: `Woman ${i}`, rating: 4 + i * 0.1, gender: 'female' });
        }
        await addPlayers(page, players.slice(0, 16));
        await page.locator('button:has-text("Auto-Assign Partners")').click();
        await saveSettings(page);
      } else {
        await addRandomPlayers(page, 20);
      }

      await goToDashboard(page);
      await startEventDay(page);

      const checkInCount = template.eventDayRules?.poolFormat === 'pools_of_4'
        ? 16
        : template.eventDayRules?.poolFormat === 'pools_of_5'
          ? 20
          : 16;

      await checkInPlayers(page, checkInCount);
      await closeCheckIn(page);

      await playMultipleRounds(page, 2);
    });
  }
});

test.describe('Event Day Settings - Edge Cases', () => {
  test('Minimum player count creates a single court', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        poolFormat: 'pools_of_4'
      },
      randomPlayers: 4,
      checkInCount: 4
    });

    const court4Count = await getCourtByLabel(page, 'Court 4').locator('.league-court-player').count();
    const court3Count = await getCourtByLabel(page, 'Court 3').locator('.league-court-player').count();
    expect(court4Count).toBe(4);
    expect(court3Count).toBe(0);
  });

  test('Maximum players fill all courts', async ({ page }) => {
    await setupActiveEventDay(page, {
      rules: {
        poolFormat: 'pools_of_5'
      },
      randomPlayers: 20,
      checkInCount: 20
    });

    await expect(page.locator('.league-court-player')).toHaveCount(20);
  });

  test('Odd counts with flexible divisibility in mixed doubles', async ({ page }) => {
    const players = [
      { name: 'M1', rating: 4.5, gender: 'male' },
      { name: 'M2', rating: 4.4, gender: 'male' },
      { name: 'M3', rating: 4.3, gender: 'male' },
      { name: 'M4', rating: 4.2, gender: 'male' },
      { name: 'M5', rating: 4.1, gender: 'male' },
      { name: 'F1', rating: 4.0, gender: 'female' },
      { name: 'F2', rating: 3.9, gender: 'female' },
      { name: 'F3', rating: 3.8, gender: 'female' },
      { name: 'F4', rating: 3.7, gender: 'female' },
      { name: 'F5', rating: 3.6, gender: 'female' }
    ];

    await setupLeagueWithRules(page, {
      divisibilityRequirement: 'flexible',
      poolFormat: 'pools_of_4_or_5'
    }, { leagueMode: 'mixed_doubles' });

    await addPlayers(page, players);
    await page.locator('button:has-text("Auto-Assign Partners")').click();
    await saveSettings(page);
    await goToDashboard(page);
    await startEventDay(page);
    await checkInPlayers(page, 10);
    await closeCheckIn(page);

    await expect(page.getByText('Courts & Matches')).toBeVisible();
  });
});
