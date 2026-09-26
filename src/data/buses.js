export const cities = ['Coimbatore', 'Chennai', 'Bangalore', 'Kochi', 'Madurai']
export const buses = [
  { id: 'coi-maa-1', from: 'Coimbatore', to: 'Chennai', operator: 'KPN Travels', type: 'AC Sleeper', depart: '21:30', arrive: '06:15', duration: '8h 45m', price: 1299, seats: 12, rating: 4.8, amenities: ['Air conditioning', 'Wi-Fi', 'Charging'], board: ['Gandhipuram Bus Stand', 'Avinashi Road'], drop: ['Koyambedu Bus Terminal', 'Guindy'] },
  { id: 'coi-blr-1', from: 'Coimbatore', to: 'Bangalore', operator: 'SRS Travels', type: 'Volvo Multi-Axle Sleeper', depart: '22:00', arrive: '05:30', duration: '7h 30m', price: 999, seats: 8, rating: 4.7, amenities: ['Air conditioning', 'Blanket', 'USB charging'], board: ['Gandhipuram', 'Hope College'], drop: ['Madiwala', 'Majestic'] },
  { id: 'coi-cok-1', from: 'Coimbatore', to: 'Kochi', operator: 'Kerala Lines', type: 'AC Seater / Sleeper', depart: '20:45', arrive: '02:30', duration: '5h 45m', price: 799, seats: 9, rating: 4.6, amenities: ['Air conditioning', 'Charging', 'Water'], board: ['Gandhipuram', 'Ukkadam'], drop: ['Vyttila Mobility Hub', 'Aluva'] },
  { id: 'coi-ixm-1', from: 'Coimbatore', to: 'Madurai', operator: 'City Express', type: 'AC Seater', depart: '08:00', arrive: '11:45', duration: '3h 45m', price: 499, seats: 16, rating: 4.5, amenities: ['Air conditioning', 'Water'], board: ['Gandhipuram', 'Singanallur'], drop: ['Mattuthavani Bus Stand'] },
  { id: 'maa-coi-1', from: 'Chennai', to: 'Coimbatore', operator: 'Orange Travels', type: 'AC Sleeper', depart: '21:00', arrive: '06:00', duration: '9h', price: 1399, seats: 6, rating: 4.9, amenities: ['Air conditioning', 'Wi-Fi', 'Blanket'], board: ['Koyambedu', 'Guindy'], drop: ['Gandhipuram', 'Hope College'] },
  { id: 'blr-coi-1', from: 'Bangalore', to: 'Coimbatore', operator: 'SRS Travels', type: 'Volvo Sleeper', depart: '22:30', arrive: '05:45', duration: '7h 15m', price: 1099, seats: 11, rating: 4.7, amenities: ['Air conditioning', 'Blanket', 'USB charging'], board: ['Madiwala', 'Electronic City'], drop: ['Gandhipuram', 'Singanallur'] },
  { id: 'cok-coi-1', from: 'Kochi', to: 'Coimbatore', operator: 'Kerala Lines', type: 'AC Seater', depart: '14:00', arrive: '19:45', duration: '5h 45m', price: 749, seats: 10, rating: 4.6, amenities: ['Air conditioning', 'Charging'], board: ['Vyttila', 'Aluva'], drop: ['Gandhipuram', 'Ukkadam'] },
]
export const formatINR = (amount) => `?${Number(amount || 0).toLocaleString('en-IN')}`


