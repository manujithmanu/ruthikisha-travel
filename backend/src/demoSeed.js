import { sha256 } from './lib/security.js'

const busNames = [
  'Ruthikisha Horizon', 'Ruthikisha Vista', 'Ruthikisha Breeze', 'Ruthikisha Classic', 'Ruthikisha Comfort',
  'Ruthikisha Royal', 'Ruthikisha Express', 'Ruthikisha Premium', 'Kerala Connect', 'Kerala Express',
  'South India Travels', 'South India Express', 'Royal Roadways', 'City Rider', 'Metro Connect',
  'Coastal Express', 'Malabar Express', 'Western Ghats', 'Southern Star', 'GreenLine Travels',
  'Night Rider', 'Grand South', 'Travel King', 'Comfort Ride', 'Highway Star', 'Golden Route',
  'BlueLine Travels', 'SilverLine Travels', 'Orange Express', 'RedLine Travels', 'Coastline Cruiser',
  'Deccan Link', 'Palm Route', 'Monsoon Rider', 'Silver Coast', 'Hill Country Express',
  'Starway Travels', 'Emerald Coach', 'Sunrise Express', 'Moonlight Travels',
]
const capacities = [36, 40, 40, 36, 32, 48, 45, 40, 36, 48, 40, 36, 32, 40, 45, 36, 40, 48, 36, 40, 32, 45, 40, 36, 48, 40, 36, 45, 40, 32, 48, 36, 40, 45, 36, 40, 48, 32, 40, 45]
const busTypes = ['AC Sleeper', 'AC Seater', 'Volvo-style AC', 'Non-AC Seater', 'Sleeper', 'Semi Sleeper']
const departureTimes = ['05:30', '07:00', '09:30', '12:00', '18:00', '20:00', '21:30', '22:30', '23:00']
const travelOffsets = [0, 1, 2, 7, 14, 30]
const customers = [
  'Arun Kumar', 'Meera Nair', 'Karthik Raj', 'Divya Menon', 'Praveen Kumar', 'Ananya Iyer',
  'Suresh Babu', 'Lakshmi Devi', 'Rahul Varma', 'Nithya Krishnan', 'Vignesh Selvam', 'Aparna Das',
  'Mohan Raj', 'Kavya Reddy', 'Deepak Nair', 'Sneha Thomas', 'Santhosh Pillai', 'Pooja Sharma',
  'Hari Prasad', 'Revathi S', 'Manoj Mathew', 'Keerthana M', 'Ramesh Babu', 'Fathima Ali',
  'Sanjay Kumar', 'Anjali Menon', 'Gokul Krishnan', 'Swathi R', 'Naveen Joseph', 'Indira Devi',
]
const passengerNames = ['Adithya Kumar', 'Malavika Nair', 'Sanjana Raj', 'Nikhil Menon', 'Keerthi Iyer', 'Abin Thomas', 'Varun Das', 'Riya Mathew']

