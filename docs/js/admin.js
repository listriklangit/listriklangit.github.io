// docs/js/admin.js — panel admin: login + CRUD lokasi + map picker + upload + moderasi.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const PROVINSI = ["Aceh","Sumatera Utara","Sumatera Barat","Riau","Kepulauan Riau","Jambi","Sumatera Selatan","Kepulauan Bangka Belitung","Bengkulu","Lampung","Banten","DKI Jakarta","Jawa Barat","Jawa Tengah","DI Yogyakarta","Jawa Timur","Bali","Nusa Tenggara Barat","Nusa Tenggara Timur","Kalimantan Barat","Kalimantan Tengah","Kalimantan Selatan","Kalimantan Timur","Kalimantan Utara","Sulawesi Utara","Gorontalo","Sulawesi Tengah","Sulawesi Barat","Sulawesi Selatan","Sulawesi Tenggara","Maluku","Maluku Utara","Papua Barat","Papua","Papua Tengah","Papua Pegunungan","Papua Selatan","Papua Barat Daya"];
const provSel = document.getElementById("loc-prov");
PROVINSI.forEach((p) => { const o = document.createElement("option"); o.textContent = p; provSel.appendChild(o); });

if (SUPABASE_ANON_KEY.includes("PASTE")) {
  document.getElementById("login-status").textContent = "Isi dulu SUPABASE_URL + ANON_KEY di docs/js/config.js";
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Auth ----
const viewLogin = document.getElementById("view-login"), viewPanel = document.getElementById("view-panel");
async function refreshSession() {
  const { data } = await supabase.auth.getSession();
  const logged = !!data.session;
  viewLogin.classList.toggle("hidden", logged);
  viewPanel.classList.toggle("hidden", !logged);
  document.getElementById("btn-logout").classList.toggle("hidden", !logged);
  if (logged) { initPicker(); loadAll(); }
}
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const st = document.getElementById("login-status"); st.textContent = "Masuk…";
  const { error } = await supabase.auth.signInWithPassword({
    email: document.getElementById("login-email").value.trim(),
    password: document.getElementById("login-pass").value,
  });
  st.textContent = error ? `Gagal: ${error.message}` : "Berhasil!";
  refreshSession();
});
document.getElementById("btn-logout").onclick = async () => { await supabase.auth.signOut(); location.reload(); };

// ---- Tabs ----
document.querySelectorAll(".tab-btn").forEach((b) => (b.onclick = () => {
  document.querySelectorAll(".tab-btn").forEach((x) => x.classList.remove("active"));
  b.classList.add("active");
  ["lokasi", "tambah", "review"].forEach((t) => document.getElementById(`tab-${t}`).classList.toggle("hidden", t !== b.dataset.tab));
  if (b.dataset.tab === "tambah") setTimeout(() => picker && picker.invalidateSize(), 100);
}));

// ---- Map picker ----
let picker = null, pickerMarker = null;
function initPicker() {
  if (picker) return;
  picker = L.map("picker-map").setView([-2.5, 118], 5);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(picker);
  picker.on("click", (e) => {
    document.getElementById("loc-lat").value = e.latlng.lat.toFixed(6);
    document.getElementById("loc-lng").value = e.latlng.lng.toFixed(6);
    if (pickerMarker) pickerMarker.setLatLng(e.latlng);
    else pickerMarker = L.marker(e.latlng).addTo(picker);
  });
}

