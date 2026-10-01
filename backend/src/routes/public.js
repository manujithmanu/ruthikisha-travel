import { Router } from 'express'
import { z } from 'zod'
import { pool, query } from '../db.js'
import { createToken, safeError, sha256 } from '../lib/security.js'
import { requireBookingToken } from '../middleware/auth.js'

const router = Router()
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const publicScheduleQuery = `SELECT s.id AS schedule_id,b.id AS bus_id,b.name AS operator,b.bus_number,b.type,r.from_city,r.to_city,
  to_char(s.departure_time,'HH24:MI') AS depart,to_char(s.arrival_time,'HH24:MI') AS arrive,
  s.duration_minutes,s.base_price,s.convenience_fee,s.tax_percent,b.amenities,b.photo_path,b.total_seats,b.seat_layout,
  (SELECT count(*) FROM schedule_seats ss LEFT JOIN seat_reservations sr ON sr.schedule_id=ss.schedule_id AND sr.travel_date=$3 AND sr.seat_number=ss.seat_number AND (sr.state='CONFIRMED' OR (sr.state='LOCKED' AND sr.expires_at>now())) WHERE ss.schedule_id=s.id AND ss.active AND (sr.state IS NULL OR sr.state='RELEASED')) AS seats_available
  FROM schedules s JOIN buses b ON b.id=s.bus_id JOIN routes r ON r.id=s.route_id
  WHERE s.active AND b.active AND r.active AND r.from_city=$1 AND r.to_city=$2
  AND ((s.service_date=$3) OR (s.service_date IS NULL AND s.starts_on<=$3 AND s.ends_on>=$3 AND extract(dow FROM $3::date)::smallint=ANY(s.days_of_week)))`

function mapSchedule(row, travelDate) {
  const duration = `${Math.floor(row.duration_minutes / 60)}h ${String(row.duration_minutes % 60).padStart(2, '0')}m`
  return { id: row.schedule_id, scheduleId: row.schedule_id, busId: row.bus_id, operator: row.operator, busNumber: row.bus_number, type: row.type, from: row.from_city, to: row.to_city, depart: row.depart, arrive: row.arrive, duration, durationMinutes: row.duration_minutes, price: Number(row.base_price), convenienceFee: Number(row.convenience_fee), taxPercent: Number(row.tax_percent), amenities: row.amenities, image: row.photo_path, seatLayout: row.seat_layout, totalSeats: Number(row.total_seats), seats: Number(row.seats_available), travelDate }
}
const citySQL = `SELECT city FROM (SELECT from_city AS city FROM routes WHERE active UNION SELECT to_city AS city FROM routes WHERE active) cities ORDER BY city`
const publicContentKeys=['site.companyName','home.heroTitle','home.heroSubtitle','home.heroImage','home.featuredRoutes','home.featuredBuses','home.travelHighlights','about.story','contact.phone','contact.email','contact.address','contact.supportHours','policies.cancellation','policies.terms','policies.privacy','booking.rules']

