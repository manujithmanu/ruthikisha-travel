import { Router } from 'express'
import Razorpay from 'razorpay'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { pool, query } from '../db.js'
import { requireBookingToken } from '../middleware/auth.js'
import { safeError } from '../lib/security.js'

const router = Router()
const gateway = () => process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET }) : null
const verifyHmac = (secret, body, value) => { if (!secret || !value) return false; const expected = createHmac('sha256', secret).update(body).digest(); let actual; try { actual = Buffer.from(value, 'hex') } catch { return false }; return expected.length === actual.length && timingSafeEqual(expected, actual) }

async function recordCapturedPayment(orderId,payment){
  const client=await pool.connect();let mustRefund=false;let paymentRow
  try{await client.query('BEGIN');const rows=await client.query(`SELECT p.id,p.amount,p.status,p.gateway_payment_id,b.id booking_id,b.status booking_status,b.payment_status FROM payments p JOIN bookings b ON b.id=p.booking_id WHERE p.gateway_order_id=$1 FOR UPDATE OF p,b`,[orderId]);if(!rows.rowCount){await client.query('ROLLBACK');return {confirmed:false,notFound:true}}paymentRow=rows.rows[0];if(Number(payment.amount)!==Math.round(Number(paymentRow.amount)*100)||payment.currency!=='INR'){await client.query('ROLLBACK');throw new Error('Gateway capture amount does not match the booking total')}if(paymentRow.payment_status==='PAID'){await client.query('COMMIT');return {confirmed:paymentRow.booking_status==='CONFIRMED'}}const count=await client.query(`SELECT (SELECT count(*)::int FROM booking_passengers WHERE booking_id=$1) passenger_count,(SELECT count(*)::int FROM seat_reservations WHERE booking_id=$1 AND state='LOCKED' AND expires_at>now()) locked_count`,[paymentRow.booking_id]);const holds=count.rows[0];mustRefund=paymentRow.booking_status!=='PENDING'||holds.passenger_count===0||holds.passenger_count!==holds.locked_count;await client.query("UPDATE payments SET gateway_payment_id=$1,status='PAID',paid_at=now(),gateway_payload=$2,updated_at=now() WHERE id=$3",[payment.id,JSON.stringify({id:payment.id,status:payment.status}),paymentRow.id]);if(mustRefund){await client.query("UPDATE bookings SET status='CANCELLED',payment_status='PAID',cancelled_at=now(),cancellation_reason='Seat hold expired or booking was cancelled before payment capture',updated_at=now() WHERE id=$1",[paymentRow.booking_id]);await client.query("UPDATE seat_reservations SET state='RELEASED',expires_at=NULL WHERE booking_id=$1",[paymentRow.booking_id])}else{await client.query("UPDATE bookings SET status='CONFIRMED',payment_status='PAID',updated_at=now() WHERE id=$1",[paymentRow.booking_id]);await client.query("UPDATE seat_reservations SET state='CONFIRMED',expires_at=NULL WHERE booking_id=$1 AND state='LOCKED'",[paymentRow.booking_id])}await client.query('COMMIT')}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
  if(mustRefund){try{const rz=gateway();if(!rz)throw new Error('Razorpay credentials are missing');const refund=await rz.payments.refund(payment.id);const processed=refund.status==='processed';await query("UPDATE payments SET status=CASE WHEN $1 THEN 'REFUNDED' ELSE status END,refund_status=$2,gateway_payload=gateway_payload || $3::jsonb,updated_at=now() WHERE id=$4",[processed,refund.status||'pending',JSON.stringify({refundId:refund.id}),paymentRow.id]);await query(`INSERT INTO refunds(payment_id,gateway_refund_id,amount,status,reason,gateway_payload) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(gateway_refund_id) DO UPDATE SET status=EXCLUDED.status,updated_at=now()`,[paymentRow.id,refund.id,Number(paymentRow.amount),processed?'PROCESSED':'PENDING','Late payment after seat hold ended',JSON.stringify({status:refund.status})]);return {confirmed:false,refunded:processed,refundRequired:!processed}}catch(error){await query("UPDATE payments SET refund_status='REFUND_REQUIRED',gateway_payload=gateway_payload || $1::jsonb,updated_at=now() WHERE id=$2",[JSON.stringify({refundFailure:error.message}),paymentRow.id]);return {confirmed:false,refundRequired:true}}}
  return {confirmed:true}
}

