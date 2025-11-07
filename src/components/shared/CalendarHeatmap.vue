<script setup lang="ts">
import { computed, defineProps, defineEmits, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';

type DataRow = { date: string | Date; value: number };

const props = defineProps<{
  data: DataRow[];
  monthStart?: Date | null;
  months?: number;
  max?: number | null;
  weekdayStart?: 0 | 1;
  colors?: string[];
  showLegend?: boolean;
  showHeader?: boolean;
  density?: 'normal' | 'compact' | 'tiny';
  minColumnWidthPx?: number;
  maxWidthPx?: number;
  scale?: number;
  allowNavigate?: boolean;
  minDate?: string | Date | null;
  maxDate?: string | Date | null;
  tooltipAnchor?: 'cursor' | 'cell';
}>();

const emit = defineEmits<{
  (e: 'update:monthStart', value: Date): void;
  (e: 'month-change', value: { year: number; monthIndex: number; date: Date }): void;
  (e: 'day-click', value: { date: string; value: number }): void;
}>();

function toUTCDateOnly(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function parseToUTCDate(raw: string | Date | null | undefined): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return toUTCDateOnly(raw);
  const iso = String(raw).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(iso + 'T00:00:00Z');
  const t = new Date(String(raw));
  return isNaN(t.getTime()) ? null : toUTCDateOnly(t);
}
function fmtISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function firstOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function addMonthsUTC(d: Date, n: number) {
  const y = d.getUTCFullYear(),
    m = d.getUTCMonth() + n;
  return new Date(Date.UTC(y + Math.floor(m / 12), ((m % 12) + 12) % 12, 1));
}
function clampMonth(d: Date, minD: Date | null, maxD: Date | null) {
  const f = firstOfMonthUTC(d);
  if (minD && f < firstOfMonthUTC(minD)) return firstOfMonthUTC(minD);
  if (maxD && f > firstOfMonthUTC(maxD)) return firstOfMonthUTC(maxD);
  return f;
}

const weekdayStart = computed(() => (props.weekdayStart === 0 ? 0 : 1));
const monthsCount = computed(() => Math.max(1, props.months ?? 1));
const density = computed(() => props.density ?? 'tiny');

const dataYears = computed(() => {
  const years = new Set<number>();
  for (const r of props.data || []) {
    const d = parseToUTCDate((r as any).date);
    if (d) years.add(d.getUTCFullYear());
  }
  if (years.size) return [...years].sort((a, b) => a - b);
  const y = new Date().getUTCFullYear();
  return Array.from({ length: 13 }, (_, i) => y - 6 + i);
});
const minBound = computed(() => (props.minDate ? parseToUTCDate(props.minDate) : new Date(Date.UTC(dataYears.value[0], 0, 1))));
const maxBound = computed(() => (props.maxDate ? parseToUTCDate(props.maxDate) : new Date(Date.UTC(dataYears.value.at(-1)!, 11, 31))));

const initialMonth = props.monthStart instanceof Date ? firstOfMonthUTC(props.monthStart) : firstOfMonthUTC(toUTCDateOnly(new Date()));
const currentMonthStart = ref<Date>(clampMonth(initialMonth, minBound.value, maxBound.value));
watch(
  () => props.monthStart,
  (nv) => {
    if (!nv) return;
    const d = nv instanceof Date ? nv : toUTCDateOnly(new Date());
    currentMonthStart.value = clampMonth(d, minBound.value, maxBound.value);
  }
);

const monthNames = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
];
function monthTitle(y: number, m: number) {
  return `${new Date(Date.UTC(y, m, 1)).toLocaleString('es-MX', { month: 'long', timeZone: 'UTC' })} ${y}`;
}
const allowedMonths = computed(() => {
  const y = currentMonthStart.value.getUTCFullYear();
  let minM = 0,
    maxM = 11;
  if (minBound.value && minBound.value.getUTCFullYear() === y) minM = minBound.value.getUTCMonth();
  if (maxBound.value && maxBound.value.getUTCFullYear() === y) maxM = maxBound.value.getUTCMonth();
  return monthNames.map((name, i) => ({ name, i })).filter((m) => m.i >= minM && m.i <= maxM);
});
const canPrev = computed(
  () => props.allowNavigate !== false && (!minBound.value || addMonthsUTC(currentMonthStart.value, -1) >= firstOfMonthUTC(minBound.value))
);
const canNext = computed(
  () => props.allowNavigate !== false && (!maxBound.value || addMonthsUTC(currentMonthStart.value, 1) <= firstOfMonthUTC(maxBound.value))
);
function go(n: number) {
  if (props.allowNavigate === false) return;
  const t = clampMonth(addMonthsUTC(currentMonthStart.value, n), minBound.value, maxBound.value);
  if (t.getTime() !== currentMonthStart.value.getTime()) {
    currentMonthStart.value = t;
    emit('update:monthStart', t);
    emit('month-change', { year: t.getUTCFullYear(), monthIndex: t.getUTCMonth(), date: t });
  }
}
function setMonthYear(m: number, y: number) {
  const t = clampMonth(new Date(Date.UTC(y, m, 1)), minBound.value, maxBound.value);
  currentMonthStart.value = t;
  emit('update:monthStart', t);
  emit('month-change', { year: t.getUTCFullYear(), monthIndex: t.getUTCMonth(), date: t });
}

