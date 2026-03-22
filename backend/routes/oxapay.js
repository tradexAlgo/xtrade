import express from 'express'
import crypto from 'crypto'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import User from '../models/User.js'
import { sendTemplateEmail } from '../services/emailService.js'
import EmailSettings from '../models/EmailSettings.js'
import Bonus from '../models/Bonus.js'
import UserBonus from '../models/UserBonus.js'

const router = express.Router()

const OXAPAY_API_URL = 'https://api.oxapay.com/v1'

// POST /api/oxapay/create-payment - Create OxaPay invoice for deposit
router.post('/create-payment', async (req, res) => {
  try {
    const { userId, amount, currency } = req.body

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid userId or amount' })
    }

    const merchantApiKey = process.env.OXAPAY_MERCHANT_API_KEY
    if (!merchantApiKey) {
      return res.status(500).json({ success: false, message: 'OxaPay merchant API key not configured' })
    }

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId })
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 })
      await wallet.save()
    }

    // Check if first deposit for bonus
    const userTransactions = await Transaction.find({ userId, type: 'Deposit', status: 'Approved' })
    const isFirstDeposit = userTransactions.length === 0

    // Calculate bonus
    let bonusAmount = 0
    let applicableBonus = null
    try {
      const bonuses = await Bonus.find({ status: 'ACTIVE' }).sort({ createdAt: -1 })
      for (const bonus of bonuses) {
        if (isFirstDeposit && bonus.type !== 'FIRST_DEPOSIT') continue
        if (!isFirstDeposit && bonus.type === 'FIRST_DEPOSIT') continue
        if (amount >= bonus.minDeposit) {
          if (bonus.usageLimit && bonus.usedCount >= bonus.usageLimit) continue
          let calculatedBonus = 0
          if (bonus.bonusType === 'PERCENTAGE') {
            calculatedBonus = amount * (bonus.bonusValue / 100)
            if (bonus.maxBonus && calculatedBonus > bonus.maxBonus) calculatedBonus = bonus.maxBonus
          } else {
            calculatedBonus = bonus.bonusValue
          }
          if (calculatedBonus > bonusAmount) {
            bonusAmount = calculatedBonus
            applicableBonus = bonus
          }
        }
      }
    } catch (e) {
      console.error('Bonus calculation error:', e)
    }

    // Create pending transaction
    const transaction = new Transaction({
      userId,
      walletId: wallet._id,
      type: 'Deposit',
      amount,
      paymentMethod: 'Crypto',
      status: 'Pending',
      bonusAmount,
      totalAmount: amount + bonusAmount,
      bonusId: applicableBonus?._id || null,
      transactionRef: ''
    })
    await transaction.save()

    // Update pending deposits
    wallet.pendingDeposits += amount
    await wallet.save()

    // Create OxaPay invoice
    const backendUrl = process.env.BACKEND_URL || 'https://extrede.com/api'
    const frontendUrl = process.env.FRONTEND_URL || 'https://extrede.com'
    const callbackUrl = `${backendUrl}/api/oxapay/webhook`
    const returnUrl = `${frontendUrl}/wallet?deposit=success`

    const invoiceData = {
      amount: amount,
      currency: currency || 'USD',
      lifetime: 60,
      fee_paid_by_payer: 1,
      under_paid_coverage: 2.5,
      callback_url: callbackUrl,
      return_url: returnUrl,
      order_id: transaction._id.toString(),
      description: `Extrede Deposit - $${amount}`,
      sandbox: process.env.OXAPAY_SANDBOX === 'true'
    }

    const oxaRes = await fetch(`${OXAPAY_API_URL}/payment/invoice`, {
      method: 'POST',
      headers: {
        'merchant_api_key': merchantApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    })

    const oxaData = await oxaRes.json()

    if (oxaData.status === 200 && oxaData.data) {
      transaction.transactionRef = `OXA-${oxaData.data.track_id}`
      await transaction.save()

      // Send deposit pending email
      try {
        const user = await User.findById(userId)
        if (user && user.email) {
          const settings = await EmailSettings.findOne()
          await sendTemplateEmail('deposit_pending', user.email, {
            firstName: user.firstName || user.email.split('@')[0],
            amount: amount.toFixed(2),
            transactionId: transaction._id.toString(),
            paymentMethod: 'Crypto (OxaPay)',
            date: new Date().toLocaleString(),
            platformName: settings?.platformName || 'Extrede',
            supportEmail: settings?.supportEmail || 'support@Extrede.com',
            year: new Date().getFullYear().toString()
          })
        }
      } catch (emailError) {
        console.error('Error sending deposit pending email:', emailError)
      }

      res.json({
        success: true,
        paymentUrl: oxaData.data.payment_url,
        trackId: oxaData.data.track_id,
        transactionId: transaction._id,
        bonusInfo: { bonusAmount, applicableBonus, totalAmount: amount + bonusAmount }
      })
    } else {
      // Rollback transaction on failure
      wallet.pendingDeposits -= amount
      await wallet.save()
      await Transaction.findByIdAndDelete(transaction._id)

      res.status(400).json({
        success: false,
        message: oxaData.message || 'Failed to create OxaPay payment',
        error: oxaData.error
      })
    }
  } catch (error) {
    console.error('OxaPay create payment error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/oxapay/webhook - OxaPay webhook callback (auto-credits wallet on payment confirmation)
router.post('/webhook', async (req, res) => {
  try {
    const merchantApiKey = process.env.OXAPAY_MERCHANT_API_KEY
    const payoutApiKey = process.env.OXAPAY_PAYOUT_API_KEY

    // Validate HMAC signature
    const hmacHeader = req.headers['hmac']
    if (hmacHeader && merchantApiKey) {
      const rawBody = JSON.stringify(req.body)
      const merchantHmac = crypto.createHmac('sha512', merchantApiKey).update(rawBody).digest('hex')
      const payoutHmac = payoutApiKey ? crypto.createHmac('sha512', payoutApiKey).update(rawBody).digest('hex') : ''

      if (hmacHeader !== merchantHmac && hmacHeader !== payoutHmac) {
        console.error('[OxaPay Webhook] Invalid HMAC signature')
        return res.status(403).json({ message: 'Invalid signature' })
      }
    }

    const { track_id, status, type, amount, order_id } = req.body
    console.log(`[OxaPay Webhook] track_id: ${track_id}, status: ${status}, type: ${type}, amount: ${amount}, order_id: ${order_id}`)

    // Handle payment (deposit) webhooks
    if (type === 'invoice' || type === 'white_label' || type === 'payment_link') {
      if (status === 'Paid') {
        const transaction = await Transaction.findById(order_id)
        if (!transaction) {
          console.error(`[OxaPay Webhook] Transaction not found: ${order_id}`)
          return res.json({ status: 'ok' })
        }

        if (transaction.status !== 'Pending') {
          console.log(`[OxaPay Webhook] Transaction already processed: ${order_id}`)
          return res.json({ status: 'ok' })
        }

        // Auto-approve the deposit
        const wallet = await Wallet.findById(transaction.walletId)
        if (!wallet) {
          console.error(`[OxaPay Webhook] Wallet not found for transaction: ${order_id}`)
          return res.json({ status: 'ok' })
        }

        const totalToAdd = transaction.amount + (transaction.bonusAmount || 0)
        wallet.balance += totalToAdd
        if (wallet.pendingDeposits) wallet.pendingDeposits -= transaction.amount

        transaction.status = 'Approved'
        transaction.processedAt = new Date()
        transaction.adminRemarks = `Auto-approved via OxaPay (track: ${track_id})`

        await wallet.save()
        await transaction.save()

        // Activate bonus if applicable
        if (transaction.bonusAmount > 0 && transaction.bonusId) {
          try {
            const bonus = await Bonus.findById(transaction.bonusId)
            const wagerMultiplier = bonus?.wagerRequirement || 30
            const durationDays = bonus?.duration || 30

            const userBonus = new UserBonus({
              userId: transaction.userId,
              bonusId: transaction.bonusId,
              depositId: transaction._id,
              bonusAmount: transaction.bonusAmount,
              wagerRequirement: wagerMultiplier * transaction.bonusAmount,
              remainingWager: wagerMultiplier * transaction.bonusAmount,
              status: 'ACTIVE',
              activatedAt: new Date(),
              expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
              maxWithdrawal: bonus?.maxWithdrawal || null
            })
            await userBonus.save()
            await Bonus.findByIdAndUpdate(transaction.bonusId, { $inc: { usedCount: 1 } })
          } catch (bonusError) {
            console.error('[OxaPay Webhook] Bonus activation error:', bonusError)
          }
        }

        // Send success email
        try {
          const user = await User.findById(transaction.userId)
          if (user?.email) {
            const settings = await EmailSettings.findOne()
            await sendTemplateEmail('deposit_success', user.email, {
              firstName: user.firstName || user.email.split('@')[0],
              amount: transaction.amount.toFixed(2),
              transactionId: transaction._id.toString(),
              paymentMethod: 'Crypto (OxaPay)',
              date: new Date().toLocaleString(),
              newBalance: wallet.balance.toFixed(2),
              platformName: settings?.platformName || 'Extrede',
              supportEmail: settings?.supportEmail || 'support@Extrede.com',
              year: new Date().getFullYear().toString()
            })
          }
        } catch (emailError) {
          console.error('[OxaPay Webhook] Email error:', emailError)
        }

        console.log(`[OxaPay Webhook] Deposit auto-approved: $${transaction.amount} for user ${transaction.userId}`)
      }

      // Handle expired payments
      if (status === 'Expired') {
        const transaction = await Transaction.findById(order_id)
        if (transaction && transaction.status === 'Pending') {
          const wallet = await Wallet.findById(transaction.walletId)
          if (wallet) {
            if (wallet.pendingDeposits) wallet.pendingDeposits -= transaction.amount
            await wallet.save()
          }
          transaction.status = 'Rejected'
          transaction.adminRemarks = `Payment expired (OxaPay track: ${track_id})`
          transaction.processedAt = new Date()
          await transaction.save()
          console.log(`[OxaPay Webhook] Payment expired: ${order_id}`)
        }
      }
    }

    // Handle payout (withdrawal) webhooks
    if (type === 'payout') {
      const transaction = await Transaction.findOne({ transactionRef: `OXA-PAYOUT-${track_id}` })
      if (transaction) {
        if (status === 'Complete') {
          transaction.status = 'Completed'
          transaction.processedAt = new Date()
          transaction.adminRemarks = (transaction.adminRemarks || '') + ` | Payout completed (track: ${track_id})`
          await transaction.save()
          console.log(`[OxaPay Webhook] Payout completed: ${track_id}`)
        } else if (status === 'Failed') {
          // Refund the withdrawal
          const wallet = await Wallet.findOne({ userId: transaction.userId })
          if (wallet) {
            wallet.balance += transaction.amount
            await wallet.save()
          }
          transaction.status = 'Rejected'
          transaction.adminRemarks = (transaction.adminRemarks || '') + ` | Payout failed (track: ${track_id})`
          transaction.processedAt = new Date()
          await transaction.save()
          console.log(`[OxaPay Webhook] Payout failed, refunded: ${track_id}`)
        }
      }
    }

    res.json({ status: 'ok' })
  } catch (error) {
    console.error('[OxaPay Webhook] Error:', error)
    res.json({ status: 'ok' })
  }
})

// POST /api/oxapay/create-payout - Create OxaPay payout for crypto withdrawal
router.post('/create-payout', async (req, res) => {
  try {
    const { transactionId, address, network, currency } = req.body

    const payoutApiKey = process.env.OXAPAY_PAYOUT_API_KEY
    if (!payoutApiKey) {
      return res.status(500).json({ success: false, message: 'OxaPay payout API key not configured' })
    }

    const transaction = await Transaction.findById(transactionId)
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' })
    }

    const backendUrl = process.env.BACKEND_URL || 'https://extrede.com/api'

    const payoutData = {
      address: address || transaction.cryptoAddress,
      amount: transaction.amount,
      currency: currency || transaction.cryptoCurrency || 'USDT',
      network: network || transaction.cryptoNetwork,
      callback_url: `${backendUrl}/api/oxapay/webhook`,
      description: `Extrede Withdrawal - ${transaction._id}`
    }

    const oxaRes = await fetch(`${OXAPAY_API_URL}/payout`, {
      method: 'POST',
      headers: {
        'payout_api_key': payoutApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payoutData)
    })

    const oxaData = await oxaRes.json()

    if (oxaData.status === 200 && oxaData.data) {
      transaction.transactionRef = `OXA-PAYOUT-${oxaData.data.track_id}`
      transaction.adminRemarks = (transaction.adminRemarks || '') + ` | OxaPay payout initiated (track: ${oxaData.data.track_id})`
      await transaction.save()

      res.json({
        success: true,
        message: 'Payout initiated via OxaPay',
        trackId: oxaData.data.track_id
      })
    } else {
      res.status(400).json({
        success: false,
        message: oxaData.message || 'Failed to create payout',
        error: oxaData.error
      })
    }
  } catch (error) {
    console.error('OxaPay payout error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Cleanup: Auto-reject stale pending crypto deposits (older than 70 minutes - invoice lifetime is 60 min + 10 min buffer)
const cleanupStaleCryptoDeposits = async () => {
  try {
    const cutoff = new Date(Date.now() - 70 * 60 * 1000) // 70 minutes ago
    const staleTransactions = await Transaction.find({
      type: 'Deposit',
      paymentMethod: 'Crypto',
      status: 'Pending',
      createdAt: { $lt: cutoff }
    })

    for (const txn of staleTransactions) {
      const wallet = await Wallet.findById(txn.walletId)
      if (wallet && wallet.pendingDeposits) {
        wallet.pendingDeposits -= txn.amount
        await wallet.save()
      }
      txn.status = 'Rejected'
      txn.adminRemarks = 'Auto-rejected: Payment expired (webhook not received)'
      txn.processedAt = new Date()
      await txn.save()
      console.log(`[OxaPay Cleanup] Auto-rejected stale deposit: ${txn._id}`)
    }

    if (staleTransactions.length > 0) {
      console.log(`[OxaPay Cleanup] Cleaned up ${staleTransactions.length} stale deposits`)
    }
  } catch (error) {
    console.error('[OxaPay Cleanup] Error:', error)
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupStaleCryptoDeposits, 5 * 60 * 1000)
// Also run once on startup
setTimeout(cleanupStaleCryptoDeposits, 10 * 1000)

// GET /api/oxapay/status - Check if OxaPay is configured
router.get('/status', async (req, res) => {
  const merchantKey = process.env.OXAPAY_MERCHANT_API_KEY
  const payoutKey = process.env.OXAPAY_PAYOUT_API_KEY
  res.json({
    success: true,
    depositEnabled: !!merchantKey,
    withdrawalEnabled: !!payoutKey,
    sandbox: process.env.OXAPAY_SANDBOX === 'true'
  })
})

export default router
