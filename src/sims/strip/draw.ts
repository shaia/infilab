/**
 * The canvas of `SequenceStrip`: the terms as points over n, and per mode the band, the bound lines, the auxiliary
 * sequences, the level M or the tail's spread. Colours only from the palette (the analysis colour code of
 * tokens.css); inside / outside also differ in shape: filled, or hollow with a ring.
 */

import type { Palette } from '../core/canvas';
import { sci } from '../core/format';
import { withAlpha } from '../core/ink';
import { drawAxes, insetBox, makePlot, type Box, type Plot } from '../core/plot';
import type { Analysis, StripState } from './model';

/** a typographic minus sign in front of negative numbers */
export const minus = (t: string) => t.replace(/^-/, '−');
export const fmt = (v: number) => minus(sci(v, 3));

type Ctx = CanvasRenderingContext2D;

function dotIn(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

/** hollow with a ring: an outside term is told by shape, not only by colour */
function dotOut(ctx: Ctx, x: number, y: number, r: number, p: Palette) {
  ctx.fillStyle = p.paper;
  ctx.strokeStyle = p.pointOut;
  ctx.lineWidth = Math.max(1.6, r * 0.45);
  ctx.beginPath();
  ctx.arc(x, y, r + 0.6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.8 + 1, 0, 2 * Math.PI);
  ctx.stroke();
}

/** a term the definition ignores (n ≤ N): small and grey */
function dotIgnored(ctx: Ctx, x: number, y: number, r: number, p: Palette) {
  dotIn(ctx, x, y, Math.max(1.6, r * 0.6), p.ink3);
}

type Shape = 'square' | 'diamond' | 'up' | 'down';

/** the marks of the auxiliary sequences (aₙ, bₙ of a pair; the outer ones of a sandwich) */
function mark(ctx: Ctx, shape: Shape, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (shape === 'square') ctx.rect(x - s * 0.8, y - s * 0.8, s * 1.6, s * 1.6);
  else if (shape === 'diamond') {
    ctx.moveTo(x, y - s * 1.15);
    ctx.lineTo(x + s * 1.15, y);
    ctx.lineTo(x, y + s * 1.15);
    ctx.lineTo(x - s * 1.15, y);
    ctx.closePath();
  } else {
    const d = shape === 'up' ? -1 : 1;
    ctx.moveTo(x, y + d * s * 1.2);
    ctx.lineTo(x + s * 1.1, y - d * s * 0.8);
    ctx.lineTo(x - s * 1.1, y - d * s * 0.8);
    ctx.closePath();
  }
  ctx.fill();
}

function hLine(ctx: Ctx, box: Box, y: number, color: string, width: number, dash: number[] = [], x0 = box.x) {
  if (y < box.y - 1 || y > box.y + box.h + 1) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(Math.max(box.x, x0), y);
  ctx.lineTo(box.x + box.w, y);
  ctx.stroke();
  ctx.restore();
}

/** a horizontal band between two values, clipped to the box */
function band(ctx: Ctx, box: Box, yA: number, yB: number, fill: string, x0 = box.x) {
  const top = Math.max(box.y, Math.min(yA, yB));
  const bot = Math.min(box.y + box.h, Math.max(yA, yB));
  if (bot <= top) return;
  const left = Math.max(box.x, x0);
  ctx.fillStyle = fill;
  ctx.fillRect(left, top, box.x + box.w - left, bot - top);
}

/** labels in the right margin, dropped when they would overlap one already placed */
function marginLabels(ctx: Ctx, box: Box, p: Palette, narrow: boolean, items: { text: string; y: number; color: string }[]) {
  ctx.save();
  ctx.font = `600 ${narrow ? 12 : 13}px ${p.fontUi}`;
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const placed: number[] = [];
  for (const it of items) {
    if (it.y < box.y - 6 || it.y > box.y + box.h + 6) continue;
    if (placed.some((y) => Math.abs(y - it.y) < 15)) continue;
    placed.push(it.y);
    ctx.fillStyle = it.color;
    ctx.fillText(it.text, box.x + box.w + 5, it.y);
  }
  ctx.restore();
}

/** a vertical marker line at n = v + 0.5 with a label (an arrow when v lies past the window) */
function vLine(ctx: Ctx, plot: Plot, p: Palette, v: number, text: string, color: string, row: number, dash: number[]) {
  const { box } = plot;
  const x = plot.px(v + 0.5);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.3;
  ctx.font = `600 12px ${p.fontUi}`;
  ctx.direction = 'ltr';
  ctx.textBaseline = 'top';
  const ty = box.y + 4 + row * 15;
  if (x > box.x + box.w) {
    ctx.textAlign = 'right';
    ctx.fillText(`${text} = ${v} →`, box.x + box.w - 3, ty);
  } else {
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x, box.y);
    ctx.lineTo(x, box.y + box.h);
    ctx.stroke();
    ctx.setLineDash([]);
    const right = x + 4 + 60 < box.x + box.w;
    ctx.textAlign = right ? 'left' : 'right';
    ctx.fillText(`${text} = ${v}`, right ? x + 4 : x - 4, ty);
  }
  ctx.restore();
}