// Every route is directed; both directions are listed where the demo network supports them.
const routes = [
  ['Kochi', 'Chennai', 690, 660, ['Aluva', 'Thrissur', 'Palakkad', 'Salem', 'Villupuram']],
  ['Chennai', 'Kochi', 690, 660, ['Villupuram', 'Salem', 'Palakkad', 'Thrissur', 'Aluva']],
  ['Kochi', 'Coimbatore', 190, 300, ['Aluva', 'Thrissur', 'Palakkad']],
  ['Coimbatore', 'Kochi', 190, 300, ['Palakkad', 'Thrissur', 'Aluva']],
  ['Kochi', 'Bangalore', 550, 600, ['Thrissur', 'Palakkad', 'Coimbatore', 'Salem', 'Hosur']],
  ['Bangalore', 'Kochi', 550, 600, ['Hosur', 'Salem', 'Coimbatore', 'Palakkad', 'Thrissur']],
  ['Aluva', 'Bangalore', 540, 600, ['Thrissur', 'Palakkad', 'Coimbatore', 'Salem', 'Hosur']],
  ['Bangalore', 'Aluva', 540, 600, ['Hosur', 'Salem', 'Coimbatore', 'Palakkad', 'Thrissur']],
  ['Bangalore', 'Chennai', 350, 390, ['Hosur', 'Krishnagiri', 'Vellore', 'Sriperumbudur']],
  ['Chennai', 'Bangalore', 350, 390, ['Sriperumbudur', 'Vellore', 'Krishnagiri', 'Hosur']],
  ['Bangalore', 'Coimbatore', 360, 420, ['Hosur', 'Krishnagiri', 'Dharmapuri', 'Salem']],
  ['Coimbatore', 'Bangalore', 360, 420, ['Salem', 'Dharmapuri', 'Krishnagiri', 'Hosur']],
  ['Coimbatore', 'Chennai', 510, 540, ['Salem', 'Villupuram', 'Tindivanam']],
  ['Chennai', 'Coimbatore', 510, 540, ['Tindivanam', 'Villupuram', 'Salem']],
  ['Coimbatore', 'Madurai', 215, 240, ['Pollachi', 'Palani', 'Dindigul']],
  ['Madurai', 'Coimbatore', 215, 240, ['Dindigul', 'Palani', 'Pollachi']],
  ['Chennai', 'Madurai', 460, 480, ['Villupuram', 'Trichy', 'Dindigul']],
  ['Madurai', 'Chennai', 460, 480, ['Dindigul', 'Trichy', 'Villupuram']],
  ['Kochi', 'Madurai', 270, 360, ['Aluva', 'Munnar', 'Theni']],
  ['Madurai', 'Kochi', 270, 360, ['Theni', 'Munnar', 'Aluva']],
  ['Thrissur', 'Bangalore', 450, 510, ['Palakkad', 'Coimbatore', 'Salem', 'Hosur']],
  ['Bangalore', 'Thrissur', 450, 510, ['Hosur', 'Salem', 'Coimbatore', 'Palakkad']],
  ['Calicut', 'Bangalore', 360, 420, ['Kozhikode', 'Wayanad', 'Mysore']],
  ['Bangalore', 'Calicut', 360, 420, ['Mysore', 'Wayanad', 'Kozhikode']],
  ['Trivandrum', 'Kochi', 200, 300, ['Kollam', 'Alappuzha', 'Cherthala']],
  ['Kochi', 'Trivandrum', 200, 300, ['Cherthala', 'Alappuzha', 'Kollam']],
  ['Trivandrum', 'Coimbatore', 390, 480, ['Kollam', 'Kottayam', 'Kumily', 'Palani']],
  ['Coimbatore', 'Trivandrum', 390, 480, ['Palani', 'Kumily', 'Kottayam', 'Kollam']],
  ['Chennai', 'Salem', 340, 360, ['Vellore', 'Krishnagiri', 'Dharmapuri']],
  ['Salem', 'Chennai', 340, 360, ['Dharmapuri', 'Krishnagiri', 'Vellore']],
  ['Chennai', 'Trichy', 330, 330, ['Villupuram', 'Tindivanam', 'Perambalur']],
  ['Trichy', 'Chennai', 330, 330, ['Perambalur', 'Tindivanam', 'Villupuram']],
  ['Coimbatore', 'Salem', 165, 180, ['Avinashi', 'Tiruppur', 'Erode']],
  ['Salem', 'Coimbatore', 165, 180, ['Erode', 'Tiruppur', 'Avinashi']],
]

