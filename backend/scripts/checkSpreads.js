import mongoose from 'mongoose'
import Charges from '../models/Charges.js'

mongoose.connect('mongodb://localhost:27017/dios').then(async () => {
  const charges = await Charges.find({ spreadValue: { $gt: 0 } })
  console.log('Charges with spread:')
  charges.forEach(c => {
    console.log(`Level: ${c.level}, Symbol: ${c.instrumentSymbol}, Segment: ${c.segment}, SpreadValue: ${c.spreadValue}`)
  })
  process.exit(0)
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