/* ====== datos por día y colores ====== */
const byDay = computed(() => {
  const m = new Map<string, number>();
  for (const r of props.data || []) {
    const d = parseToUTCDate((r as any).date);
    const v = Number((r as any).value);
    if (!d || !Number.isFinite(v)) continue;
    const k = fmtISO(d);
    m.set(k, (m.get(k) || 0) + v);
  }
  return m;
});

// Paleta de azules claros
const baseStart = computed(() => props.colors?.[0] ?? '#e3f2fd'); // azul muy claro
const baseEnd = computed(() => props.colors?.[props.colors.length - 1] ?? '#1976d2'); // azul fuerte
const palette5 = computed(() => [
  baseStart.value, // más claro
  '#bbdefb', // claro
  '#90caf9', // medio claro
  '#64b5f6', // azul medio
  baseEnd.value // azul fuerte
]);

// Umbrales personalizados
const THRESHOLDS = [1, 15, 30, 50];

// Color según umbral
function colorFor(v: number) {
  if (!v || v <= 0) return '#f5f5f5';
  if (v <= THRESHOLDS[0]) return palette5.value[1];
  if (v <= THRESHOLDS[1]) return palette5.value[2];
  if (v <= THRESHOLDS[2]) return palette5.value[3];
  if (v <= THRESHOLDS[3]) return palette5.value[4];
  return palette5.value[4]; // >50, azul más fuerte
}

/* ====== grid mensual ====== */
function monthGrid(y: number, m: number) {
  const first = new Date(Date.UTC(y, m, 1));
  const dow = first.getUTCDay();
  const offset = (dow - (weekdayStart.value || 0) + 7) % 7;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const out: { date: Date | null; inMonth: boolean }[] = [];
  for (let i = 0; i < offset; i++) out.push({ date: null, inMonth: false });
  for (let d = 1; d <= last; d++) out.push({ date: new Date(Date.UTC(y, m, d)), inMonth: true });
  while (out.length % 7 !== 0) out.push({ date: null, inMonth: false });
  while (out.length < 42) out.push({ date: null, inMonth: false });
  return out;
}
const weekdayNames = computed(() =>
  weekdayStart.value === 1 ? ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'] : ['D', 'L', 'M', 'Mi', 'J', 'V', 'S']
);
const monthsToRender = computed(() => {
  const arr: { year: number; monthIndex: number; title: string; cells: { date: Date | null; inMonth: boolean }[] }[] = [];
  const start = currentMonthStart.value;
  for (let i = 0; i < monthsCount.value; i++) {
    const y = start.getUTCFullYear(),
      m = start.getUTCMonth() + i;
    const ry = y + Math.floor(m / 12),
      rm = ((m % 12) + 12) % 12;
    arr.push({ year: ry, monthIndex: rm, title: monthTitle(ry, rm), cells: monthGrid(ry, rm) });
  }
  return arr;
});

/* ====== tooltip (teleport al body, anclado al cursor por defecto) ====== */
const tooltipAnchor = computed(() => props.tooltipAnchor ?? 'cursor');
const tooltipRef = ref<HTMLElement | null>(null);
const tooltip = ref({ show: false, x: 0, y: 0, title: '', body: '' });
let raf: number | null = null;