const ratePerKm = (type) => type === 'Volvo-style AC' ? 3.2 : type === 'AC Sleeper' ? 2.65 : type === 'AC Seater' ? 2.15 : type === 'Sleeper' ? 1.95 : type === 'Semi Sleeper' ? 1.8 : 1.55
const money = (value) => Math.max(399, Math.round(value / 50) * 50)
const seatType = (type) => /sleeper/i.test(type) ? 'SLEEPER' : 'STANDARD'
const seatLayoutFor = (total) => {
  const columns = total === 45 ? 5 : 4
  return { rows: total / columns, columns, aisleAfter: 2, seats: Array.from({ length: total }, (_, index) => ({ seatNumber: String(index + 1).padStart(2, '0'), seatType: 'STANDARD', active: true, row: Math.floor(index / columns) + 1, column: (index % columns) + 1 })) }
}
const arrivalTime = (departure, duration) => {
  const [hour, minute] = departure.split(':').map(Number)
  const minutes = (hour * 60 + minute + duration) % 1440
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

async function ensureBus(query, index) {
  let busNumber = index < 5 ? `RT-${101 + index}` : `DEMO-RT-${String(index + 1).padStart(3, '0')}`
  let registrationNumber = index < 5 ? `TN-38-AB-${4101 + index}` : `TN-DEMO-${String(4100 + index + 1).padStart(5, '0')}`
  const totalSeats = capacities[index]
  const type = busTypes[index % busTypes.length]
  const layout = seatLayoutFor(totalSeats)
  if (index < 5) {
    const legacy = await query('SELECT id,name,registration_number FROM buses WHERE bus_number=$1', [busNumber])
    if (legacy.rowCount && (legacy.rows[0].name !== busNames[index] || legacy.rows[0].registration_number !== registrationNumber)) {
      busNumber = `DEMO-RT-${String(index + 1).padStart(3, '0')}`
      registrationNumber = `TN-DEMO-${String(4100 + index + 1).padStart(5, '0')}`
    } else if (legacy.rowCount) {
      await query('UPDATE buses SET type=$1,total_seats=$2,seat_layout=$3,amenities=$4,active=true,updated_at=now() WHERE id=$5', [busTypes[index % busTypes.length], totalSeats, JSON.stringify(layout), JSON.stringify(['Air conditioning', 'USB charging', 'Reading lights', 'Live tracking']), legacy.rows[0].id])
    }
  }
  const result = await query(`INSERT INTO buses(name,bus_number,registration_number,type,total_seats,seat_layout,amenities,photo_path,active)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,true) ON CONFLICT(bus_number) DO NOTHING RETURNING id`, [busNames[index], busNumber, registrationNumber, type, totalSeats, JSON.stringify(layout), JSON.stringify(['Air conditioning', 'USB charging', 'Reading lights', 'Live tracking']), `/images/WhatsApp%20Image%202026-09-29%20at%209.20.04%20AM.jpeg`])
  const found = result.rows[0] || (await query('SELECT id FROM buses WHERE bus_number=$1', [busNumber])).rows[0]
  if (!found) throw new Error(`Could not provision demo bus ${busNumber}`)
  const id = found.id
  if (busNumber.startsWith('DEMO-')) await query('UPDATE buses SET active=true WHERE id=$1', [id])
  await query(`INSERT INTO bus_seats(bus_id,seat_number,seat_type,active)
    SELECT $1, seat.seat_number, seat.seat_type, true FROM jsonb_to_recordset($2::jsonb) AS seat(seat_number text, seat_type text)
    ON CONFLICT(bus_id,seat_number) DO NOTHING`, [id, JSON.stringify(layout.seats.map((seat) => ({ seat_number: seat.seatNumber, seat_type: seatType(type) })))])
  return { id, type, totalSeats }
}

async function ensureRoute(query, route) {
  const [from, to, distance, duration, stops] = route
  const inserted = await query(`INSERT INTO routes(from_city,to_city,route_name,stops,distance_km,estimated_duration_minutes,active)
    VALUES($1,$2,$3,$4,$5,$6,true) ON CONFLICT(from_city,to_city) DO NOTHING RETURNING id`, [from, to, `${from} - ${to}`, JSON.stringify([from, ...stops, to]), distance, duration])
  const found = inserted.rows[0] || (await query('SELECT id FROM routes WHERE from_city=$1 AND to_city=$2', [from, to])).rows[0]
  if (!found) throw new Error(`Could not provision demo route ${from} - ${to}`)
  return { id: found.id, from, to, distance, duration }
}

async function ensureSchedule(query, bus, route, routeIndex, variant) {
  const firstTimeIndex = (routeIndex * 3 + variant * 2) % departureTimes.length
  const times = [departureTimes[firstTimeIndex], departureTimes[(firstTimeIndex + 4) % departureTimes.length]]
  const schedules = []
  for (let timeIndex = 0; timeIndex < times.length; timeIndex += 1) {
    const departure = times[timeIndex]
    const departurePosition = departureTimes.indexOf(departure)
    const basePrice = money(route.distance * ratePerKm(bus.type) * (1 + ((routeIndex + variant + timeIndex) % 5) * 0.055))
    const prior = await query(`SELECT id FROM schedules WHERE bus_id=$1 AND route_id=$2 AND service_date IS NULL AND departure_time=$3::time ORDER BY created_at LIMIT 1`, [bus.id, route.id, departure])
    let schedule
    if (prior.rowCount) {
      schedule = await query(`UPDATE schedules SET starts_on=CURRENT_DATE,ends_on=CURRENT_DATE+90,days_of_week=ARRAY[0,1,2,3,4,5,6]::smallint[],arrival_time=$1::time,duration_minutes=$2,base_price=$3,active=true,updated_at=now() WHERE id=$4 RETURNING id`, [arrivalTime(departure, route.duration), route.duration, basePrice, prior.rows[0].id])
    } else {
      schedule = await query(`INSERT INTO schedules(bus_id,route_id,starts_on,ends_on,days_of_week,departure_time,arrival_time,duration_minutes,base_price,convenience_fee,tax_percent,active)
        VALUES($1,$2,CURRENT_DATE,CURRENT_DATE+90,ARRAY[0,1,2,3,4,5,6]::smallint[],$3::time,$4::time,$5,$6,$7,0,true) RETURNING id`, [bus.id, route.id, departure, arrivalTime(departure, route.duration), route.duration, basePrice, 25])
    }
    const scheduleId = schedule.rows[0].id
    await query(`INSERT INTO schedule_seats(schedule_id,seat_number,seat_type,active)
      SELECT $1,seat_number,seat_type,active FROM bus_seats WHERE bus_id=$2 ON CONFLICT(schedule_id,seat_number) DO UPDATE SET seat_type=EXCLUDED.seat_type,active=EXCLUDED.active`, [scheduleId, bus.id])
    schedules.push({ id: scheduleId, bus, route, departure, departurePosition, basePrice })
  }
  return schedules
}

async function ensureCustomer(query, index) {
  const phone = `+9100000${String(index + 1).padStart(5, '0')}`
  const email = `traveller${String(index + 1).padStart(2, '0')}@example.test`
  const prior = await query('SELECT id,full_name,email FROM customers WHERE phone=$1', [phone])
  if (prior.rowCount && (prior.rows[0].email !== email || prior.rows[0].full_name !== customers[index])) {
    throw new Error(`Demo customer phone ${phone} is already assigned to a non-demo customer`)
  }
  await query('INSERT INTO customers(full_name,phone,email) VALUES($1,$2,$3) ON CONFLICT(phone) DO NOTHING', [customers[index], phone, email])
  return (await query('SELECT id,full_name,phone,email FROM customers WHERE phone=$1', [phone])).rows[0]
}

function bookingState(index) {
  if (index < 18) return { status: 'CONFIRMED', paymentStatus: 'PAID', reservationState: 'CONFIRMED' }
  if (index < 20) return { status: 'CANCELLED', paymentStatus: 'REFUNDED', reservationState: 'RELEASED' }
  if (index < 28) return { status: 'CONFIRMED', paymentStatus: 'PENDING', reservationState: 'CONFIRMED' }
  if (index < 40) return { status: 'PENDING', paymentStatus: 'PENDING', reservationState: 'LOCKED' }
  return { status: 'CANCELLED', paymentStatus: 'FAILED', reservationState: 'RELEASED' }
}

async function ensureBooking(query, index, customer, trip, date) {
  const reference = `DEMO-BOOKING-${String(index + 1).padStart(3, '0')}`
  const state = bookingState(index)
  const passengerCount = index % 6 === 0 ? 2 : 1
  const existing = await query('SELECT id,access_token_hash FROM bookings WHERE reference=$1', [reference])
  let bookingId
  if (existing.rowCount) {
    const owned = await query(`SELECT 1 FROM payments WHERE booking_id=$1 AND gateway='DEMO' AND gateway_payload->>'demo'='true' LIMIT 1`, [existing.rows[0].id])
    if (!owned.rowCount && existing.rows[0].access_token_hash !== sha256(`demo:${reference}`)) {
      console.warn(`Skipped ${reference}: the reference is already used by a non-demo payment`)
      return false
    }
    bookingId = existing.rows[0].id
    await query("UPDATE seat_reservations SET state='RELEASED',expires_at=NULL WHERE booking_id=$1", [bookingId])
  }
  const availableRows = await query(`SELECT ss.seat_number FROM schedule_seats ss
    LEFT JOIN seat_reservations sr ON sr.schedule_id=ss.schedule_id AND sr.travel_date=$2 AND sr.seat_number=ss.seat_number
      AND (sr.state='CONFIRMED' OR (sr.state='LOCKED' AND sr.expires_at>now()))
    WHERE ss.schedule_id=$1 AND ss.active AND sr.seat_number IS NULL ORDER BY ss.seat_number`, [trip.id, date])
  const available = availableRows.rows.map((row) => row.seat_number)
  if (available.length < passengerCount) return false
  const seats = available.slice(0, passengerCount)
  const subtotal = trip.basePrice * passengerCount
  const fee = 25
  const tax = 0
  const total = subtotal + fee + tax
  if (existing.rowCount) {
    await query(`UPDATE bookings SET customer_id=$1,schedule_id=$2,travel_date=$3,status=$4,payment_status=$5,subtotal=$6,fee=$7,tax=$8,total=$9,cancellation_reason=$10,cancelled_at=$11,created_at=now(),updated_at=now() WHERE id=$12`, [customer.id, trip.id, date, state.status, state.paymentStatus, subtotal, fee, tax, total, state.status === 'CANCELLED' ? 'Demo sample cancellation' : null, state.status === 'CANCELLED' ? new Date() : null, bookingId])
  } else {
    const inserted = await query(`INSERT INTO bookings(reference,customer_id,schedule_id,travel_date,status,payment_status,subtotal,fee,tax,total,access_token_hash,cancellation_reason,cancelled_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(reference) DO NOTHING RETURNING id`, [reference, customer.id, trip.id, date, state.status, state.paymentStatus, subtotal, fee, tax, total, sha256(`demo:${reference}`), state.status === 'CANCELLED' ? 'Demo sample cancellation' : null, state.status === 'CANCELLED' ? new Date() : null])
    if (!inserted.rowCount) return false
    bookingId = inserted.rows[0].id
  }
  for (let personIndex = 0; personIndex < passengerCount; personIndex += 1) {
    const fullName = personIndex === 0 ? customer.full_name : passengerNames[index % passengerNames.length]
    const age = 19 + ((index * 7 + personIndex * 13) % 48)
    const gender = ['FEMALE', 'MALE', 'OTHER'][index % 3]
    const passenger = await query('SELECT id FROM booking_passengers WHERE booking_id=$1 AND seat_number=$2 LIMIT 1', [bookingId, seats[personIndex]])
    if (passenger.rowCount) {
      await query('UPDATE booking_passengers SET full_name=$1,age=$2,gender=$3,phone=$4,email=$5 WHERE id=$6', [fullName, age, gender, personIndex === 0 ? customer.phone : null, personIndex === 0 ? customer.email : null, passenger.rows[0].id])
    } else {
      await query(`INSERT INTO booking_passengers(booking_id,full_name,age,gender,phone,email,seat_number) VALUES($1,$2,$3,$4,$5,$6,$7)`, [bookingId, fullName, age, gender, personIndex === 0 ? customer.phone : null, personIndex === 0 ? customer.email : null, seats[personIndex]])
    }
    const expiration = state.reservationState === 'LOCKED' ? new Date(Date.now() + 30 * 86400000) : null
    await query(`INSERT INTO seat_reservations(schedule_id,travel_date,seat_number,booking_id,state,expires_at)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(schedule_id,travel_date,seat_number) DO UPDATE
      SET booking_id=EXCLUDED.booking_id,state=EXCLUDED.state,expires_at=EXCLUDED.expires_at
      WHERE seat_reservations.booking_id=EXCLUDED.booking_id OR seat_reservations.state='RELEASED' OR (seat_reservations.state='LOCKED' AND seat_reservations.expires_at<=now())`, [trip.id, date, seats[personIndex], bookingId, state.reservationState, expiration])
  }
  const existingPayment = await query(`SELECT id FROM payments WHERE booking_id=$1 AND gateway='DEMO' AND gateway_payload->>'demo'='true' ORDER BY created_at LIMIT 1`, [bookingId])
  const payload = JSON.stringify({ demo: true, sample: true, note: 'Not a Razorpay transaction', seeded: true })
  if (existingPayment.rowCount) {
    await query('UPDATE payments SET amount=$1,status=$2,refund_status=$3,gateway_payload=$4,updated_at=now() WHERE id=$5', [total, state.paymentStatus, state.paymentStatus === 'REFUNDED' ? 'PROCESSED' : null, payload, existingPayment.rows[0].id])
  } else {
    await query('INSERT INTO payments(booking_id,gateway,amount,status,refund_status,gateway_payload) VALUES($1,\'DEMO\',$2,$3,$4,$5)', [bookingId, total, state.paymentStatus, state.paymentStatus === 'REFUNDED' ? 'PROCESSED' : null, payload])
  }
  if (state.paymentStatus === 'REFUNDED') {
    const refundIndex = index - 17
    await query(`INSERT INTO refunds(payment_id,gateway_refund_id,amount,status,reason,gateway_payload)
      SELECT p.id,$2,$3,'PROCESSED','Demo sample refund',$4 FROM payments p WHERE p.booking_id=$1 AND p.gateway='DEMO' AND p.gateway_payload->>'demo'='true'
      ON CONFLICT(gateway_refund_id) DO UPDATE SET amount=EXCLUDED.amount,status='PROCESSED',updated_at=now()`, [bookingId, `DEMO-REFUND-${String(refundIndex).padStart(3, '0')}`, total, payload])
  }
  return true
}

export async function seedDemoData(query) {
  const fleet = []
  for (let index = 0; index < busNames.length; index += 1) fleet.push(await ensureBus(query, index))
  const routeRows = []
  for (const route of routes) routeRows.push(await ensureRoute(query, route))
  const tripsByRoute = new Map()
  for (let routeIndex = 0; routeIndex < routeRows.length; routeIndex += 1) {
    const route = routeRows[routeIndex]
    const trips = []
    for (let variant = 0; variant < 2; variant += 1) {
      const busIndex = (routeIndex * 3 + variant * 11) % fleet.length
      trips.push(...await ensureSchedule(query, fleet[busIndex], route, routeIndex, variant))
    }
    tripsByRoute.set(route.id, trips)
  }
  const customerRows = []
  for (let index = 0; index < customers.length; index += 1) customerRows.push(await ensureCustomer(query, index))
  let bookingCount = 0
  for (let index = 0; index < 48; index += 1) {
    const route = routeRows[(index * 7) % routeRows.length]
    const trips = tripsByRoute.get(route.id)
    const trip = trips[index % trips.length]
    const offset = travelOffsets[index % travelOffsets.length]
    const date = (await query('SELECT (CURRENT_DATE+$1::int)::text date', [offset])).rows[0].date
    const customer = customerRows[(index * 11) % customerRows.length]
    if (await ensureBooking(query, index, customer, trip, date)) bookingCount += 1
  }
  const ids = (rows) => rows.map((row) => row.id)
  const [busCount, routeCount, scheduleCount, customerCount, bookingTotal, paymentCount, refundCount] = await Promise.all([
    query('SELECT count(*)::int count FROM buses WHERE id=ANY($1::uuid[])', [ids(fleet)]),
    query('SELECT count(*)::int count FROM routes WHERE id=ANY($1::uuid[])', [ids(routeRows)]),
    query('SELECT count(*)::int count FROM schedules WHERE id=ANY($1::uuid[])', [Array.from(tripsByRoute.values()).flat().map((trip) => trip.id)]),
    query('SELECT count(*)::int count FROM customers WHERE id=ANY($1::uuid[])', [ids(customerRows)]),
    query("SELECT count(DISTINCT b.id)::int count FROM bookings b JOIN payments p ON p.booking_id=b.id WHERE b.reference LIKE 'DEMO-BOOKING-%' AND p.gateway='DEMO' AND p.gateway_payload->>'demo'='true'"),
    query("SELECT count(*)::int count FROM payments WHERE gateway='DEMO' AND gateway_payload->>'demo'='true'"),
    query("SELECT count(*)::int count FROM refunds WHERE gateway_refund_id LIKE 'DEMO-REFUND-%'"),
  ])
  console.log(`Demo seed ready: buses=${busCount.rows[0].count}, routes=${routeCount.rows[0].count}, schedules=${scheduleCount.rows[0].count}, customers=${customerCount.rows[0].count}, bookings=${bookingTotal.rows[0].count}, payments=${paymentCount.rows[0].count}, refunds=${refundCount.rows[0].count}; added or refreshed ${bookingCount} demo bookings this run.`)
}
