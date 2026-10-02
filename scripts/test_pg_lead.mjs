// Uji aturan T2 Leadership (opsi A, 2026-10-01) — jalankan: node scripts/test_pg_lead.mjs
import { readFileSync } from 'fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// --- extractor statement "var NAME = {...};" dengan brace matching sadar-string ---
function extractStmt(s, startMarker) {
  const i = s.indexOf(startMarker);
  if (i < 0) throw new Error('marker tidak ketemu: ' + startMarker);
  const b0 = s.indexOf('{', i);
  let depth = 0, inStr = null;
  for (let j = b0; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (c === inStr && s[j - 1] !== '\\') inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return s.slice(i, s.indexOf(';', j) + 1); }
  }
  throw new Error('tidak ketemu akhir statement: ' + startMarker);
}
const dataStmt = extractStmt(src, 'var DATA =');
const piketStmt = extractStmt(src, 'var PIKET =');
const gi = src.indexOf('function guruGender');
const guruGenderStmt = src.slice(gi, src.indexOf('\n', gi));
const pgBlock = src.slice(src.indexOf('var pgTL='), src.indexOf('function pgNorm('));
const aiTT = src.slice(src.indexOf('function aiTierText'), src.indexOf('function aiFactsPengganti'));

const prelude = dataStmt + '\n' + piketStmt + '\n' + guruGenderStmt + `
var order=DATA.order, teachers=DATA.teachers, days=DATA.days, dayId=DATA.day_id, validByDay=DATA.valid_lessons_by_day;
var pgAbsenPick={}, pgAbsenList=[], pgDSel=null, pgJamLst={}, pgBlok={}, pgSEL={}, pgParsial={}, pgOff={};
` + '\n' + pgBlock + '\n' + aiTT;
// jalankan di scope global lalu ambil lewat globalThis
(0, eval)(prelude + `
globalThis.__T = { order, teachers, guruGender, pgGenderGuru, pgRecBlok, pgRecPenuh, pgChip, pgRowChips,
  pgBuildBlok, pgJamMengajar, pgIsLead, pgLonggar, aiTierText, pgLT, pgAbsenList, pgDSel, pgJamLst, pgBlok, pgSEL, pgParsial,
  pgBisaGanti, pgAbsenJams, pgLonggarPenuhR,
  set(absen,d){ pgAbsenList=absen.slice(); pgDSel=d;
    [pgJamLst,pgBlok,pgSEL,pgParsial,pgOff].forEach(function(o){ Object.keys(o).forEach(function(k){ delete o[k]; }); }); },
  blokOf(g,d){ pgJamLst[g]=pgJamMengajar(g,d); pgBlok[g]=pgBuildBlok(g,d,pgJamLst[g]); pgSEL[g]={}; return pgBlok[g]; } };
`);
const T = globalThis.__T;
const { teachers, pgLT, pgRecBlok, pgRecPenuh, pgChip, pgIsLead, aiTierText } = T;
const G = T.guruGender;

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  GAGAL: ' + msg); } };
const SESI = { 'Leadership 7': 'Monday', 'Leadership 8': 'Tuesday', 'Leadership 9': 'Wednesday' };

// === UJI 1: 45 kasus absen tunggal — T2 tidak pernah kosong, list tak pernah kosong ===
console.log('UJI 1: absen tunggal semua guru Leadership');
for (const [kelas, day] of Object.entries(SESI)) {
  for (const g of pgLT[kelas]) {
    T.set([g], day);
    const bl = T.blokOf(g, day).find(pgIsLead);
    ok(!!bl, g + ' punya blok Leadership di ' + day);
    const rr = pgRecBlok(g, day, bl.jams, kelas, g, bl.key);
    const timSameGender = pgLT[kelas].filter(n => n !== g && G(n) === G(g));
    ok(rr.lead === true, g + ': flag lead');
    ok(rr.t2a.length === timSameGender.length, g + ': T2=' + rr.t2a.length + ' = tim segender=' + timSameGender.length);
    ok(rr.t2a.length > 0, g + ': T2 TIDAK kosong');
    ok(!rr.t2a.includes(g), g + ': dirinya tidak masuk T2');
    ok((rr.t1.length + rr.t2a.length) > 0, g + ': list total tidak kosong');
    ok(rr.t1.every(n => G(n) === G(g) && pgLT[kelas].indexOf(n) === -1), g + ': T1 semua segender & di luar tim');
    ok(rr.t2a.every(n => G(n) === G(g) && pgLT[kelas].includes(n)), g + ': T2 semua segender & anggota tim');
    const idxBusy = rr.t2a.findIndex(n => bl.jams.every(j => !!teachers[n].cells[day + '|' + j]));
    if (idxBusy > -1) ok(rr.t2a.slice(0, idxBusy).every(n => bl.jams.every(j => !teachers[n].cells[day + '|' + j])), g + ': sort longgar-duluan');
  }
}

