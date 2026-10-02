/**
 * PLAYGROUNDS + CLUES  (SAMPLE DATA — edit freely)
 * =================================================
 * This one file holds everything specific to a playground:
 *   - its ID (the number written on the tags: ...?park=123&loc=LOC04)
 *   - its location (lat/lng, for "suggest the nearest playground")
 *   - the ten tag locations LOC01..LOC10 (what physical spot each tag is on)
 *   - for each fixed-order game: the 10-step order + the clue spoken at each step
 *
 * Same ten tags for all five games: the game is chosen in the app, never on the tag.
 *
 * LOCATION fields
 *   name   short label kids/parents see ("Big Slide")
 *   icon   emoji or "svg:swing" / "svg:seesaw" (see js/core/icons.js)
 *   hint   phrase used by auto-generated clues ("the tallest slide")
 *   level  'high' | 'low'   (used by High and Low Challenge templates)
 *
 * GAME STEPS  games.<gameId> = [ 10 × { loc, clue?, critter? } ]
 *   loc      which tag is correct for this step
 *   clue     spoken + shown when this step starts (it should lead to `loc`).
 *            OPTIONAL: if omitted, the game builds one from the location's
 *            `hint` (see clueTemplate() in each js/games/*.js file). Playground
 *            123 has every clue hand-written; 456 and 789 show the template route.
 *   critter  (Rescue the Playground Critters only) optional custom critter
 *
 * Memory Mode has no fixed order (numbers are shuffled at game start), so it
 * only uses the locations.
 *
 * Game ids: critters | power | highlow | loop | memory
 */

