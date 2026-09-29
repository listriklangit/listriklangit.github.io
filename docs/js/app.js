// docs/js/app.js — logika peta publik (ESM). Aman XSS: data user dirender via textContent.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const mapEl = document.getElementById("map");
const cardsEl = document.getElementById("cards");
const warnEl = document.getElementById("supabase-warning");

const INDONESIA = { center: [-2.5, 118], zoom: 5, minZoom: 5, maxZoom: 18 };
const BOUNDS = [[-11.5, 94.5], [6.5, 141.5]];

const map = L.map("map", {
  zoomControl: false, minZoom: INDONESIA.minZoom, maxZoom: INDONESIA.maxZoom,
  maxBounds: BOUNDS, maxBoundsViscosity: 1.0, worldCopyJump: false,
}).setView(INDONESIA.center, INDONESIA.zoom);
L.control.zoom({ position: "bottomright" }).addTo(map);
L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  maxZoom: 20, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
}).addTo(map);

// Logo overlay kiri atas → klik reset view Indonesia
const LogoControl = L.Control.extend({
  onAdd() {
    const d = L.DomUtil.create("div", "map-logo-control");
    d.innerHTML = `<img src="./logo.svg" alt="logo"/><span>Listrik Langit<small>Klik: reset Indonesia</small></span>`;
    d.title = "Reset view Indonesia";
    L.DomEvent.on(d, "click", (e) => { L.DomEvent.stop(e); map.flyTo(INDONESIA.center, INDONESIA.zoom, { duration: 1 }); });
    return d;
  },
});
map.addControl(new LogoControl({ position: "topleft" }));
document.getElementById("btn-reset-view").onclick = () => map.flyTo(INDONESIA.center, INDONESIA.zoom);

const TYPE_COLOR = { "On-Grid": "#16a34a", "Off-Grid": "#d97706", "Hybrid": "#2563eb" };
const cluster = L.markerClusterGroup();
map.addLayer(cluster);

let supabase = null;
const useSupabase = SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.includes("PASTE");
if (useSupabase) supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
else warnEl.classList.remove("hidden"), warnEl.textContent = "Mode demo lokal: isi SUPABASE_URL + ANON_KEY di docs/js/config.js lalu jalankan SQL di docs/supabase-schema.sql agar data live dari Supabase.";

let locations = [], photosByLoc = {}, reviewsByLoc = {};

function ytEmbed(url) {
  if (!url) return "";
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{6,})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : "";
}
function esc(s) { return String(s ?? ""); } // dipakai hanya untuk atribut; teks utama via textContent

async function loadData() {
  if (!supabase && USE_LOCAL_FALLBACK) {
    locations = window.FALLBACK_LOCATIONS || [];
    (window.FALLBACK_PHOTOS || []).forEach((p) => ((photosByLoc[p.location_id] ||= []).push(p)));
    (window.FALLBACK_REVIEWS || []).forEach((r) => ((reviewsByLoc[r.location_id] ||= []).push(r)));
    return;
  }
  const { data: locs, error } = await supabase.from("locations").select("*").eq("is_published", true).order("install_year", { ascending: false });
  if (error) throw error;
  locations = locs || [];
  if (!locations.length) return;
  const ids = locations.map((l) => l.id);
  const [{ data: ph }, { data: rv }] = await Promise.all([
    supabase.from("photos").select("*").in("location_id", ids).order("sort_order"),
    supabase.from("reviews").select("*").in("location_id", ids).eq("is_approved", true).order("created_at", { ascending: false }),
  ]);
  (ph || []).forEach((p) => ((photosByLoc[p.location_id] ||= []).push(p)));
  (rv || []).forEach((r) => ((reviewsByLoc[r.location_id] ||= []).push(r)));
}

function stats(list) {
  const t = list.length;
  const kwp = list.reduce((a, l) => a + Number(l.capacity_kwp || 0), 0);
  const prov = new Set(list.map((l) => l.province)).size;
  document.getElementById("stat-titik").textContent = t;
  document.getElementById("stat-kwp").textContent = kwp.toLocaleString("id-ID");
  document.getElementById("stat-prov").textContent = prov;
}

function fillFilters() {
  const provs = [...new Set(locations.map((l) => l.province).filter(Boolean))].sort();
  const years = [...new Set(locations.map((l) => l.install_year).filter(Boolean))].sort((a, b) => b - a);
  const pSel = document.getElementById("f-prov"), ySel = document.getElementById("f-tahun");
  provs.forEach((p) => { const o = document.createElement("option"); o.textContent = p; pSel.appendChild(o); });
  years.forEach((y) => { const o = document.createElement("option"); o.textContent = y; ySel.appendChild(o); });
}