// === UJI 2: batch Senin 6 putra — dulu KOSONG TOTAL utk 3 guru L7 ===
console.log('UJI 2: batch Senin 6 putra');
const batch = ['Mr Ifan', 'Mr Musfiq', 'Mr Sharih', 'Mr Amar', 'Mr Jack', 'Mr Hang'];
T.set(batch, 'Monday');
for (const g of batch.filter(x => pgLT['Leadership 7'].includes(x))) {
  const bl = T.blokOf(g, 'Monday').find(pgIsLead);
  const rr = pgRecBlok(g, 'Monday', bl.jams, 'Leadership 7', g, bl.key);
  ok(rr.t2a.length > 0, g + ': T2 tidak kosong (dulu KOSONG TOTAL) -> ' + rr.t2a.join(', '));
  ok(!rr.t2a.some(n => batch.includes(n)), g + ': sesama batch tidak masuk kandidat');
}

// === UJI 3: chip — sibuk vs longgar ===
console.log('UJI 3: pgChip tandai sibuk/longgar');
T.set(['Mr Ifan'], 'Tuesday');
const blI = T.blokOf('Mr Ifan', 'Tuesday').find(pgIsLead);
const rrI = pgRecBlok('Mr Ifan', 'Tuesday', blI.jams, 'Leadership 8', 'Mr Ifan', blI.key);
const sibuk = rrI.t2a.find(n => blI.jams.every(j => !!teachers[n].cells['Tuesday|' + j]));
ok(!!sibuk, 'ada anggota tim yg sibuk utk dites');
const chipBusy = pgChip('Mr Ifan', sibuk, blI.key);
ok(chipBusy.includes('· sibuk'), 'chip sibuk ada "· sibuk" -> ' + chipBusy);
ok(!chipBusy.includes('pg-free'), 'chip sibuk tanpa ✓');
ok(chipBusy.includes('pg-selected') === false, 'chip belum terpilih');
const chipT1 = pgChip('Mr Ifan', rrI.t1[0], blI.key);
ok(chipT1.includes('pg-free'), 'chip T1 ada ✓ -> ' + chipT1);
// ✓ T1 harus berbasis jam blok (bukan semua jam guru absen)
ok(chipT1.includes(blI.jams.join(',') ), 'chip T1 menampilkan jam blok -> ' + chipT1);

// === UJI 4: reservasi lintas guru dihormati di T1 ===
console.log('UJI 4: reservasi lintas-guru');
T.set(['Mr Ifan', 'Mr Jack'], 'Tuesday');
T.blokOf('Mr Ifan', 'Tuesday'); T.blokOf('Mr Jack', 'Tuesday');
const blJ = T.pgBlok['Mr Jack'].find(pgIsLead);
const rrJ1 = pgRecBlok('Mr Jack', 'Tuesday', blJ.jams, 'Leadership 8', 'Mr Jack', blJ.key);
if (rrJ1.t1.length > 0) {
  const dipilih = rrJ1.t1[0];
  T.pgSEL['Mr Jack'][blJ.key] = dipilih;
  const blK = T.pgBlok['Mr Ifan'].find(pgIsLead);
  const rrJ2 = pgRecBlok('Mr Ifan', 'Tuesday', blK.jams, 'Leadership 8', 'Mr Ifan', blK.key);
  ok(!rrJ2.t1.includes(dipilih), dipilih + ' yang sudah direservasi tidak masuk T1 guru lain');
}

// === UJI 5: regresi blok KBM biasa ===
console.log('UJI 5: regresi blok KBM biasa');
T.set(['Mr Hang'], 'Saturday');
const bloks = T.blokOf('Mr Hang', 'Saturday');
ok(bloks.length > 0, 'Mr Hang Sabtu punya blok');
let semuaBiasa = true;
bloks.forEach(b => { const rr = pgRecBlok('Mr Hang', 'Saturday', b.jams, pgIsLead(b) ? b.kelas : null, 'Mr Hang', b.key); if (rr.lead) semuaBiasa = false; });
ok(semuaBiasa, 'blok Sabtu Mr Hang tidak salah terdeteksi lead');
// self-exclusion batch pada blok biasa
T.set(['Mr Hang', 'Mr Amar'], 'Saturday');
T.blokOf('Mr Hang', 'Saturday'); T.blokOf('Mr Amar', 'Saturday');
T.pgBlok['Mr Hang'].forEach(b => {
  const rr = pgRecBlok('Mr Hang', 'Saturday', b.jams, null, 'Mr Hang', b.key);
  ok(!rr.t1.includes('Mr Amar') && !rr.t2a.includes('Mr Amar') && !rr.t2b.includes('Mr Amar') && !rr.t3.includes('Mr Amar'), 'Mr Amar (absen) tidak jadi kandidat Mr Hang');
});