export const PLAYGROUNDS = [
  // ---------------------------------------------------------------- 123
  {
    id: '123',
    name: 'Sunny Meadow Park',
    icon: '🌻',
    color: '#FFC83D',
    lat: 41.8819, lng: -87.6278,
    locations: {
      LOC01: { name: 'Front Gate',    icon: '🚪', hint: 'the front gate',            level: 'low' },
      LOC02: { name: 'Big Slide',     icon: '🛝', hint: 'the tallest slide',         level: 'high' },
      LOC03: { name: 'Swings',        icon: 'svg:swing', hint: 'the swings',          level: 'high' },
      LOC04: { name: 'Monkey Bars',   icon: '🐒', hint: 'the monkey bars',           level: 'high' },
      LOC05: { name: 'Climbing Wall', icon: '🧗', hint: 'the bumpy climbing wall',   level: 'high' },
      LOC06: { name: 'Sandbox',       icon: '🏖️', hint: 'the sandbox',               level: 'low' },
      LOC07: { name: 'Seesaw',        icon: 'svg:seesaw', hint: 'the seesaw',         level: 'low' },
      LOC08: { name: 'Crawl Tunnel',  icon: '🐛', hint: 'the crawl tunnel',          level: 'low' },
      LOC09: { name: 'Lookout Tower', icon: '🔭', hint: 'the top of the tower',      level: 'high' },
      LOC10: { name: 'Picnic Bench',  icon: '🧺', hint: 'the picnic bench',          level: 'low' },
    },
    games: {
      critters: [
        { loc: 'LOC02', clue: 'A little bunny is hiding where kids zoom down fast. Head to the tallest slide!' },
        { loc: 'LOC06', clue: 'A squirrel is digging for acorns in the sand. Find the sandbox!' },
        { loc: 'LOC03', clue: 'A turtle wants to fly back and forth. Look by the swings!' },
        { loc: 'LOC08', clue: 'A hedgehog loves dark, cozy places. Check the crawl tunnel!' },
        { loc: 'LOC05', clue: 'A frog is trying to hop up the bumpy rocks. Go to the climbing wall!' },
        { loc: 'LOC10', clue: 'An owl is waiting for a picnic snack. Find the picnic bench!' },
        { loc: 'LOC04', clue: 'A ladybug is swinging hand over hand. Look under the monkey bars!' },
        { loc: 'LOC07', clue: 'A fox is going up and down, up and down. Find the seesaw!' },
        { loc: 'LOC09', clue: 'A snail climbed all the way to the top to see far away. Go to the lookout tower!' },
        { loc: 'LOC01', clue: 'The last critter, a baby chick, is waiting to go home. Head to the front gate!' },
      ],
      power: [
        { loc: 'LOC01', clue: 'Power station one is at the front gate. Go go go!' },
        { loc: 'LOC03', clue: 'Zap! Next power station: the swings!' },
        { loc: 'LOC05', clue: 'Lights flickering! Run to the climbing wall!' },
        { loc: 'LOC07', clue: 'Quick! Power up the seesaw!' },
        { loc: 'LOC09', clue: 'Climb high! Power station at the lookout tower!' },
        { loc: 'LOC02', clue: 'Hurry to the tallest slide!' },
        { loc: 'LOC04', clue: 'Next: the monkey bars. Fast feet!' },
        { loc: 'LOC06', clue: 'Beep beep! Run to the sandbox!' },
        { loc: 'LOC08', clue: 'Almost there! Zoom to the crawl tunnel!' },
        { loc: 'LOC10', clue: 'Last one! Restore the power at the picnic bench!' },
      ],
      highlow: [
        { loc: 'LOC09', clue: 'Go HIGH! Climb to the top of the lookout tower!' },
        { loc: 'LOC08', clue: 'Now go LOW! Crawl to the tunnel!' },
        { loc: 'LOC05', clue: 'HIGH again! Find the climbing wall!' },
        { loc: 'LOC06', clue: 'LOW! Get down to the sandbox!' },
        { loc: 'LOC04', clue: 'Reach up HIGH to the monkey bars!' },
        { loc: 'LOC10', clue: 'LOW and slow. Go to the picnic bench!' },
        { loc: 'LOC02', clue: 'HIGH! Head to the top of the tallest slide!' },
        { loc: 'LOC07', clue: 'LOW! Find the seesaw!' },
        { loc: 'LOC03', clue: 'Swing up HIGH! Go to the swings!' },
        { loc: 'LOC01', clue: 'And finally, LOW. Walk back to the front gate!' },
      ],
      loop: [
        { loc: 'LOC01', clue: 'Start your loop at the front gate. Keep moving the whole way!' },
        { loc: 'LOC02', clue: 'Keep walking! Next stop, the tallest slide.' },
        { loc: 'LOC03', clue: 'Nice pace! On to the swings.' },
        { loc: 'LOC04', clue: 'Don\'t stop! The monkey bars are next.' },
        { loc: 'LOC05', clue: 'Keep it flowing to the climbing wall.' },
        { loc: 'LOC09', clue: 'Up next, the lookout tower. Keep going!' },
        { loc: 'LOC08', clue: 'Loop around to the crawl tunnel.' },
        { loc: 'LOC07', clue: 'Keep moving! The seesaw is next.' },
        { loc: 'LOC06', clue: 'Almost around! Walk to the sandbox.' },
        { loc: 'LOC10', clue: 'Finish the loop at the picnic bench!' },
      ],
    },
  },

  // ---------------------------------------------------------------- 456
  // Shows the TEMPLATE route: only `loc` is set, clues are generated from `hint`.
  {
    id: '456',
    name: 'Rocket Ridge Playground',
    icon: '🚀',
    color: '#4ECDC4',
    lat: 41.8962, lng: -87.6190,
    locations: {
      LOC01: { name: 'Entrance Sign', icon: '🪧', hint: 'the entrance sign',     level: 'low' },
      LOC02: { name: 'Tube Slide',    icon: '🛝', hint: 'the tube slide',        level: 'high' },
      LOC03: { name: 'Spinner',       icon: '🌀', hint: 'the spinner',           level: 'low' },
      LOC04: { name: 'Climbing Net',  icon: '🕸️', hint: 'the rope climbing net', level: 'high' },
      LOC05: { name: 'Wobbly Bridge', icon: '🌉', hint: 'the wobbly bridge',     level: 'high' },
      LOC06: { name: 'Fire Pole',     icon: '🚒', hint: 'the fire pole',         level: 'high' },
      LOC07: { name: 'Swings',        icon: 'svg:swing', hint: 'the swings',      level: 'low' },
      LOC08: { name: 'Drinking Fountain', icon: '🚰', hint: 'the drinking fountain', level: 'low' },
      LOC09: { name: 'Rocket Tower',  icon: '🚀', hint: 'the top of the rocket tower', level: 'high' },
      LOC10: { name: 'Bench',         icon: '🪑', hint: 'the big bench',         level: 'low' },
    },
    games: {
      critters: ['LOC03', 'LOC09', 'LOC07', 'LOC02', 'LOC10', 'LOC05', 'LOC08', 'LOC04', 'LOC06', 'LOC01'].map((loc) => ({ loc })),
      power:    ['LOC01', 'LOC02', 'LOC03', 'LOC04', 'LOC05', 'LOC06', 'LOC07', 'LOC08', 'LOC09', 'LOC10'].map((loc) => ({ loc })),
      highlow:  ['LOC09', 'LOC03', 'LOC04', 'LOC07', 'LOC05', 'LOC08', 'LOC06', 'LOC10', 'LOC02', 'LOC01'].map((loc) => ({ loc })),
      loop:     ['LOC01', 'LOC03', 'LOC02', 'LOC04', 'LOC05', 'LOC09', 'LOC06', 'LOC07', 'LOC08', 'LOC10'].map((loc) => ({ loc })),
    },
  },

  // ---------------------------------------------------------------- 789
  {
    id: '789',
    name: 'Pirate Cove Play Area',
    icon: '🏴‍☠️',
    color: '#FF8C42',
    lat: 41.8676, lng: -87.6140,
    locations: {
      LOC01: { name: 'Dock Gate',     icon: '⚓', hint: 'the dock gate',          level: 'low' },
      LOC02: { name: 'Pirate Ship',   icon: '⛵', hint: 'the pirate ship',        level: 'high' },
      LOC03: { name: 'Rope Ladder',   icon: '🪜', hint: 'the rope ladder',        level: 'high' },
      LOC04: { name: 'Twisty Slide',  icon: '🛝', hint: 'the twisty slide',       level: 'high' },
      LOC05: { name: 'Crow\'s Nest',  icon: '🔭', hint: 'the crow\'s nest lookout', level: 'high' },
      LOC06: { name: 'Treasure Chest', icon: '💰', hint: 'the treasure chest',   level: 'low' },
      LOC07: { name: 'Sand Beach',    icon: '🏖️', hint: 'the sandy beach',        level: 'low' },
      LOC08: { name: 'Crawl Tunnel',  icon: '🐛', hint: 'the crawl tunnel',       level: 'low' },
      LOC09: { name: 'Swings',        icon: 'svg:swing', hint: 'the swings',       level: 'high' },
      LOC10: { name: 'Palm Bench',    icon: '🌴', hint: 'the palm tree bench',    level: 'low' },
    },
    games: {
      critters: ['LOC06', 'LOC02', 'LOC08', 'LOC05', 'LOC07', 'LOC03', 'LOC10', 'LOC04', 'LOC09', 'LOC01'].map((loc) => ({ loc })),
      power:    ['LOC01', 'LOC03', 'LOC05', 'LOC07', 'LOC09', 'LOC02', 'LOC04', 'LOC06', 'LOC08', 'LOC10'].map((loc) => ({ loc })),
      highlow:  ['LOC05', 'LOC08', 'LOC02', 'LOC06', 'LOC03', 'LOC07', 'LOC04', 'LOC10', 'LOC09', 'LOC01'].map((loc) => ({ loc })),
      loop:     ['LOC01', 'LOC02', 'LOC03', 'LOC04', 'LOC05', 'LOC06', 'LOC07', 'LOC08', 'LOC09', 'LOC10'].map((loc) => ({ loc })),
    },
  },
];

/** The ten location codes, in order. */
export const LOC_CODES = Array.from({ length: 10 }, (_, i) => `LOC${String(i + 1).padStart(2, '0')}`);