function ttText(d: Date) {
  const iso = fmtISO(d);
  const val = byDay.value.get(iso) ?? 0;
  const title = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' }).format(d);
  return { title, body: `Respuestas: ${val} resp.` };
}
function clampToViewport(x: number, y: number) {
  const el = tooltipRef.value;
  const w = el?.offsetWidth ?? 220;
  const h = el?.offsetHeight ?? 60;
  const vw = window.innerWidth,
    vh = window.innerHeight,
    pad = 8;
  return {
    x: Math.min(Math.max(x, pad), vw - w - pad),
    y: Math.min(Math.max(y, pad), vh - h - pad)
  };
}
async function showAtCursor(cx: number, cy: number, d: Date) {
  const { title, body } = ttText(d);
  tooltip.value.show = true;
  tooltip.value.title = title;
  tooltip.value.body = body;
  await nextTick();
  const p = clampToViewport(cx + 12, cy + 12);
  tooltip.value.x = p.x;
  tooltip.value.y = p.y;
}
async function showAtCellRect(rect: DOMRect, d: Date) {
  const { title, body } = ttText(d);
  tooltip.value.show = true;
  tooltip.value.title = title;
  tooltip.value.body = body;
  await nextTick();
  const el = tooltipRef.value;
  const w = el?.offsetWidth ?? 220;
  const x = rect.left + rect.width / 2 - w / 2;
  const y = rect.top - 10;
  const p = clampToViewport(x, y);
  tooltip.value.x = p.x;
  tooltip.value.y = p.y;
}
function onEnter(ev: PointerEvent, d: Date | null) {
  if (!d) return onLeave();
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    if (tooltipAnchor.value === 'cursor') showAtCursor(ev.clientX, ev.clientY, d);
    else showAtCellRect((ev.currentTarget as HTMLElement).getBoundingClientRect(), d);
  });
}
function onMove(ev: PointerEvent, d: Date | null) {
  if (!d) return onLeave();
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    if (tooltipAnchor.value === 'cursor') showAtCursor(ev.clientX, ev.clientY, d);
    else showAtCellRect((ev.currentTarget as HTMLElement).getBoundingClientRect(), d);
  });
}
function onLeave() {
  if (raf) {
    cancelAnimationFrame(raf);
    raf = null;
  }
  tooltip.value.show = false;
}
function onScrollReposition() {
  if (tooltipAnchor.value === 'cell' && tooltip.value.show) tooltip.value.show = false;
}
onMounted(() => window.addEventListener('scroll', onScrollReposition, true));
onBeforeUnmount(() => window.removeEventListener('scroll', onScrollReposition, true));

const cssVars = computed(() => {
  const presets = {
    normal: { colMin: 320, monthsGap: 16, dayGap: 6, radius: 8, padX: 12, padY: 10, title: 22, num: 18, val: 18 },
    compact: { colMin: 260, monthsGap: 12, dayGap: 4, radius: 6, padX: 10, padY: 8, title: 18, num: 16, val: 16 },
    tiny: { colMin: 200, monthsGap: 10, dayGap: 3, radius: 6, padX: 8, padY: 6, title: 16, num: 14, val: 14 }
  } as const;
  const p = presets[density.value];
  return {
    '--col-min': `${Math.max(140, props.minColumnWidthPx ?? p.colMin)}px`,
    '--months-gap': `${p.monthsGap}px`,
    '--day-gap': `${p.dayGap}px`,
    '--day-radius': `${p.radius}px`,
    '--pad-x': `${p.padX}px`,
    '--pad-y': `${p.padY}px`,
    '--title-size': `${p.title}px`,
    '--num-size': `${p.num}px`,
    '--val-size': `${p.val}px`,
    '--max-width': `${Math.max(220, props.maxWidthPx ?? 420)}px`
  } as Record<string, string>;
});
const outerStyle = computed(() => {
  const s = Number(props.scale ?? 1.1);
  return { display: 'inline-block', transform: `scale(${s})`, transformOrigin: 'top left' } as Record<string, string>;
});

function onDayClick(d: Date | null) {
  if (!d) return;
  emit('day-click', { date: fmtISO(d), value: byDay.value.get(fmtISO(d)) || 0 });
}
</script>

