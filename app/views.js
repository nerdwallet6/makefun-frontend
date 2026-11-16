// The four pages, each a function from API data to HTML.
// Every API string goes through esc() before it reaches the page.
// Images carry crossorigin="anonymous" in the markup (set before src is
// fetched) because avatar/entry images send Cross-Origin-Resource-Policy.

import { date, entries, esc, money, msLeft, num, timeLeft, timeLeftClass } from './format.js';
import { profilePictureUrl } from './api.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const feeText = (b) => {
  const fee = Number(b.entryFeeUsd);
  return Number.isFinite(fee) && fee > 0 ? `${money(fee)} entry fee` : 'No entry fee';
};

const bountyUrl = (slug) => `#/bounty/${encodeURIComponent(slug)}`;
const leaderboardUrl = (slug) => `#/bounty/${encodeURIComponent(slug)}/leaderboard`;
const accountUrl = (handle) => `#/account/${encodeURIComponent(handle)}`;

/** An <img> whose crossorigin is set before its src is fetched. */
function img(src, alt, cls) {
  if (!src) return '';
  return `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" crossorigin="anonymous" loading="lazy" onerror="this.remove()">`;
}

/** Whether a bounty still takes entries: open status AND deadline in the future. */
export function accepting(b) {
  return b.status === 'open' && msLeft(b.deadline) > 0;
}

export function statusBadge(b) {
  if (b.status === 'resolved') return '<span class="badge closed">Resolved</span>';
  if (accepting(b)) return '<span class="badge open">Open · accepting entries</span>';
  if (b.status === 'open') return '<span class="badge closed">Closed · deadline passed</span>';
  return `<span class="badge closed">${esc(b.status)}</span>`;
}

/** Live reward rows: rewardsNow (live pot, fee share included) or the base rewards map. */
export function rewardRows(b) {
  if (Array.isArray(b.rewardsNow) && b.rewardsNow.length) {
    return b.rewardsNow.map((r) => ({ place: r.place, amount: r.amountUsd }));
  }
  if (b.rewards && typeof b.rewards === 'object') {
    return Object.entries(b.rewards)
      .map(([place, amount]) => ({ place: Number(place), amount }))
      .sort((a, b2) => a.place - b2.place);
  }
  return [];
}

function placeLabel(place) {
  if (place === 1) return '1st';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  return `${place}th`;
}

// ---------------------------------------------------------------- board

export const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'closing', label: 'Closing soon' },
  { id: 'nofee', label: 'No fee' },
  { id: 'high', label: 'High reward' },
];

export function filterBounties(items, filter) {
  const now = Date.now();
  switch (filter) {
    case 'closing':
      return items.filter((b) => {
        const ms = new Date(b.deadline).getTime() - now;
        return ms > 0 && ms <= 48 * 3600000;
      });
    case 'nofee':
      return items.filter((b) => !Number(b.entryFeeUsd));
    case 'high':
      return items.filter((b) => Number(b.potUsd ?? b.rewardAmount) >= 500);
    default:
      return items;
  }
}

/** Soonest deadline first; past-deadline rows sink below live ones. */
export function sortBounties(items) {
  return [...items].sort((a, b) => {
    const aPast = msLeft(a.deadline) <= 0;
    const bPast = msLeft(b.deadline) <= 0;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });
}

function boardRow(b) {
  const tags = [b.category, ...(Array.isArray(b.skills) ? b.skills.slice(0, 3) : [])]
    .filter(Boolean)
    .map((t) => `<span class="tag">${esc(t)}</span>`)
    .join('');
  return `
      <li class="card">
        <div class="card-main">
          <a class="card-title" href="${bountyUrl(b.slug)}">${esc(b.title)}</a>
          <p class="card-summary">${esc(b.summary ?? '')}</p>
          <div class="tags">${tags}</div>
        </div>
        <div class="card-side">
          <span class="pot">${pot(b)}</span>
          <span class="fee">${esc(feeText(b))}</span>
          <span class="time ${timeLeftClass(b.deadline)}">${esc(timeLeft(b.deadline))}</span>
          <span class="count">${esc(entries(b.submissionCount))}</span>
          <a class="card-link" href="${leaderboardUrl(b.slug)}">Leaderboard →</a>
        </div>
      </li>`;
}

export function board(data, { filter = 'all', shown = 20 } = {}) {
  const sorted = sortBounties(filterBounties(data.items ?? [], filter));
  const visible = sorted.slice(0, shown);
  const buttons = FILTERS.map(
    (f) =>
      `<button type="button" data-filter="${f.id}" class="${f.id === filter ? 'active' : ''}" aria-pressed="${f.id === filter}">${f.label}</button>`,
  ).join('');
  const rows = visible.map(boardRow).join('');
  const more =
    sorted.length > shown
      ? `<p><button type="button" id="show-more">Show more (${num(sorted.length - shown)} remaining)</button></p>`
      : '';
  const empty =
    sorted.length === 0
      ? '<p class="empty">No bounties match this filter.</p>'
      : '';
  return `
    <h1>Open bounties</h1>
    <p class="lede">${num(data.items?.length ?? sorted.length)} bounties on the board, soonest deadline first. Rewards are paid in USDC on Solana.</p>
    <div class="filters" role="group" aria-label="Filter bounties">${buttons}</div>
    <ul class="board">${rows}</ul>
    ${empty}${more}`;
}

