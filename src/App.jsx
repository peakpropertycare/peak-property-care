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
  Zap, Target, Award, Star, ArrowUpRight,
  FileText, MessageSquare, Copy, Wind, CloudRain, CloudSun,
  Cloud, Thermometer, CheckSquare, Square, Send,
  Percent, Layers, LogOut, Receipt, Settings as SettingsIcon, Camera,
} from "lucide-react";
import emailjs from "@emailjs/browser";
import { storage } from "./lib/storage";
import { supabase } from "./lib/supabaseClient";
import logo from "./assets/logo.png";

const EJS_SVC  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EJS_TPL  = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EJS_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/* ═══════════════════════════════════════
   DESIGN TOKENS — Premium 2026 palette
   ═══════════════════════════════════════ */
const P       = "#0057FF";   // primary blue
const P_DEEP  = "#003ED4";
const P_LIGHT = "#E0EAFF";
const CYAN    = "#00B8D9";
const CYAN_L  = "#D8F7FF";
const EMERALD = "#00C896";
const EM_DEEP = "#00A07A";
const EM_L    = "#D4F9F0";
const AMBER   = "#FF9F1C";
const AMB_L   = "#FFF2D8";
const RED     = "#FF4757";
const RED_L   = "#FFE4E7";
const VIOLET  = "#7B5EA7";
const VIO_L   = "#EEE6FF";
const DARK    = "#060F1E";   // header/nav
const DARK2   = "#0C1A30";   // sidebar
const INK     = "#1A2744";   // primary text
const INK_SOFT= "#2D4068";
const MUTED   = "#6B7A99";
const LINE    = "#E0E8F8";
const BG      = "#F0F4FF";
const CARD    = "#FFFFFF";
const ACCENT_LIGHT = "#B8CCFF";

// Legacy aliases so older component refs still work
const ACCENT      = P;
const ACCENT_DEEP = P_DEEP;
const GREEN       = EMERALD;
const PURPLE      = VIOLET;
const PINK        = "#E0436B";
const GRAY        = "#9AA8C0";

const FONT_HEAD = "'Plus Jakarta Sans', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

/* ── Services ── */
const SERVICES = [
  { id: "window",   label: "Window Cleaning",    icon: Droplets,  color: P      },
  { id: "solar",    label: "Solar Panel Cleaning",icon: Sun,       color: AMBER  },
  { id: "pressure", label: "Pressure Washing",    icon: Sparkles,  color: EMERALD},
  { id: "gutter",   label: "Gutter Cleaning",     icon: Layers,    color: VIOLET },
];


/* ── Frequencies ── */
const FREQUENCIES = [
  { id: "one-time",  label: "One-time" },
  { id: "monthly",   label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "biannual",  label: "Every 6 months" },
  { id: "annual",    label: "Annual" },
];

/* ── Canvass statuses ── */
const HOUSE_STATUSES = [
  { id: "not-home",    label: "Not Home",        color: GRAY   },
  { id: "no",          label: "Said No",          color: RED    },
  { id: "callback",    label: "Call/Text Back",   color: AMBER  },
  { id: "appointment", label: "Appointment Set",  color: P      },
  { id: "completed",   label: "Job Completed",    color: EMERALD},
];

/* ── Communication templates ── */
const COMM_TEMPLATES = [
  { id: "reminder", label: "Appointment Reminder",
    icon: CalendarDays, color: P,
    sms: (c) => `Hi ${c.name?.split(" ")[0] || "there"}! Just a reminder your ${c.services?.map((s) => ({ window:"window cleaning", solar:"solar panel cleaning", pressure:"pressure washing", gutter:"gutter cleaning" })[s]).join(" & ")} appointment with Peak Property Care is scheduled for ${c.nextServiceDate ? new Date(c.nextServiceDate+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}) : "your upcoming date"}${c.nextServiceTime ? " at "+formatTime(c.nextServiceTime) : ""}. Reply STOP to opt out.` },
  { id: "followup", label: "Follow-Up / Review Request",
    icon: Star, color: AMBER,
    sms: (c) => `Hi ${c.name?.split(" ")[0] || "there"}! Thanks for choosing Peak Property Care — we hope your windows are sparkling! 🪟 If you have a minute, we'd love a quick Google review: [your-link-here]. See you next time!` },
  { id: "quote",    label: "Quote Follow-Up",
    icon: FileText, color: EMERALD,
    sms: (c) => `Hi ${c.name?.split(" ")[0] || "there"}! Following up on the quote we sent for Peak Property Care services. Ready to book? Reply YES and we'll get you scheduled right away. Questions? Just text back!` },
  { id: "seasonal", label: "Seasonal Outreach",
    icon: CloudSun, color: CYAN,
    sms: (c) => `Hi ${c.name?.split(" ")[0] || "there"}! 🌞 Spring is the perfect time for sparkling clean windows! As a valued Peak Property Care client, you're first in line. Reply BOOK to lock in your spot before we fill up!` },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
  "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Home",     icon: LayoutDashboard },
  { id: "clients",   label: "Clients",  icon: Users           },
  { id: "schedule",  label: "Schedule", icon: ClipboardList   },
  { id: "canvass",   label: "Door Map", icon: HomeIcon        },
  { id: "finance",   label: "Finance",  icon: DollarSign      },
  { id: "settings",  label: "Settings", icon: SettingsIcon    },
];

const DURATION_PRESETS = [30, 60, 90, 120];
const CLIENT_TAGS = ["Recurring", "High Value", "Commercial", "Residential", "Referral"];
const PHOTO_CATEGORIES = [
  { id: "property", label: "Property" },
  { id: "before",   label: "Before"   },
  { id: "after",    label: "After"    },
  { id: "job",      label: "Job"      },
];
const AVATAR_COLORS = [P, EMERALD, AMBER, VIOLET, PINK, CYAN, "#E0436B"];

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
  for (let m = 6 * 60; m <= 19 * 60; m += 30) out.push(minutesToTime(m));
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
function formatPhoneInput(raw) {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
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

/* ═══════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════ */

function ServiceBadge({ id, size = "sm" }) {
  const s = serviceMap[id];
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}
      style={{ borderColor: `${s.color}50`, color: s.color, background: `${s.color}12` }}>
      <Icon size={size === "sm" ? 11 : 13} strokeWidth={2.2} />
      {s.label}
    </span>
  );
}

function TagBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{ borderColor: `${P}25`, color: P, background: P_LIGHT }}>
      <Tag size={9} strokeWidth={2.3} />{label}
    </span>
  );
}

