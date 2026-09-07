import fs from 'fs';

const confirmed = JSON.parse(fs.readFileSync('scratch/confirmed-future-reservations.json', 'utf8'));

// Group by room / accommodation
const byAccommodation = {};
for (const r of confirmed) {
  // roomName or product or pmsProduct
  const accKey = r.roomName || r.product;
  if (!byAccommodation[accKey]) byAccommodation[accKey] = [];
  byAccommodation[accKey].push({
    id: r.id,
    guest: `${r.firstName} ${r.lastName}`,
    channel: r.channelName,
    checkin: r.checkin?.slice(0, 10),
    checkout: r.checkout?.slice(0, 10),
    product: r.product,
    roomName: r.roomName,
    created: r.createTime
  });
}

console.log('=== VERIFICA SOVRAPPOSIZIONI / OVERBOOKING PER ALLOGGIO ===');
let foundOverbooking = false;

for (const [acc, list] of Object.entries(byAccommodation)) {
  list.sort((a, b) => (a.checkin > b.checkin ? 1 : -1));
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const r1 = list[i];
      const r2 = list[j];
      // Check if [r1.checkin, r1.checkout] overlaps with [r2.checkin, r2.checkout]
      // Overlap if r1.checkin < r2.checkout && r2.checkin < r1.checkout
      if (r1.checkin < r2.checkout && r2.checkin < r1.checkout) {
        foundOverbooking = true;
        console.log(`\n🚨 OVERBOOKING RILEVATO SU: ${acc}`);
        console.log(`   Prenotazione 1: ID ${r1.id} | ${r1.guest} | ${r1.channel} | ${r1.checkin} -> ${r1.checkout} (Creata: ${r1.created})`);
        console.log(`   Prenotazione 2: ID ${r2.id} | ${r2.guest} | ${r2.channel} | ${r2.checkin} -> ${r2.checkout} (Creata: ${r2.created})`);
      }
    }
  }
}

if (!foundOverbooking) {
  console.log('Nessun overbooking rilevato all\'interno dello stesso alloggio su future reservations confermate.');
}