async function recordRefundUpdate(refund){
  if(!refund?.payment_id||!['processed','failed'].includes(refund.status))return
  const client=await pool.connect()
  try{await client.query('BEGIN');const rows=await client.query('SELECT p.id,p.booking_id,p.amount FROM payments p WHERE p.gateway_payment_id=$1 FOR UPDATE',[refund.payment_id]);if(!rows.rowCount){await client.query('ROLLBACK');return}const payment=rows.rows[0];const processed=refund.status==='processed';if(processed){await client.query("UPDATE payments SET status='REFUNDED',refund_status='PROCESSED',gateway_payload=gateway_payload || $1::jsonb,updated_at=now() WHERE id=$2",[JSON.stringify({refundId:refund.id}),payment.id]);await client.query("UPDATE bookings SET status='CANCELLED',payment_status='REFUNDED',cancelled_at=COALESCE(cancelled_at,now()),cancellation_reason=COALESCE(cancellation_reason,'Refund processed'),updated_at=now() WHERE id=$1",[payment.booking_id]);await client.query("UPDATE seat_reservations SET state='RELEASED',expires_at=NULL WHERE booking_id=$1",[payment.booking_id])}else{await client.query("UPDATE payments SET status='PAID',refund_status='FAILED',gateway_payload=gateway_payload || $1::jsonb,updated_at=now() WHERE id=$2",[JSON.stringify({refundId:refund.id}),payment.id])}await client.query(`INSERT INTO refunds(payment_id,gateway_refund_id,amount,status,gateway_payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT(gateway_refund_id) DO UPDATE SET status=EXCLUDED.status,gateway_payload=EXCLUDED.gateway_payload,updated_at=now()`,[payment.id,refund.id,Number(payment.amount),processed?'PROCESSED':'FAILED',JSON.stringify({status:refund.status})]);await client.query('COMMIT')}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}

router.post('/order', requireBookingToken, async (req, res, next) => {
  const client = await pool.connect()
  try {
    const razorpay = gateway(); if (!razorpay) return safeError(res, 503, 'Online payments are not configured yet')
    await client.query('BEGIN')
    const b = await client.query(`SELECT b.id,b.total,b.travel_date,p.id payment_id,p.gateway_order_id,p.payment_method FROM bookings b JOIN payments p ON p.booking_id=b.id WHERE b.id=$1 FOR UPDATE OF b,p`, [req.bookingId])
    if (!b.rowCount) { await client.query('ROLLBACK'); return safeError(res,404,'Booking not found') }
    if (b.rows[0].payment_method !== 'RAZORPAY') { await client.query('ROLLBACK'); return safeError(res,409,'This booking uses cash payment') }
    if (b.rows[0].gateway_order_id) { await client.query('COMMIT'); return res.json({ success:true, orderId:b.rows[0].gateway_order_id, amount:Math.round(Number(b.rows[0].total)*100), currency:'INR', keyId:process.env.RAZORPAY_KEY_ID }) }
    const hold = await client.query("SELECT 1 FROM seat_reservations WHERE booking_id=$1 AND state='LOCKED' AND expires_at>now() LIMIT 1", [req.bookingId])
    if (!hold.rowCount) { await client.query('ROLLBACK'); return safeError(res,409,'Seat hold expired. Please select your seats again') }
    const order = await razorpay.orders.create({ amount:Math.round(Number(b.rows[0].total)*100),currency:'INR',receipt:String(req.bookingId),notes:{ bookingId:String(req.bookingId) } })
    await client.query('UPDATE payments SET gateway_order_id=$1,updated_at=now() WHERE id=$2',[order.id,b.rows[0].payment_id])
    await client.query('COMMIT'); return res.status(201).json({success:true,orderId:order.id,amount:order.amount,currency:order.currency,keyId:process.env.RAZORPAY_KEY_ID})
  } catch(error) { await client.query('ROLLBACK'); return next(error) } finally { client.release() }
})