<template>
  <div class="calendar-monthly-outer" :style="outerStyle">
    <div class="calendar-monthly" :style="cssVars">
      <div v-if="allowNavigate !== false" class="nav-bar">
        <button class="nav-btn" :disabled="!canPrev" @click="go(-1)">‹</button>
        <div class="nav-selects">
          <select
            class="nav-select"
            :value="currentMonthStart.getUTCMonth()"
            @change="setMonthYear(Number(($event.target as HTMLSelectElement).value), currentMonthStart.getUTCFullYear())"
          >
            <option v-for="m in allowedMonths" :key="m.i" :value="m.i">{{ m.name }}</option>
          </select>
          <select
            class="nav-select"
            :value="currentMonthStart.getUTCFullYear()"
            @change="setMonthYear(currentMonthStart.getUTCMonth(), Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="y in dataYears" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <button class="nav-btn" :disabled="!canNext" @click="go(1)">›</button>
      </div>

      <div class="calendar-row">
        <div v-for="(month, mi) in monthsToRender" :key="mi" class="month-block">
          <div v-if="showHeader !== false" class="month-title">{{ month.title }}</div>
          <div class="weekday-row">
            <div v-for="(wd, i) in weekdayNames" :key="i" class="weekday-cell">{{ wd }}</div>
          </div>

          <div class="day-grid">
            <div
              v-for="(cell, ci) in month.cells"
              :key="ci"
              class="day-cell"
              :class="{ 'in-month': cell.inMonth }"
              :style="cell.inMonth ? { backgroundColor: colorFor(byDay.get(fmtISO(cell.date!)) || 0) } : {}"
              @pointerenter="onEnter($event, cell.inMonth ? cell.date : null)"
              @pointermove="onMove($event, cell.inMonth ? cell.date : null)"
              @pointerleave="onLeave"
              @click="onDayClick(cell.date)"
            >
              <div v-if="cell.inMonth" class="day-number">{{ new Date(cell.date!).getUTCDate() }}</div>
              <div v-if="cell.inMonth && (byDay.get(fmtISO(cell.date!)) ?? 0) > 0" class="day-value">
                {{ (byDay.get(fmtISO(cell.date!)) ?? 0) > 100 ? '+100' : byDay.get(fmtISO(cell.date!)) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showLegend !== false" class="legend">
        <span class="legend-label">Menos</span>
        <div class="legend-squares">
          <span class="sq" :style="{ background: '#f5f5f5' }" title="0" />
          <span class="sq" :style="{ background: palette5[1] }" title="1" />
          <span class="sq" :style="{ background: palette5[2] }" title="15" />
          <span class="sq" :style="{ background: palette5[3] }" title="30" />
          <span class="sq" :style="{ background: palette5[4] }" title="50+" />
        </div>
        <span class="legend-label">Más</span>
      </div>
    </div>

    <!-- Tooltip en body -->
    <teleport to="body">
      <div v-show="tooltip.show" ref="tooltipRef" class="calendar-tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
        <div class="tt-title">{{ tooltip.title }}</div>
        <div class="tt-body">{{ tooltip.body }}</div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.calendar-monthly {
  width: max-content;
  max-width: var(--max-width, 380px);
}
.calendar-monthly-outer {
  position: relative;
  overflow: visible;
}
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}
.nav-btn {
  width: 54px;
  height: 32px;
  padding: 0 15px;
  border-radius: 10px;
  border: 1.5px solid #e0e0e0;
  background: #fff;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    box-shadow 0.12s,
    border-color 0.12s;
}
.nav-btn:active,
.nav-btn:focus {
  border-color: #1976d2;
  outline: none;
  box-shadow: 0 0 0 2px #90caf9;
}
.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.nav-selects {
  display: flex;
  gap: 8px;
  align-items: center;
}
.nav-select {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 6px 10px;
  background: #fff;
  font-size: 16px;
  min-width: 320px;
  max-width: 100%;
  white-space: nowrap;
  appearance: none;
}
.calendar-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--col-min, 200px), 1fr));
  gap: var(--months-gap, 10px);
}
.month-block {
  border: 1px solid #eaeaea;
  border-radius: 12px;
  padding: var(--pad-y, 8px) var(--pad-x, 10px);
  background: #fff;
}
.month-title {
  font-weight: 700;
  font-size: var(--title-size, 22px);
  text-transform: capitalize;
  margin-bottom: 6px;
}
.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 6px;
}
.weekday-cell {
  text-align: center;
  font-size: 16px;
  color: #666;
}
.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--day-gap, 3px);
}
.day-cell {
  position: relative;
  aspect-ratio: 1/1;
  border-radius: var(--day-radius, 6px);
  background: #fafafa;
  border: 1px solid #eee;
  transition:
    transform 0.06s,
    box-shadow 0.06s;
}
.day-cell.in-month {
  cursor: pointer;
}
.day-cell.in-month:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}
.day-number {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: var(--num-size, 18px);
  color: #333;
  font-weight: 600;
}
.day-value {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-size: var(--val-size, 18px);
  font-weight: 700;
  color: #0d47a1;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}
.legend {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  font-size: 14px;
  color: #555;
  flex-wrap: wrap;
}
.legend-squares {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.legend-squares .sq {
  width: 16px;
  height: 10px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}
.legend-label {
  white-space: nowrap;
}
.calendar-tooltip {
  position: fixed;
  z-index: 2147483647;
  pointer-events: none;
  background: #fff;
  color: #222;
  border-radius: 10px;
  box-shadow:
    0 8px 24px rgba(15, 23, 42, 0.14),
    0 2px 6px rgba(0, 0, 0, 0.06);
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid #e6e8ee;
  min-width: 180px;
  max-width: 280px;
}
.tt-title {
  font-weight: 700;
  margin-bottom: 4px;
}
.tt-body {
  font-weight: 500;
  color: #374151;
}

@media (max-width: 600px) {
  .nav-selects {
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }
  .nav-select {
    min-width: 0;
    width: 100%;
    font-size: 15px;
  }
}
</style>