function Avatar({ name, size = 36 }) {
  const bg = getAvatarColor(name);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${bg}, ${bg}99)`, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: size * 0.36, flexShrink: 0, boxShadow: `0 2px 8px ${bg}40` }}>
      {getInitials(name)}
    </div>
  );
}

const inputStyle = {
  width: "100%", borderRadius: 10, border: `1.5px solid ${LINE}`,
  padding: "9px 12px", fontSize: "0.875rem", outline: "none",
  fontFamily: FONT_BODY, background: "white", color: INK,
};

function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold tracking-wide uppercase" style={{ color: MUTED, letterSpacing: "0.07em" }}>{label}</span>
      {children}
      {hint && <span className="text-xs" style={{ color: MUTED }}>{hint}</span>}
    </label>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 6, backdropFilter: "blur(8px)" }}>
        <img src={logo} alt="Peak Property Care logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      <div>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, color: "white", fontSize: "0.95rem", letterSpacing: "-0.01em" }}>Peak Property Care</div>
        <div style={{ fontFamily: FONT_MONO, color: ACCENT_LIGHT, fontSize: "0.58rem", letterSpacing: "0.2em" }} className="uppercase">Client Hub · Pro</div>
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
        <div key={t.id} className="anim-toast flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-bold text-white"
          style={{ background: t.type === "error" ? `linear-gradient(135deg,${RED},#CC0011)` : t.type === "warning" ? `linear-gradient(135deg,${AMBER},#E07800)` : `linear-gradient(135deg,${EMERALD},${EM_DEEP})`, minWidth: 230, boxShadow: `0 8px 24px ${t.type === "error" ? RED : t.type === "warning" ? AMBER : EMERALD}55` }}>
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
    <div className="card card-lift relative overflow-hidden p-5 cursor-default"
      style={{ background: `linear-gradient(145deg, #fff 0%, ${accent}0A 100%)`, borderColor: `${accent}28`, boxShadow: `0 4px 20px ${accent}0F` }}>
      <div className="absolute -top-4 -right-4 pointer-events-none" style={{ color: accent, opacity: 0.06 }}><Icon size={96} /></div>
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="rounded-2xl p-2.5" style={{ background: `${accent}18` }}>
            <Icon size={18} style={{ color: accent }} strokeWidth={2} />
          </div>
          {trend !== undefined && (
            <span className="flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: trend >= 0 ? EMERALD : RED, background: trend >= 0 ? EM_L : RED_L }}>
              <ArrowUpRight size={11} style={{ transform: trend < 0 ? "rotate(90deg)" : "none" }} />
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-3xl font-black tracking-tight anim-count" style={{ color: INK, fontFamily: FONT_HEAD, letterSpacing: "-0.02em" }}>{value}</p>
        <p className="text-xs font-bold mt-1" style={{ color: accent, fontFamily: FONT_HEAD }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: MUTED, fontFamily: FONT_BODY }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Mini bar chart ── */
function MiniBarChart({ data }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-2 h-20 mt-2">
      {data.slice().reverse().map((item, i) => {
        const pct = Math.max(6, (item.revenue / max) * 100);
        return (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-1 min-w-0" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="w-full rounded-t-lg bar-fill" style={{ height: `${pct}%`, background: `linear-gradient(to top, ${P}, ${CYAN})` }} />
            <span className="font-mono" style={{ color: MUTED, fontSize: "0.6rem" }}>{item.month.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Progress bar ── */
function ProgressBar({ value, max, color, height = 8 }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="rounded-full overflow-hidden" style={{ height, background: `${color}18`, marginTop: 8 }}>
      <div className="h-full rounded-full progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}BB)` }} />
    </div>
  );
}

/* ── Donut chart (CSS conic-gradient) ── */
function DonutChart({ segments, size = 100 }) {
  let cumulative = 0;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (!total) return null;
  const gradientParts = segments.map((seg) => {
    const pct = (seg.value / total) * 100;
    const from = cumulative;
    cumulative += pct;
    return `${seg.color} ${from}% ${cumulative}%`;
  }).join(", ");
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: `conic-gradient(${gradientParts})`, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }} />
      <div style={{ position: "absolute", inset: size * 0.22, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="text-xs font-black" style={{ color: INK, fontFamily: FONT_HEAD }}>{segments.length}</span>
      </div>
    </div>
  );
}

/* ── Weather widget ── */
function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) { setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weathercode,windspeed_10m,precipitation&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`);
        const d = await r.json();
        setWeather(d.current);
      } catch { /* ignore */ }
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  if (loading) return <div className="shimmer-bg rounded-2xl h-20" />;
  if (!weather) return null;

  const code = weather.weathercode ?? 0;
  const temp = Math.round(weather.temperature_2m ?? 70);
  const wind = Math.round(weather.windspeed_10m ?? 0);
  const precip = weather.precipitation ?? 0;

  const isGood = code <= 3 && wind < 20 && precip === 0;
  const isOk   = (code <= 3 || code === 45) && wind < 30;
  const icon   = code === 0 ? Sun : code <= 2 ? CloudSun : code <= 3 ? Cloud : CloudRain;
  const WeatherIcon = icon;
  const verdict = isGood ? "Perfect for cleaning" : isOk ? "Manageable conditions" : "Tough day — reschedule if possible";
  const vColor  = isGood ? EMERALD : isOk ? AMBER : RED;

  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="rounded-2xl p-3 flex-shrink-0" style={{ background: isGood ? EM_L : isOk ? AMB_L : RED_L }}>
        <WeatherIcon size={26} style={{ color: vColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold" style={{ color: vColor }}>{verdict}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-sm font-bold" style={{ color: INK, fontFamily: FONT_MONO }}><Thermometer size={12} />{temp}°F</span>
          <span className="flex items-center gap-1 text-xs" style={{ color: MUTED }}><Wind size={11} />{wind} mph</span>
          {precip > 0 && <span className="flex items-center gap-1 text-xs" style={{ color: RED }}><CloudRain size={11} />{precip}mm rain</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Van checklist ── */
const VAN_ITEMS = [
  "Squeegees (all sizes)", "Scrubbers & sleeves", "Window cleaning solution",
  "Bucket & T-bar", "Extension poles", "Microfibre cloths",
  "Safety harness / ladder", "Pressure washer hose", "Solar panel brushes",
  "Invoice book / tablet", "Uniform & gloves",
];

function VanChecklist() {
  const [checked, setChecked] = useState(() => {
    try { const d = localStorage.getItem("vanChecklist"); return d ? JSON.parse(d) : {}; } catch { return {}; }
  });
  const [open, setOpen] = useState(false);

  function toggle(item) {
    setChecked((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      localStorage.setItem("vanChecklist", JSON.stringify(next));
      return next;
    });
  }
  function resetAll() {
    setChecked({});
    localStorage.setItem("vanChecklist", "{}");
  }

  const done = VAN_ITEMS.filter((i) => checked[i]).length;

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-4">
        <div className="rounded-xl p-2" style={{ background: `${VIOLET}18` }}>
          <Wrench size={16} style={{ color: VIOLET }} />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-bold" style={{ color: INK, fontFamily: FONT_HEAD }}>Van Checklist</p>
          <p className="text-xs" style={{ color: done === VAN_ITEMS.length ? EMERALD : MUTED }}>{done}/{VAN_ITEMS.length} packed</p>
        </div>
        <ProgressBar value={done} max={VAN_ITEMS.length} color={done === VAN_ITEMS.length ? EMERALD : P} height={5} />
        <ChevronRight size={16} style={{ color: MUTED, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {open && (
        <div className="border-t px-4 pb-4" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-3">
            {VAN_ITEMS.map((item) => (
              <button key={item} onClick={() => toggle(item)} className="flex items-center gap-2 text-sm py-1.5 text-left rounded-lg px-2 hover:bg-slate-50 transition-colors">
                {checked[item] ? <CheckSquare size={16} style={{ color: EMERALD, flexShrink: 0 }} /> : <Square size={16} style={{ color: LINE, flexShrink: 0 }} />}
                <span style={{ color: checked[item] ? MUTED : INK, textDecoration: checked[item] ? "line-through" : "none" }}>{item}</span>
              </button>
            ))}
          </div>
          <button onClick={resetAll} className="text-xs font-semibold mt-3" style={{ color: MUTED }}>Reset all</button>
        </div>
      )}
    </div>
  );
}

function TabHero({ icons, from, to, title, subtitle, action, tag }) {
  return (
    <div className="relative overflow-hidden rounded-3xl mb-6 px-6 py-6 anim-fade-up"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`, boxShadow: `0 16px 48px ${from}44` }}>
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E\")" }} />
      {/* Dot grid */}
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      {/* Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)", transform: "translate(30%, -40%)" }} />
      {/* Decorative icons */}
      <div className="absolute right-4 bottom-0 flex items-end gap-0 pointer-events-none" style={{ opacity: 0.13 }}>
        {icons.map((Icon, i) => (
          <Icon key={i} size={88 - i * 16} color="white" style={{ transform: `rotate(${(i - 1) * 14}deg) translateY(${i * 8}px)`, marginLeft: -12 }} />
        ))}
      </div>
      <img src={logo} alt="" style={{ position: "absolute", left: 14, bottom: -18, width: 80, opacity: 0.08 }} />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          {tag && <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-2" style={{ background: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.95)" }}>{tag}</span>}
          <h1 className="text-white font-black tracking-tight" style={{ fontFamily: FONT_HEAD, fontSize: "1.35rem", letterSpacing: "-0.02em" }}>{title}</h1>
          {subtitle && <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.78)", fontFamily: FONT_BODY }}>{subtitle}</p>}
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
        <Field label="Phone"><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: formatPhoneInput(e.target.value) }))} placeholder="(555) 555-5555" inputMode="tel" style={inputStyle} /></Field>
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