// ---------------------------------------------------------------- bounty

export function bounty(b) {
  const rows = rewardRows(b);
  const table =
    rows.length === 0
      ? '<p>No reward breakdown published yet.</p>'
      : `<table class="rewards"><thead><tr><th>Place</th><th>Reward</th></tr></thead><tbody>${rows
          .map((r) => `<tr><td>${esc(placeLabel(r.place))}</td><td>${esc(money(r.amount))}</td></tr>`)
          .join('')}</tbody></table>`;
  const tags = [b.category, ...(Array.isArray(b.skills) ? b.skills : [])]
    .filter(Boolean)
    .map((t) => `<span class="tag">${esc(t)}</span>`)
    .join('');
  const sponsor = b.sponsor?.name
    ? `<p class="sponsor">Sponsored by ${esc(b.sponsor.name)}${b.sponsor.isVerified ? ' ✓' : ''}</p>`
    : '';
  const winner =
    b.winner?.handle || b.winner?.title
      ? `<p class="winner">Winner: ${esc(b.winner.handle ?? b.winner.title)}</p>`
      : '';
  return `
    <p class="crumbs"><a href="#/">← All bounties</a> · <a href="${leaderboardUrl(b.slug)}">Leaderboard →</a></p>
    <h1>${esc(b.title)}</h1>
    ${statusBadge(b)}
    ${sponsor}
    <p class="lede">${esc(b.summary ?? '')}</p>
    <div class="tags">${tags}</div>
    <dl class="facts">
      <dt>Live pot</dt><dd class="pot">${pot(b)}</dd>
      <dt>Entry fee</dt><dd>${esc(feeText(b))}</dd>
      <dt>Deadline</dt><dd>${esc(date(b.deadline))} <span class="time ${timeLeftClass(b.deadline)}">(${esc(timeLeft(b.deadline))})</span></dd>
      ${b.publishedAt ? `<dt>Published</dt><dd>${esc(date(b.publishedAt))}</dd>` : ''}
      <dt>Entries</dt><dd>${esc(entries(b.submissionCount))}</dd>
      <dt>Status</dt><dd>${esc(b.status ?? '—')}</dd>
    </dl>
    ${winner}
    <h2>Rewards</h2>
    <p class="note">Live pot — includes entry fees paid in so far.</p>
    ${table}
    <h2>Description</h2>
    <div class="description">${esc(b.description ?? '')}</div>
    <p><a href="${leaderboardUrl(b.slug)}">See the leaderboard →</a></p>`;
}

// ---------------------------------------------------------------- leaderboard

/** One leaderboard row: whole rows carry display[rankKey]; compact rows carry display. */
function leaderboardRow(row, rankKey, rankTitle) {
  const score =
    (row.display && row.display[rankKey]) ?? row.display ?? (row.values && row.values[rankKey] != null ? String(row.values[rankKey]) : '—');
  const handle = row.handle ?? '—';
  const name = row.title ?? '';
  const prize = row.prize_rank != null ? ` · prize #${num(row.prize_rank)}` : '';
  const flags = [row.baseline ? 'baseline' : '', row.house ? 'house' : ''].filter(Boolean).join(' ');
  return `
      <li class="lb-row">
        <span class="lb-rank">${num(row.rank ?? row.performance ?? '—')}</span>
        ${img(row.image, `${handle} avatar`, 'lb-avatar')}
        <span class="lb-who">
          <a href="${accountUrl(handle)}">${esc(handle)}</a>
          ${name ? `<span class="lb-title">${esc(name)}</span>` : ''}
          ${flags ? `<span class="lb-flags">${esc(flags)}</span>` : ''}
        </span>
        <span class="lb-score" title="${esc(rankTitle)}">${esc(score)}${prize ? `<span class="lb-prize">${esc(prize)}</span>` : ''}</span>
      </li>`;
}

