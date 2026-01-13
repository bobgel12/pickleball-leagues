# Mixed Doubles League - Implementation Review & Testing Guide

## Implementation Review

### ✅ Completed Components

#### 1. **Data Model** (`leagueStorage.js`)
- ✅ `leagueMode` field added (regular/mixed_doubles)
- ✅ `gender` field added to players (male/female/null)
- ✅ `partners` object added to league (bidirectional mapping)
- ✅ `playedWithPartner` flag in match structure
- ✅ Export/import updated to handle all new fields

#### 2. **Partner Management** (`leagueStorage.js`, `useLeagueState.js`)
- ✅ `getPartner()` - Get partner for a player
- ✅ `setPartner()` - Set/remove partnerships (bidirectional)
- ✅ `validatePartnership()` - Ensures 1 man + 1 woman
- ✅ `autoAssignPartners()` - Pairs by ladder position
- ✅ `canChangePartners()` - Validates timing restrictions

#### 3. **Schedule Generation** (`roundRobin.js`)
- ✅ `generateMixedDoublesSchedule()` - Creates mixed doubles schedule
- ✅ Round 1: Uses assigned partners
- ✅ Rounds 2+: Maintains mixed teams (1 man + 1 woman)
- ✅ Gender balance maintained throughout

#### 4. **Scoring System** (`ladderMovement.js`)
- ✅ Partner bonus: 2x points for wins/losses with partner
- ✅ Regular: 1x points for wins/losses without partner
- ✅ Works with all scoring systems (simple, court, smart)

#### 5. **UI Components**
- ✅ League mode selector in setup
- ✅ Gender field in player registration (conditional)
- ✅ Partner management section with auto-assign
- ✅ Partner indicators in match display
- ✅ Gender display in player list

### ⚠️ Potential Issues to Watch

1. **Round 1 Partner Matching**: If partners aren't on the same court, Round 1 may not pair them correctly
2. **Gender Balance**: System allows uneven gender counts but may have issues with scheduling
3. **Partner Changes**: Validation prevents changes during active event days, but UI should clearly show this

---

## UI Testing Guide

### Prerequisites
1. Start the development server: `npm run dev` (or your start command)
2. Navigate to the League section
3. Clear any existing league data if needed (use Reset League)

---

### Test 1: League Mode Selection

**Steps:**
1. Go to League Setup
2. Find "League Mode" dropdown in League Settings
3. Select "Mixed Doubles (1 man + 1 woman)"
4. Click "Save Settings"
5. Verify the mode is saved

**Expected Results:**
- ✅ Dropdown shows both options (Regular / Mixed Doubles)
- ✅ Mode persists after save
- ✅ Gender field appears in player registration form
- ✅ Partner Management section appears below player list

**Test Regular Mode:**
- Switch back to "Regular Ladder League"
- Gender field should disappear
- Partner Management section should disappear

---

### Test 2: Player Registration with Gender

**Steps:**
1. Set league mode to Mixed Doubles
2. In "Add Player Form":
   - Enter player name: "John Doe"
   - Enter DUPR: 4.500
   - Select Gender: "Male"
   - Click "Add"
3. Add another player:
   - Name: "Jane Smith"
   - DUPR: 4.500
   - Gender: "Female"
   - Click "Add"
4. Add 2 more players (1 male, 1 female)

**Expected Results:**
- ✅ Gender dropdown appears when mode is Mixed Doubles
- ✅ Gender is required (Add button disabled without gender)
- ✅ Players show gender in the player list (colored: blue for male, pink for female)
- ✅ Gender persists after page refresh

**Edge Cases:**
- Try adding player without gender → Should be blocked
- Try "Add Random" → Should assign random gender
- Switch to Regular mode → Gender field should hide

---

### Test 3: Auto-Assign Partners

**Steps:**
1. Ensure you have at least 2 male and 2 female players
2. Scroll to "Partner Management" section
3. Click "Auto-Assign Partners" button
4. Check the "Current Partnerships" list