function filtered() {
  const q = document.getElementById("f-search").value.toLowerCase().trim();
  const prov = document.getElementById("f-prov").value, tipe = document.getElementById("f-tipe").value;
  const tahun = document.getElementById("f-tahun").value;
  const min = parseFloat(document.getElementById("f-min").value), max = parseFloat(document.getElementById("f-max").value);
  return locations.filter((l) => {
    if (prov && l.province !== prov) return false;
    if (tipe && l.system_type !== tipe) return false;
    if (tahun && String(l.install_year) !== tahun) return false;
    if (!isNaN(min) && Number(l.capacity_kwp) < min) return false;
    if (!isNaN(max) && Number(l.capacity_kwp) > max) return false;
    if (q && !`${l.name} ${l.client_name || ""} ${l.city || ""} ${l.province || ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderMarkers(list) {
  cluster.clearLayers();
  list.forEach((l) => {
    const m = L.circleMarker([l.lat, l.lng], {
      radius: 9, color: "#fff", weight: 2, fillColor: TYPE_COLOR[l.system_type] || "#0f172a", fillOpacity: 0.95,
    });
    const cover = l.cover_url ? `<img src="${esc(l.cover_url)}" style="width:100%;height:90px;object-fit:cover" loading="lazy"/><br/>` : "";
    m.bindPopup(`<div style="min-width:180px;max-width:220px">${cover}<b></b><br/><span></span><br/><a class="popup-btn" href="#lokasi=${esc(l.slug || l.id)}">Lihat Detail →</a></div>`);
    m.on("popupopen", (e) => {
      const n = e.popup.getElement().querySelector("b"); n.textContent = l.name;
      const s = e.popup.getElement().querySelector("span"); s.textContent = `${l.capacity_kwp} kWp • ${l.province}`;
    });
    m.on("click", () => { window.location.hash = `lokasi=${l.slug || l.id}`; });
    m._locId = l.id;
    cluster.addLayer(m);
  });
}

function renderCards(list) {
  document.getElementById("result-count").textContent = list.length;
  cardsEl.innerHTML = "";
  if (!list.length) { cardsEl.innerHTML = `<p class="text-sm text-slate-500">Tidak ada lokasi cocok. Ubah filter.</p>`; return; }
  list.forEach((l) => {
    const card = document.createElement("button");
    card.className = "loc-card text-left bg-white border rounded-xl overflow-hidden";
    const img = document.createElement(l.cover_url ? "img" : "div");
    if (l.cover_url) { img.src = l.cover_url; img.alt = l.name; img.loading = "lazy"; img.className = "w-full h-28 object-cover"; }
    else { img.className = "w-full h-28 bg-gradient-to-br from-amber-400 to-slate-800 flex items-center justify-center text-white font-extrabold text-xl"; img.textContent = "☀"; }
    const body = document.createElement("div"); body.className = "p-3";
    const b = document.createElement("span"); b.className = `badge badge-${(l.system_type || "").replace("-", "-")}`; b.textContent = l.system_type || "-";
    const h = document.createElement("div"); h.className = "font-bold text-sm mt-1"; h.textContent = l.name;
    const p = document.createElement("div"); p.className = "text-xs text-slate-500"; p.textContent = `${l.capacity_kwp} kWp • ${l.city || ""} ${l.province || ""} • ${l.install_year || ""}`;
    body.append(b, h, p); card.append(img, body);
    card.onclick = () => { map.flyTo([l.lat, l.lng], Math.max(map.getZoom(), 10), { duration: 1 }); window.location.hash = `lokasi=${l.slug || l.id}`; };
    cardsEl.appendChild(card);
  });
}

function refresh() { const list = filtered(); stats(locations); renderMarkers(list); renderCards(list); }
["f-search", "f-prov", "f-tipe", "f-tahun", "f-min", "f-max"].forEach((id) =>
  document.getElementById(id).addEventListener("input", refresh));

// ---- Modal ----
const modal = document.getElementById("detail-modal");
let curLoc = null, curPhotos = [], curIdx = 0;
function showPhoto(i) {
  curIdx = (i + curPhotos.length) % curPhotos.length;
  document.getElementById("m-photo").src = curPhotos[curIdx] || "";
  const dots = document.getElementById("m-dots"); dots.innerHTML = "";
  curPhotos.forEach((_, k) => { const d = document.createElement("span"); d.className = "dot" + (k === curIdx ? " active" : ""); dots.appendChild(d); });
}
document.getElementById("m-prev").onclick = () => showPhoto(curIdx - 1);
document.getElementById("m-next").onclick = () => showPhoto(curIdx + 1);
document.getElementById("m-close").onclick = () => { modal.classList.add("hidden"); history.replaceState(null, "", location.pathname); document.getElementById("m-video").src = ""; };
modal.addEventListener("click", (e) => { if (e.target === modal.firstElementChild) document.getElementById("m-close").click(); });
document.getElementById("m-share").onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); document.getElementById("m-share").textContent = "Link tersalin ✓"; setTimeout(() => (document.getElementById("m-share").textContent = "Salin link"), 1500); } catch {}
};

async function openModal(slugOrId) {
  const l = locations.find((x) => x.slug === slugOrId || x.id === slugOrId);
  if (!l) return;
  curLoc = l;
  document.getElementById("m-name").textContent = l.name;
  document.getElementById("m-sub").textContent = `${l.city || ""} ${l.province || ""}`.trim();
  document.getElementById("m-kwp").textContent = `${l.capacity_kwp} kWp`;
  document.getElementById("m-tipe").textContent = l.system_type || "-";
  document.getElementById("m-tahun").textContent = l.install_year || "-";
  document.getElementById("m-klien").textContent = l.client_name || "-";
  document.getElementById("m-desc").textContent = l.description || "";
  document.getElementById("m-coord").textContent = `${l.lat}, ${l.lng}`;
  const badges = document.getElementById("m-badges"); badges.innerHTML = "";
  [l.system_type, `${l.capacity_kwp} kWp`, String(l.install_year || "")].filter(Boolean).forEach((t) => {
    const s = document.createElement("span"); s.className = "badge badge-Hybrid"; s.textContent = t; badges.appendChild(s);
  });
  document.getElementById("m-route").href = `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`;
  curPhotos = [l.cover_url, ...(photosByLoc[l.id] || []).map((p) => p.url)].filter(Boolean);
  if (!curPhotos.length) curPhotos = ["./logo.svg"];
  showPhoto(0);
  const emb = ytEmbed(l.youtube_url);
  document.getElementById("m-video-wrap").classList.toggle("hidden", !emb);
  document.getElementById("m-video").src = emb;
  renderReviews(l.id);
  modal.classList.remove("hidden");
}
function renderReviews(locId) {
  const box = document.getElementById("m-reviews"); box.innerHTML = "";
  const list = reviewsByLoc[locId] || [];
  if (!list.length) { box.innerHTML = `<p class="text-xs text-slate-500">Belum ada review. Jadilah yang pertama!</p>`; return; }
  list.forEach((r) => {
    const d = document.createElement("div"); d.className = "bg-slate-50 rounded-lg p-2";
    const h = document.createElement("div"); h.className = "text-xs font-bold"; h.textContent = `${r.author_name} • ${"★".repeat(r.rating || 5)}`;
    const p = document.createElement("div"); p.className = "text-xs text-slate-600"; p.textContent = r.message;
    d.append(h, p); box.appendChild(d);
  });
}
document.getElementById("review-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const st = document.getElementById("r-status");
  const payload = {
    location_id: curLoc.id,
    author_name: document.getElementById("r-name").value.trim().slice(0, 60),
    rating: Number(document.getElementById("r-rating").value),
    message: document.getElementById("r-msg").value.trim().slice(0, 1000),
    is_approved: false,
  };
  if (!payload.author_name || !payload.message) return;
  if (!supabase) { st.textContent = "Mode demo: review tidak dikirim (Supabase belum dikonfigurasi)."; return; }
  st.textContent = "Mengirim…";
  const { error } = await supabase.from("reviews").insert(payload);
  st.textContent = error ? `Gagal: ${error.message}` : "Terima kasih! Review menunggu moderasi admin.";
  if (!error) e.target.reset();
});
window.addEventListener("hashchange", () => {
  const m = location.hash.match(/lokasi=(.+)/);
  if (m) openModal(decodeURIComponent(m[1]));
});

// ---- init ----
try {
  await loadData();
  fillFilters(); refresh();
  const m = location.hash.match(/lokasi=(.+)/);
  if (m) openModal(decodeURIComponent(m[1]));
} catch (err) {
  console.error(err);
  warnEl.classList.remove("hidden");
  warnEl.textContent = `Gagal memuat Supabase: ${err.message}. Cek config.js + RLS policy.`;
}