export function leaderboard(lb, slug, { shown = 50 } = {}) {
  const comp = lb.competition ?? {};
  const phase = lb.phase ?? {};
  const columns = Array.isArray(lb.columns) ? lb.columns : [];
  const rankKey = lb.rank_key ?? columns[0]?.key ?? 'score';
  const rankCol = columns.find((c) => c.key === rankKey);
  const rankTitle = rankCol?.title ?? lb.title ?? 'Score';
  const whole = Array.isArray(lb.entries) ? lb.entries : [];
  const rest = Array.isArray(lb.rest) ? lb.rest : [];
  const total = whole.length + rest.length;
  const all = [...whole, ...rest].slice(0, shown);
  const more =
    total > shown
      ? `<p><button type="button" id="show-more">Show more (${num(total - shown)} remaining)</button></p>`
      : '';
  const heldNote =
    phase.placements_held && phase.scores_visible === false
      ? '<p class="note">Placements are held until the results are finalised — scores are hidden for now.</p>'
      : phase.placements_held
        ? '<p class="note">Places are unofficial until the results publish.</p>'
        : '';
  const rows = all.map((r) => leaderboardRow(r, rankKey, rankTitle)).join('');
  return `
    <p class="crumbs"><a href="#/">← All bounties</a> · <a href="${bountyUrl(slug)}">← ${esc(comp.title ?? slug)}</a></p>
    <h1>Leaderboard</h1>
    <p class="lede"><a href="${bountyUrl(slug)}">${esc(comp.title ?? slug)}</a></p>
    <p class="meta">${esc(phase.title ?? '')}${phase.ends_at ? ` · ends ${esc(date(phase.ends_at))}` : ''} · ranked by ${esc(rankTitle)}${lb.tie_break?.title ? ` · tie-break: ${esc(lb.tie_break.title)}` : ''}</p>
    ${heldNote}
    ${total === 0 ? '<p class="empty">No entries on the leaderboard yet.</p>' : `
    <ol class="lb">
      <li class="lb-head"><span>#</span><span></span><span>Entry</span><span>${esc(rankTitle)}</span></li>
      ${rows}
    </ol>
    <p class="meta">Showing ${num(all.length)} of ${num(total)} entries ranked.</p>
    ${more}`}`;
}

// ---------------------------------------------------------------- account

export function profile(p, handle) {
  const rec = p.record ?? {};
  const solutions = Array.isArray(p.solutions) ? p.solutions : [];
  const avatar = p.image ?? p.avatar ?? profilePictureUrl(handle);
  const links = [];
  if (p.github_login) links.push(`<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub @${esc(p.github_login)}</a>`);
  if (p.x?.username) links.push(`<a href="${esc(p.x.url ?? `https://x.com/${p.x.username}`)}">X @${esc(p.x.username)}</a>`);
  if (p.discord?.username) links.push(`<span>Discord ${esc(p.discord.username)}</span>`);
  if (p.wallet?.explorer_url) links.push(`<a href="${esc(p.wallet.explorer_url)}">Wallet</a>`);
  const solRows = solutions
    .map((s) => {
      const c = s.competition ?? {};
      const score = s.score?.display ?? (s.score?.value != null ? String(s.score.value) : '—');
      const place = s.placement != null ? ` · #${num(s.placement)}` : '';
      const prize = s.prize_usd != null ? ` · ${money(s.prize_usd)}` : '';
      return `
      <li class="card">
        <div class="card-main">
          <a class="card-title" href="${bountyUrl(c.slug)}">${esc(c.title ?? c.slug ?? '—')}</a>
          <p class="card-summary">${esc(s.title ?? '')}</p>
          <span class="meta">Entered ${esc(date(s.entered_at))}${place}${prize}</span>
        </div>
        <div class="card-side"><span class="pot">${esc(score)}</span><span class="fee">${esc(s.score?.column?.title ?? 'Score')}</span></div>
      </li>`;
    })
    .join('');
  return `
    <p class="crumbs"><a href="#/">← All bounties</a></p>
    <div class="profile-head">
      ${img(avatar, `${handle} avatar`, 'avatar')}
      <div>
        <h1>@${esc(handle)}</h1>
        ${p.display_name ? `<p class="lede">${esc(p.display_name)}</p>` : ''}
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : '<p class="bio muted">No bio yet.</p>'}
        ${links.length ? `<p class="links">${links.join(' · ')}</p>` : ''}
        ${p.joined_at ? `<p class="meta">Joined ${esc(date(p.joined_at))}</p>` : ''}
      </div>
    </div>
    <dl class="facts stats">
      <dt>Entered</dt><dd>${num(rec.competitions_entered ?? 0)}</dd>
      <dt>Won</dt><dd>${num(rec.competitions_won ?? 0)}</dd>
      <dt>Placed</dt><dd>${num(rec.competitions_placed ?? 0)}</dd>
      <dt>Podiums</dt><dd>${num(rec.podium_finishes ?? 0)}</dd>
      <dt>Best placement</dt><dd>${rec.best_placement != null ? `#${num(rec.best_placement)}` : '—'}</dd>
      <dt>Prize money</dt><dd>${money(rec.prize_usd ?? 0)}</dd>
    </dl>
    <h2>Entries (${num(solutions.length)})</h2>
    ${solutions.length === 0 ? '<p class="empty">No public entries yet.</p>' : `<ul class="board">${solRows}</ul>`}`;
}

// ---------------------------------------------------------------- errors

export function errorPage(message, backHref = '#/') {
  return `
    <p class="crumbs"><a href="${backHref}">← Back</a></p>
    <h1>Something went wrong</h1>
    <p>${esc(message || 'Could not load this page. Please try again.')}</p>
    <p><a href="#/">Back to the board</a></p>`;
}