router.get('/meta', async (_req, res, next) => { try { const result = await query(citySQL); return res.json({ success: true, cities: result.rows.map((row) => row.city) }) } catch (error) { return next(error) } })
router.get('/content',async(_req,res,next)=>{try{const result=await query('SELECT key,value FROM website_settings WHERE key=ANY($1::text[])',[publicContentKeys]);return res.json({success:true,content:Object.fromEntries(result.rows.map(row=>[row.key,row.value]))})}catch(error){return next(error)}})
router.post('/contact',async(req,res,next)=>{const parsed=z.object({name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(254),message:z.string().trim().min(10).max(5000)}).safeParse(req.body);if(!parsed.success)return safeError(res,400,'Enter your name, a valid email, and a message of at least 10 characters');try{await query('INSERT INTO contact_messages(full_name,email,message,ip_address) VALUES($1,$2,$3,$4)',[parsed.data.name,parsed.data.email,parsed.data.message,req.ip]);return res.status(201).json({success:true,message:'Your note has been sent to the Ruthikisha team.'})}catch(error){return next(error)}})
router.get('/routes', async (_req, res, next) => { try { const result = await query('SELECT id,from_city AS "from",to_city AS "to",route_name AS name,stops,distance_km AS "distanceKm",estimated_duration_minutes AS "durationMinutes" FROM routes WHERE active ORDER BY from_city,to_city'); return res.json({ success: true, routes: result.rows }) } catch (error) { return next(error) } })
router.get('/buses', async (_req, res, next) => { try { const result = await query('SELECT id,name,bus_number AS "busNumber",type,total_seats AS "totalSeats",amenities,photo_path AS "photoPath" FROM buses WHERE active ORDER BY name'); return res.json({ success: true, buses: result.rows }) } catch (error) { return next(error) } })
router.get('/search', async (req, res, next) => {
  try {
    const parsed = z.object({ from: z.string().min(2), to: z.string().min(2), date: dateSchema }).safeParse(req.query)
    if (!parsed.success) return safeError(res, 400, 'Choose an origin, destination, and travel date')
    if (parsed.data.from === parsed.data.to) return safeError(res, 400, 'Origin and destination must be different')
    const result = await query(publicScheduleQuery + ' ORDER BY s.departure_time', [parsed.data.from, parsed.data.to, parsed.data.date])
    return res.json({ success: true, schedules: result.rows.map((row) => mapSchedule(row, parsed.data.date)) })
  } catch (error) { return next(error) }
})
router.get('/schedules/:id', async (req, res, next) => {
  try {
    const parsed = dateSchema.safeParse(req.query.date)
    if (!parsed.success) return safeError(res, 400, 'A valid travel date is required')
    const result = await query(publicScheduleQuery.replace('r.from_city=$1 AND r.to_city=$2', 's.id=$1') + ' LIMIT 1', [req.params.id, null, parsed.data])
    if (!result.rowCount) return safeError(res, 404, 'Journey not found for this date')
    return res.json({ success: true, schedule: mapSchedule(result.rows[0], parsed.data) })
  } catch (error) { return next(error) }
})
router.get('/schedules/:id/seats', async (req, res, next) => {
  try {
    const parsed = dateSchema.safeParse(req.query.date)
    if (!parsed.success) return safeError(res, 400, 'A valid travel date is required')
    const result = await query(`SELECT ss.seat_number,ss.seat_type,ss.active,COALESCE(layout.row_number,((row_number() OVER(ORDER BY CASE WHEN ss.seat_number ~ '^[0-9]+$' THEN ss.seat_number::int END,ss.seat_number)-1)/4+1)::int) AS row_number,COALESCE(layout.column_number,((row_number() OVER(ORDER BY CASE WHEN ss.seat_number ~ '^[0-9]+$' THEN ss.seat_number::int END,ss.seat_number)-1)%4+1)::int) AS column_number,COALESCE(sr.state='CONFIRMED' OR (sr.state='LOCKED' AND sr.expires_at>now()),false) AS unavailable,
      CASE WHEN sr.state='LOCKED' AND sr.expires_at>now() THEN 'LOCKED' WHEN sr.state='CONFIRMED' THEN 'BOOKED' ELSE 'AVAILABLE' END AS status
      FROM schedule_seats ss JOIN schedules s ON s.id=ss.schedule_id JOIN buses b ON b.id=s.bus_id
      LEFT JOIN LATERAL (SELECT (item->>'row')::int row_number,(item->>'column')::int column_number FROM jsonb_array_elements(COALESCE(b.seat_layout->'seats','[]'::jsonb)) item WHERE item->>'seatNumber'=ss.seat_number LIMIT 1) layout ON true
      LEFT JOIN seat_reservations sr ON sr.schedule_id=ss.schedule_id AND sr.travel_date=$2 AND sr.seat_number=ss.seat_number AND (sr.state='CONFIRMED' OR (sr.state='LOCKED' AND sr.expires_at>now()))
      WHERE ss.schedule_id=$1 ORDER BY ss.seat_number`, [req.params.id, parsed.data])
    if (!result.rowCount) return safeError(res, 404, 'Seats for this journey were not found')
    return res.json({ success: true, seats: result.rows })
  } catch (error) { return next(error) }
})

