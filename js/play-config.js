/* The arcade's leaderboard (js/play.js). Leave board empty and every score
   stays on the visitor's own device. Fill in a Supabase project's URL and
   its public "anon" key to share one board between everyone who plays —
   js/games/README.md has the table SQL and how to moderate it. The anon
   key is meant to be public; the table's row-level security protects it. */
window.TEKEX_PLAY = {
  board: { url: '', key: '', table: 'scores' }
};
