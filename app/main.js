// A make.fun frontend: the board, one bounty, its leaderboard, and public
// profiles, on hash routes.
//
//   #/                          the board
//   #/bounty/<slug>             one bounty
//   #/bounty/<slug>/leaderboard its leaderboard
//   #/account/<handle>          a public profile
//
// window.__shotReady is false while a page loads and true once its data is on
// screen, so a screenshot script knows when to capture.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, errorPage, leaderboard, profile } from './views.js';

const app = document.getElementById('app');
const searchForm = document.getElementById('account-search');
const searchInput = document.getElementById('account-handle');
let renderToken = 0;
let boardData = null;
let boardFilter = 'all';
let boardShown = 20;
let leaderboardData = null;
let leaderboardSlug = '';
let leaderboardShown = 50;

function renderLeaderboard() {
  app.innerHTML = leaderboard(leaderboardData, leaderboardSlug, { shown: leaderboardShown });
  const more = document.getElementById('show-more');
  if (more) {
    more.addEventListener('click', () => {
      leaderboardShown += 50;
      renderLeaderboard();
    });
  }
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const handle = searchInput.value.trim().replace(/^@/, '');
  if (handle) location.hash = `#/account/${encodeURIComponent(handle)}`;
});

function renderBoard() {
  document.title = 'make.fun bounties';
  app.innerHTML = board(boardData, { filter: boardFilter, shown: boardShown });
  app.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      boardFilter = btn.dataset.filter;
      boardShown = 20;
      renderBoard();
    });
  });
  const more = document.getElementById('show-more');
  if (more) {
    more.addEventListener('click', () => {
      boardShown += 20;
      renderBoard();
    });
  }
}

async function render() {
  const token = ++renderToken;
  window.__shotReady = false;
  app.innerHTML = '<p class="loading">Loading…</p>';
  const hash = location.hash || '#/';
  try {
    let match;
    if ((match = hash.match(/^#\/bounty\/([^/]+)\/leaderboard\/?$/))) {
      const slug = decodeURIComponent(match[1]);
      leaderboardData = await getLeaderboard(slug);
      leaderboardSlug = slug;
      leaderboardShown = 50;
      if (token !== renderToken) return;
      document.title = `Leaderboard · ${leaderboardData.competition?.title ?? slug} | make.fun bounties`;
      renderLeaderboard();
    } else if ((match = hash.match(/^#\/bounty\/([^/]+)\/?$/))) {
      const b = await getBounty(decodeURIComponent(match[1]));
      if (token !== renderToken) return;
      document.title = `${b.title} | make.fun bounties`;
      app.innerHTML = bounty(b);
    } else if ((match = hash.match(/^#\/account\/([^/]+)\/?$/))) {
      const handle = decodeURIComponent(match[1]).replace(/^@/, '');
      const p = await getProfile(handle);
      if (token !== renderToken) return;
      document.title = `@${p.handle ?? handle} | make.fun bounties`;
      app.innerHTML = profile(p, p.handle ?? handle);
    } else {
      if (!boardData) boardData = await getBounties();
      if (token !== renderToken) return;
      renderBoard();
    }
  } catch (err) {
    if (token !== renderToken) return;
    const missing = err && err.status === 404;
    document.title = 'Not found | make.fun bounties';
    app.innerHTML = errorPage(
      missing
        ? 'Nothing here matches that bounty or account — it may have been removed, or the handle may be mistyped.'
        : `Could not load this page (${err && err.message ? err.message : 'network error'}). Check your connection and try again.`,
    );
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();