// === UJI 6: aiTierText menandai (sibuk) ===
console.log('UJI 6: aiTierText (sibuk)');
T.set(['Mr Ifan'], 'Tuesday');
const bl6 = T.blokOf('Mr Ifan', 'Tuesday').find(pgIsLead);
const rr6 = pgRecBlok('Mr Ifan', 'Tuesday', bl6.jams, 'Leadership 8', 'Mr Ifan', bl6.key);
const txt = aiTierText(rr6, 'Tuesday', bl6.jams);
ok(/\(sibuk\)/.test(txt), 'teks AI memuat (sibuk) -> ' + txt.split('\n').find(l => l.startsWith('T2')));
T.set(['Ms Dila'], 'Monday');
const txtBiasa = aiTierText(pgRecPenuh('Ms Dila', 'Monday', [4], 'Ms Dila', null), 'Monday', [4]);
ok(!txtBiasa.includes('(sibuk)'), 'teks AI blok biasa tanpa (sibuk)');

// === UJI 7: chip ALL (kartu emas) ===
console.log('UJI 7: chip ALL (kartu emas)');
T.set(['Mr Hang'], 'Saturday');
T.blokOf('Mr Hang', 'Saturday');
const pf = pgRecPenuh('Mr Hang', 'Saturday', T.pgJamLst['Mr Hang'], 'Mr Hang', null);
if (pf.t1.length) { const c = pgChip('Mr Hang', pf.t1[0], 'ALL'); ok(c.includes("'ALL'"), 'chip ALL memakai kunci ALL'); }

// === UJI 8: absen parsial (v5.9.0) — guru berhalangan yg HADIR SEBAGIAN ikut jadi kandidat ===
console.log('UJI 8: absen parsial -> guru absen jadi kandidat utk guru lain di jam longgarnya');
const semua = rr => [].concat(rr.t1, rr.t2a, rr.t2b, rr.t3);
let fiks = null;
outer8:
for (const d of DATA.days) {
  for (const X of T.order) {
    const jmX = T.pgJamMengajar(X, d);
    if (!jmX.length || T.pgBuildBlok(X, d, jmX).length < 2) continue;
    for (const Y of T.order) {
      if (Y === X || !T.pgJamMengajar(Y, d).length) continue;
      const bY = T.pgBuildBlok(Y, d, T.pgJamMengajar(Y, d)).find(b => !pgIsLead(b) && b.jams.every(j => !teachers[X].cells[d + '|' + j]));
      const bY2 = T.pgBuildBlok(Y, d, T.pgJamMengajar(Y, d)).find(b => !pgIsLead(b) && b.jams.some(j => !!teachers[X].cells[d + '|' + j]));
      if (bY && bY2) { fiks = { d, X, Y, bY, bY2, bX: T.pgBuildBlok(X, d, jmX)[0] }; break outer8; }
    }
  }
}
ok(!!fiks, 'ketemu fixture absen-parsial (X longgar & mengajar di blok2 berbeda milik Y)');
if (fiks) {
  const { d, X, Y, bY, bY2, bX } = fiks;
  // (a) X absen SEHARI PENUH -> tetap bukan kandidat (perilaku lama terjaga)
  T.set([Y, X], d);
  T.blokOf(Y, d); T.blokOf(X, d);
  let rr = pgRecBlok(Y, d, bY.jams, null, Y, bY.key);
  ok(!semua(rr).includes(X), X + ' absen sehari penuh TIDAK jadi kandidat ' + Y);
  // (b) X hadir SEBAGIAN (simulasi pgJamLanjut: cuma blok pertama X yg diganti) -> masuk kandidat
  T.pgJamLst[X] = bX.jams.slice(); T.pgBlok[X] = T.pgBuildBlok(X, d, bX.jams); T.pgSEL[X] = {};
  T.pgParsial[X] = true;
  rr = pgRecBlok(Y, d, bY.jams, null, Y, bY.key);
  ok(semua(rr).includes(X), X + ' hadir sebagian -> jadi kandidat di blok ' + bY.key + ' (longgar semua jamnya)');
  // (c) ... tapi tidak di jam yang X MENGAJAR
  rr = pgRecBlok(Y, d, bY2.jams, null, Y, bY2.key);
  ok(!semua(rr).includes(X), X + ' TIDAK jadi kandidat di blok ' + bY2.key + ' (jam itu dia mengajar)');
}

