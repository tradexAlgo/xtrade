import mongoose from 'mongoose'
import Charges from '../models/Charges.js'

mongoose.connect('mongodb://localhost:27017/dios').then(async () => {
  // Set all spreadValue to 0
  const result = await Charges.updateMany(
    { spreadValue: { $gt: 0 } },
    { $set: { spreadValue: 0 } }
  )
  console.log('Updated charges:', result.modifiedCount)
  
  // Verify
  const remaining = await Charges.find({ spreadValue: { $gt: 0 } })
  console.log('Remaining charges with spread > 0:', remaining.length)
  
  process.exit(0)
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
