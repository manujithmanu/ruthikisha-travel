import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import auth from './routes/auth.js'
import publicRoutes from './routes/public.js'
import payments, { razorpayWebhook } from './routes/payments.js'
import admin from './routes/admin.js'
import { safeError } from './lib/security.js'

const app=express(); const here=path.dirname(fileURLToPath(import.meta.url))
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw new Error('JWT_SECRET must contain at least 32 characters')
const origins=(process.env.APP_URL||'http://localhost:5173').split(',').map(x=>x.trim())
app.disable('x-powered-by'); app.set('trust proxy',2); app.use(helmet()); app.use(cors({origin(origin,cb){if(!origin||origins.includes(origin))return cb(null,true);return cb(new Error('Origin is not allowed'))},credentials:true})); app.use(cookieParser())
app.post('/api/payments/webhook',express.raw({type:'application/json',limit:'1mb'}),razorpayWebhook)
app.use(express.json({limit:'1mb'})); app.use('/uploads',express.static(path.resolve(process.env.UPLOAD_DIR||path.join(here,'../uploads')),{dotfiles:'deny',index:false}))
app.get('/api/health',(_req,res)=>res.json({success:true,status:'ok'})); app.use('/api/auth',auth); app.use('/api/admin',admin); app.use('/api/contact',rateLimit({windowMs:60*60*1000,limit:8,standardHeaders:true,legacyHeaders:false})); app.use('/api',publicRoutes); app.use('/api/payments',rateLimit({windowMs:60000,limit:20,standardHeaders:true,legacyHeaders:false}),payments)
app.use((_req,res)=>safeError(res,404,'Not found'))
app.use((err,_req,res,_next)=>{console.error({message:err.message,code:err.code,stack:process.env.NODE_ENV==='production'?undefined:err.stack});return safeError(res,err.status||500,err.status&&err.status<500?err.message:'The server could not complete this request')})
const port=Number(process.env.PORT||4000); app.listen(port,'0.0.0.0',()=>console.log(`Ruthikisha API listening on ${port}`))
