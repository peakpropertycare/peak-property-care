import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Plus, Search, X, Phone, Mail, MapPin, Droplets, Sun, Sparkles,
  Trash2, Pencil, CheckCircle2, Clock, AlertTriangle, Loader2,
  ClipboardList, Users, DollarSign, TrendingUp, Briefcase,
  Home as HomeIcon, ChevronRight, ChevronLeft, CalendarDays,
  Info, LayoutDashboard, Navigation, Tag, Search as SearchIcon,
  Zap, Target, Award, BarChart2, Star, Bell, ArrowUpRight,
} from "lucide-react";
import { storage } from "./lib/storage";
import logo from "./assets/logo.png";

/* ---------- design tokens ---------- */
const ACCENT = "#0048CD";
const ACCENT_DEEP = "#002C82";
const INK = "#081226";
const INK_SOFT = "#1C2D4A";
const ACCENT_LIGHT = "#9CC2FF";
const BG = "#F2F5FC";
const LINE = "#DDE6F5";
const AMBER = "#C9852A";
const GREEN = "#3F8F63";
const RED = "#B3493A";
const GRAY = "#8C97A0";
const MUTED = "#5A6B85";
const PURPLE = "#7C5CBF";
const PINK = "#C9476B";

const FONT_HEAD = "'Space Grotesk', sans-serif";
const FONT_BODY = "Inter, sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

const SERVICES = [
  { id: "window", label: "Window Cleaning", icon: Droplets, color: ACCENT },
  { id: "solar", label: "Solar Panel Cleaning", icon: Sun, color: AMBER },
  { id: "pressure", label: "Pressure Washing", icon: Sparkles, color: GREEN },
];

const FREQUENCIES = [
  { id: "one-time", label: "One-time" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "biannual", label: "Every 6 months" },
  { id: "annual", label: "Annual" },
];

const HOUSE_STATUSES = [
  { id: "not-home", label: "Not Home", color: GRAY },
  { id: "no", label: "Said No", color: RED },
  { id: "callback", label: "Call/Text Back", color: AMBER },
  { id: "appointment", label: "Appointment Set", color: ACCENT },
  { id: "completed", label: "Job Completed", color: GREEN },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
  "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "clients", label: "Clients", icon: Users },
  { id: "schedule", label: "Schedule", icon: ClipboardList },
  { id: "canvass", label: "Door Map", icon: HomeIcon },
  { id: "finance", label: "Finance", icon: DollarSign },
];

const DURATION_PRESETS = [30, 60, 90, 120];
const CLIENT_TAGS = ["Recurring", "High Value", "Commercial", "Residential", "Referral"];
const PHOTO_CATEGORIES = [
  { id: "property", label: "Property" },
  { id: "before", label: "Before" },
  { id: "after", label: "After" },
  { id: "job", label: "Job" },
];
const AVATAR_COLORS = [ACCENT, GREEN, AMBER, PURPLE, PINK, "#2A9D8F"];

const serviceMap = Object.fromEntries(SERVICES.map((s) => [s.id, s]));
const statusMap = Object.fromEntries(HOUSE_STATUSES.map((s) => [s.id, s]));
const freqLabel = (id) => FREQUENCIES.find((f) => f.id === id)?.label || id;

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatMonth(ym) {
  const dt = new Date(ym + "-01T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return "";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function timeToMinutes(t) {
  const [h, m] = (t || "08:00").split(":").map(Number);
  return h * 60 + m;
}
function slotsForAppointment(startTime, duration) {
  const startMin = timeToMinutes(startTime);
  const count = Math.max(1, Math.ceil((duration || 30) / 30));
  const out = [];
  for (let i = 0; i < count; i++) out.push(minutesToTime(startMin + i * 30));
  return out;
}
const TIME_SLOTS = (() => {
  const out = [];
  for (let m = 6 * 60; m <= 18 * 60; m += 30) out.push(minutesToTime(m));
  return out;
})();
function formatAddress(c) {
  const parts = [];
  if (c.street) parts.push(c.street);
  const cityState = [c.city, c.state].filter(Boolean).join(", ");
  const cityStateZip = [cityState, c.zip].filter(Boolean).join(" ");
  if (cityStateZip) parts.push(cityStateZip);
  return parts.join(", ");
}
function formatMoney(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}
function addInterval(dateStr, frequency) {
  const months = { monthly: 1, quarterly: 3, biannual: 6, annual: 12 }[frequency];
  if (!months) return null;
  const dt = new Date(dateStr + "T00:00:00");
  dt.setMonth(dt.getMonth() + months);
  return dt.toISOString().slice(0, 10);
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / 86400000);
}
function dueText(days) {
  if (days === null) return { text: "No date set", color: MUTED };
  if (days < 0) return { text: `Overdue ${Math.abs(days)}d`, color: RED };
  if (days === 0) return { text: "Due today", color: AMBER };
  if (days <= 7) return { text: `Due in ${days}d`, color: AMBER };
  return { text: `Due in ${days}d`, color: GREEN };
}
function normPhone(p) {
  return (p || "").replace(/\D/g, "");
}
function normStr(s) {
  return (s || "").trim().toLowerCase();
}
function findMatch(clients, info) {
  const phone = normPhone(info.phone);
  if (phone) {
    const m = clients.find((c) => normPhone(c.phone) === phone);
    if (m) return m;
  }
  if (info.street && info.street.trim()) {
    const m = clients.find((c) => normStr(c.street) === normStr(info.street) && normStr(c.zip) === normStr(info.zip));
    if (m) return m;
  }
  if (info.name && info.name.trim()) {
    const m = clients.find((c) => normStr(c.name) === normStr(info.name));
    if (m) return m;
  }
  return null;
}
function getMissingFields(form) {
  const checks = [
    { key: "name", label: "name" },
    { key: "phone", label: "phone" },
    { key: "street", label: "address" },
    { key: "price", label: "price" },
    { key: "nextServiceDate", label: "appointment date" },
  ];
  return checks.filter((c) => !form[c.key] || !String(form[c.key]).trim());
}
function getInitials(name) {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
function getAvatarColor(name) {
  const str = name || "?";
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(hash)];
}
function compressImageFile(file, maxDim, quality, callback) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  services: [],
  tags: [],
  frequency: "monthly",
  price: "",
  nextServiceDate: "",
  nextServiceTime: "",
  duration: 60,
  notes: "",
};

