import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** Encodes only the public ticket reference. Passenger/contact details never enter the QR payload. */
export default function TicketQRCode({ reference }) {
  const [result, setResult] = useState({ reference: '', image: '' })
  useEffect(() => {
    let current = true
    QRCode.toDataURL(JSON.stringify({ ticket: reference }), {
      errorCorrectionLevel: 'M', margin: 1, width: 176,
      color: { dark: '#183e34', light: '#ffffff' },
    }).then((url) => { if (current) setResult({ reference, image: url }) }).catch(() => { if (current) setResult({ reference, image: '' }) })
    return () => { current = false }
  }, [reference])
  const image = result.reference === reference ? result.image : ''
  return image ? <img className="ticket-qr" src={image} alt={`QR code for ticket ${reference}`} width="128" height="128" /> : <span className="ticket-qr-placeholder" aria-label="Ticket QR code loading">QR</span>
}