const bookingSchema = z.object({ scheduleId: z.string().uuid(), travelDate: dateSchema, customer: z.object({ fullName: z.string().min(2).max(120), phone: z.string().min(8).max(30), email: z.string().email().max(254).optional() }), passengers: z.array(z.object({ fullName: z.string().min(2).max(120), age: z.number().int().min(1).max(120).optional(), gender: z.enum(['FEMALE','MALE','OTHER','PREFER_NOT_TO_SAY']).optional(), seatNumber: z.string().min(1).max(8), phone: z.string().max(30).optional(), email: z.string().email().optional(), emergencyContact: z.string().max(120).optional() })).min(1).max(8) })
router.post('/bookings', async (req, res, next) => {
  const parsed = bookingSchema.safeParse(req.body)
  if (!parsed.success) return safeError(res, 400, 'Check passenger details and selected seats')
  const data = parsed.data; const seats = data.passengers.map((passenger) => passenger.seatNumber)
  if (new Set(seats).size !== seats.length) return safeError(res, 400, 'Each passenger must have a different seat')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const sch = await client.query(`SELECT s.*,b.id bus_id,r.from_city,r.to_city FROM schedules s JOIN buses b ON b.id=s.bus_id JOIN routes r ON r.id=s.route_id WHERE s.id=$1 AND s.active AND b.active AND r.active AND ((s.service_date=$2) OR (s.service_date IS NULL AND s.starts_on<=$2 AND s.ends_on>=$2 AND extract(dow FROM $2::date)::smallint=ANY(s.days_of_week))) FOR UPDATE OF s`, [data.scheduleId, data.travelDate])
    if (!sch.rowCount) { await client.query('ROLLBACK'); return safeError(res, 404, 'This trip is not scheduled for the selected date') }
    const schedule = sch.rows[0]
    const seatsResult = await client.query('SELECT seat_number FROM schedule_seats WHERE schedule_id=$1 AND seat_number=ANY($2::text[]) AND active FOR UPDATE', [data.scheduleId, seats])
    if (seatsResult.rowCount !== seats.length) { await client.query('ROLLBACK'); return safeError(res, 409, 'One or more selected seats are not available') }
    const customerResult = await client.query(`INSERT INTO customers(full_name,phone,email) VALUES($1,$2,$3)
      ON CONFLICT(phone) DO UPDATE SET full_name=EXCLUDED.full_name,email=COALESCE(EXCLUDED.email,customers.email),updated_at=now() RETURNING id`, [data.customer.fullName, data.customer.phone, data.customer.email || null])
    const customerId = customerResult.rows[0].id
    const subtotal = Number(schedule.base_price) * seats.length; const fee = Number(schedule.convenience_fee); const tax = Math.round(subtotal * Number(schedule.tax_percent)) / 100
    const total = subtotal + fee + tax
    const seq = await client.query("SELECT nextval('booking_reference_seq') AS n")
    const reference = `RT-${data.travelDate.slice(0,4)}-${String(seq.rows[0].n).padStart(6,'0')}`
    const bookingToken = createToken()
    const booking = await client.query(`INSERT INTO bookings(reference,customer_id,schedule_id,travel_date,subtotal,fee,tax,total,access_token_hash)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,reference,status,payment_status,subtotal,fee,tax,total,travel_date,created_at`, [reference, customerId, data.scheduleId, data.travelDate, subtotal, fee, tax, total, sha256(bookingToken)])
    const holdMinutes = Math.min(Math.max(Number(process.env.SEAT_LOCK_MINUTES || 10), 1), 30)
    for (const passenger of data.passengers) {
      const reservation = await client.query(`INSERT INTO seat_reservations(schedule_id,travel_date,seat_number,booking_id,state,expires_at)
        VALUES($1,$2,$3,$4,'LOCKED',now()+($5::text || ' minutes')::interval)
        ON CONFLICT(schedule_id,travel_date,seat_number) DO UPDATE SET booking_id=EXCLUDED.booking_id,state='LOCKED',expires_at=EXCLUDED.expires_at,created_at=now()
        WHERE seat_reservations.state='RELEASED' OR (seat_reservations.state='LOCKED' AND seat_reservations.expires_at<=now()) RETURNING seat_number`, [data.scheduleId, data.travelDate, passenger.seatNumber, booking.rows[0].id, String(holdMinutes)])
      if (!reservation.rowCount) { await client.query('ROLLBACK'); return safeError(res, 409, 'Sorry, a selected seat is no longer available') }
      await client.query(`INSERT INTO booking_passengers(booking_id,full_name,age,gender,phone,email,emergency_contact,seat_number)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [booking.rows[0].id, passenger.fullName, passenger.age || null, passenger.gender || null, passenger.phone || null, passenger.email || null, passenger.emergencyContact || null, passenger.seatNumber])
    }
    await client.query("INSERT INTO payments(booking_id,amount,status) VALUES($1,$2,'PENDING')", [booking.rows[0].id, total])
    await client.query('COMMIT')
    return res.status(201).json({ success: true, booking: { ...booking.rows[0], bookingToken, scheduleId: data.scheduleId, passengers: data.passengers } })
  } catch (error) { await client.query('ROLLBACK'); return next(error) } finally { client.release() }
})
router.get('/bookings/:id', requireBookingToken, async (req, res, next) => {
  try {
    const result = await query(`SELECT b.id,b.reference,b.status,b.payment_status,b.travel_date,b.subtotal,b.fee,b.tax,b.total,b.created_at,
      c.full_name customer_name,c.phone,c.email,s.departure_time,s.arrival_time,bu.name bus_name,bu.bus_number,r.from_city,r.to_city,b.cancellation_request_status,b.cancellation_requested_at,b.cancellation_request_reason,
      COALESCE(json_agg(json_build_object('name',bp.full_name,'seat',bp.seat_number,'age',bp.age,'gender',bp.gender)) FILTER (WHERE bp.id IS NOT NULL),'[]') passengers
      FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN schedules s ON s.id=b.schedule_id JOIN buses bu ON bu.id=s.bus_id JOIN routes r ON r.id=s.route_id
      LEFT JOIN booking_passengers bp ON bp.booking_id=b.id WHERE b.id=$1 GROUP BY b.id,c.id,s.id,bu.id,r.id`, [req.bookingId])
    if (!result.rowCount) return safeError(res, 404, 'Booking not found')
    return res.json({ success: true, booking: result.rows[0] })
  } catch (error) { return next(error) }
})
router.post('/bookings/:id/cancel', requireBookingToken, async (req,res,next)=>{const parsed=z.object({reason:z.string().trim().max(500).optional()}).safeParse(req.body||{});if(!parsed.success)return safeError(res,400,'Cancellation reason is too long');const client=await pool.connect();try{await client.query('BEGIN');const configured=await client.query("SELECT value FROM website_settings WHERE key='booking.cancellationWindowHours'");const configuredHours=Number(configured.rows[0]?.value??24);const hours=Number.isFinite(configuredHours)?Math.min(Math.max(configuredHours,0),720):24;const booking=await client.query(`SELECT b.status,b.payment_status,b.cancellation_request_status,((b.travel_date+s.departure_time) AT TIME ZONE 'Asia/Kolkata') > now()+($2::text||' hours')::interval AS within_cancellation_window FROM bookings b JOIN schedules s ON s.id=b.schedule_id WHERE b.id=$1 FOR UPDATE OF b`,[req.bookingId,String(hours)]);if(!booking.rowCount){await client.query('ROLLBACK');return safeError(res,404,'Booking not found')}const current=booking.rows[0];if(!current.within_cancellation_window){await client.query('ROLLBACK');return safeError(res,409,`Bookings can be cancelled up to ${hours} hours before departure`)}if(current.status==='PENDING'&&current.payment_status!=='PAID'){await client.query("UPDATE bookings SET status='CANCELLED',cancellation_reason=$1,cancelled_at=now(),updated_at=now() WHERE id=$2",[parsed.data.reason||'Cancelled by customer before payment',req.bookingId]);await client.query("UPDATE seat_reservations SET state='RELEASED',expires_at=NULL WHERE booking_id=$1",[req.bookingId]);await client.query('COMMIT');return res.json({success:true,status:'CANCELLED',cancellationRequestStatus:'NONE'})}if(current.status==='CONFIRMED'&&current.payment_status==='PAID'){if(current.cancellation_request_status==='REQUESTED'){await client.query('ROLLBACK');return safeError(res,409,'A cancellation request is already under review')}await client.query("UPDATE bookings SET cancellation_request_status='REQUESTED',cancellation_requested_at=now(),cancellation_request_reason=$1,updated_at=now() WHERE id=$2",[parsed.data.reason||'Cancellation requested by customer',req.bookingId]);await client.query('COMMIT');return res.json({success:true,status:'CONFIRMED',cancellationRequestStatus:'REQUESTED'})}await client.query('ROLLBACK');return safeError(res,409,'This booking can no longer be cancelled online')}catch(error){await client.query('ROLLBACK');next(error)}finally{client.release()}})
router.get('/bookings', async (req, res, next) => {
  try {
    if (!req.get('authorization')) return safeError(res, 401, 'Sign in to view bookings')
    return safeError(res, 401, 'Admin sessions cannot access customer booking history')
  } catch (error) { return next(error) }
})

export { mapSchedule, publicScheduleQuery }
export default router
