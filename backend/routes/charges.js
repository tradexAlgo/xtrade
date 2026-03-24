import express from 'express'
import Charges from '../models/Charges.js'
import AccountType from '../models/AccountType.js'
import Instrument from '../models/Instrument.js'

const router = express.Router()

// GET /api/charges/spreads - Get spreads for all instruments (for display in trading UI)
router.get('/spreads', async (req, res) => {
  try {
    const { userId, accountTypeId } = req.query
    console.log(`[Spreads Request] userId=${userId}, accountTypeId=${accountTypeId}`);
    
    // Get all active instruments from database
    const allInstruments = await Instrument.find({ isActive: true }).select('symbol')
    let allSymbols = allInstruments.map(i => i.symbol)
    
    // Fallback: If no instruments in database, use default symbol list
    if (allSymbols.length === 0) {
      console.log('[Spreads] No instruments in database, using default symbol list')
      allSymbols = [
        // Forex
        'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 
        'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'GBPAUD', 
        'GBPCAD', 'AUDCAD', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
        // Metals
        'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD',
        // Crypto (all supported)
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 
        'DOGEUSDT', 'DOTUSDT', 'LTCUSDT', 'LINKUSDT', 'SHIBUSDT', 'UNIUSDT',
        'ATOMUSDT', 'TRXUSDT', 'BCHUSDT', 'XLMUSDT', 'ETCUSDT', 'NEARUSDT',
        'AAVEUSDT', 'FTMUSDT', 'SANDUSDT', 'MANAUSDT', 'ARBUSDT', 'OPUSDT',
        'SUIUSDT', 'APTUSDT', 'INJUSDT', 'FILUSDT', 'ICPUSDT', 'MKRUSDT'
      ]
    }
    
    console.log('[Spreads] Total symbols:', allSymbols.length)
    
    // Get all charges that have spread values > 0
    const charges = await Charges.find({ isActive: true })
      .sort({ level: 1 })
    
    // Filter charges with spreadValue > 0
    const chargesWithSpread = charges.filter(c => {
      if (c.spreadValue <= 0) return false;
      if (c.level === 'USER' && (!userId || c.userId?.toString() !== userId)) return false;
      if (c.level === 'ACCOUNT_TYPE' && (!accountTypeId || c.accountTypeId?.toString() !== accountTypeId)) return false;
      return true;
    });
    console.log('All charges count:', charges.length, 'With spread (filtered):', chargesWithSpread.length)
    
    // Debug: Log all charges with spread
    chargesWithSpread.forEach(c => {
      console.log(`[Spread Charge] Level: ${c.level}, Symbol: ${c.instrumentSymbol}, Segment: ${c.segment}, Value: ${c.spreadValue}`)
    })
    
    // Build a map of symbol -> spread (respecting hierarchy)
    const spreadMap = {}
    
    // Priority order: USER > INSTRUMENT > ACCOUNT_TYPE > SEGMENT > GLOBAL
    const priorityOrder = { 'USER': 1, 'INSTRUMENT': 2, 'ACCOUNT_TYPE': 3, 'SEGMENT': 4, 'GLOBAL': 5 };
    
    const applySpread = (symbol, charge) => {
      const existing = spreadMap[symbol];
      if (!existing || priorityOrder[charge.level] < priorityOrder[existing.level]) {
        spreadMap[symbol] = {
          spread: charge.spreadValue,
          spreadType: charge.spreadType,
          level: charge.level
        };
      }
    };

    for (const charge of chargesWithSpread) {
      if (charge.instrumentSymbol) {
        applySpread(charge.instrumentSymbol, charge);
      } else if (charge.segment) {
        const segmentSymbols = {
          'Forex': ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY'],
          'Metals': ['XAUUSD', 'XAGUSD'],
          'Crypto': ['BTCUSDT', 'ETHUSDT', 'LTCUSDT', 'XRPUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'AVAXUSDT', 'LINKUSDT'],
          'Indices': ['US30', 'US500', 'NAS100']
        };
        const symbols = segmentSymbols[charge.segment] || [];
        for (const symbol of symbols) {
          applySpread(symbol, charge);
        }
      } else {
        // Evaluate globally over all symbols for GLOBAL, ACCOUNT_TYPE, and USER level charges that don't specify instrument or segment
        for (const symbol of allSymbols) {
          applySpread(symbol, charge);
        }
      }
    }
    
    console.log('Returning spreads:', JSON.stringify(spreadMap))
    console.log('XAUUSD spread:', spreadMap['XAUUSD'])
    console.log('Total symbols with spread:', Object.keys(spreadMap).length)
    res.json({ success: true, spreads: spreadMap })
  } catch (error) {
    console.error('Error fetching spreads:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/charges - Get all charges with optional filters
router.get('/', async (req, res) => {
  try {
    const { segment, level, instrumentSymbol, userId } = req.query
    
    let query = { isActive: true }
    // Include charges for specific segment OR null segment (applies to all)
    if (segment) {
      query.$or = [{ segment: segment }, { segment: null }]
    }
    if (level) query.level = level
    if (instrumentSymbol) query.instrumentSymbol = instrumentSymbol
    if (userId) query.userId = userId

    const charges = await Charges.find(query)
      .populate('userId', 'name email mobile')
      .populate('accountTypeId', 'name')
      .sort({ level: 1, createdAt: -1 })
    res.json({ success: true, charges })
  } catch (error) {
    console.error('Error fetching charges:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/charges/for-trade - Get charges for a specific trade (used by trading panel)
router.get('/for-trade', async (req, res) => {
  try {
    const { userId, symbol, segment, accountTypeId } = req.query
    
    if (!symbol) {
      return res.status(400).json({ success: false, message: 'Symbol is required' })
    }
    
    const charges = await Charges.getChargesForTrade(userId, symbol, segment, accountTypeId)
    res.json({ success: true, charges })
  } catch (error) {
    console.error('Error fetching charges for trade:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/charges/:id - Get single charge
router.get('/:id', async (req, res) => {
  try {
    const charge = await Charges.findById(req.params.id)
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge not found' })
    }
    res.json({ success: true, charge })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/charges - Create new charge
router.post('/', async (req, res) => {
  try {
    const {
      level,
      userId,
      instrumentSymbol,
      segment,
      accountTypeId,
      spreadType,
      spreadValue,
      commissionType,
      commissionValue,
      commissionOnBuy,
      commissionOnSell,
      commissionOnClose,
      swapLong,
      swapShort,
      swapType
    } = req.body

    if (!level) {
      return res.status(400).json({ success: false, message: 'Level is required' })
    }

    const charge = await Charges.create({
      level,
      userId: userId && userId !== '' ? userId : null,
      instrumentSymbol: instrumentSymbol && instrumentSymbol !== '' ? instrumentSymbol : null,
      segment: segment && segment !== '' ? segment : null,
      accountTypeId: accountTypeId && accountTypeId !== '' ? accountTypeId : null,
      spreadType: spreadType || 'FIXED',
      spreadValue: spreadValue || 0,
      commissionType: commissionType || 'PER_LOT',
      commissionValue: commissionValue || 0,
      commissionOnBuy: commissionOnBuy !== false,
      commissionOnSell: commissionOnSell !== false,
      commissionOnClose: commissionOnClose || false,
      swapLong: swapLong || 0,
      swapShort: swapShort || 0,
      swapType: swapType || 'POINTS',
      isActive: true
    })

    // Sync spread to AccountType if this is an ACCOUNT_TYPE level charge
    if (level === 'ACCOUNT_TYPE' && accountTypeId && spreadValue > 0) {
      await AccountType.findByIdAndUpdate(accountTypeId, { 
        minSpread: spreadValue,
        commission: commissionValue || 0
      })
      console.log(`Synced spread ${spreadValue} and commission ${commissionValue || 0} to AccountType ${accountTypeId}`)
    }

    res.json({ success: true, message: 'Charge created', charge })
  } catch (error) {
    console.error('Error creating charge:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/charges/:id - Update charge
router.put('/:id', async (req, res) => {
  try {
    const {
      level,
      userId,
      instrumentSymbol,
      segment,
      accountTypeId,
      spreadType,
      spreadValue,
      commissionType,
      commissionValue,
      commissionOnBuy,
      commissionOnSell,
      commissionOnClose,
      swapLong,
      swapShort,
      swapType,
      isActive
    } = req.body

    const charge = await Charges.findById(req.params.id)
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge not found' })
    }

    if (level !== undefined) charge.level = level
    if (userId !== undefined) charge.userId = userId && userId !== '' ? userId : null
    if (instrumentSymbol !== undefined) charge.instrumentSymbol = instrumentSymbol && instrumentSymbol !== '' ? instrumentSymbol : null
    if (segment !== undefined) charge.segment = segment && segment !== '' ? segment : null
    if (accountTypeId !== undefined) charge.accountTypeId = accountTypeId && accountTypeId !== '' ? accountTypeId : null
    if (spreadType !== undefined) charge.spreadType = spreadType
    if (spreadValue !== undefined) charge.spreadValue = spreadValue
    if (commissionType !== undefined) charge.commissionType = commissionType
    if (commissionValue !== undefined) charge.commissionValue = commissionValue
    if (commissionOnBuy !== undefined) charge.commissionOnBuy = commissionOnBuy
    if (commissionOnSell !== undefined) charge.commissionOnSell = commissionOnSell
    if (commissionOnClose !== undefined) charge.commissionOnClose = commissionOnClose
    if (swapLong !== undefined) charge.swapLong = swapLong
    if (swapShort !== undefined) charge.swapShort = swapShort
    if (swapType !== undefined) charge.swapType = swapType
    if (isActive !== undefined) charge.isActive = isActive

    await charge.save()

    // Sync spread to AccountType if this is an ACCOUNT_TYPE level charge
    if (charge.level === 'ACCOUNT_TYPE' && charge.accountTypeId) {
      const updateData = {}
      if (charge.spreadValue > 0) updateData.minSpread = charge.spreadValue
      if (charge.commissionValue > 0) updateData.commission = charge.commissionValue
      
      if (Object.keys(updateData).length > 0) {
        await AccountType.findByIdAndUpdate(charge.accountTypeId, updateData)
        console.log(`Synced spread/commission to AccountType ${charge.accountTypeId}:`, updateData)
      }
    }

    res.json({ success: true, message: 'Charge updated', charge })
  } catch (error) {
    console.error('Error updating charge:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/charges/:id - Delete charge
router.delete('/:id', async (req, res) => {
  try {
    const charge = await Charges.findById(req.params.id)
    if (!charge) {
      return res.status(404).json({ success: false, message: 'Charge not found' })
    }

    await Charges.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Charge deleted' })
  } catch (error) {
    console.error('Error deleting charge:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