/* ================= AUTH SCREEN ================= */
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  function switchMode(m) {
    setMode(m);
    setError(null);
    setMessage(null);
    setFirstName(""); setLastName(""); setPhone(""); setEmail(""); setPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signup") {
        if (!firstName.trim() || !lastName.trim()) throw new Error("Please enter your first and last name.");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() },
          },
        });
        if (error) throw error;
        setMessage("Account created! Check your email to confirm, then sign in.");
        switchMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!stayLoggedIn) {
          window.addEventListener("beforeunload", () => supabase.auth.signOut(), { once: true });
        }
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #0C1E38 100%)` }}>
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", padding: 10, marginBottom: 16, backdropFilter: "blur(8px)" }}>
            <img src={logo} alt="Peak Property Care" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <h1 style={{ fontFamily: FONT_HEAD, fontWeight: 800, color: "white", fontSize: "1.4rem", letterSpacing: "-0.02em" }}>Peak Property Care</h1>
          <p style={{ color: ACCENT_LIGHT, fontSize: "0.75rem", fontFamily: FONT_MONO, letterSpacing: "0.18em", marginTop: 4 }}>CLIENT HUB · PRO</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 style={{ fontFamily: FONT_HEAD, fontWeight: 800, color: INK, fontSize: "1.15rem", marginBottom: 6 }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p style={{ color: MUTED, fontSize: "0.83rem", marginBottom: 20 }}>
            {mode === "login" ? "Sign in to access your client hub." : "Fill in your details to get started."}
          </p>

          {message && (
            <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium" style={{ background: EM_L, color: EMERALD }}>
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium" style={{ background: RED_L, color: RED }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First name">
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="given-name" placeholder="John" style={inputStyle} />
                  </Field>
                  <Field label="Last name">
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="family-name" placeholder="Smith" style={inputStyle} />
                  </Field>
                </div>
                <Field label="Phone number">
                  <input value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} autoComplete="tel" placeholder="(555) 555-5555" inputMode="tel" style={inputStyle} />
                </Field>
              </>
            )}
            <Field label="Email address">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" style={inputStyle} />
            </Field>
            <Field label={mode === "signup" ? "Create a password" : "Password"}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="••••••••" style={inputStyle} />
            </Field>

            {mode === "login" && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none mt-1">
                <div
                  onClick={() => setStayLoggedIn((v) => !v)}
                  style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${stayLoggedIn ? P : LINE}`,
                    background: stayLoggedIn ? P : "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {stayLoggedIn && <CheckCircle2 size={11} color="white" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: "0.83rem", color: INK }}>Stay logged in</span>
              </label>
            )}

            <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white mt-1" style={{ background: loading ? `${P}80` : `linear-gradient(135deg, ${P}, ${P_DEEP})`, boxShadow: `0 4px 16px ${P}40` }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t text-center" style={{ borderColor: LINE }}>
            <p className="text-sm" style={{ color: MUTED }}>
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}
              {" "}
              <button onClick={() => switchMode(mode === "login" ? "signup" : "login")} className="font-bold" style={{ color: P }}>
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= APP ================= */
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userAvatar, setUserAvatar] = useState(null);
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    storage.get(`avatar:${session.user.id}`).then((r) => {
      if (r) setUserAvatar(JSON.parse(r.value));
    }).catch(() => {});
  }, [session?.user?.id]);

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
    link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap";
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
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
    const meta = session?.user?.user_metadata || {};
    const bookerName = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || session?.user?.email?.split("@")[0] || "Unknown";
    const schedStamp = clientInfo.nextServiceDate ? { scheduledBy: bookerName, scheduledById: session?.user?.id } : {};
    const nextClients = match
      ? clients.map((c) => (c.id === match.id ? { ...c, ...clientInfo, ...schedStamp, id: c.id, history: c.history || [] } : c))
      : [...clients, { ...emptyForm, ...clientInfo, ...schedStamp, id: clientId, history: [] }];

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
    const sellerName = client.scheduledBy || "Unknown";
    const sellerId = client.scheduledById;
    const entry = { date: today, services: client.services, notes: note, price: Number(price) || 0, bookedBy: sellerName, bookedById: sellerId };
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

  const selected = clients.find((c) => c.id === selectedId) || null;

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${DARK}, #0C1E38)` }}>
      <Loader2 size={28} className="animate-spin" style={{ color: ACCENT_LIGHT }} />
    </div>
  );
  if (!session) return <AuthScreen />;

  return (
    <div style={{ background: BG, fontFamily: FONT_BODY, minHeight: "100vh" }} className="text-slate-800 flex flex-col">
      <header style={{ background: `linear-gradient(135deg, ${DARK} 0%, #0C1E38 100%)`, borderBottom: "1px solid rgba(255,255,255,0.06)" }} className="px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <Logo />
        <div className="flex items-center gap-3">
          {saveState === "saving" && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: `${P}20`, color: ACCENT_LIGHT, fontFamily: FONT_MONO }}>
              <Loader2 size={10} className="animate-spin" /> saving…
            </span>
          )}
          {saveState === "error" && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: `${RED}20`, color: RED, fontFamily: FONT_MONO }}>
              <AlertTriangle size={10} /> save failed
            </span>
          )}
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }} title="Sign out">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </header>
      {/* Animated gradient accent stripe */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${P}, ${CYAN}, ${EMERALD}, ${AMBER}, ${P})`, backgroundSize: "300% 100%", animation: "gradientPan 4s ease infinite" }} />

      <div className="flex flex-1 min-h-0">
        <aside className="hidden sm:flex flex-col w-60 shrink-0 py-4 px-3 gap-0.5 border-r" style={{ background: DARK2, borderColor: "rgba(255,255,255,0.05)" }}>
          <p className="text-xs font-bold px-3 mb-2 mt-1 tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.18)", fontFamily: FONT_MONO }}>Navigation</p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition-all relative overflow-hidden"
                style={{ background: active ? `linear-gradient(135deg, ${P}35, ${P}18)` : "transparent", color: active ? "white" : "#5A7799", fontFamily: FONT_HEAD, borderLeft: active ? `3px solid ${P}` : "3px solid transparent" }}>
                {active && <div className="absolute inset-0 rounded-xl" style={{ background: `radial-gradient(ellipse at left, ${P}20, transparent 70%)` }} />}
                <Icon size={16} strokeWidth={active ? 2.5 : 2} style={{ position: "relative", zIndex: 1 }} />
                <span style={{ position: "relative", zIndex: 1 }}>{item.label}</span>
              </button>
            );
          })}
          <div className="mt-auto pt-4 mx-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {/* User mini-profile */}
            <div className="px-3 py-2 mb-2 flex items-center gap-2.5">
              {userAvatar
                ? <img src={userAvatar} alt="avatar" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${P}60` }} />
                : <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${P},${P_DEEP})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, color: "white", flexShrink: 0 }}>
                    {(session?.user?.user_metadata?.first_name?.[0] || session?.user?.email?.[0] || "?").toUpperCase()}
                  </div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {[session?.user?.user_metadata?.first_name, session?.user?.user_metadata?.last_name].filter(Boolean).join(" ") || "My Account"}
                </p>
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.28)", fontFamily: FONT_MONO }}>{session?.user?.email}</p>
              </div>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 px-3 py-2 rounded-xl w-full" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)" }}>
              <LogOut size={14} />
              <span className="text-xs font-bold" style={{ fontFamily: FONT_HEAD }}>Sign out</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-8 py-6 pb-32 sm:pb-12">
          {loading ? (
            <div className="flex items-center gap-2 text-sm py-12 justify-center" style={{ color: MUTED }}><Loader2 size={16} className="animate-spin" /> Loading…</div>
          ) : (
            <>
              {page === "dashboard" && (
                <>
                  <TabHero icons={[LayoutDashboard, Sparkles]} from={P} to={DARK} title="Welcome back" subtitle={`Here's your business at a glance — ${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}`} />
                  <DashboardTab clients={clients} pins={pins} onOpenClient={setSelectedId} setPage={setPage} onAdd={openAdd} session={session} />
                </>
              )}
              {page === "clients" && (
                <>
                  <TabHero
                    icons={[Users, HomeIcon]} from={P} to={P_DEEP}
                    title="Clients" subtitle="Your full client list and service plans."
                    action={<button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white shrink-0" style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}><Plus size={16} /> Add client</button>}
                  />
                  <ClientsTab clients={filtered} allCount={clients.length} query={query} setQuery={setQuery} serviceFilter={serviceFilter} setServiceFilter={setServiceFilter} onOpen={setSelectedId} onAdd={openAdd} />
                </>
              )}
              {page === "schedule" && (
                <>
                  <TabHero icons={[CalendarDays, Clock]} from={P} to={P_DEEP} title="Schedule" subtitle="Click an open slot to book. Booked jobs are blocked by duration." />
                  <ScheduleTab clients={clients} scheduleDate={scheduleDate} setScheduleDate={setScheduleDate} onOpenClient={setSelectedId} onBookSlot={(slot) => openBook(scheduleDate, slot)} />
                </>
              )}
              {page === "canvass" && (
                <>
                  <TabHero icons={[HomeIcon, MapPin]} from={P} to={P_DEEP} title="Door Map" subtitle="Tap the map to drop a pin. Tap a pin to edit." />
                  <DoorMap pins={pins} clients={clients} persistPins={persistPins} upsertClientAndPin={upsertClientAndPin} deletePin={deletePin} showToast={showToast} onOpenClient={(id) => { setSelectedId(id); setPage("clients"); }} />
                </>
              )}
              {page === "finance" && (
                <>
                  <TabHero icons={[DollarSign, TrendingUp]} from={P} to={P_DEEP} title="Finance" subtitle="Revenue, completed jobs, and projected income." />
                  <FinanceTab clients={clients} />
                </>
              )}
              {page === "settings" && (
                <SettingsTab session={session} userAvatar={userAvatar} setUserAvatar={setUserAvatar} showToast={showToast} />
              )}
            </>
          )}
        </main>
      </div>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 flex items-center py-2 px-2 gap-1 overflow-x-auto" style={{ background: DARK2, boxShadow: "0 -1px 0 rgba(255,255,255,0.06), 0 -12px 40px rgba(0,0,0,0.4)", paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)} className="flex flex-col items-center gap-0.5 flex-1 min-w-0 py-1.5 px-1 rounded-xl transition-all" style={{ background: active ? `${P}28` : "transparent" }}>
              <Icon size={17} strokeWidth={active ? 2.5 : 2} color={active ? ACCENT_LIGHT : "#4A6280"} />
              <span style={{ color: active ? ACCENT_LIGHT : "#4A6280", fontSize: "0.56rem", fontFamily: FONT_HEAD, whiteSpace: "nowrap" }}>{item.label}</span>
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
          showToast={showToast}
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
function DashboardTab({ clients, pins, onOpenClient, setPage, onAdd, session }) {
  const today = todayStr();
  const todays = clients.filter((c) => c.nextServiceDate === today).sort((a, b) => (a.nextServiceTime || "").localeCompare(b.nextServiceTime || ""));
  const overdue = clients.filter((c) => c.nextServiceDate && daysUntil(c.nextServiceDate) < 0);
  const thisMonth = today.slice(0, 7);
  const lastMonth = (() => { const d = new Date(today + "T00:00:00"); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const monthRevenue = clients.reduce((sum, c) => sum + (c.history || []).filter((h) => h.date.slice(0, 7) === thisMonth).reduce((s, h) => s + (Number(h.price) || 0), 0), 0);
  const lastMonthRevenue = clients.reduce((sum, c) => sum + (c.history || []).filter((h) => h.date.slice(0, 7) === lastMonth).reduce((s, h) => s + (Number(h.price) || 0), 0), 0);
  const revTrend = lastMonthRevenue ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : undefined;
  const upcomingCount = clients.filter((c) => c.nextServiceDate && daysUntil(c.nextServiceDate) >= 0).length;
  const recurringCount = clients.filter((c) => c.frequency && c.frequency !== "one-time").length;
  const currentUserName = [session?.user?.user_metadata?.first_name, session?.user?.user_metadata?.last_name].filter(Boolean).join(" ") || session?.user?.email?.split("@")[0];
  const [lbView, setLbView] = useState("monthly");

  function buildLeaderboard(filterFn) {
    const totals = {};
    clients.forEach((c) => {
      (c.history || []).forEach((h) => {
        if (!h.bookedBy || !filterFn(h)) return;
        totals[h.bookedBy] = (totals[h.bookedBy] || 0) + (Number(h.price) || 0);
      });
    });
    return Object.entries(totals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }

  const monthlyLb  = useMemo(() => buildLeaderboard((h) => h.date?.slice(0, 7) === thisMonth), [clients, thisMonth]);
  const alltimeLb  = useMemo(() => buildLeaderboard(() => true), [clients]);
  const leaderboard = lbView === "monthly" ? monthlyLb : alltimeLb;

  return (
    <div className="anim-fade-up" style={{ fontFamily: FONT_BODY }}>
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 stagger">
        <StatCard icon={CalendarDays} label="Today's Jobs"   value={todays.length}         accent={P}       sub={formatDate(today)} />
        <StatCard icon={ClipboardList} label="Upcoming"       value={upcomingCount}          accent={AMBER}   sub="Scheduled jobs" />
        <StatCard icon={DollarSign}    label="This Month"     value={formatMoney(monthRevenue)} accent={EMERALD} sub="Completed jobs" trend={revTrend} />
        <StatCard icon={Users}         label="Recurring"      value={recurringCount}         accent={VIOLET}  sub="Active service plans" />
      </div>

      {/* Weather */}
      <div className="mb-4"><WeatherWidget /></div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="card mb-4 px-4 py-3 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${RED_L}, #fff)`, borderColor: `${RED}30` }}>
          <div className="rounded-xl p-2 flex-shrink-0" style={{ background: `${RED}18` }}><AlertTriangle size={15} style={{ color: RED }} /></div>
          <p className="text-sm font-semibold flex-1" style={{ color: RED }}>
            {overdue.length} overdue — {overdue.slice(0, 2).map((c) => c.name?.split(" ")[0] || "Client").join(", ")}{overdue.length > 2 ? ` +${overdue.length - 2}` : ""}
          </p>
          <button onClick={() => setPage("schedule")} className="text-xs font-bold shrink-0 px-2.5 py-1 rounded-lg" style={{ background: `${RED}15`, color: RED }}>View →</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Today's route */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: INK, fontFamily: FONT_HEAD }}>Today's Route</p>
            <button onClick={() => setPage("schedule")} className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ color: P, background: P_LIGHT }}>Schedule →</button>
          </div>
          {todays.length === 0 ? (
            <div className="flex flex-col items-center py-5 gap-2">
              <div className="rounded-full p-3" style={{ background: P_LIGHT }}><CalendarDays size={22} style={{ color: P }} /></div>
              <p className="text-sm text-center" style={{ color: MUTED }}>Nothing booked today.</p>
              <button onClick={() => setPage("schedule")} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ color: P, background: P_LIGHT }}>+ Book a job</button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {todays.map((c, i) => (
                <button key={c.id} onClick={() => onOpenClient(c.id)} className="card-lift flex items-center gap-3 text-left text-sm py-2 px-2 rounded-xl">
                  <span className="text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${P}18`, color: P, fontFamily: FONT_MONO }}>{i + 1}</span>
                  <Avatar name={c.name} size={30} />
                  <span className="flex-1 min-w-0 truncate font-semibold" style={{ color: INK }}>{c.name || "Unnamed client"}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: P_LIGHT, color: P, fontFamily: FONT_MONO }}>{c.nextServiceTime ? formatTime(c.nextServiceTime) : "—"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Top Sellers leaderboard */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award size={15} style={{ color: AMBER }} />
              <p className="text-sm font-bold" style={{ color: INK, fontFamily: FONT_HEAD }}>Top Sellers</p>
            </div>
            <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${LINE}` }}>
              {["monthly", "alltime"].map((v) => (
                <button key={v} onClick={() => setLbView(v)} className="px-2.5 py-1 text-xs font-bold transition-colors" style={{ background: lbView === v ? P : "transparent", color: lbView === v ? "white" : MUTED }}>
                  {v === "monthly" ? "This Month" : "All Time"}
                </button>
              ))}
            </div>
          </div>
          {leaderboard.length === 0 ? (
            <div className="flex flex-col items-center py-4 gap-1.5">
              <Star size={20} style={{ color: MUTED }} />
              <p className="text-xs text-center" style={{ color: MUTED }}>{lbView === "monthly" ? "No sales logged this month yet." : "Book jobs to start tracking sales."}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {leaderboard.map(({ name, total }, i) => {
                const isMe = name === currentUserName;
                const rankColor = [AMBER, "#9CA3AF", "#B87333"][i] || MUTED;
                const barPct = leaderboard[0]?.total ? Math.max(8, (total / leaderboard[0].total) * 100) : 0;
                return (
                  <div key={name} className="rounded-xl px-3 py-2.5" style={{ background: isMe ? `${P}08` : BG, border: `1px solid ${isMe ? P + "30" : LINE}` }}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="text-xs font-black w-5 shrink-0 text-center" style={{ color: rankColor, fontFamily: FONT_MONO }}>#{i + 1}</span>
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: `linear-gradient(135deg,${getAvatarColor(name)},${getAvatarColor(name)}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 800, color: "white", flexShrink: 0 }}>
                          {getInitials(name)}
                        </div>
                        <span className="font-semibold text-sm truncate" style={{ color: INK }}>{name}</span>
                        {isMe && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: P_LIGHT, color: P }}>You</span>}
                      </div>
                      <span className="font-black text-sm shrink-0" style={{ color: EMERALD, fontFamily: FONT_MONO }}>{formatMoney(total)}</span>
                    </div>
                    <div className="rounded-full overflow-hidden ml-7" style={{ height: 4, background: `${LINE}` }}>
                      <div style={{ width: `${barPct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${P}, ${CYAN})` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={onAdd} className="btn-primary flex items-center gap-1.5"><Plus size={16} /> Add Client</button>
        <button onClick={() => setPage("schedule")} className="btn-ghost flex items-center gap-1.5"><CalendarDays size={15} /> Schedule</button>
        <button onClick={() => setPage("canvass")} className="btn-ghost flex items-center gap-1.5"><HomeIcon size={15} /> Door Map</button>
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
const SLOT_H = 52; // px height per 30-min slot

function ScheduleTab({ clients, scheduleDate, setScheduleDate, onOpenClient, onBookSlot }) {
  const dayClients = clients.filter((c) => c.nextServiceDate === scheduleDate);

  // Build occupied map: slot → { client, isStart, numSlots }
  const occupied = {};
  dayClients.forEach((c) => {
    if (!TIME_SLOTS.includes(c.nextServiceTime)) return;
    const slots = slotsForAppointment(c.nextServiceTime, c.duration || 60);
    slots.forEach((s, i) => {
      if (!occupied[s]) occupied[s] = { client: c, isStart: i === 0, numSlots: slots.length };
    });
  });

  // Build merged display rows
  const displayRows = [];
  let i = 0;
  while (i < TIME_SLOTS.length) {
    const slot = TIME_SLOTS[i];
    const occ = occupied[slot];
    if (occ && occ.isStart) {
      displayRows.push({ type: "booked", slot, client: occ.client, numSlots: occ.numSlots });
      i += occ.numSlots;
    } else if (occ) {
      i++; // continuation — skip, already in a booked row
    } else {
      displayRows.push({ type: "free", slot });
      i++;
    }
  }

  const unslotted = dayClients.filter((c) => !TIME_SLOTS.includes(c.nextServiceTime));
  const heading = new Date(scheduleDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const isToday = scheduleDate === todayStr();

  function shiftDay(delta) {
    const d = new Date(scheduleDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setScheduleDate(d.toISOString().slice(0, 10));
  }

  const bookedCount = dayClients.length;
  const dayRevenue = dayClients.reduce((s, c) => s + (Number(c.price) || 0), 0);

  return (
    <div>
      {/* Date navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl border p-3 mb-3 shadow-sm" style={{ borderColor: LINE }}>
        <button onClick={() => shiftDay(-1)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors" style={{ color: MUTED }}><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="font-bold text-sm" style={{ color: INK, fontFamily: FONT_HEAD }}>{heading}</p>
          <div className="flex items-center justify-center gap-3 mt-0.5">
            {!isToday && <button onClick={() => setScheduleDate(todayStr())} className="text-xs font-medium" style={{ color: P }}>← Today</button>}
            {bookedCount > 0 && <span className="text-xs font-semibold" style={{ color: MUTED }}>{bookedCount} job{bookedCount !== 1 ? "s" : ""}{dayRevenue > 0 ? ` · ${formatMoney(dayRevenue)}` : ""}</span>}
          </div>
        </div>
        <button onClick={() => shiftDay(1)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors" style={{ color: MUTED }}><ChevronRight size={18} /></button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: LINE }}>
        {/* Header row */}
        <div className="flex items-center border-b" style={{ borderColor: LINE, background: BG }}>
          <div className="shrink-0 px-3 py-2.5" style={{ width: 88 }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: MUTED }}>Time</span>
          </div>
          <div className="flex-1 px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: MUTED }}>Client</span>
          </div>
          <div className="shrink-0 px-3 py-2.5 hidden sm:block" style={{ width: 160 }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: MUTED }}>Services</span>
          </div>
          <div className="shrink-0 px-4 py-2.5" style={{ width: 80 }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: MUTED }}>Price</span>
          </div>
        </div>

        {/* Rows */}
        {displayRows.map((row) => {
          if (row.type === "free") {
            return (
              <div key={row.slot} className="flex items-stretch border-b last:border-0" style={{ borderColor: LINE, minHeight: SLOT_H }}>
                <div className="shrink-0 flex items-center justify-center px-3" style={{ width: 88, background: `${BG}99`, fontFamily: FONT_MONO, fontSize: "0.7rem", color: MUTED, borderRight: `1px solid ${LINE}` }}>
                  {formatTime(row.slot)}
                </div>
                <button onClick={() => onBookSlot(row.slot)} className="flex-1 flex items-center gap-2 px-4 text-sm transition-colors hover:bg-blue-50" style={{ color: `${P}90` }}>
                  <Plus size={13} />
                  <span>Available — click to book</span>
                </button>
              </div>
            );
          }

          // Booked row
          const c = row.client;
          const rowH = row.numSlots * SLOT_H;
          const endMin = timeToMinutes(row.slot) + (c.duration || 60);
          const endLabel = formatTime(minutesToTime(endMin));

          return (
            <div key={row.slot} className="flex items-stretch border-b last:border-0" style={{ borderColor: LINE, minHeight: rowH }}>
              {/* Time column */}
              <div className="shrink-0 flex flex-col items-start justify-start px-3 pt-3 gap-0.5" style={{ width: 88, background: `${BG}99`, fontFamily: FONT_MONO, borderRight: `1px solid ${LINE}` }}>
                <span className="font-bold" style={{ color: P, fontSize: "0.72rem" }}>{formatTime(row.slot)}</span>
                <span style={{ color: MUTED, fontSize: "0.62rem" }}>→ {endLabel}</span>
                <span className="mt-1 rounded-full px-1.5 py-0.5" style={{ background: `${P}14`, color: P, fontSize: "0.6rem", fontWeight: 700 }}>{c.duration || 60}m</span>
              </div>

              {/* Client column */}
              <button onClick={() => onOpenClient(c.id)} className="flex-1 flex items-center gap-3 px-4 text-left hover:bg-slate-50 transition-colors min-w-0" style={{ borderLeft: `3px solid ${P}`, background: `${P}03` }}>
                <Avatar name={c.name} size={32} />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: INK, fontFamily: FONT_HEAD }}>{c.name || "Unnamed client"}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: MUTED }}>{formatAddress(c) || "No address"}</p>
                  {/* Services visible on mobile */}
                  <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                    {c.services.map((s) => <ServiceBadge key={s} id={s} />)}
                  </div>
                </div>
              </button>

              {/* Services column — desktop only */}
              <div className="shrink-0 hidden sm:flex flex-col items-start justify-center gap-1 px-3" style={{ width: 160, borderLeft: `1px solid ${LINE}` }}>
                {c.services.map((s) => <ServiceBadge key={s} id={s} />)}
              </div>

              {/* Price column */}
              <div className="shrink-0 flex items-center justify-end px-4" style={{ width: 80, borderLeft: `1px solid ${LINE}` }}>
                {c.price
                  ? <span className="font-black text-sm" style={{ color: EMERALD, fontFamily: FONT_MONO }}>{formatMoney(c.price)}</span>
                  : <span style={{ color: MUTED, fontSize: "0.75rem" }}>—</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unslotted clients (no time set or time outside slots) */}
      {unslotted.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: MUTED }}>No time set</p>
          <div className="flex flex-col gap-2">
            {unslotted.map((c) => (
              <button key={c.id} onClick={() => onOpenClient(c.id)} className="bg-white rounded-xl border px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors shadow-sm" style={{ borderColor: LINE }}>
                <Avatar name={c.name} size={30} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: INK }}>{c.name || "Unnamed client"}</p>
                  <p className="text-xs truncate" style={{ color: MUTED }}>{formatAddress(c)}</p>
                </div>
                <div className="flex gap-1 shrink-0">{c.services.map((s) => <ServiceBadge key={s} id={s} />)}</div>
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

/* ── Communication Templates ── */
function CommTemplates({ client }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(null);

  function copy(id, text) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2200);
  }

  return (
    <div className="mt-6 border-t pt-5" style={{ borderColor: LINE }}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} style={{ color: P }} />
          <p className="text-xs font-bold tracking-wide uppercase" style={{ color: MUTED }}>Message Templates</p>
        </div>
        <ChevronRight size={14} style={{ color: MUTED, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {open && (
        <div className="flex flex-col gap-2">
          {COMM_TEMPLATES.map((t) => {
            const Icon = t.icon;
            const text = t.sms(client);
            const isCopied = copied === t.id;
            return (
              <div key={t.id} className="rounded-2xl border p-3" style={{ borderColor: `${t.color}28`, background: `${t.color}06` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon size={13} style={{ color: t.color }} />
                    <p className="text-xs font-bold" style={{ color: t.color }}>{t.label}</p>
                  </div>
                  <button onClick={() => copy(t.id, text)} className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: isCopied ? EM_L : `${t.color}12`, color: isCopied ? EMERALD : t.color }}>
                    {isCopied ? <><CheckCircle2 size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: INK_SOFT }}>{text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Detail drawer ---------- */
function DetailDrawer({ client, onClose, onEdit, onDelete, onMark, noteDraft, setNoteDraft, priceDraft, setPriceDraft, showToast }) {
  const [sendingReceipt, setSendingReceipt] = useState(false);
  async function handleSendReceipt(price, notes, date, services) {
    setSendingReceipt(true);
    await sendReceiptEmail(client, price, notes, date, services, showToast);
    setSendingReceipt(false);
  }
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
          <p className="text-xs font-bold mb-2 tracking-wide uppercase" style={{ color: MUTED }}>Mark Job Complete</p>
          <div className="flex gap-2">
            <div className="flex items-center rounded-lg border px-2" style={{ borderColor: LINE }}>
              <span className="text-sm" style={{ color: MUTED }}>$</span>
              <input value={priceDraft} onChange={(e) => setPriceDraft(e.target.value)} placeholder="0" inputMode="decimal" className="text-sm py-2 px-1 w-16 outline-none" />
            </div>
            <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Note (optional)" className="text-sm rounded-lg border px-3 py-2 flex-1" style={{ borderColor: LINE }} />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={onMark} className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white whitespace-nowrap flex-1" style={{ background: GREEN }}><CheckCircle2 size={14} /> Mark serviced</button>
            {client.email && (
              <button onClick={() => handleSendReceipt(priceDraft, noteDraft)} disabled={sendingReceipt} className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap" style={{ background: P_LIGHT, color: sendingReceipt ? MUTED : P, opacity: sendingReceipt ? 0.7 : 1 }}>
                {sendingReceipt ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
                {sendingReceipt ? "Sending…" : "Send receipt"}
              </button>
            )}
          </div>
          {!client.email && (
            <p className="text-xs mt-1.5" style={{ color: MUTED }}>Add client email to enable receipts.</p>
          )}
        </div>

        <PhotosSection clientId={client.id} />

        {/* Communication templates */}
        <CommTemplates client={client} />

        <div className="mt-6">
          <p className="text-xs font-bold mb-2 tracking-wide uppercase" style={{ color: MUTED }}>Service History</p>
          {(!client.history || client.history.length === 0) ? (
            <p className="text-sm" style={{ color: MUTED }}>No services logged yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {client.history.map((h, i) => (
                <div key={i} className="rounded-xl border p-3" style={{ borderColor: LINE }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Clock size={13} style={{ color: MUTED }} />
                      <p className="text-sm font-semibold" style={{ color: INK }}>{formatDate(h.date)}</p>
                      {!!h.price && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: EMERALD, background: EM_L, fontFamily: FONT_MONO }}>{formatMoney(h.price)}</span>}
                    </div>
                    {client.email && (
                      <button onClick={() => handleSendReceipt(h.price, h.notes, h.date, h.services)} disabled={sendingReceipt} className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg" style={{ background: P_LIGHT, color: sendingReceipt ? MUTED : P, opacity: sendingReceipt ? 0.7 : 1 }}>
                        {sendingReceipt ? <Loader2 size={11} className="animate-spin" /> : <Receipt size={11} />}
                        {sendingReceipt ? "…" : "Receipt"}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">{(h.services || []).map((s) => <ServiceBadge key={s} id={s} />)}</div>
                  {h.notes && <p className="text-xs mt-1.5" style={{ color: MUTED }}>{h.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function sendReceiptEmail(client, price, notes, date, services, showToast) {
  const d = date || todayStr();
  const svcMap = { window: "Window Cleaning", solar: "Solar Panel Cleaning", pressure: "Pressure Washing", gutter: "Gutter Cleaning" };
  const svcList = (services || client.services || []).map((s) => svcMap[s] || s);
  const addr = formatAddress(client);
  const amt = formatMoney(Number(price) || 0);
  const dateLabel = new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  try {
    await emailjs.send(EJS_SVC, EJS_TPL, {
      to_email:      client.email,
      to_name:       client.name || "Valued Customer",
      date:          dateLabel,
      services_list: svcList.join(", "),
      total:         amt,
      address:       addr || "—",
      notes:         notes || "",
    }, EJS_KEY);
    showToast?.(`Receipt sent to ${client.email}`);
  } catch (err) {
    const msg = err?.text || err?.message || "Unknown error";
    showToast?.(`Failed to send receipt: ${msg}`, "error");
  }
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

/* ---------- Settings / Profile tab ---------- */
function SettingsTab({ session, userAvatar, setUserAvatar, showToast }) {
  const meta = session?.user?.user_metadata || {};
  const [firstName, setFirstName] = useState(meta.first_name || "");
  const [lastName,  setLastName]  = useState(meta.last_name  || "");
  const [phone,     setPhone]     = useState(meta.phone      || "");
  const [saving,    setSaving]    = useState(false);

  async function saveProfile() {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() },
      });
      if (error) throw error;
      showToast("Profile saved!");
    } catch (e) {
      showToast(e.message, "error");
    }
    setSaving(false);
  }

  function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImageFile(file, 240, 0.82, async (dataUrl) => {
      setUserAvatar(dataUrl);
      await storage.set(`avatar:${session.user.id}`, JSON.stringify(dataUrl));
      showToast("Profile picture updated!");
    });
    e.target.value = "";
  }

  async function removeAvatar() {
    setUserAvatar(null);
    await storage.delete(`avatar:${session.user.id}`);
    showToast("Profile picture removed");
  }

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Your Name";

  return (
    <div className="anim-fade-up" style={{ fontFamily: FONT_BODY }}>
      <TabHero icons={[SettingsIcon, Users]} from={P} to={P_DEEP} title="Profile & Settings" subtitle="Update your personal info and configure the app." />

      {/* Profile card */}
      <div className="card p-6 mb-4">
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: MUTED }}>My Profile</p>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative shrink-0">
            {userAvatar
              ? <img src={userAvatar} alt="Profile" style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", border: `3px solid ${P}40`, display: "block" }} />
              : <div style={{ width: 76, height: 76, borderRadius: "50%", background: `linear-gradient(135deg,${P},${P_DEEP})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", fontWeight: 800, color: "white", fontFamily: FONT_HEAD }}>
                  {(firstName[0] || "?").toUpperCase()}
                </div>
            }
            <label className="absolute bottom-0 right-0 flex items-center justify-center cursor-pointer" style={{ width: 28, height: 28, borderRadius: "50%", background: P, border: "2.5px solid white" }}>
              <Camera size={13} color="white" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div>
            <p className="font-black text-base" style={{ color: INK, fontFamily: FONT_HEAD }}>{displayName}</p>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>{session?.user?.email}</p>
            {userAvatar && (
              <button onClick={removeAvatar} className="text-xs mt-1.5 font-medium" style={{ color: RED }}>Remove photo</button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" style={inputStyle} />
            </Field>
            <Field label="Last name">
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" style={inputStyle} />
            </Field>
          </div>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} placeholder="(555) 555-5555" inputMode="tel" style={inputStyle} />
          </Field>
          <Field label="Email (read-only)">
            <input value={session?.user?.email || ""} disabled style={{ ...inputStyle, background: BG, color: MUTED, cursor: "default" }} />
          </Field>
        </div>

        <button onClick={saveProfile} disabled={saving} className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-5 text-sm font-bold text-white mt-4" style={{ background: saving ? `${P}70` : `linear-gradient(135deg,${P},${P_DEEP})`, boxShadow: `0 4px 16px ${P}30` }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Save Profile
        </button>
      </div>

      {/* Danger zone */}
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Account</p>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: `${RED}30`, color: RED, background: RED_L }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}

/* ---------- Finance tab ---------- */
function FinanceTab({ clients }) {
  const [goal, setGoal] = useState(() => { try { return Number(localStorage.getItem("revenueGoal")) || 0; } catch { return 0; } });
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

  const serviceBreakdown = useMemo(() => {
    const totals = {};
    jobs.forEach((j) => (j.services || []).forEach((s) => { totals[s] = (totals[s] || 0) + (Number(j.price) || 0) / Math.max(1, (j.services || []).length); }));
    return SERVICES.map((s) => ({ ...s, value: totals[s.id] || 0 })).filter((s) => s.value > 0);
  }, [jobs]);

  if (clients.length === 0) {
    return (
      <div className="card flex flex-col items-center py-16 text-center">
        <div className="rounded-2xl p-4 mb-3" style={{ background: EM_L }}><DollarSign size={32} style={{ color: EMERALD }} /></div>
        <p className="font-black text-lg" style={{ color: INK, fontFamily: FONT_HEAD }}>No revenue yet</p>
        <p className="text-sm mt-1 max-w-xs" style={{ color: MUTED }}>Add clients and mark services complete to start tracking revenue.</p>
      </div>
    );
  }

  return (
    <div className="anim-fade-up" style={{ fontFamily: FONT_BODY }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 stagger">
        <StatCard icon={DollarSign}  label="Total Revenue" value={formatMoney(totalRevenue)} accent={EMERALD} sub="All-time, completed jobs" />
        <StatCard icon={Briefcase}   label="Jobs Done"      value={jobsCompleted}             accent={P}       sub="All-time" />
        <StatCard icon={TrendingUp}  label="Avg. Job"       value={formatMoney(avgJobValue)}  accent={AMBER}   sub="Per completed job" />
        <StatCard icon={Zap}         label="Projected"      value={formatMoney(projected)}    accent={VIOLET}  sub="From scheduled clients" />
      </div>

      {/* Monthly goal */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl p-2" style={{ background: `${P}18` }}><Target size={15} style={{ color: P }} /></div>
            <p className="text-sm font-bold" style={{ color: INK, fontFamily: FONT_HEAD }}>Monthly Revenue Goal — {formatMonth(thisMonth)}</p>
          </div>
          {editingGoal ? (
            <div className="flex items-center gap-1.5">
              <input autoFocus value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} placeholder="0" inputMode="decimal" className="text-sm border rounded-xl px-2.5 py-1.5 w-28" style={{ borderColor: LINE }} />
              <button onClick={() => { const v = Number(goalDraft) || 0; setGoal(v); localStorage.setItem("revenueGoal", v); setEditingGoal(false); }} className="text-xs font-bold px-3 py-1.5 rounded-xl text-white" style={{ background: EMERALD }}>Set</button>
              <button onClick={() => setEditingGoal(false)} className="text-xs rounded-xl px-2 py-1.5" style={{ color: MUTED }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => { setGoalDraft(goal ? String(goal) : ""); setEditingGoal(true); }} className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ color: P, background: P_LIGHT }}>
              {goal ? "Edit goal" : "Set goal"}
            </button>
          )}
        </div>
        {goal > 0 ? (
          <>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black" style={{ color: INK, fontFamily: FONT_HEAD }}>{formatMoney(thisMonthRevenue)}</span>
              <span className="text-base font-semibold" style={{ color: MUTED }}>/ {formatMoney(goal)}</span>
            </div>
            <ProgressBar value={thisMonthRevenue} max={goal} color={thisMonthRevenue >= goal ? EMERALD : P} height={10} />
            <p className="text-xs font-bold mt-2" style={{ color: thisMonthRevenue >= goal ? EMERALD : MUTED }}>
              {thisMonthRevenue >= goal ? `Goal reached! +${formatMoney(thisMonthRevenue - goal)} over target` : `${formatMoney(goal - thisMonthRevenue)} to reach your goal`}
            </p>
          </>
        ) : (
          <p className="text-sm mt-1" style={{ color: MUTED }}>Set a monthly revenue goal to track your progress.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Revenue chart */}
        <div className="card p-5">
          <p className="text-sm font-bold mb-1" style={{ color: INK, fontFamily: FONT_HEAD }}>Revenue by Month</p>
          {monthly.length === 0 ? <p className="text-sm mt-2" style={{ color: MUTED }}>No completed jobs yet.</p> : (
            <>
              <MiniBarChart data={monthly} />
              <div className="flex flex-col gap-1.5 mt-3">
                {monthly.map((m) => (
                  <div key={m.month} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0" style={{ borderColor: LINE }}>
                    <span className="font-medium" style={{ color: INK_SOFT }}>{formatMonth(m.month)}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="pill" style={{ background: BG, color: MUTED }}>{m.count} job{m.count !== 1 ? "s" : ""}</span>
                      <span className="font-bold" style={{ color: EMERALD, fontFamily: FONT_MONO }}>{formatMoney(m.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Service breakdown */}
        <div className="card p-5">
          <p className="text-sm font-bold mb-4" style={{ color: INK, fontFamily: FONT_HEAD }}>Revenue by Service</p>
          {serviceBreakdown.length === 0 ? <p className="text-sm" style={{ color: MUTED }}>No data yet.</p> : (
            <div className="flex items-center gap-5">
              <DonutChart segments={serviceBreakdown.map((s) => ({ value: s.value, color: s.color }))} size={96} />
              <div className="flex flex-col gap-2 flex-1">
                {serviceBreakdown.map((s) => {
                  const Icon = s.icon;
                  const pct = totalRevenue ? Math.round((s.value / totalRevenue) * 100) : 0;
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5"><Icon size={11} style={{ color: s.color }} /><span className="font-semibold" style={{ color: INK }}>{s.label}</span></div>
                        <span className="font-bold" style={{ color: s.color, fontFamily: FONT_MONO }}>{formatMoney(s.value)}</span>
                      </div>
                      <ProgressBar value={s.value} max={totalRevenue} color={s.color} height={5} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent jobs */}
      <div className="card p-5">
        <p className="text-sm font-bold mb-4" style={{ color: INK, fontFamily: FONT_HEAD }}>Recent Jobs</p>
        {jobs.length === 0 ? <p className="text-sm" style={{ color: MUTED }}>No completed jobs yet.</p> : (
          <div className="flex flex-col gap-0">
            {jobs.slice(0, 10).map((j, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: LINE }}>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={j.clientName} size={32} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: INK }}>{j.clientName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs" style={{ color: MUTED, fontFamily: FONT_MONO }}>{formatDate(j.date)}</p>
                      <div className="flex gap-1">{(j.services || []).map((s) => <ServiceBadge key={s} id={s} />)}</div>
                    </div>
                  </div>
                </div>
                <span className="font-black text-base shrink-0 ml-3" style={{ color: EMERALD, fontFamily: FONT_MONO }}>{formatMoney(j.price)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
