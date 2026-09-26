const KEY = 'ruthikisha.booking'
const HISTORY = 'ruthikisha.history'
export const readBooking = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
export const saveBooking = (booking) => { localStorage.setItem(KEY, JSON.stringify(booking)); return booking }
export const addBookingToHistory = (booking) => { const items = JSON.parse(localStorage.getItem(HISTORY) || '[]'); localStorage.setItem(HISTORY, JSON.stringify([booking, ...items.filter((item) => item.id !== booking.id)])) }
export const readHistory = () => { try { return JSON.parse(localStorage.getItem(HISTORY) || '[]') } catch { return [] } }