// === UJI 9: kandidat parsial tetap tunduk reservasi lintas-guru ===
console.log('UJI 9: reservasi — sub yang sudah dipakai guru lain tidak muncul lagi di jam sama');
let f9 = null;
outer9:
for (const d of DATA.days) {
  for (const X of T.order) {
    if (!T.pgJamMengajar(X, d).length) continue;
    for (const Y of T.order) {
      if (Y === X || !T.pgJamMengajar(Y, d).length) continue;
      const bY = T.pgBuildBlok(Y, d, T.pgJamMengajar(Y, d)).find(b => !pgIsLead(b) && b.jams.every(j => !teachers[X].cells[d + '|' + j]));
      if (!bY) continue;
      for (const Z of T.order) {
        if (Z === X || Z === Y || !T.pgJamMengajar(Z, d).length) continue;
        const bZ = T.pgBuildBlok(Z, d, T.pgJamMengajar(Z, d)).find(b => !pgIsLead(b) &&
          b.jams.some(j => bY.jams.includes(j)) && b.jams.every(j => !teachers[X].cells[d + '|' + j]));
        if (bZ) { f9 = { d, X, Y, Z, bY, bZ }; break outer9; }
      }
    }
  }
}
ok(!!f9, 'ketemu fixture reservasi (bY & bZ beririsan jam, X longgar di keduanya)');
if (f9) {
  const { d, X, Y, Z, bY, bZ } = f9;
  T.set([Y, Z], d);
  T.blokOf(Y, d); T.blokOf(Z, d);
  T.pgSEL[Y][bY.key] = X; // Y memakai X di blok bY
  const rr = pgRecBlok(Z, d, bZ.jams, null, Z, bZ.key);
  ok(!semua(rr).includes(X), X + ' sudah cover ' + Y + ' di jam ' + bY.key + ' -> tidak muncul utk blok ' + bZ.key + ' milik ' + Z);
}

// === UJI 10: anggota tim Leadership yg absen parsial di T2 ===
console.log('UJI 10: anggota tim Leadership absen parsial — tampil di T2 kecuali absennya menutup blok rapat');
for (const [kelas, day] of Object.entries(SESI)) {
  const tim = pgLT[kelas];
  if (tim.length < 2) continue;
  const g = tim[0], m = tim[1];
  T.set([g, m], day);
  const blG = T.blokOf(g, day).find(pgIsLead);
  const bloksM = T.pgBuildBlok(m, day, T.pgJamMengajar(m, day));
  const blMlead = bloksM.find(pgIsLead);
  const blMlain = bloksM.find(b => !pgIsLead(b));
  // (a) absen SEHARI PENUH -> tidak tampil di T2 (memang tidak di sekolah)
  T.blokOf(m, day); T.pgParsial[m] = false;
  let rr = pgRecBlok(g, day, blG.jams, kelas, g, blG.key);
  ok(!rr.t2a.includes(m), kelas + ': ' + m + ' absen sehari penuh tidak di T2');
  // (b) absen parsial di blok NON-rapat -> tetap tampil di T2 (dia hadir di jam rapat)
  if (blMlain) {
    T.pgJamLst[m] = blMlain.jams.slice(); T.pgBlok[m] = T.pgBuildBlok(m, day, blMlain.jams); T.pgSEL[m] = {};
    T.pgParsial[m] = true;
    rr = pgRecBlok(g, day, blG.jams, kelas, g, blG.key);
    ok(rr.t2a.includes(m), kelas + ': ' + m + ' absen parsial (blok ' + blMlain.key + ') tetap di T2');
  }
  // (c) absen tepat di blok rapat leadership-nya -> tidak tampil (sedang pergi)
  if (blMlead) {
    T.pgJamLst[m] = blMlead.jams.slice(); T.pgBlok[m] = T.pgBuildBlok(m, day, blMlead.jams); T.pgSEL[m] = {};
    T.pgParsial[m] = true;
    rr = pgRecBlok(g, day, blG.jams, kelas, g, blG.key);
    ok(!rr.t2a.includes(m), kelas + ': ' + m + ' absen di jam rapat leadership (' + blMlead.key + ') tidak di T2');
  }
}

console.log('\nHASIL: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