router.post('/verify', requireBookingToken, async (req,res,next) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {}
  if (!orderId || !paymentId || !signature) return safeError(res,400,'Missing payment verification fields')
  try {
    const payment=await query('SELECT p.id,p.gateway_order_id,p.status,p.amount,p.payment_method FROM payments p WHERE p.booking_id=$1',[req.bookingId])
    if (payment.rowCount && payment.rows[0].payment_method !== 'RAZORPAY') return safeError(res,409,'This booking uses cash payment')
    if (!payment.rowCount || payment.rows[0].gateway_order_id!==orderId) return safeError(res,400,'Payment order does not match this booking')
    if (!verifyHmac(process.env.RAZORPAY_KEY_SECRET,`${orderId}|${paymentId}`,signature)) return safeError(res,400,'Payment signature could not be verified')
    const fetched=await gateway().payments.fetch(paymentId)
    if (fetched.order_id!==orderId || fetched.status!=='captured' || Number(fetched.amount)!==Math.round(Number(payment.rows[0].amount)*100) || fetched.currency!=='INR') return safeError(res,409,'Payment has not been captured for the expected amount')
    const result=await recordCapturedPayment(orderId,fetched)
    if(!result.confirmed)return safeError(res,409,result.refunded?'Seat hold expired after payment; the captured payment has been refunded':'Payment was captured after the seat hold ended. Contact support about the refund.')
    return res.json({success:true,status:'PAID'})
  } catch(error) { return next(error) }
})

export async function razorpayWebhook(req,res,next) {
  let eventId
  try {
    const raw=req.body
    if (!Buffer.isBuffer(raw) || !verifyHmac(process.env.RAZORPAY_WEBHOOK_SECRET,raw,req.get('x-razorpay-signature'))) return res.status(400).json({success:false,message:'Invalid webhook signature'})
    const event=JSON.parse(raw.toString('utf8'));eventId=event.id; if(!eventId)return res.status(400).json({success:false,message:'Webhook event ID is missing'})
    const inserted=await query(`INSERT INTO payment_webhook_events(event_id,event_type,status,attempts) VALUES($1,$2,'RECEIVED',1) ON CONFLICT(event_id) DO NOTHING RETURNING event_id`,[eventId,event.event||'unknown'])
    if(!inserted.rowCount){const prior=await query('SELECT status FROM payment_webhook_events WHERE event_id=$1',[eventId]);if(prior.rows[0]?.status!=='FAILED')return res.json({success:true,received:true,duplicate:true});await query("UPDATE payment_webhook_events SET status='RECEIVED',attempts=attempts+1,error_message=NULL WHERE event_id=$1",[eventId])}
    const entity=event.payload?.payment?.entity;const refund=event.payload?.refund?.entity
    if (entity?.order_id && event.event==='payment.captured') await recordCapturedPayment(entity.order_id,entity)
    if(refund&&['refund.processed','refund.failed'].includes(event.event))await recordRefundUpdate(refund)
    await query("UPDATE payment_webhook_events SET status='PROCESSED',processed_at=now(),error_message=NULL WHERE event_id=$1",[eventId])
    return res.json({success:true,received:true})
  } catch(error){if(eventId)await query("UPDATE payment_webhook_events SET status='FAILED',error_message=$1 WHERE event_id=$2",[String(error.message).slice(0,500),eventId]).catch(()=>{});return next(error)}
}
export default router