// ---- Compress + upload (jpg/png/webp, max 5MB, resize max 1600px q0.8) ----
function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return reject(new Error("Tipe file harus jpg/png/webp"));
    if (file.size > 5 * 1024 * 1024) return reject(new Error(`File ${file.name} > 5MB`));
    const img = new Image();
    img.onload = () => {
      const max = 1600; let { width: w, height: h } = img;
      if (Math.max(w, h) > max) { const r = max / Math.max(w, h); w = Math.round(w * r); h = Math.round(h * r); }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Compress gagal"))), "image/jpeg", 0.8);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("File bukan gambar valid"));
    img.src = URL.createObjectURL(file);
  });
}
async function uploadPhoto(blob, locId, kind) {
  const path = `${locId}/${kind}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("photos").getPublicUrl(path);
  return data.publicUrl;
}

// ---- CRUD lokasi ----
let allLocs = [];
async function loadAll() {
  const [{ data: locs }, { data: pending }] = await Promise.all([
    supabase.from("locations").select("*").order("created_at", { ascending: false }),
    supabase.from("reviews").select("id").eq("is_approved", false),
  ]);
  allLocs = locs || [];
  document.getElementById("review-count").textContent = (pending || []).length;
  renderTable(""); loadPending();
}
function renderTable(q) {
  const tb = document.getElementById("loc-rows"); tb.innerHTML = "";
  allLocs.filter((l) => !q || `${l.name} ${l.province} ${l.city || ""}`.toLowerCase().includes(q.toLowerCase())).forEach((l) => {
    const tr = document.createElement("tr"); tr.className = "border-b";
    const tdName = document.createElement("td"); tdName.className = "py-2 pr-2 font-semibold"; tdName.textContent = l.name;
    const tdP = document.createElement("td"); tdP.className = "pr-2"; tdP.textContent = l.province;
    const tdK = document.createElement("td"); tdK.className = "pr-2"; tdK.textContent = l.capacity_kwp;
    const tdT = document.createElement("td"); tdT.className = "pr-2"; tdT.textContent = l.install_year;
    const tdPub = document.createElement("td"); tdPub.className = "pr-2"; tdPub.textContent = l.is_published ? "Ya" : "Tidak";
    const tdA = document.createElement("td"); tdA.className = "flex gap-1 py-1";
    const bE = document.createElement("button"); bE.className = "border rounded px-2 py-0.5 text-xs font-bold"; bE.textContent = "Edit"; bE.onclick = () => fillForm(l);
    const bP = document.createElement("button"); bP.className = "border rounded px-2 py-0.5 text-xs"; bP.textContent = l.is_published ? "Unpublish" : "Publish";
    bP.onclick = async () => { await supabase.from("locations").update({ is_published: !l.is_published }).eq("id", l.id); loadAll(); };
    const bD = document.createElement("button"); bD.className = "border border-red-300 text-red-600 rounded px-2 py-0.5 text-xs"; bD.textContent = "Hapus";
    bD.onclick = async () => { if (confirm(`Hapus "${l.name}"?`)) { await supabase.from("locations").delete().eq("id", l.id); loadAll(); } };
    tdA.append(bE, bP, bD);
    tr.append(tdName, tdP, tdK, tdT, tdPub, tdA); tb.appendChild(tr);
  });
}
document.getElementById("admin-search").addEventListener("input", (e) => renderTable(e.target.value));

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80); }
function fillForm(l) {
  document.querySelector('[data-tab="tambah"]').click();
  for (const [id, v] of [["loc-id", l.id], ["loc-name", l.name], ["loc-slug", l.slug || ""], ["loc-city", l.city || ""], ["loc-lat", l.lat], ["loc-lng", l.lng], ["loc-kwp", l.capacity_kwp], ["loc-year", l.install_year], ["loc-client", l.client_name || ""], ["loc-desc", l.description || ""], ["loc-yt", l.youtube_url || ""]])
    document.getElementById(id).value = v ?? "";
  provSel.value = l.province; document.getElementById("loc-tipe").value = l.system_type;
  document.getElementById("loc-pub").checked = !!l.is_published;
  if (picker) { picker.setView([l.lat, l.lng], 10); if (pickerMarker) pickerMarker.setLatLng([l.lat, l.lng]); else pickerMarker = L.marker([l.lat, l.lng]).addTo(picker); }
  loadEditPhotos(l.id);
}
async function loadEditPhotos(locId) {
  const box = document.getElementById("edit-photos"); box.innerHTML = "Memuat foto…";
  const { data } = await supabase.from("photos").select("*").eq("location_id", locId).order("sort_order");
  box.innerHTML = `<div class="font-bold text-xs">Foto tambahan (${(data || []).length})</div>`;
  (data || []).forEach((p) => {
    const row = document.createElement("div"); row.className = "flex items-center gap-2 bg-slate-50 rounded-lg p-1.5";
    const im = document.createElement("img"); im.src = p.url; im.className = "w-14 h-10 object-cover rounded";
    const cap = document.createElement("span"); cap.className = "flex-1 truncate"; cap.textContent = p.caption || p.url.split("/").pop();
    const del = document.createElement("button"); del.className = "text-red-600 font-bold"; del.textContent = "Hapus";
    del.onclick = async () => { await supabase.from("photos").delete().eq("id", p.id); loadEditPhotos(locId); };
    row.append(im, cap, del); box.appendChild(row);
  });
}
document.getElementById("form-reset").onclick = () => document.getElementById("loc-form").reset();
document.getElementById("loc-name").addEventListener("input", (e) => {
  if (!document.getElementById("loc-id").value) document.getElementById("loc-slug").value = slugify(e.target.value);
});

document.getElementById("loc-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const st = document.getElementById("form-status"); st.textContent = "Menyimpan…";
  try {
    const id = document.getElementById("loc-id").value || undefined;
    const row = {
      name: document.getElementById("loc-name").value.trim(),
      slug: document.getElementById("loc-slug").value.trim() || slugify(document.getElementById("loc-name").value),
      province: provSel.value, city: document.getElementById("loc-city").value.trim(),
      lat: Number(document.getElementById("loc-lat").value), lng: Number(document.getElementById("loc-lng").value),
      capacity_kwp: Number(document.getElementById("loc-kwp").value),
      system_type: document.getElementById("loc-tipe").value,
      install_year: Number(document.getElementById("loc-year").value),
      client_name: document.getElementById("loc-client").value.trim(),
      description: document.getElementById("loc-desc").value.trim(),
      youtube_url: document.getElementById("loc-yt").value.trim(),
      is_published: document.getElementById("loc-pub").checked,
    };
    let locId = id;
    if (id) {
      const { error } = await supabase.from("locations").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("locations").insert(row).select("id").single();
      if (error) throw error;
      locId = data.id;
    }
    // cover
    const coverFile = document.getElementById("loc-cover").files[0];
    if (coverFile) {
      const url = await uploadPhoto(await compressImage(coverFile), locId, "cover");
      await supabase.from("locations").update({ cover_url: url }).eq("id", locId);
    }
    // foto tambahan
    for (const f of document.getElementById("loc-photos").files) {
      const url = await uploadPhoto(await compressImage(f), locId, "photo");
      await supabase.from("photos").insert({ location_id: locId, url });
    }
    st.textContent = "Tersimpan ✓";
    e.target.reset(); document.getElementById("loc-id").value = "";
    loadAll();
  } catch (err) { st.textContent = `Gagal: ${err.message}`; }
});

// ---- Moderasi review ----
async function loadPending() {
  const box = document.getElementById("pending-reviews"); box.innerHTML = "Memuat…";
  const { data } = await supabase.from("reviews").select("*, locations(name)").eq("is_approved", false).order("created_at", { ascending: false });
  box.innerHTML = "";
  if (!data?.length) { box.innerHTML = `<p class="text-xs text-slate-500">Tidak ada review menunggu. Semua sudah dimoderasi ✓</p>`; return; }
  data.forEach((r) => {
    const d = document.createElement("div"); d.className = "border rounded-xl p-3";
    const h = document.createElement("div"); h.className = "text-xs font-bold"; h.textContent = `${r.author_name} • ${"★".repeat(r.rating)} → ${r.locations?.name || r.location_id}`;
    const p = document.createElement("p"); p.className = "text-sm mt-1"; p.textContent = r.message;
    const row = document.createElement("div"); row.className = "flex gap-2 mt-2";
    const ok = document.createElement("button"); ok.className = "bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-lg"; ok.textContent = "Approve";
    ok.onclick = async () => { await supabase.from("reviews").update({ is_approved: true }).eq("id", r.id); loadAll(); };
    const del = document.createElement("button"); del.className = "border border-red-300 text-red-600 text-xs px-3 py-1 rounded-lg"; del.textContent = "Hapus";
    del.onclick = async () => { await supabase.from("reviews").delete().eq("id", r.id); loadAll(); };
    row.append(ok, del); d.append(h, p, row); box.appendChild(d);
  });
}

refreshSession();
