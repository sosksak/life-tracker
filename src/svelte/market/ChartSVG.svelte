<script>
  /** ChartSVG — SVG-график с кроссхэйром для курса крипты. */
  let { pts, cur, range, width = 340 } = $props();
  import { fmtPrice, fmtDT, fmtAxis } from './store.svelte.js';

  const W = $derived(Math.max(280, Math.round(width)));
  const H = 188;
  const padL = 6, padR = 6, padT = 14, padB = 32;

  const chartData = $derived.by(() => {
    if (!pts || pts.length < 2) return null;
    const ys = pts.map(p => p[1]);
    let min = Math.min(...ys), max = Math.max(...ys);
    if (max === min) { max += 1; min -= 1; }
    const x0 = pts[0][0], x1 = pts[pts.length - 1][0];
    const X = t => padL + (t - x0) / (x1 - x0) * (W - padL - padR);
    const Y = v => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
    // Path
    let d = '';
    for (let i = 0; i < pts.length; i++) d += (i ? 'L' : 'L') + X(pts[i][0]).toFixed(1) + ',' + Y(pts[i][1]).toFixed(1);
    d = 'M' + d.slice(1);
    const area = d + 'L' + X(x1).toFixed(1) + ',' + (H - padB) + 'L' + X(x0).toFixed(1) + ',' + (H - padB) + 'Z';
    const up = pts[pts.length - 1][1] >= pts[0][1];
    // Min/Max labels
    const iMin = ys.indexOf(min), iMax = ys.indexOf(max);
    // Axis ticks
    const ticks = [];
    for (let i = 0; i <= 4; i++) {
      const t = x0 + (x1 - x0) * i / 4;
      ticks.push({ x: X(t), label: fmtAxis(t, range), anchor: i === 0 ? 'start' : i === 4 ? 'end' : 'middle' });
    }
    // Label positions
    const labelPos = (i, anchorUp) => {
      let x = X(pts[i][0]), ta = 'middle';
      if (x < 40) { ta = 'start'; x = Math.max(x, padL); }
      else if (x > W - 40) { ta = 'end'; x = Math.min(x, W - padR); }
      const y = anchorUp ? Y(pts[i][1]) - 5 : Y(pts[i][1]) + 12;
      return { x, y, ta };
    };
    const maxPos = labelPos(iMax, true);
    const minPos = labelPos(iMin, false);
    return { d, area, up, min, max, iMin, iMax, X, Y, ys, x0, x1, ticks, maxPos, minPos };
  });

  const col = $derived(chartData?.up ? 'var(--green)' : 'var(--red)');

  // Crosshair state
  let crossX = $state(0);
  let crossY = $state(0);
  let crossVisible = $state(false);
  let tipText = $state('');
  let svgEl;

  function findPoint(px) {
    if (!chartData || !pts.length) return null;
    const xv = px / svgEl.getBoundingClientRect().width * W;
    const { x0, x1, X, Y } = chartData;
    const t = x0 + (Math.min(Math.max(xv, padL), W - padR) - padL) / (W - padL - padR) * (x1 - x0);
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][0] < t) lo = m; else hi = m; }
    const i = Math.abs(pts[lo][0] - t) < Math.abs(pts[hi][0] - t) ? lo : hi;
    return { i, p: pts[i], sx: X(pts[i][0]), sy: Y(pts[i][1]) };
  }

  function onMove(ev) {
    if (!svgEl || !chartData) return;
    const r = svgEl.getBoundingClientRect();
    const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    const found = findPoint(px);
    if (!found) return;
    crossX = found.sx;
    crossY = found.sy;
    crossVisible = true;
    tipText = fmtDT(found.p[0]) + ' · ' + fmtPrice(found.p[1], cur);
    if (ev.cancelable && ev.touches) ev.preventDefault();
  }

  function onLeave() { crossVisible = false; }
</script>

{#if !chartData}
  <div class="mk-empty">Нет данных графика</div>
{:else}
  <div class="mk-chart-wrap">
    <svg
      bind:this={svgEl}
      class="mk-svg"
      viewBox="0 0 {W} {H}"
      width={W}
      height={H}
      onmousemove={onMove}
      onmouseleave={onLeave}
      ontouchstart={onMove}
      ontouchmove={onMove}
      ontouchend={onLeave}
    >
      <defs>
        <linearGradient id="mkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={col} stop-opacity="0.22"/>
          <stop offset="1" stop-color={col} stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} class="mk-base"/>
      <path d={chartData.area} fill="url(#mkFill)"/>
      <path d={chartData.d} fill="none" stroke={col} stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <!-- Min/Max labels -->
      <text x={chartData.maxPos.x} y={chartData.maxPos.y} text-anchor={chartData.maxPos.ta} class="mk-lbl">{fmtPrice(chartData.max, cur)}</text>
      <text x={chartData.minPos.x} y={chartData.minPos.y} text-anchor={chartData.minPos.ta} class="mk-lbl">{fmtPrice(chartData.min, cur)}</text>
      <!-- Axis -->
      {#each chartData.ticks as tick}
        <text x={tick.x} y={H - 6} text-anchor={tick.anchor} class="mk-ax">{tick.label}</text>
      {/each}
      <!-- Crosshair -->
      {#if crossVisible}
        <line x1={crossX} x2={crossX} y1={padT} y2={H - padB} class="mk-cross"/>
        <circle cx={crossX} cy={crossY} r="4" fill={col} stroke="#fff" stroke-width="2"/>
      {/if}
    </svg>
    {#if crossVisible}
      <div class="mk-tip">{tipText}</div>
    {/if}
  </div>
{/if}