/* ---------- shared bits ---------- */
function ServiceBadge({ id, size = "sm" }) {
  const s = serviceMap[id];
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 ${size === "sm" ? "py-0.5 text-xs" : "py-1 text-sm"}`}
      style={{ borderColor: s.color, color: s.color, backgroundColor: `${s.color}14` }}
    >
      <Icon size={size === "sm" ? 12 : 14} />
      {s.label}
    </span>
  );
}
function TagBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: LINE, color: MUTED, background: BG }}>
      <Tag size={10} />{label}
    </span>
  );
}
function Avatar({ name, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: getAvatarColor(name), color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>
      {getInitials(name)}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: 8,
  border: `1px solid ${LINE}`,
  padding: "8px 10px",
  fontSize: "0.875rem",
  outline: "none",
  fontFamily: FONT_BODY,
};

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium" style={{ color: MUTED }}>{label}</span>
      {children}
    </label>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div style={{ width: 38, height: 38, borderRadius: 10, background: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 5 }}>
        <img src={logo} alt="Peak Property Care logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      <div>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, color: "white" }} className="text-base leading-tight">Peak Property Care</div>
        <div style={{ fontFamily: FONT_MONO, color: ACCENT_LIGHT, fontSize: "0.62rem", letterSpacing: "0.18em" }} className="uppercase">Client Hub</div>
      </div>
    </div>
  );
}

/* ── Toast ── */
function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return createPortal(
    <div className="fixed top-4 right-4 flex flex-col gap-2" style={{ zIndex: 99999 }}>
      {toasts.map((t) => (
        <div key={t.id} className="animate-toast flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white"
          style={{ background: t.type === "error" ? RED : t.type === "warning" ? AMBER : GREEN, minWidth: 220 }}>
          {t.type === "error" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          {t.message}
        </div>
      ))}
    </div>,
    document.body
  );
}

/* ── StatCard ── */
function StatCard({ icon: Icon, label, value, accent, sub, trend }) {
  return (
    <div className="hover-lift relative overflow-hidden rounded-2xl p-4"
      style={{ background: `linear-gradient(135deg, #fff 0%, ${accent}0C 100%)`, border: `1px solid ${accent}28`, boxShadow: `0 4px 20px ${accent}10` }}>
      <div className="absolute -top-3 -right-3 opacity-[0.06]" style={{ color: accent }}><Icon size={88} /></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="rounded-xl p-2" style={{ background: `${accent}18` }}><Icon size={17} style={{ color: accent }} /></div>
          {trend !== undefined && (
            <span className="flex items-center gap-0.5 text-xs font-bold" style={{ color: trend >= 0 ? GREEN : RED }}>
              <ArrowUpRight size={13} style={{ transform: trend < 0 ? "rotate(90deg)" : "none" }} />{Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-black tracking-tight animate-count" style={{ color: INK, fontFamily: FONT_HEAD }}>{value}</p>
        <p className="text-xs font-bold mt-0.5" style={{ color: accent }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: MUTED }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Mini bar chart ── */
function MiniBarChart({ data }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-1.5 h-16 mt-3">
      {data.slice().reverse().map((item) => {
        const pct = Math.max(6, (item.revenue / max) * 100);
        return (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full rounded-t-md bar-fill"
              style={{ height: `${pct}%`, background: `linear-gradient(to top, ${ACCENT}, ${ACCENT_LIGHT})` }} />
            <span style={{ color: MUTED, fontSize: "0.58rem", fontFamily: FONT_MONO }}>{item.month.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Progress bar ── */
function ProgressBar({ value, max, color }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 rounded-full overflow-hidden mt-2" style={{ background: `${color}18` }}>
      <div className="h-full rounded-full progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
    </div>
  );
}

function TabHero({ icons, from, to, title, subtitle, action }) {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-5 px-5 py-6 shadow-lg animate-fade-in" style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}>
      {/* Radial glow */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%)" }} />
      {/* Decorative icons */}
      <div className="absolute inset-0 flex items-center justify-end pr-4 gap-0" style={{ opacity: 0.12 }}>
        {icons.map((Icon, i) => (
          <Icon key={i} size={90 - i * 18} color="white" style={{ transform: `rotate(${(i - 1) * 12}deg)`, marginLeft: -18 }} />
        ))}
      </div>
      <img src={logo} alt="" style={{ position: "absolute", left: 12, bottom: -16, width: 72, opacity: 0.1 }} />
      {/* Dot grid */}
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.4 }} />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-white text-xl font-black tracking-tight" style={{ fontFamily: FONT_HEAD }}>{title}</h1>
          {subtitle && <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

/* ---------- shared client fields form ---------- */
function ClientFieldsForm({ form, setForm, compact, clients }) {
  const [dismissed, setDismissed] = useState(false);
  const missing = getMissingFields(form);

  const conflict = useMemo(() => {
    if (!form.nextServiceDate || !form.nextServiceTime || !clients) return null;
    const mySlots = slotsForAppointment(form.nextServiceTime, form.duration || 60);
    for (const c of clients) {
      if (c.id && form.id && c.id === form.id) continue;
      if (c.nextServiceDate !== form.nextServiceDate || !c.nextServiceTime) continue;
      const theirSlots = slotsForAppointment(c.nextServiceTime, c.duration || 60);
      if (mySlots.some((s) => theirSlots.includes(s))) return c;
    }
    return null;
  }, [form.nextServiceDate, form.nextServiceTime, form.duration, form.id, clients]);

  function toggleService(id) {
    setForm((f) => ({ ...f, services: f.services.includes(id) ? f.services.filter((s) => s !== id) : [...f.services, id] }));
  }
  function toggleTag(tag) {
    setForm((f) => ({ ...f, tags: (f.tags || []).includes(tag) ? f.tags.filter((t) => t !== tag) : [...(f.tags || []), tag] }));
  }

  return (
    <div className="flex flex-col gap-3">
      {missing.length > 0 && !dismissed && (
        <div className="flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: `${AMBER}14`, color: AMBER }}>
          <span className="flex items-start gap-1.5">
            <Info size={14} className="mt-0.5 shrink-0" />
            Missing: {missing.map((m) => m.label).join(", ")}. Totally fine if that's on purpose.
          </span>
          <button onClick={() => setDismissed(true)} className="shrink-0"><X size={14} /></button>
        </div>
      )}
      {conflict && (
        <div className="flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs" style={{ background: `${RED}14`, color: RED }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          Overlaps with {conflict.name || "another appointment"} at {formatTime(conflict.nextServiceTime)}. You can still save if that's intentional.
        </div>
      )}
      <Field label="Name"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone"><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} /></Field>
        <Field label="Email"><input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} /></Field>
      </div>
      <Field label="Street address"><input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} style={inputStyle} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="City"><input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} style={inputStyle} /></Field>
        <Field label="State">
          <select value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} style={inputStyle}>
            <option value="">—</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Zip"><input value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} style={inputStyle} /></Field>
      </div>
      <Field label="Services">
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((s) => {
            const active = form.services.includes(s.id);
            const Icon = s.icon;
            return (
              <button type="button" key={s.id} onClick={() => toggleService(s.id)} className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: active ? s.color : LINE, background: active ? `${s.color}14` : "white", color: active ? s.color : MUTED }}>
                <Icon size={12} /> {s.label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Tags">
        <div className="flex flex-wrap gap-2">
          {CLIENT_TAGS.map((t) => {
            const active = (form.tags || []).includes(t);
            return (
              <button type="button" key={t} onClick={() => toggleTag(t)} className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: active ? ACCENT : LINE, background: active ? `${ACCENT}14` : "white", color: active ? ACCENT : MUTED }}>
                <Tag size={11} /> {t}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Frequency">
          <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} style={inputStyle}>
            {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </Field>
        <Field label="Price per visit ($)"><input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} inputMode="decimal" placeholder="0" style={inputStyle} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Appointment date"><input type="date" value={form.nextServiceDate || ""} onChange={(e) => setForm((f) => ({ ...f, nextServiceDate: e.target.value }))} style={inputStyle} /></Field>
        <Field label="Appointment time">
          <select value={form.nextServiceTime || ""} onChange={(e) => setForm((f) => ({ ...f, nextServiceTime: e.target.value }))} style={inputStyle}>
            <option value="">—</option>
            {TIME_SLOTS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Job duration">
        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((d) => (
            <button type="button" key={d} onClick={() => setForm((f) => ({ ...f, duration: d }))} className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: form.duration === d ? ACCENT : LINE, background: form.duration === d ? `${ACCENT}14` : "white", color: form.duration === d ? ACCENT : MUTED }}>
              {d} min
            </button>
          ))}
          <button type="button" onClick={() => setForm((f) => ({ ...f, duration: DURATION_PRESETS.includes(f.duration) ? 45 : f.duration }))} className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: !DURATION_PRESETS.includes(form.duration) ? ACCENT : LINE, background: !DURATION_PRESETS.includes(form.duration) ? `${ACCENT}14` : "white", color: !DURATION_PRESETS.includes(form.duration) ? ACCENT : MUTED }}>
            Custom
          </button>
        </div>
        {!DURATION_PRESETS.includes(form.duration) && (
          <input type="number" min="15" step="15" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) || 30 }))} placeholder="Minutes" style={{ ...inputStyle, marginTop: 6 }} />
        )}
      </Field>
      <Field label="Notes (gate code, pets, access, preferences)">
        <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={compact ? 2 : 3} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
    </div>
  );
}

function ClientModal({ form, setForm, mode, onSubmit, onClose, onDelete, clients }) {
  const title = mode === "edit" ? "Edit client" : mode === "book" ? "Book appointment" : "Add client";
  const saveLabel = mode === "edit" ? "Save changes" : mode === "book" ? "Book appointment" : "Add client";
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md flex flex-col rounded-t-2xl sm:rounded-2xl" style={{ height: "92vh", maxHeight: "92vh" }}>
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: LINE }}>
          <p className="font-bold text-lg" style={{ color: INK, fontFamily: FONT_HEAD }}>{title}</p>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ClientFieldsForm form={form} setForm={setForm} clients={clients} />
        </div>
        <div className="shrink-0 flex items-center justify-between gap-2 px-5 py-4 border-t" style={{ borderColor: LINE }}>
          {mode === "edit" && onDelete ? (
            <button onClick={onDelete} className="flex items-center gap-1.5 text-sm rounded-lg border px-3 py-2" style={{ borderColor: LINE, color: RED }}><Trash2 size={14} /> Delete</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-2 text-sm rounded-lg border" style={{ borderColor: LINE }}>Cancel</button>
            <button onClick={onSubmit} className="px-4 py-2 text-sm rounded-lg text-white font-medium" style={{ background: ACCENT }}>{saveLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= APP ================= */
export default function App() {
  const [clients, setClients] = useState([]);
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("idle");
  const [page, setPage] = useState("dashboard");
  const [scheduleDate, setScheduleDate] = useState(todayStr());
  const [toasts, setToasts] = useState([]);

  function showToast(message, type = "success") {
    const id = genId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [priceDrafts, setPriceDrafts] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get("clients");
        const data = res ? JSON.parse(res.value) : [];
        setClients(data.map((c) => ({ ...emptyForm, ...c, tags: c.tags || [] })));
      } catch {
        setClients([]);
      }
      try {
        const res = await storage.get("pins");
        setPins(res ? JSON.parse(res.value) : []);
      } catch {
        setPins([]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  async function persist(next, toast) {
    setClients(next);
    setSaveState("saving");
    const ok = await storage.set("clients", JSON.stringify(next));
    setSaveState(ok ? "idle" : "error");
    if (toast) showToast(toast, ok ? "success" : "error");
  }
  async function persistPins(next) {
    setPins(next);
    const ok = await storage.set("pins", JSON.stringify(next));
    setSaveState(ok ? "idle" : "error");
  }

  function upsertClientAndPin(clientInfo, pinContext) {
    const match = clientInfo.id ? clients.find((c) => c.id === clientInfo.id) : findMatch(clients, clientInfo);
    const clientId = match ? match.id : genId();
    const nextClients = match
      ? clients.map((c) => (c.id === match.id ? { ...c, ...clientInfo, id: c.id, history: c.history || [] } : c))
      : [...clients, { ...emptyForm, ...clientInfo, id: clientId, history: [] }];

    const hasAppt = !!clientInfo.nextServiceDate;
    const label = clientInfo.name || clientInfo.street || "Client";
    const statusId = hasAppt ? "appointment" : clientInfo.statusId || "not-home";
    const targetPinId = pinContext?.pinId || pins.find((p) => p.clientId === clientId)?.id;

    let nextPins = pins;
    if (targetPinId) {
      nextPins = pins.map((p) =>
        p.id === targetPinId
          ? { ...p, ...(pinContext?.lat != null ? { lat: pinContext.lat, lng: pinContext.lng } : {}), clientId, label, statusId, updatedAt: new Date().toISOString() }
          : p
      );
    } else if (pinContext || hasAppt) {
      nextPins = [...pins, { id: genId(), lat: pinContext?.lat ?? null, lng: pinContext?.lng ?? null, label, statusId, notes: "", clientId, updatedAt: new Date().toISOString() }];
    }

    persist(nextClients);
    if (nextPins !== pins) persistPins(nextPins);
    return clientId;
  }

  function deletePin(id) {
    persistPins(pins.filter((p) => p.id !== id));
  }

  function openAdd() {
    setForm(emptyForm);
    setModal({ mode: "add" });
  }
  function openEdit(client) {
    setForm({ ...emptyForm, ...client });
    setModal({ mode: "edit", clientId: client.id });
  }
  function openBook(date, time) {
    setForm({ ...emptyForm, nextServiceDate: date, nextServiceTime: time });
    setModal({ mode: "book" });
  }
  function submitModal() {
    const info = modal.mode === "edit" ? { ...form, id: modal.clientId } : { ...form };
    const id = upsertClientAndPin(info, null);
    setModal(null);
    setSelectedId(id);
    showToast(modal.mode === "edit" ? "Client updated" : modal.mode === "book" ? "Appointment booked" : "Client added");
  }
  function deleteClient(id) {
    persist(clients.filter((c) => c.id !== id), null);
    persistPins(pins.map((p) => (p.clientId === id ? { ...p, clientId: null } : p)));
    if (selectedId === id) setSelectedId(null);
    setConfirmDeleteId(null);
  }

  function getPriceDraft(c) {
    return priceDrafts[c.id] !== undefined ? priceDrafts[c.id] : c.price ?? "";
  }
  function markServiced(client) {
    const today = todayStr();
    const note = noteDrafts[client.id] || "";
    const price = getPriceDraft(client);
    const entry = { date: today, services: client.services, notes: note, price: Number(price) || 0 };
    const nextDate = client.frequency === "one-time" ? null : addInterval(today, client.frequency);
    const updated = { ...client, history: [entry, ...(client.history || [])], nextServiceDate: nextDate, nextServiceTime: nextDate ? client.nextServiceTime : "" };
    persist(clients.map((c) => (c.id === client.id ? updated : c)), `Job logged${price ? ` · ${formatMoney(price)}` : ""}`);
    const linkedPin = pins.find((p) => p.clientId === client.id);
    if (linkedPin) persistPins(pins.map((p) => (p.id === linkedPin.id ? { ...p, statusId: "completed", updatedAt: new Date().toISOString() } : p)));
    setNoteDrafts((d) => ({ ...d, [client.id]: "" }));
    setPriceDrafts((d) => {
      const next = { ...d };
      delete next[client.id];
      return next;
    });
  }

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const q = normStr(query);
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        formatAddress(c).toLowerCase().includes(q) ||
        normPhone(c.phone).includes(normPhone(query)) ||
        (c.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        c.services.some((s) => (serviceMap[s]?.label || "").toLowerCase().includes(q));
      const matchesService = !serviceFilter || c.services.includes(serviceFilter);
      return matchesQuery && matchesService;
    });
  }, [clients, query, serviceFilter]);

  const scheduled = useMemo(() => {
    return clients.filter((c) => c.nextServiceDate).map((c) => ({ ...c, days: daysUntil(c.nextServiceDate) })).sort((a, b) => a.days - b.days);
  }, [clients]);

  const selected = clients.find((c) => c.id === selectedId) || null;

  return (
    <div style={{ background: BG, fontFamily: FONT_BODY, minHeight: "100vh" }} className="text-slate-800 flex flex-col">
      <header style={{ background: `linear-gradient(135deg, ${INK} 0%, #0B1F3E 100%)`, borderBottom: `1px solid rgba(255,255,255,0.06)` }} className="px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
        <Logo />
        <div className="flex items-center gap-3">
          {saveState === "saving" && (
            <span className="flex items-center gap-1 text-xs" style={{ color: ACCENT_LIGHT, fontFamily: FONT_MONO }}>
              <Loader2 size={11} className="animate-spin" /> saving…
            </span>
          )}
          {saveState === "error" && (
            <span className="flex items-center gap-1 text-xs" style={{ color: RED, fontFamily: FONT_MONO }}>
              <AlertTriangle size={11} /> save failed
            </span>
          )}
        </div>
      </header>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT}, #00A3FF, ${GREEN}, ${ACCENT})`, backgroundSize: "200% 100%", animation: "shimmer 3s linear infinite" }} />

      <div className="flex flex-1 min-h-0">
        <aside className="hidden sm:flex flex-col w-56 shrink-0 py-5 px-3 gap-1 border-r" style={{ background: "#07101F", borderColor: "rgba(255,255,255,0.05)" }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition-all"
                style={{ background: active ? `linear-gradient(135deg, ${ACCENT}40, ${ACCENT}20)` : "transparent", color: active ? "white" : "#6B839A", fontFamily: FONT_HEAD, borderLeft: active ? `3px solid ${ACCENT}` : "3px solid transparent", marginLeft: active ? 0 : 0 }}>
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
          <div className="mt-auto pt-4 border-t mx-1" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-xs px-3" style={{ color: "#3D5268", fontFamily: FONT_MONO }}>Peak Property Care</p>
            <p className="text-xs px-3" style={{ color: "#2A3D52" }}>v1.0</p>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-8 py-6 pb-24 sm:pb-10">
          {loading ? (
            <div className="flex items-center gap-2 text-sm py-12 justify-center" style={{ color: MUTED }}><Loader2 size={16} className="animate-spin" /> Loading…</div>
          ) : (
            <>
              {page === "dashboard" && (
                <>
                  <TabHero icons={[LayoutDashboard, Sparkles]} from={ACCENT} to={ACCENT_DEEP} title="Welcome back" subtitle="Here's what's happening with Peak Property Care." />
                  <DashboardTab clients={clients} pins={pins} onOpenClient={setSelectedId} setPage={setPage} onAdd={openAdd} />
                </>
              )}
              {page === "clients" && (
                <>
                  <TabHero
                    icons={[Users, HomeIcon]} from={ACCENT} to={INK}
                    title="Clients" subtitle="Your full client list and service plans."
                    action={<button onClick={openAdd} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white shrink-0 bg-white/15 backdrop-blur"><Plus size={16} /> Add client</button>}
                  />
                  <ClientsTab clients={filtered} allCount={clients.length} query={query} setQuery={setQuery} serviceFilter={serviceFilter} setServiceFilter={setServiceFilter} onOpen={setSelectedId} onAdd={openAdd} />
                </>
              )}
              {page === "schedule" && (
                <>
                  <TabHero icons={[CalendarDays, Clock]} from={AMBER} to={INK} title="Schedule" subtitle="Tap an open slot to book an appointment." />
                  <ScheduleTab clients={clients} scheduleDate={scheduleDate} setScheduleDate={setScheduleDate} onOpenClient={setSelectedId} onBookSlot={(slot) => openBook(scheduleDate, slot)} />
                </>
              )}
              {page === "canvass" && (
                <>
                  <TabHero icons={[HomeIcon, MapPin]} from={GREEN} to={INK} title="Door Map" subtitle="A real, live map — tap to drop a pin on any house." />
                  <DoorMap pins={pins} clients={clients} persistPins={persistPins} upsertClientAndPin={upsertClientAndPin} deletePin={deletePin} showToast={showToast} onOpenClient={(id) => { setSelectedId(id); setPage("clients"); }} />
                </>
              )}
              {page === "finance" && (
                <>
                  <TabHero icons={[DollarSign, TrendingUp]} from={GREEN} to={ACCENT_DEEP} title="Finance" subtitle="Revenue, completed jobs, and projected income." />
                  <FinanceTab clients={clients} />
                </>
              )}
            </>
          )}
        </main>
      </div>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 flex justify-around items-center py-2 px-1" style={{ background: "#0B1830", boxShadow: "0 -4px 16px rgba(0,0,0,0.3)" }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)} className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl" style={{ background: active ? `${ACCENT}35` : "transparent" }}>
              <Icon size={18} color={active ? ACCENT_LIGHT : "#7488AC"} />
              <span style={{ color: active ? ACCENT_LIGHT : "#7488AC", fontSize: "0.58rem", fontFamily: FONT_HEAD }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {selected && (
        <DetailDrawer
          client={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => openEdit(selected)}
          onDelete={() => setConfirmDeleteId(selected.id)}
          onMark={() => markServiced(selected)}
          noteDraft={noteDrafts[selected.id] || ""}
          setNoteDraft={(v) => setNoteDrafts((d) => ({ ...d, [selected.id]: v }))}
          priceDraft={getPriceDraft(selected)}
          setPriceDraft={(v) => setPriceDrafts((d) => ({ ...d, [selected.id]: v }))}
        />
      )}

      {modal && (
        <ClientModal form={form} setForm={setForm} mode={modal.mode} clients={clients} onSubmit={submitModal} onClose={() => setModal(null)} onDelete={modal.mode === "edit" ? () => { setConfirmDeleteId(modal.clientId); setModal(null); } : null} />
      )}

      {confirmDeleteId && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-full p-2" style={{ background: `${RED}18` }}><AlertTriangle size={20} style={{ color: RED }} /></div>
              <p className="font-bold text-base" style={{ color: INK }}>Delete this client?</p>
            </div>
            <p className="text-sm mb-5" style={{ color: MUTED }}>This removes their info, history, and photos. Any map pin stays but unlinks. This can't be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm rounded-xl border font-medium" style={{ borderColor: LINE }}>Cancel</button>
              <button onClick={() => { deleteClient(confirmDeleteId); showToast("Client deleted", "error"); }} className="px-4 py-2 text-sm rounded-xl text-white font-medium" style={{ background: RED }}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}

/* ---------- Dashboard ---------- */
function DashboardTab({ clients, pins, onOpenClient, setPage, onAdd }) {
  const today = todayStr();
  const todays = clients.filter((c) => c.nextServiceDate === today).sort((a, b) => (a.nextServiceTime || "").localeCompare(b.nextServiceTime || ""));
  const followUps = pins.filter((p) => p.statusId === "callback").slice(0, 5);
  const overdue = clients.filter((c) => c.nextServiceDate && daysUntil(c.nextServiceDate) < 0);
  const thisMonth = today.slice(0, 7);
  const lastMonth = (() => { const d = new Date(today + "T00:00:00"); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const monthRevenue = clients.reduce((sum, c) => sum + (c.history || []).filter((h) => h.date.slice(0, 7) === thisMonth).reduce((s, h) => s + (Number(h.price) || 0), 0), 0);
  const lastMonthRevenue = clients.reduce((sum, c) => sum + (c.history || []).filter((h) => h.date.slice(0, 7) === lastMonth).reduce((s, h) => s + (Number(h.price) || 0), 0), 0);
  const revTrend = lastMonthRevenue ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : undefined;
  const upcomingCount = clients.filter((c) => c.nextServiceDate && daysUntil(c.nextServiceDate) >= 0).length;
  const totalPins = pins.length;
  const appointmentPins = pins.filter((p) => p.statusId === "appointment" || p.statusId === "completed").length;
  const convRate = totalPins ? Math.round((appointmentPins / totalPins) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={CalendarDays} label="Today's Jobs" value={todays.length} accent={ACCENT} sub={formatDate(today)} />
        <StatCard icon={ClipboardList} label="Upcoming" value={upcomingCount} accent={AMBER} sub="Scheduled jobs" />
        <StatCard icon={DollarSign} label="This Month" value={formatMoney(monthRevenue)} accent={GREEN} sub="Completed jobs" trend={revTrend} />
        <StatCard icon={Target} label="Canvass Rate" value={`${convRate}%`} accent={PURPLE} sub={`${appointmentPins}/${totalPins} doors converted`} />
      </div>

      {overdue.length > 0 && (
        <div className="rounded-2xl border px-4 py-3 mb-5 flex items-center gap-3" style={{ background: `${RED}0A`, borderColor: `${RED}30` }}>
          <AlertTriangle size={16} style={{ color: RED, flexShrink: 0 }} />
          <p className="text-sm font-medium" style={{ color: RED }}>
            {overdue.length} overdue appointment{overdue.length > 1 ? "s" : ""} — {overdue.slice(0, 2).map((c) => c.name || "Unnamed").join(", ")}{overdue.length > 2 ? ` +${overdue.length - 2} more` : ""}
          </p>
          <button onClick={() => setPage("schedule")} className="ml-auto text-xs font-bold shrink-0" style={{ color: RED }}>View →</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: LINE }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: INK, fontFamily: FONT_HEAD }}>Today's route</p>
            <button onClick={() => setPage("schedule")} className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ color: ACCENT, background: `${ACCENT}10` }}>View schedule</button>
          </div>
          {todays.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <CalendarDays size={28} style={{ color: ACCENT_LIGHT }} />
              <p className="text-sm text-center" style={{ color: MUTED }}>Nothing booked today — <button onClick={() => setPage("schedule")} style={{ color: ACCENT }}>add an appointment</button></p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {todays.map((c, i) => (
                <button key={c.id} onClick={() => onOpenClient(c.id)} className="hover-lift flex items-center gap-3 text-left text-sm py-2 px-2 rounded-xl border border-transparent hover:border-current" style={{ borderColor: "transparent" }}>
                  <span className="text-xs font-bold shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: `${ACCENT}15`, color: ACCENT, fontFamily: FONT_MONO }}>{i + 1}</span>
                  <Avatar name={c.name} size={30} />
                  <span className="flex-1 min-w-0 truncate font-medium" style={{ color: INK }}>{c.name || "Unnamed client"}</span>
                  <span className="text-xs font-mono shrink-0 px-2 py-0.5 rounded-full" style={{ background: `${ACCENT}10`, color: ACCENT }}>{c.nextServiceTime ? formatTime(c.nextServiceTime) : "—"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: LINE }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: INK, fontFamily: FONT_HEAD }}>Follow-ups needed</p>
            <button onClick={() => setPage("canvass")} className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ color: AMBER, background: `${AMBER}10` }}>Door Map</button>
          </div>
          {followUps.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <Star size={28} style={{ color: GREEN }} />
              <p className="text-sm" style={{ color: MUTED }}>No pending call-backs — nice!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {followUps.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5 text-sm py-1.5 px-2 rounded-xl">
                  <span className="animate-pulse-dot" style={{ width: 9, height: 9, borderRadius: 999, background: AMBER, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ color: INK }}>{p.label || "Untitled house"}</span>
                  {p.notes && <span className="text-xs truncate" style={{ color: MUTED }}>{p.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={onAdd} className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md" style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})` }}><Plus size={16} /> Add client</button>
        <button onClick={() => setPage("schedule")} className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "white", border: `1.5px solid ${LINE}`, color: INK }}><CalendarDays size={16} /> Schedule</button>
        <button onClick={() => setPage("canvass")} className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "white", border: `1.5px solid ${LINE}`, color: INK }}><HomeIcon size={16} /> Door Map</button>
        <button onClick={() => setPage("finance")} className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "white", border: `1.5px solid ${LINE}`, color: INK }}><BarChart2 size={16} /> Finance</button>
      </div>
    </div>
  );
}

/* ---------- Clients tab ---------- */
function ClientsTab({ clients, allCount, query, setQuery, serviceFilter, setServiceFilter, onOpen, onAdd }) {
  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2 mb-3 bg-white" style={{ borderColor: LINE }}>
        <Search size={16} style={{ color: MUTED }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, address, service, or tag" className="outline-none text-sm flex-1" />
      </div>
      <div className="flex gap-2 flex-wrap mb-5">
        <FilterChip active={!serviceFilter} onClick={() => setServiceFilter(null)} label="All services" />
        {SERVICES.map((s) => <FilterChip key={s.id} active={serviceFilter === s.id} onClick={() => setServiceFilter(serviceFilter === s.id ? null : s.id)} label={s.label} color={s.color} icon={s.icon} />)}
      </div>
      {clients.length === 0 ? (
        <EmptyState allCount={allCount} onAdd={onAdd} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => {
            const due = dueText(daysUntil(c.nextServiceDate));
            const addr = formatAddress(c);
            const lifetime = (c.history || []).reduce((s, h) => s + (Number(h.price) || 0), 0);
            return (
              <button key={c.id} onClick={() => onOpen(c.id)} className="hover-lift text-left bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: LINE }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={c.name} size={36} />
                    <div className="min-w-0">
                      <p className="font-bold truncate" style={{ color: INK, fontFamily: FONT_HEAD }}>{c.name || "Unnamed client"}</p>
                      {addr && <p className="flex items-center gap-1 text-xs truncate" style={{ color: MUTED }}><MapPin size={10} /> {addr}</p>}
                    </div>
                  </div>
                  <span className="text-xs font-bold shrink-0 px-2 py-0.5 rounded-full" style={{ color: due.color, background: `${due.color}14` }}>{due.text}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {c.services.map((s) => <ServiceBadge key={s} id={s} />)}
                  {(c.tags || []).map((t) => <TagBadge key={t} label={t} />)}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: LINE }}>
                  <p className="text-xs" style={{ color: MUTED }}>{freqLabel(c.frequency)}{c.nextServiceDate ? ` · ${formatDate(c.nextServiceDate)}` : ""}</p>
                  <div className="flex items-center gap-2">
                    {lifetime > 0 && <span className="text-xs font-bold" style={{ color: GREEN, fontFamily: FONT_MONO }}>{formatMoney(lifetime)}</span>}
                    {c.price && <span className="text-xs" style={{ color: MUTED, fontFamily: FONT_MONO }}>{formatMoney(c.price)}/visit</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
function FilterChip({ active, onClick, label, color = ACCENT, icon: Icon }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: active ? color : LINE, background: active ? `${color}14` : "white", color: active ? color : MUTED }}>
      {Icon && <Icon size={12} />}{label}
    </button>
  );
}
function EmptyState({ allCount, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 rounded-xl border border-dashed bg-white" style={{ borderColor: LINE }}>
      <Droplets size={32} style={{ color: ACCENT_LIGHT }} />
      <p className="mt-3 font-medium" style={{ color: INK, fontFamily: FONT_HEAD }}>{allCount === 0 ? "No clients yet" : "No matches"}</p>
      <p className="text-sm mt-1 max-w-xs" style={{ color: MUTED }}>{allCount === 0 ? "Add your first client to start tracking jobs and schedules." : "Try a different search or filter."}</p>
      {allCount === 0 && <button onClick={onAdd} className="mt-4 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: ACCENT }}><Plus size={16} /> Add client</button>}
    </div>
  );
}

/* ---------- Schedule tab ---------- */
function ScheduleTab({ clients, scheduleDate, setScheduleDate, onOpenClient, onBookSlot }) {
  const dayClients = clients.filter((c) => c.nextServiceDate === scheduleDate);
  const occupied = {};
  dayClients.forEach((c) => {
    if (!TIME_SLOTS.includes(c.nextServiceTime)) return;
    const slots = slotsForAppointment(c.nextServiceTime, c.duration || 60);
    slots.forEach((s, i) => { if (!occupied[s]) occupied[s] = { client: c, isStart: i === 0 }; });
  });
  const unslotted = dayClients.filter((c) => !TIME_SLOTS.includes(c.nextServiceTime));
  const heading = new Date(scheduleDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  function shiftDay(delta) {
    const d = new Date(scheduleDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setScheduleDate(d.toISOString().slice(0, 10));
  }

  return (
    <div>
      <div className="flex items-center justify-between bg-white rounded-xl border p-3 mb-4 shadow-sm" style={{ borderColor: LINE }}>
        <button onClick={() => shiftDay(-1)} className="p-2 rounded-lg" style={{ color: MUTED }}><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="font-semibold text-sm" style={{ color: INK, fontFamily: FONT_HEAD }}>{heading}</p>
          <button onClick={() => setScheduleDate(todayStr())} className="text-xs" style={{ color: ACCENT }}>Jump to today</button>
        </div>
        <button onClick={() => shiftDay(1)} className="p-2 rounded-lg" style={{ color: MUTED }}><ChevronRight size={18} /></button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: LINE }}>
        {TIME_SLOTS.map((slot) => {
          const occ = occupied[slot];
          if (occ && !occ.isStart) {
            return (
              <div key={slot} className="flex items-stretch border-b last:border-0" style={{ borderColor: LINE }}>
                <div className="w-20 shrink-0 flex items-center justify-center text-xs font-medium" style={{ color: MUTED, fontFamily: FONT_MONO, background: BG }}>{formatTime(slot)}</div>
                <div className="flex-1 flex items-center px-3 py-1.5 text-xs" style={{ color: MUTED, background: `${ACCENT}08` }}>↳ continued — {occ.client.name || "Unnamed client"}</div>
              </div>
            );
          }
          return (
            <div key={slot} className="flex items-stretch border-b last:border-0" style={{ borderColor: LINE }}>
              <div className="w-20 shrink-0 flex items-center justify-center text-xs font-medium" style={{ color: MUTED, fontFamily: FONT_MONO, background: BG }}>{formatTime(slot)}</div>
              {occ ? (
                <button onClick={() => onOpenClient(occ.client.id)} className="flex-1 text-left px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={occ.client.name} size={28} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: INK }}>{occ.client.name || "Unnamed client"}</p>
                      <p className="text-xs truncate" style={{ color: MUTED }}>{formatAddress(occ.client) || "No address"} · {occ.client.duration || 60} min</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {occ.client.services.map((s) => <ServiceBadge key={s} id={s} />)}
                    {occ.client.price && <span className="text-xs font-semibold" style={{ color: GREEN, fontFamily: FONT_MONO }}>{formatMoney(occ.client.price)}</span>}
                  </div>
                </button>
              ) : (
                <button onClick={() => onBookSlot(slot)} className="flex-1 text-left px-3 py-2.5 text-sm" style={{ color: ACCENT }}>+ Available — tap to book</button>
              )}
            </div>
          );
        })}
      </div>

      {unslotted.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium mb-2" style={{ color: MUTED }}>OTHER TIMES TODAY</p>
          <div className="flex flex-col gap-2">
            {unslotted.map((c) => (
              <button key={c.id} onClick={() => onOpenClient(c.id)} className="bg-white rounded-lg border px-3 py-2 text-left text-sm flex items-center justify-between" style={{ borderColor: LINE }}>
                <span style={{ color: INK }}>{c.name || "Unnamed client"}{c.nextServiceTime ? ` · ${formatTime(c.nextServiceTime)}` : ""}</span>
                <span style={{ color: MUTED }} className="text-xs">{formatAddress(c)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Photos section ---------- */
function PhotosSection({ clientId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("before");
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const res = await storage.get(`photos:${clientId}`);
        if (active) setPhotos(res ? JSON.parse(res.value) : []);
      } catch {
        if (active) setPhotos([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [clientId]);

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    const room = 10 - photos.length;
    if (room <= 0) {
      e.target.value = "";
      return;
    }
    files.slice(0, room).forEach((file) => {
      compressImageFile(file, 900, 0.6, (dataUrl) => {
        setPhotos((prev) => {
          const next = [...prev, { id: genId(), category, dataUrl, addedAt: new Date().toISOString() }];
          storage.set(`photos:${clientId}`, JSON.stringify(next));
          return next;
        });
      });
    });
    e.target.value = "";
  }

  function deletePhoto(id) {
    setPhotos((prev) => {
      const next = prev.filter((p) => p.id !== id);
      storage.set(`photos:${clientId}`, JSON.stringify(next));
      return next;
    });
  }

  const shown = photos.filter((p) => p.category === category);

  return (
    <div className="mt-6">
      <p className="text-xs font-medium mb-2" style={{ color: MUTED }}>PHOTOS ({photos.length}/10)</p>
      <div className="flex gap-1.5 mb-2 flex-wrap">
        {PHOTO_CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)} className="text-xs rounded-full border px-2.5 py-1 font-medium" style={{ borderColor: category === c.id ? ACCENT : LINE, background: category === c.id ? `${ACCENT}14` : "white", color: category === c.id ? ACCENT : MUTED }}>
            {c.label}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm" style={{ color: MUTED }}>Loading photos…</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {shown.map((p) => (
            <button key={p.id} onClick={() => setLightbox(p)} className="relative rounded-lg overflow-hidden border" style={{ borderColor: LINE, aspectRatio: "1/1" }}>
              <img src={p.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
          {shown.length === 0 && <p className="text-sm col-span-3" style={{ color: MUTED }}>No {category} photos yet.</p>}
        </div>
      )}
      <label className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 cursor-pointer" style={{ background: `${ACCENT}14`, color: ACCENT }}>
        + Add photo
        <input type="file" accept="image/*" multiple capture="environment" onChange={handleFiles} className="hidden" />
      </label>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox.dataUrl} alt="" style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain" }} />
          <button onClick={(e) => { e.stopPropagation(); deletePhoto(lightbox.id); setLightbox(null); }} className="absolute bottom-6 flex items-center gap-1.5 text-sm rounded-lg px-3 py-2 text-white" style={{ background: RED }}>
            <Trash2 size={14} /> Delete photo
          </button>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white"><X size={22} /></button>
        </div>
      )}
    </div>
  );
}

/* ---------- Detail drawer ---------- */
function DetailDrawer({ client, onClose, onEdit, onDelete, onMark, noteDraft, setNoteDraft, priceDraft, setPriceDraft }) {
  const due = dueText(daysUntil(client.nextServiceDate));
  const addr = formatAddress(client);
  const lifetimeValue = (client.history || []).reduce((sum, h) => sum + (Number(h.price) || 0), 0);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <div className="bg-white w-full sm:w-[420px] h-full overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={client.name} size={44} />
            <div>
              <p className="text-lg font-bold" style={{ color: INK, fontFamily: FONT_HEAD }}>{client.name || "Unnamed client"}</p>
              <span className="text-xs font-medium" style={{ color: due.color, fontFamily: FONT_MONO }}>{due.text}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-1.5 mt-3 rounded-lg px-3 py-2" style={{ background: `${GREEN}10` }}>
          <TrendingUp size={14} style={{ color: GREEN }} />
          <span className="text-xs" style={{ color: MUTED }}>Lifetime value:</span>
          <span className="text-sm font-bold" style={{ color: GREEN, fontFamily: FONT_MONO }}>{formatMoney(lifetimeValue)}</span>
        </div>

        <div className="mt-4 flex flex-col gap-1.5 text-sm" style={{ color: INK_SOFT }}>
          {client.phone && <p className="flex items-center gap-2"><Phone size={14} style={{ color: MUTED }} /> {client.phone}</p>}
          {client.email && <p className="flex items-center gap-2"><Mail size={14} style={{ color: MUTED }} /> {client.email}</p>}
          {addr && (
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2"><MapPin size={14} style={{ color: MUTED }} /> {addr}</p>
              <a href={`https://maps.apple.com/?daddr=${encodeURIComponent(addr)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium shrink-0" style={{ color: ACCENT }}>
                <Navigation size={12} /> Directions
              </a>
            </div>
          )}
          {client.price && <p className="flex items-center gap-2"><DollarSign size={14} style={{ color: MUTED }} /> {formatMoney(client.price)} per visit</p>}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {client.services.map((s) => <ServiceBadge key={s} id={s} size="md" />)}
          {(client.tags || []).map((t) => <TagBadge key={t} label={t} />)}
          {client.services.length === 0 && (client.tags || []).length === 0 && <span className="text-xs" style={{ color: MUTED }}>No service or tags set</span>}
        </div>
        <p className="text-xs mt-2" style={{ color: MUTED }}>{freqLabel(client.frequency)} · next service {formatDate(client.nextServiceDate)}{client.nextServiceTime ? ` at ${formatTime(client.nextServiceTime)}` : ""}{client.nextServiceDate ? ` · ${client.duration || 60} min` : ""}</p>

        {client.notes && (
          <div className="mt-4 rounded-lg p-3 text-sm" style={{ background: BG, color: INK_SOFT }}>
            <p className="text-xs font-medium mb-1" style={{ color: MUTED }}>NOTES</p>{client.notes}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onEdit} className="flex items-center gap-1.5 text-sm rounded-lg border px-3 py-2" style={{ borderColor: LINE }}><Pencil size={14} /> Edit</button>
          <button onClick={onDelete} className="flex items-center gap-1.5 text-sm rounded-lg border px-3 py-2" style={{ borderColor: LINE, color: RED }}><Trash2 size={14} /> Delete</button>
        </div>

        <div className="mt-5 pt-5 border-t" style={{ borderColor: LINE }}>
          <p className="text-xs font-medium mb-2" style={{ color: MUTED }}>MARK A SERVICE COMPLETE</p>
          <div className="flex gap-2">
            <div className="flex items-center rounded-lg border px-2" style={{ borderColor: LINE }}>
              <span className="text-sm" style={{ color: MUTED }}>$</span>
              <input value={priceDraft} onChange={(e) => setPriceDraft(e.target.value)} placeholder="0" inputMode="decimal" className="text-sm py-2 px-1 w-16 outline-none" />
            </div>
            <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Note (optional)" className="text-sm rounded-lg border px-3 py-2 flex-1" style={{ borderColor: LINE }} />
          </div>
          <button onClick={onMark} className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white whitespace-nowrap mt-2 w-full" style={{ background: GREEN }}><CheckCircle2 size={14} /> Mark serviced</button>
        </div>

        <PhotosSection clientId={client.id} />

        <div className="mt-6">
          <p className="text-xs font-medium mb-2" style={{ color: MUTED }}>SERVICE HISTORY</p>
          {(!client.history || client.history.length === 0) ? (
            <p className="text-sm" style={{ color: MUTED }}>No services logged yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {client.history.map((h, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <Clock size={14} className="mt-0.5 shrink-0" style={{ color: MUTED }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p style={{ color: INK }}>{formatDate(h.date)}</p>
                      {!!h.price && <span className="text-xs font-semibold" style={{ color: GREEN, fontFamily: FONT_MONO }}>{formatMoney(h.price)}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">{(h.services || []).map((s) => <ServiceBadge key={s} id={s} />)}</div>
                    {h.notes && <p className="text-xs mt-1" style={{ color: MUTED }}>{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Door Map ---------- */
function DoorMap({ pins, clients, persistPins, upsertClientAndPin, deletePin, showToast, onOpenClient }) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);
  const [panel, setPanel] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [clientForm, setClientForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;
    const map = L.map(mapElRef.current, { center: [39.5, -98.35], zoom: 4 });
    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 19, attribution: "© OpenStreetMap contributors" }
    ).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    map.on("click", (e) => {
      setPanel({ mode: "create", lat: e.latlng.lat, lng: e.latlng.lng, label: "", statusId: "not-home", notes: "" });
      setExpanded(false);
      setClientForm(emptyForm);
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();
    pins.filter((p) => p.lat != null && p.lng != null).forEach((pin) => {
      const status = statusMap[pin.statusId] || statusMap["not-home"];
      const marker = L.circleMarker([pin.lat, pin.lng], {
        radius: 10, color: "#ffffff", weight: 2.5, fillColor: status.color, fillOpacity: 1,
      });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        const linked = pin.clientId ? clients.find((c) => c.id === pin.clientId) : null;
        setPanel({ mode: "edit", id: pin.id, lat: pin.lat, lng: pin.lng, label: pin.label, statusId: pin.statusId, notes: pin.notes || "", linkedClient: linked || null });
        setExpanded(!!linked);
        setClientForm(linked ? { ...emptyForm, ...linked } : { ...emptyForm, name: pin.label || "" });
      });
      marker.addTo(markersRef.current);
    });
  }, [pins, clients]);

  async function searchAddress() {
    if (!searchQuery.trim() || !mapRef.current) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      const pos = data?.[0];
      if (pos) {
        mapRef.current.setView([parseFloat(pos.lat), parseFloat(pos.lon)], 16);
      } else {
        setSearchError("No matching address found.");
      }
    } catch {
      setSearchError("Search failed — check your connection.");
    } finally {
      setSearching(false);
    }
  }

  function quickTagAndSave(statusId) {
    const label = statusMap[statusId]?.label || statusId;
    if (panel.mode === "create") {
      persistPins([...pins, { id: genId(), lat: panel.lat, lng: panel.lng, label: panel.label || "Untitled house", statusId, notes: panel.notes, clientId: null, updatedAt: new Date().toISOString() }]);
      showToast(`Pin dropped · ${label}`);
    } else {
      persistPins(pins.map((p) => (p.id === panel.id ? { ...p, label: panel.label, statusId, notes: panel.notes, updatedAt: new Date().toISOString() } : p)));
      showToast(`Updated to ${label}`);
    }
    setPanel(null);
  }
  function saveExpanded() {
    const hasAppt = !!clientForm.nextServiceDate;
    upsertClientAndPin(clientForm, { lat: panel.lat, lng: panel.lng, pinId: panel.id });
    showToast(hasAppt ? "Client saved · added to schedule" : "Client saved");
    setPanel(null);
  }
  function deletePanelPin() {
    if (panel.mode === "edit") deletePin(panel.id);
    setPanel(null);
  }

  const counts = useMemo(() => {
    const c = {};
    HOUSE_STATUSES.forEach((s) => (c[s.id] = 0));
    pins.forEach((p) => (c[p.statusId] = (c[p.statusId] || 0) + 1));
    return c;
  }, [pins]);

  const conversionRate = pins.length ? Math.round(((counts["appointment"] || 0) + (counts["completed"] || 0)) / pins.length * 100) : 0;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap gap-2 mb-3">
        {HOUSE_STATUSES.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5 text-xs rounded-full border px-2.5 py-1 font-medium bg-white" style={{ borderColor: `${s.color}40`, color: s.color }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: s.color, display: "inline-block" }} />
            {s.label} <span style={{ color: MUTED, fontWeight: 400 }}>({counts[s.id] || 0})</span>
          </span>
        ))}
        {pins.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs rounded-full border px-2.5 py-1 font-semibold ml-auto" style={{ borderColor: `${PURPLE}40`, color: PURPLE, background: `${PURPLE}0A` }}>
            <Target size={11} /> {conversionRate}% conversion
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 flex-1 bg-white" style={{ borderColor: LINE }}>
          <SearchIcon size={16} style={{ color: MUTED }} />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchAddress()} placeholder="Search an address or neighborhood" className="outline-none text-sm flex-1" />
          {searching && <Loader2 size={14} className="animate-spin" style={{ color: MUTED }} />}
        </div>
        <button onClick={searchAddress} className="rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: LINE }}>Go</button>
      </div>
      {searchError && <p className="text-xs mb-2" style={{ color: RED }}>{searchError}</p>}

      <p className="text-xs mb-3" style={{ color: MUTED }}>Tap anywhere on the map to drop a pin. Tap a pin to edit or update it.</p>

      <div ref={mapElRef} className="rounded-xl border" style={{ borderColor: LINE, height: 520, width: "100%" }} />

      {panel && createPortal(
        <div className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/50 px-3 pb-4 sm:px-4 sm:py-8 overflow-y-auto" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-slide-up overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: LINE, background: panel.mode === "create" ? `linear-gradient(135deg, ${GREEN}18, ${ACCENT}10)` : `linear-gradient(135deg, ${ACCENT}12, ${INK}08)` }}>
              <div>
                <p className="font-bold text-sm" style={{ color: INK, fontFamily: FONT_HEAD }}>{panel.mode === "create" ? "New house pin" : panel.linkedClient ? panel.linkedClient.name : panel.label || "House pin"}</p>
                {panel.linkedClient && <p className="text-xs mt-0.5" style={{ color: MUTED }}>Linked client · tap to edit</p>}
              </div>
              <div className="flex items-center gap-2">
                {panel.mode === "edit" && panel.linkedClient && (
                  <button onClick={() => { setPanel(null); onOpenClient(panel.linkedClient.id); }} className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: `${ACCENT}14`, color: ACCENT }}>View →</button>
                )}
                <button onClick={() => setPanel(null)} className="p-1 rounded-lg hover:bg-black/5"><X size={16} /></button>
              </div>
            </div>

            <div className="px-5 py-4">
              {!expanded ? (
                <>
                  <p className="text-xs font-bold mb-2 tracking-wide" style={{ color: MUTED }}>SET STATUS</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {HOUSE_STATUSES.map((s) => {
                      const active = panel.statusId === s.id;
                      return (
                        <button key={s.id} onClick={() => quickTagAndSave(s.id)}
                          className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all"
                          style={{ borderColor: active ? s.color : `${s.color}50`, background: active ? s.color : `${s.color}10`, color: active ? "white" : s.color }}>
                          <span style={{ width: 8, height: 8, borderRadius: 999, background: active ? "white" : s.color, display: "inline-block", flexShrink: 0 }} />
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                  <input value={panel.label} onChange={(e) => setPanel((p) => ({ ...p, label: e.target.value }))} placeholder="Address or label (optional)" className="text-sm rounded-xl border px-3 py-2 w-full mb-2" style={{ borderColor: LINE }} />
                  <textarea value={panel.notes} onChange={(e) => setPanel((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes (gate code, pets, etc.)" rows={2} className="text-sm rounded-xl border px-3 py-2 w-full mb-4" style={{ borderColor: LINE, resize: "vertical" }} />
                  <button onClick={() => setExpanded(true)} className="flex items-center gap-1.5 text-sm font-semibold mb-4 w-full justify-center rounded-xl border py-2.5" style={{ borderColor: `${ACCENT}40`, color: ACCENT, background: `${ACCENT}08` }}>
                    <Plus size={15} /> {panel.linkedClient ? "Edit client details" : "Add client info & book appointment"}
                  </button>
                  <div className="flex justify-between gap-2">
                    {panel.mode === "edit" ? (
                      <button onClick={deletePanelPin} className="flex items-center gap-1.5 text-xs rounded-xl border px-3 py-2 font-medium" style={{ borderColor: `${RED}40`, color: RED }}>
                        <Trash2 size={13} /> Delete pin
                      </button>
                    ) : <span />}
                    <button onClick={() => quickTagAndSave(panel.statusId)} className="text-xs font-semibold rounded-xl px-3 py-2 text-white" style={{ background: ACCENT }}>
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <ClientFieldsForm form={clientForm} setForm={setClientForm} compact clients={clients} />
                  <div className="flex justify-between gap-2 mt-4">
                    <button onClick={() => setExpanded(false)} className="text-xs rounded-xl border px-3 py-2 font-medium" style={{ borderColor: LINE, color: MUTED }}>← Back</button>
                    <button onClick={saveExpanded} className="text-sm font-bold rounded-xl px-4 py-2 text-white flex items-center gap-1.5" style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})` }}>
                      <CheckCircle2 size={14} /> Save to clients & schedule
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ---------- Finance tab ---------- */
function FinanceTab({ clients }) {
  const [goal, setGoal] = useState(() => {
    try { return Number(localStorage.getItem("revenueGoal")) || 0; } catch { return 0; }
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");

  const jobs = useMemo(() => {
    const list = [];
    clients.forEach((c) => (c.history || []).forEach((h) => list.push({ ...h, clientName: c.name })));
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [clients]);

  const today = todayStr();
  const thisMonth = today.slice(0, 7);
  const totalRevenue = jobs.reduce((sum, j) => sum + (Number(j.price) || 0), 0);
  const jobsCompleted = jobs.length;
  const avgJobValue = jobsCompleted ? totalRevenue / jobsCompleted : 0;
  const projected = clients.filter((c) => c.nextServiceDate).reduce((sum, c) => sum + (Number(c.price) || 0), 0);
  const thisMonthRevenue = jobs.filter((j) => j.date.slice(0, 7) === thisMonth).reduce((sum, j) => sum + (Number(j.price) || 0), 0);

  const monthly = useMemo(() => {
    const groups = {};
    jobs.forEach((j) => {
      const key = j.date.slice(0, 7);
      if (!groups[key]) groups[key] = { revenue: 0, count: 0 };
      groups[key].revenue += Number(j.price) || 0;
      groups[key].count += 1;
    });
    return Object.entries(groups).map(([month, v]) => ({ month, ...v })).sort((a, b) => (a.month < b.month ? 1 : -1)).slice(0, 6);
  }, [jobs]);

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed bg-white" style={{ borderColor: LINE }}>
        <div className="rounded-2xl p-4 mb-3" style={{ background: `${GREEN}14` }}><DollarSign size={32} style={{ color: GREEN }} /></div>
        <p className="font-bold text-lg" style={{ color: INK, fontFamily: FONT_HEAD }}>No revenue yet</p>
        <p className="text-sm mt-1 max-w-xs" style={{ color: MUTED }}>Add clients and mark services complete to start tracking revenue here.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Total Revenue" value={formatMoney(totalRevenue)} accent={GREEN} sub="All-time" />
        <StatCard icon={Briefcase} label="Jobs Done" value={jobsCompleted} accent={ACCENT} sub="All-time" />
        <StatCard icon={TrendingUp} label="Avg. Job" value={formatMoney(avgJobValue)} accent={AMBER} sub="Per completed job" />
        <StatCard icon={Zap} label="Projected" value={formatMoney(projected)} accent={PURPLE} sub="From scheduled clients" />
      </div>

      {/* Monthly goal */}
      <div className="bg-white rounded-2xl border p-4 shadow-sm mb-5" style={{ borderColor: LINE }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Target size={16} style={{ color: ACCENT }} />
            <p className="text-sm font-bold" style={{ color: INK, fontFamily: FONT_HEAD }}>Monthly goal — {formatMonth(thisMonth)}</p>
          </div>
          {editingGoal ? (
            <div className="flex items-center gap-1.5">
              <input autoFocus value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} placeholder="0" inputMode="decimal"
                className="text-sm border rounded-lg px-2 py-1 w-24" style={{ borderColor: LINE }} />
              <button onClick={() => { const v = Number(goalDraft) || 0; setGoal(v); localStorage.setItem("revenueGoal", v); setEditingGoal(false); }}
                className="text-xs font-bold px-2.5 py-1 rounded-lg text-white" style={{ background: GREEN }}>Set</button>
              <button onClick={() => setEditingGoal(false)} className="text-xs rounded-lg px-2 py-1" style={{ color: MUTED }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => { setGoalDraft(goal ? String(goal) : ""); setEditingGoal(true); }} className="text-xs font-semibold" style={{ color: ACCENT }}>
              {goal ? "Edit goal" : "Set goal"}
            </button>
          )}
        </div>
        {goal > 0 ? (
          <>
            <div className="flex items-end justify-between mt-1 mb-1">
              <span className="text-2xl font-black" style={{ color: INK, fontFamily: FONT_HEAD }}>{formatMoney(thisMonthRevenue)}</span>
              <span className="text-sm font-semibold" style={{ color: MUTED }}>/ {formatMoney(goal)}</span>
            </div>
            <ProgressBar value={thisMonthRevenue} max={goal} color={thisMonthRevenue >= goal ? GREEN : ACCENT} />
            <p className="text-xs mt-1.5" style={{ color: thisMonthRevenue >= goal ? GREEN : MUTED }}>
              {thisMonthRevenue >= goal ? `🎉 Goal reached! +${formatMoney(thisMonthRevenue - goal)} over` : `${formatMoney(goal - thisMonthRevenue)} to go`}
            </p>
          </>
        ) : (
          <p className="text-sm mt-1" style={{ color: MUTED }}>Set a monthly revenue goal to track your progress.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: LINE }}>
          <p className="text-sm font-bold mb-1" style={{ color: INK, fontFamily: FONT_HEAD }}>Revenue by month</p>
          {monthly.length === 0 ? <p className="text-sm" style={{ color: MUTED }}>No completed jobs yet.</p> : (
            <>
              <MiniBarChart data={monthly} />
              <div className="flex flex-col gap-1.5 mt-3">
                {monthly.map((m) => (
                  <div key={m.month} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0" style={{ borderColor: LINE }}>
                    <span style={{ color: INK_SOFT }}>{formatMonth(m.month)}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: MUTED, background: BG }}>{m.count} job{m.count !== 1 ? "s" : ""}</span>
                      <span className="font-bold" style={{ color: GREEN, fontFamily: FONT_MONO }}>{formatMoney(m.revenue)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border p-4 shadow-sm" style={{ borderColor: LINE }}>
          <p className="text-sm font-bold mb-3" style={{ color: INK, fontFamily: FONT_HEAD }}>Recent jobs</p>
          {jobs.length === 0 ? <p className="text-sm" style={{ color: MUTED }}>No completed jobs yet.</p> : (
            <div className="flex flex-col gap-3">
              {jobs.slice(0, 8).map((j, i) => (
                <div key={i} className="flex items-start justify-between text-sm py-2 border-b last:border-0" style={{ borderColor: LINE }}>
                  <div>
                    <p className="font-semibold" style={{ color: INK }}>{j.clientName}</p>
                    <p className="text-xs" style={{ color: MUTED }}>{formatDate(j.date)}</p>
                    <div className="flex gap-1 mt-1">{(j.services || []).map((s) => <ServiceBadge key={s} id={s} />)}</div>
                    {j.notes && <p className="text-xs mt-0.5 italic" style={{ color: MUTED }}>{j.notes}</p>}
                  </div>
                  <span className="font-bold shrink-0 text-base" style={{ color: GREEN, fontFamily: FONT_MONO }}>{formatMoney(j.price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