**Expected Results:**
- ✅ Top-ranked man paired with top-ranked woman
- ✅ Second man paired with second woman, etc.
- ✅ Partnerships shown in the list with gender indicators
- ✅ Each player appears only once in partnerships

**Verify Pairing Logic:**
- Check standings (sorted by DUPR or points)
- Verify #1 man is with #1 woman
- Verify #2 man is with #2 woman

---

### Test 4: Manual Partner Assignment

**Steps:**
1. In "Manual Partner Assignment" section:
   - Select "Player 1": Choose a male player
   - Select "Player 2": Choose a female player
   - Click "Assign Partners"
2. Verify partnership appears in list
3. Try assigning same-gender partners:
   - Select two males → Should show error
   - Select two females → Should show error

**Expected Results:**
- ✅ Different gender pairs work
- ✅ Same gender pairs are rejected with error message
- ✅ Partnership appears in Current Partnerships list
- ✅ Can remove partnership with "Remove" button

**Edge Cases:**
- Assign player who already has partner → Should replace old partnership
- Assign same player twice → Should show error
- Remove partnership → Should disappear from list

---

### Test 5: Partner Change Restrictions

**Steps:**
1. Assign some partners
2. Start an Event Day (check in players, close check-in)
3. Try to change partners while event day is active
4. Complete the event day
5. Try to change partners again

**Expected Results:**
- ✅ Warning message appears when trying to change during active event day
- ✅ Auto-Assign and Manual Assignment buttons disabled during active event day
- ✅ After event day completion, partner changes allowed again

---

### Test 6: Event Day - Round 1 with Partners

**Steps:**
1. Set up Mixed Doubles league with 8+ players (4+ men, 4+ women)
2. Assign partners using Auto-Assign
3. Start Event Day 1
4. Check in at least 4 players (2 men, 2 women) who are partners
5. Close check-in to generate courts
6. View matches on courts

**Expected Results:**
- ✅ Round 1 matches show partners playing together
- ✅ "👥 Partner" badge appears on teams playing with assigned partner
- ✅ Teams are mixed (1 man + 1 woman) in Round 1

**Verify Partner Matching:**
- Check Court 4 (highest) - should have partners paired
- Check Round 1 matches - should show partner indicators
- Verify `playedWithPartner: true` in match data (check browser console)

---

### Test 7: Subsequent Rounds - Mixed Teams

**Steps:**
1. Complete Round 1 matches (enter scores)
2. View Round 2 matches
3. Check team compositions

**Expected Results:**
- ✅ Round 2+ teams are mixed (1 man + 1 woman)
- ✅ Partners are split (not playing together)
- ✅ No "👥 Partner" badge in Round 2+
- ✅ All teams maintain gender balance

**Verify Mixed Teams:**
- Each team should have exactly 1 man and 1 woman
- No same-gender teams
- Gender balance maintained across all rounds

---

### Test 8: Scoring - Partner Bonus

**Steps:**
1. Complete Round 1 match where partners play together
2. Complete Round 2 match where partners play separately
3. Check player standings/points

**Expected Results:**
- ✅ Win in Round 1 (with partner) = 2 points (or 2x court multiplier)
- ✅ Win in Round 2 (without partner) = 1 point (or 1x court multiplier)
- ✅ Loss with partner = -2 points (in simple scoring)
- ✅ Loss without partner = -1 point (in simple scoring)

**Test Different Scoring Systems:**
- **Simple**: Win with partner = +2, Win without = +1
- **Court**: Win with partner on Court 4 = 8 points (4 × 2), Win without = 4 points
- **Smart**: Partner bonus multiplies the smart points calculation

---

### Test 9: Ladder Movement

**Steps:**
1. Complete all matches in an event day
2. Close the event day
3. Check ladder movement preview
4. Start next event day
5. Verify players moved correctly

