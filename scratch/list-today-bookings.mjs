import fs from 'fs';

const confirmed = JSON.parse(fs.readFileSync('scratch/confirmed-future-reservations.json', 'utf8'));

const todayBookings = confirmed.filter(r => (r.createTime || '').startsWith('2026-09-05') || (r.createTime || '').startsWith('2026-09-04') || (r.createTime || '').startsWith('2026-09-03'));

console.log(`=== PRENOTAZIONI FUTURE CONFERMATE CREATE IL 3, 4 E 5 SETTEMBRE 2026 (${todayBookings.length}) ===`);
for (const r of todayBookings) {
  console.log(`\n📌 ID: ${r.id}`);
  console.log(`   Canale: ${r.channelName}`);
  console.log(`   Camera / Prodotto: ${r.roomName} (${r.product})`);
  console.log(`   Ospite: ${r.firstName} ${r.lastName}`);
  console.log(`   Periodo: ${r.checkin?.slice(0, 10)} -> ${r.checkout?.slice(0, 10)}`);
  console.log(`   Totale: ${r.totalGross} THB`);
  console.log(`   Creato il: ${r.createTime}`);
}