/** Draw the figure; returns the plot (the pointer maps x back to n through it). */
export function drawStrip(ctx: Ctx, view: { w: number; h: number }, p: Palette, s: StripState, an: Analysis): Plot {
  const narrow = view.w < 420;
  // the right margin holds the L, M, ε labels, so they never sit on top of the terms
  const box = insetBox({ x: 0, y: 0, w: view.w, h: view.h }, { l: narrow ? 46 : 56, r: narrow ? 40 : 50, t: 24, b: 46 });
  const yLabel = s.mode === 'combine' ? 'aₙ, bₙ, cₙ' : s.mode === 'sandwich' ? 'aₙ ≤ bₙ ≤ cₙ' : 'aₙ';
  const plot = makePlot(box, { min: 0, max: an.win + 1, label: 'n' }, { min: an.y[0], max: an.y[1], label: yLabel });
  const { win } = an;
  const xN = plot.px(s.N + 0.5);
  const clampY = (v: number) => Math.max(box.y - 4, Math.min(box.y + box.h + 4, plot.py(v)));
  // a point never takes more than about a third of the space one term gets, so rings do not merge on a phone
  const r = Math.max(1.8, Math.min(4.6, (box.w / win) * 0.3));
  const usesN = s.mode !== 'bound';

  // the ignored terms: everything up to N
  if (usesN && s.N > 0) {
    ctx.save();
    ctx.fillStyle = withAlpha(p.ink3, 0.1);
    ctx.fillRect(box.x, box.y, Math.max(0, Math.min(xN, box.x + box.w) - box.x), box.h);
    ctx.restore();
  }

  const labels: { text: string; y: number; color: string }[] = [];
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();

  if (s.mode === 'limit' || s.mode === 'combine' || s.mode === 'sandwich') {
    // the ε-band and the (candidate) limit
    const yTop = plot.py(an.L + an.eps);
    const yBot = plot.py(an.L - an.eps);
    band(ctx, box, yTop, yBot, p.epsBand);
    hLine(ctx, box, yTop, p.eps, 1, [5, 4]);
    hLine(ctx, box, yBot, p.eps, 1, [5, 4]);
    hLine(ctx, box, plot.py(an.L), p.limit, 2);
    labels.push({ text: 'L', y: plot.py(an.L), color: p.limit });
    if (yBot - yTop > 30) labels.push({ text: 'L+ε', y: yTop, color: p.eps }, { text: 'L−ε', y: yBot, color: p.eps });
  }

  if (s.mode === 'combine' && an.combine && s.showMin && an.combine.tol) {
    // the tolerances the proof puts on aₙ and bₙ, around their limits
    const { p: pr, tol } = an.combine;
    for (const [lim, e, color] of [
      [pr.aLimit!, tol.epsA, p.ink2],
      [pr.bLimit!, tol.epsB, p.ink3],
    ] as [number, number, string][]) {
      band(ctx, box, plot.py(lim + e), plot.py(lim - e), withAlpha(color, 0.07));
      hLine(ctx, box, plot.py(lim + e), color, 1, [2, 3]);
      hLine(ctx, box, plot.py(lim - e), color, 1, [2, 3]);
      hLine(ctx, box, plot.py(lim), color, 1);
    }
  }

  if (s.mode === 'bound') {
    // |y| ≤ M: the region a bound allows
    band(ctx, box, plot.py(s.M), plot.py(-s.M), p.epsBand);
    hLine(ctx, box, plot.py(s.M), p.eps, 1.8);
    hLine(ctx, box, plot.py(-s.M), p.eps, 1.8);
    labels.push({ text: 'M', y: plot.py(s.M), color: p.eps }, { text: '−M', y: plot.py(-s.M), color: p.eps });
    if (s.showMin && an.bound?.proof != null) {
      const B = an.bound.proof;
      hLine(ctx, box, plot.py(an.L), p.limit, 1.6);
      hLine(ctx, box, plot.py(an.L + 1), p.limit, 1, [2, 4]);
      hLine(ctx, box, plot.py(an.L - 1), p.limit, 1, [2, 4]);
      hLine(ctx, box, plot.py(B), p.ink, 1.6, [9, 5]);
      hLine(ctx, box, plot.py(-B), p.ink, 1.6, [9, 5]);
      labels.push({ text: 'B', y: plot.py(B), color: p.ink }, { text: '−B', y: plot.py(-B), color: p.ink }, { text: 'L', y: plot.py(an.L), color: p.limit });
    }
  }

  if (s.mode === 'infinite' && an.infinite) {
    // the region the definition asks the terms after N to be in: above M (→ ∞) or below it (→ −∞)
    const yM = plot.py(s.M);
    band(ctx, box, yM, an.infinite.dir > 0 ? box.y : box.y + box.h, p.epsBand);
    hLine(ctx, box, yM, p.eps, 2);
    labels.push({ text: 'M', y: yM, color: p.eps });
  }

  if (s.mode === 'cauchy' && an.cauchy) {
    // the tail's spread from min to max, filled when it is narrower than ε
    const c = an.cauchy;
    const yMax = plot.py(c.max);
    const yMin = plot.py(c.min);
    if (c.below) {
      band(ctx, box, yMax, yMin, withAlpha(p.pointIn, 0.16), xN);
      hLine(ctx, box, yMax, p.pointIn, 1.4, [], xN);
      hLine(ctx, box, yMin, p.pointIn, 1.4, [], xN);
    } else {
      hLine(ctx, box, yMax, p.pointOut, 1.4, [6, 4], xN);
      hLine(ctx, box, yMin, p.pointOut, 1.4, [6, 4], xN);
    }
  }
  ctx.restore();

  drawAxes(ctx, plot, p);

  // the ε ruler of mode cauchy: a bar of height ε from the tail's minimum, in the right margin beside the spread
  if (s.mode === 'cauchy' && an.cauchy) {
    const x = box.x + box.w + 8;
    const y0 = clampY(an.cauchy.min);
    const y1 = clampY(an.cauchy.min + an.eps);
    ctx.save();
    ctx.strokeStyle = p.eps;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 4, y0);
    ctx.lineTo(x + 4, y0);
    ctx.moveTo(x - 4, y1);
    ctx.lineTo(x + 4, y1);
    ctx.stroke();
    ctx.fillStyle = p.eps;
    ctx.font = `600 ${narrow ? 12 : 13}px ${p.fontUi}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.direction = 'ltr';
    ctx.fillText('ε', x + 7, (y0 + y1) / 2);
    ctx.restore();
  } else {
    marginLabels(ctx, box, p, narrow, labels);
  }

  // the auxiliary sequences, small and in ink tones: below the main points
  const small = Math.max(1.5, r * 0.6);
  for (let n = 1; n <= win; n++) {
    const x = plot.px(n);
    if (s.mode === 'combine' && an.combine) {
      mark(ctx, 'square', x, clampY(an.combine.p.a(n)), small, p.ink2);
      mark(ctx, 'diamond', x, clampY(an.combine.p.b(n)), small, p.ink3);
    } else if (s.mode === 'sandwich' && an.sandwich) {
      mark(ctx, 'up', x, clampY(an.sandwich.t.lower(n)), small, p.ink2);
      mark(ctx, 'down', x, clampY(an.sandwich.t.upper(n)), small, p.ink2);
    }
  }

  // the terms of the verdict's sequence
  const bad = new Set(an.bad);
  for (let n = 1; n <= win; n++) {
    const v = an.main(n);
    if (!Number.isFinite(v)) continue;
    const x = plot.px(n);
    const y = clampY(v);
    ctx.save();
    if (usesN && n <= s.N) dotIgnored(ctx, x, y, r, p);
    else {
      const ok = s.mode === 'cauchy' ? an.works : !bad.has(n);
      if (ok) dotIn(ctx, x, y, r, p.pointIn);
      else dotOut(ctx, x, y, r, p);
    }
    ctx.restore();
  }

  // the helpers' N lines
  if (s.showMin && s.mode === 'combine' && an.combine?.tol) {
    if (an.combine.N1 !== null) vLine(ctx, plot, p, an.combine.N1, 'N₁', p.ink2, 1, [3, 3]);
    if (an.combine.N2 !== null) vLine(ctx, plot, p, an.combine.N2, 'N₂', p.ink2, 2, [3, 3]);
  }
  if (s.showMin && s.mode === 'sandwich' && an.sandwich) {
    if (an.sandwich.Nlow !== null) vLine(ctx, plot, p, an.sandwich.Nlow, 'N₁', p.ink2, 1, [3, 3]);
    if (an.sandwich.Nup !== null) vLine(ctx, plot, p, an.sandwich.Nup, 'N₂', p.ink2, 2, [3, 3]);
  }

  // the N line
  if (xN >= box.x && xN <= box.x + box.w) {
    ctx.save();
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(xN, box.y);
    ctx.lineTo(xN, box.y + box.h);
    ctx.stroke();
    ctx.setLineDash([]);
    // above the plot, to the right of the line, clear of the y-axis ticks
    ctx.fillStyle = p.ink;
    ctx.font = `700 14px ${p.fontUi}`;
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`N = ${s.N}`, Math.min(xN + 5, box.x + box.w - 50), box.y - 4);
    ctx.restore();
  }
  return plot;
}