**Expected Results:**
- ✅ Ladder movement works per individual player (not per partnership)
- ✅ Players move up/down based on their individual performance
- ✅ Partner bonus points affect movement
- ✅ Partners may end up on different courts after movement

---

### Test 10: Export/Import

**Steps:**
1. Create Mixed Doubles league with players and partners
2. Export league (Download button)
3. Reset league
4. Import the exported file

**Expected Results:**
- ✅ League mode preserved (Mixed Doubles)
- ✅ All player genders preserved
- ✅ All partnerships preserved
- ✅ League functions normally after import

**Verify Export Data:**
- Open exported JSON file
- Check `league.leagueMode` = "mixed_doubles"
- Check `players[].gender` values
- Check `partners` object has correct mappings

---

### Test 11: Edge Cases

#### Gender Imbalance
- **Test**: Add 5 men and 2 women
- **Expected**: System should handle gracefully, some players may not get partners

#### Odd Number of Players on Court
- **Test**: Court with 5 players (3 men, 2 women)
- **Expected**: Gender balance maintained when someone sits out

#### Unpaired Players
- **Test**: Add players but don't assign all partners
- **Expected**: Unpaired players shown in list, can still participate

#### Partner Not Checked In
- **Test**: Assign partners, but only one partner checks in for event day
- **Expected**: Round 1 should handle gracefully, player may play with different partner or sit out

---

### Test 12: UI Visual Checks

**Verify:**
- ✅ Gender indicators in player list (colored text)
- ✅ Partner indicators in match cards (👥 badge)
- ✅ Partner Management section styling
- ✅ Warning messages are clear and visible
- ✅ Disabled states are obvious (grayed out buttons)

---

## Common Issues & Solutions

### Issue: Partners not showing in Round 1
**Solution**: Verify partners are assigned and both players checked in for the event day

### Issue: Gender field not appearing
**Solution**: Ensure league mode is set to "Mixed Doubles" and settings are saved

### Issue: Can't change partners
**Solution**: Complete or cancel the current event day first

### Issue: Scoring seems wrong
**Solution**: Check that `playedWithPartner` flag is set correctly in match data

### Issue: Teams not mixed in Round 2+
**Solution**: Verify all players have gender assigned and schedule generation is working

---

## Browser Console Checks

Open browser DevTools (F12) and check:

1. **League State**: `localStorage.getItem('pb_ladder_league')`
   - Verify `leagueMode: "mixed_doubles"`
   - Verify `partners: { ... }` object exists
   - Verify players have `gender` field

2. **Match Data**: Check event day schedule
   - Round 1 matches should have `playedWithPartner: true` for partner teams
   - Round 2+ matches should have `playedWithPartner: false`

3. **Scoring**: Check player performance calculations
   - Points should be 2x for partner matches, 1x for non-partner matches

---

## Quick Test Checklist

- [ ] League mode selector works
- [ ] Gender field appears/disappears correctly
- [ ] Players can be added with gender
- [ ] Auto-assign partners works
- [ ] Manual partner assignment works
- [ ] Partner validation (same gender rejected)
- [ ] Partner change restrictions work
- [ ] Round 1 shows partners together
- [ ] Round 2+ shows mixed teams (partners split)
- [ ] Partner indicators show in matches
- [ ] Scoring gives 2x points for partner wins
- [ ] Ladder movement works correctly
- [ ] Export/import preserves all data
- [ ] Edge cases handled gracefully

---

## Performance Notes

- Partner lookups are O(1) using object mapping
- Schedule generation handles up to 40 players efficiently
- Gender separation is done once per court, not per match

---

## Next Steps After Testing

1. If issues found, document them with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser console errors (if any)

2. Test with real-world scenarios:
   - 20+ players
   - Multiple event days
   - Various gender ratios

3. User acceptance testing:
   - Have actual users try the feature
   - Gather feedback on UI/UX
   - Check for usability issues
