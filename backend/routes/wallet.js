import express from 'express'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import TradingAccount from '../models/TradingAccount.js'
import User from '../models/User.js'
import AdminWallet from '../models/AdminWallet.js'
import AdminWalletTransaction from '../models/AdminWalletTransaction.js'
import Bonus from '../models/Bonus.js'
import UserBonus from '../models/UserBonus.js'
import { sendTemplateEmail } from '../services/emailService.js'
import EmailSettings from '../models/EmailSettings.js'

const router = express.Router()

// GET /api/wallet/:userId - Get user wallet
router.get('/:userId', async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.params.userId })
    if (!wallet) {
      wallet = new Wallet({ userId: req.params.userId, balance: 0 })
      await wallet.save()
    }
    res.json({ wallet })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wallet', error: error.message })
  }
})

// POST /api/wallet/deposit - Create deposit request
router.post('/deposit', async (req, res) => {
  try {
    const { userId, amount, paymentMethod, transactionRef, screenshot, bonusTradingAccountId } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' })
    }

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId })
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 })
      await wallet.save()
    }

    // Check if this is user's first deposit
    const userTransactions = await Transaction.find({ userId, type: 'Deposit', status: 'Approved' })
    const isFirstDeposit = userTransactions.length === 0

    // Calculate applicable bonus
    let bonusAmount = 0
    let applicableBonus = null

    try {
      // Get all bonuses (simplified query like in bonus routes)
      const bonuses = await Bonus.find({}).sort({ createdAt: -1 })
      console.log('Deposit bonus calculation - found', bonuses.length, 'bonuses, isFirstDeposit:', isFirstDeposit)

      // Find the best applicable bonus
      for (const bonus of bonuses) {
        // Check if bonus is active
        if (bonus.status !== 'ACTIVE') continue
        
        // Check bonus type matches first deposit status
        if (isFirstDeposit && bonus.type !== 'FIRST_DEPOSIT') continue
        if (!isFirstDeposit && bonus.type === 'FIRST_DEPOSIT') continue
        
        if (amount >= bonus.minDeposit) {
          if (bonus.usageLimit && bonus.usedCount >= bonus.usageLimit) {
            continue // Skip if usage limit reached
          }

          let calculatedBonus = 0
          if (bonus.bonusType === 'PERCENTAGE') {
            calculatedBonus = amount * (bonus.bonusValue / 100)
            if (bonus.maxBonus && calculatedBonus > bonus.maxBonus) {
              calculatedBonus = bonus.maxBonus
            }
          } else {
            calculatedBonus = bonus.bonusValue
          }

          if (calculatedBonus > bonusAmount) {
            bonusAmount = calculatedBonus
            applicableBonus = bonus
            console.log('Found applicable bonus:', bonus.name, 'bonusAmount:', calculatedBonus)
          }
        }
      }
    } catch (bonusError) {
      console.error('Bonus calculation error:', bonusError)
      // Continue without bonus if calculation fails
    }

    console.log('Final deposit bonus:', { bonusAmount, applicableBonus: applicableBonus?.name, totalAmount: amount + bonusAmount })

    // Create transaction
    const transaction = new Transaction({
      userId,
      walletId: wallet._id,
      type: 'Deposit',
      amount,
      paymentMethod,
      transactionRef,
      screenshot,
      status: 'Pending',
      bonusAmount,
      totalAmount: amount + bonusAmount,
      bonusId: applicableBonus?._id || null,
      bonusTradingAccountId: bonusTradingAccountId || null
    })
    await transaction.save()

    // Update pending deposits
    wallet.pendingDeposits += amount
    await wallet.save()

    // Send deposit pending email
    try {
      const user = await User.findById(userId)
      if (user && user.email) {
        const settings = await EmailSettings.findOne()
        await sendTemplateEmail('deposit_pending', user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          amount: amount.toFixed(2),
          transactionId: transaction._id.toString(),
          paymentMethod: paymentMethod || 'Bank Transfer',
          date: new Date().toLocaleString(),
          platformName: settings?.platformName || 'Extrede',
          supportEmail: settings?.supportEmail || 'support@Extrede.com',
          year: new Date().getFullYear().toString()
        })
      }
    } catch (emailError) {
      console.error('Error sending deposit pending email:', emailError)
    }

    res.status(201).json({ 
      message: 'Deposit request submitted', 
      transaction,
      bonusInfo: {
        bonusAmount,
        applicableBonus,
        totalAmount: amount + bonusAmount
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error creating deposit', error: error.message })
  }
})

// POST /api/wallet/withdraw - Create withdrawal request
router.post('/withdraw', async (req, res) => {
  try {
    const { userId, amount, paymentMethod, bankAccountId, bankAccountDetails, cryptoAddress, cryptoCurrency, cryptoNetwork } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' })
    }

    // Use atomic operation to check and deduct balance in one step (prevents race conditions)
    const wallet = await Wallet.findOneAndUpdate(
      { userId, balance: { $gte: amount } }, // Only update if balance >= amount
      { 
        $inc: { 
          balance: -amount, 
          pendingWithdrawals: amount 
        } 
      },
      { new: true }
    )

    if (!wallet) {
      // Check if wallet exists or just insufficient balance
      const existingWallet = await Wallet.findOne({ userId })
      if (!existingWallet) {
        return res.status(404).json({ message: 'Wallet not found' })
      }
      return res.status(400).json({ message: `Insufficient balance. Available: $${existingWallet.balance.toFixed(2)}` })
    }

    // Create transaction with bank account details or crypto details
    const transaction = new Transaction({
      userId,
      walletId: wallet._id,
      type: 'Withdrawal',
      amount,
      paymentMethod,
      status: 'Pending',
      bankAccountId,
      bankAccountDetails,
      cryptoAddress: cryptoAddress || '',
      cryptoCurrency: cryptoCurrency || '',
      cryptoNetwork: cryptoNetwork || ''
    })
    await transaction.save()

    // Send withdrawal pending email
    try {
      const user = await User.findById(userId)
      if (user && user.email) {
        const settings = await EmailSettings.findOne()
        await sendTemplateEmail('withdrawal_pending', user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          amount: amount.toFixed(2),
          transactionId: transaction._id.toString(),
          paymentMethod: paymentMethod || 'Bank Transfer',
          date: new Date().toLocaleString(),
          platformName: settings?.platformName || 'Extrede',
          supportEmail: settings?.supportEmail || 'support@Extrede.com',
          year: new Date().getFullYear().toString()
        })
      }
    } catch (emailError) {
      console.error('Error sending withdrawal pending email:', emailError)
    }

    res.status(201).json({ message: 'Withdrawal request submitted', transaction })
  } catch (error) {
    res.status(500).json({ message: 'Error creating withdrawal', error: error.message })
  }
})

// POST /api/wallet/transfer-to-trading - Transfer from wallet to trading account
router.post('/transfer-to-trading', async (req, res) => {
  try {
    const { userId, tradingAccountId, amount } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' })
    }

    // Get wallet
    const wallet = await Wallet.findOne({ userId })
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' })
    }

    // Check wallet balance
    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient wallet balance' })
    }

    // Get trading account
    const tradingAccount = await TradingAccount.findById(tradingAccountId)
    if (!tradingAccount) {
      return res.status(404).json({ message: 'Trading account not found' })
    }

    // Verify ownership
    if (tradingAccount.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Transfer funds
    wallet.balance -= amount
    tradingAccount.balance += amount

    await wallet.save()
    await tradingAccount.save()

    res.json({ 
      message: 'Funds transferred successfully',
      walletBalance: wallet.balance,
      tradingAccountBalance: tradingAccount.balance
    })
  } catch (error) {
    res.status(500).json({ message: 'Error transferring funds', error: error.message })
  }
})

// POST /api/wallet/transfer-from-trading - Transfer from trading account to wallet
router.post('/transfer-from-trading', async (req, res) => {
  try {
    const { userId, tradingAccountId, amount } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' })
    }

    // Get trading account
    const tradingAccount = await TradingAccount.findById(tradingAccountId)
    if (!tradingAccount) {
      return res.status(404).json({ message: 'Trading account not found' })
    }

    // Verify ownership
    if (tradingAccount.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Check trading account balance
    if (tradingAccount.balance < amount) {
      return res.status(400).json({ message: 'Insufficient trading account balance' })
    }

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId })
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 })
    }

    // Transfer funds
    tradingAccount.balance -= amount
    wallet.balance += amount

    await tradingAccount.save()
    await wallet.save()

    res.json({ 
      message: 'Funds transferred successfully',
      walletBalance: wallet.balance,
      tradingAccountBalance: tradingAccount.balance
    })
  } catch (error) {
    res.status(500).json({ message: 'Error transferring funds', error: error.message })
  }
})

// GET /api/wallet/transactions/:userId - Get user transactions
router.get('/transactions/:userId', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
    res.json({ transactions })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message })
  }
})

// GET /api/wallet/transactions/all - Get all transactions (admin)
router.get('/admin/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
    res.json({ transactions })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message })
  }
})

// PUT /api/wallet/admin/approve/:id - Approve transaction (admin)
router.put('/admin/approve/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    if (transaction.status !== 'Pending') {
      return res.status(400).json({ message: 'Transaction already processed' })
    }

    const wallet = await Wallet.findById(transaction.walletId)

    if (transaction.type === 'Deposit') {
      // Add deposit amount to wallet balance (withdrawable)
      const depositAmount = transaction.amount
      const bonusAmount = transaction.bonusAmount || 0
      console.log('Approving deposit - amount:', depositAmount, 'bonus:', bonusAmount, 'bonusTradingAccountId:', transaction.bonusTradingAccountId)
      wallet.balance += depositAmount
      
      // Add bonus to trading account credit if specified, otherwise to wallet bonusBalance
      if (bonusAmount > 0) {
        if (transaction.bonusTradingAccountId) {
          // Add bonus to trading account credit (non-withdrawable)
          const TradingAccount = (await import('../models/TradingAccount.js')).default
          const tradingAccount = await TradingAccount.findById(transaction.bonusTradingAccountId)
          if (tradingAccount) {
            tradingAccount.credit = (tradingAccount.credit || 0) + bonusAmount
            await tradingAccount.save()
            console.log(`Bonus $${bonusAmount} added to trading account ${tradingAccount.accountId} credit`)
          } else {
            // Fallback to wallet bonusBalance if account not found
            wallet.bonusBalance = (wallet.bonusBalance || 0) + bonusAmount
            console.log(`Trading account not found, bonus added to wallet bonusBalance`)
          }
        } else {
          // No trading account selected, add to wallet pendingBonus (will auto-transfer when account created)
          wallet.pendingBonus = (wallet.pendingBonus || 0) + bonusAmount
          console.log(`No trading account selected, bonus added to wallet pendingBonus`)
        }
      }
      if (wallet.pendingDeposits) wallet.pendingDeposits -= transaction.amount
    } else {
      if (wallet.pendingWithdrawals) wallet.pendingWithdrawals -= transaction.amount
    }

    transaction.status = 'Approved'
    transaction.processedAt = new Date()

    // If crypto withdrawal, trigger OxaPay payout automatically
    if (transaction.type === 'Withdrawal' && transaction.paymentMethod === 'Crypto' && transaction.cryptoAddress) {
      try {
        const payoutApiKey = process.env.OXAPAY_PAYOUT_API_KEY
        if (payoutApiKey) {
          const backendUrl = process.env.BACKEND_URL || 'https://extrede.com/api'
          const payoutData = {
            address: transaction.cryptoAddress,
            amount: transaction.amount,
            currency: transaction.cryptoCurrency || 'USDT',
            network: transaction.cryptoNetwork,
            callback_url: `${backendUrl}/api/oxapay/webhook`,
            description: `Extrede Withdrawal - ${transaction._id}`
          }

          const oxaRes = await fetch('https://api.oxapay.com/v1/payout', {
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
            console.log(`[OxaPay Payout] Initiated for transaction ${transaction._id}, track: ${oxaData.data.track_id}`)
          } else {
            console.error('[OxaPay Payout] Failed:', oxaData)
            transaction.adminRemarks = (transaction.adminRemarks || '') + ` | OxaPay payout failed: ${oxaData.message || 'Unknown error'}`
          }
        }
      } catch (payoutError) {
        console.error('[OxaPay Payout] Error:', payoutError)
        transaction.adminRemarks = (transaction.adminRemarks || '') + ` | OxaPay payout error: ${payoutError.message}`
      }
    }

    await wallet.save()
    await transaction.save()

    // Activate bonus if this is a deposit with bonus
    if (transaction.type === 'Deposit' && transaction.bonusAmount > 0 && transaction.bonusId) {
      try {
        // Get the bonus to use its actual wager requirement and duration
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

        // Update bonus usage count
        await Bonus.findByIdAndUpdate(transaction.bonusId, { $inc: { usedCount: 1 } })

        console.log(`Bonus activated: $${transaction.bonusAmount} (${wagerMultiplier}x wager) for user ${transaction.userId}`)
      } catch (bonusError) {
        console.error('Error activating bonus:', bonusError)
        // Don't fail the transaction if bonus activation fails
      }
    }

    // Send email notification
    try {
      const user = await User.findById(transaction.userId)
      if (user && user.email) {
        const settings = await EmailSettings.findOne()
        const templateSlug = transaction.type === 'Deposit' ? 'deposit_success' : 'withdrawal_success'
        await sendTemplateEmail(templateSlug, user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          amount: transaction.amount.toFixed(2),
          transactionId: transaction._id.toString(),
          paymentMethod: transaction.paymentMethod || 'Wallet',
          date: new Date().toLocaleString(),
          newBalance: wallet.balance.toFixed(2),
          platformName: settings?.platformName || 'Extrede',
          supportEmail: settings?.supportEmail || 'support@Extrede.com',
          year: new Date().getFullYear().toString()
        })
      }
    } catch (emailError) {
      console.error('Error sending transaction email:', emailError)
    }

    res.json({ message: 'Transaction approved', transaction })
  } catch (error) {
    res.status(500).json({ message: 'Error approving transaction', error: error.message })
  }
})

// PUT /api/wallet/admin/reject/:id - Reject transaction (admin)
router.put('/admin/reject/:id', async (req, res) => {
  try {
    const { reason } = req.body
    const transaction = await Transaction.findById(req.params.id)
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    if (transaction.status !== 'Pending') {
      return res.status(400).json({ message: 'Transaction already processed' })
    }

    const wallet = await Wallet.findById(transaction.walletId)
    const user = await User.findById(transaction.userId)

    if (transaction.type === 'Deposit') {
      if (wallet.pendingDeposits) wallet.pendingDeposits -= transaction.amount
    } else {
      // Refund withdrawal amount
      wallet.balance += transaction.amount
      if (wallet.pendingWithdrawals) wallet.pendingWithdrawals -= transaction.amount
    }

    transaction.status = 'Rejected'
    transaction.processedAt = new Date()
    transaction.adminRemarks = reason || 'Rejected by admin'

    await wallet.save()
    await transaction.save()

    // Send email notification to user for rejected deposit
    if (transaction.type === 'Deposit' && user) {
      try {
        const emailSubject = `Deposit Rejected - ${transaction._id}`
        const emailContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #dc2626;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${process.env.LOGO_URL || 'https://extrede.com/extrede-logo.png'}" alt="Extrede" style="height: 50px; width: auto; margin-bottom: 15px;" />
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Extrede</h1>
      </div>
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: #dc2626; color: #fff; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">✗ Deposit Rejected</span>
      </div>
      <h2 style="color: #dc2626; margin: 0 0 20px; font-size: 20px; text-align: center;">Deposit Not Approved</h2>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Hi ${user.firstName || 'User'},</p>
      <p style="color: #aaa; margin: 0 0 20px; line-height: 1.6;">Your deposit of $${transaction.amount.toFixed(2)} has been rejected.</p>
      <div style="background: #1a1a2e; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="color: #888; font-size: 14px; margin: 0 0 10px;">Transaction Details:</p>
        <p style="color: #aaa; font-size: 14px; margin: 0 0 5px;">Amount: $${transaction.amount.toFixed(2)}</p>
        <p style="color: #aaa; font-size: 14px; margin: 0 0 5px;">Transaction ID: ${transaction._id}</p>
        <p style="color: #aaa; font-size: 14px; margin: 0 0 5px;">Date: ${new Date().toLocaleDateString()}</p>
        ${reason ? `<p style="color: #aaa; font-size: 14px; margin: 0;">Reason: ${reason}</p>` : ''}
      </div>
      <p style="color: #888; font-size: 14px; margin: 0 0 30px;">If you have any questions, please contact our support team.</p>
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${process.env.FRONTEND_URL || 'https://extrede.com'}/user/login" style="display: inline-block; background: #dc2626; color: #fff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold;">Contact Support</a>
      </div>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
      <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">© ${new Date().getFullYear()} Extrede. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

        await sendTemplateEmail(
          user.email,
          emailSubject,
          emailContent
        )
        console.log(`[Email] Deposit rejection sent to ${user.email}`)
      } catch (emailError) {
        console.error('[Email] Error sending deposit rejection email:', emailError)
      }
    }

    res.json({ message: 'Transaction rejected', transaction })
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting transaction', error: error.message })
  }
})

// PUT /api/wallet/transaction/:id/approve - Approve transaction (admin)
router.put('/transaction/:id/approve', async (req, res) => {
  try {
    const { adminRemarks } = req.body
    const transaction = await Transaction.findById(req.params.id)
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    if (transaction.status !== 'Pending') {
      return res.status(400).json({ message: 'Transaction already processed' })
    }

    const wallet = await Wallet.findById(transaction.walletId)

    if (transaction.type === 'Deposit') {
      // Add deposit amount to wallet balance (withdrawable)
      const depositAmount = transaction.amount
      const bonusAmount = transaction.bonusAmount || 0
      console.log('Approving deposit - amount:', depositAmount, 'bonus:', bonusAmount, 'bonusTradingAccountId:', transaction.bonusTradingAccountId)
      wallet.balance += depositAmount
      
      // Add bonus to trading account credit if specified, otherwise to wallet bonusBalance
      if (bonusAmount > 0) {
        if (transaction.bonusTradingAccountId) {
          // Add bonus to trading account credit (non-withdrawable)
          const TradingAccount = (await import('../models/TradingAccount.js')).default
          const tradingAccount = await TradingAccount.findById(transaction.bonusTradingAccountId)
          if (tradingAccount) {
            tradingAccount.credit = (tradingAccount.credit || 0) + bonusAmount
            await tradingAccount.save()
            console.log(`Bonus $${bonusAmount} added to trading account ${tradingAccount.accountId} credit`)
          } else {
            // Fallback to wallet bonusBalance if account not found
            wallet.bonusBalance = (wallet.bonusBalance || 0) + bonusAmount
            console.log(`Trading account not found, bonus added to wallet bonusBalance`)
          }
        } else {
          // No trading account selected, add to wallet pendingBonus (will auto-transfer when account created)
          wallet.pendingBonus = (wallet.pendingBonus || 0) + bonusAmount
          console.log(`No trading account selected, bonus added to wallet pendingBonus`)
        }
      }
      wallet.pendingDeposits -= transaction.amount
    } else if (transaction.type === 'Withdrawal') {
      // Check if user is a copy trading follower and apply commission to master
      try {
        const CopyFollower = (await import('../models/CopyFollower.js')).default
        const CopyCommission = (await import('../models/CopyCommission.js')).default
        const MasterTrader = (await import('../models/MasterTrader.js')).default
        const TradingAccount = (await import('../models/TradingAccount.js')).default
        
        // Find active copy followers for this user
        const followers = await CopyFollower.find({
          followerId: transaction.userId,
          status: 'ACTIVE'
        }).populate('masterId')
        
        if (followers.length > 0) {
          console.log(`Processing copy trading commission for withdrawal: ${transaction.userId}`)
          
          for (const follower of followers) {
            const master = follower.masterId
            if (!master || !master.approvedCommissionPercentage) continue
            
            const commissionPercentage = master.approvedCommissionPercentage
            const adminSharePercentage = master.adminSharePercentage || 30
            
            // Calculate commission on withdrawal amount
            const totalCommission = transaction.amount * (commissionPercentage / 100)
            const adminShare = totalCommission * (adminSharePercentage / 100)
            const masterShare = totalCommission - adminShare
            
            // Get follower's trading account to deduct commission
            const followerAccount = await TradingAccount.findById(follower.followerAccountId)
            if (followerAccount && followerAccount.balance >= totalCommission) {
              // Deduct commission from follower's trading account
              followerAccount.balance -= totalCommission
              await followerAccount.save()
              
              // Create commission record
              await CopyCommission.create({
                masterId: master._id,
                followerId: follower._id,
                followerUserId: transaction.userId,
                followerAccountId: follower.followerAccountId,
                tradingDay: new Date().toISOString().split('T')[0],
                dailyProfit: 0, // No profit, this is withdrawal commission
                commissionPercentage,
                totalCommission,
                adminShare,
                masterShare,
                adminSharePercentage,
                type: 'WITHDRAWAL',
                relatedTransactionId: transaction._id,
                deductedAt: new Date()
              })
              
              // Update master pending commission
              master.pendingCommission += masterShare
              master.totalCommissionEarned += masterShare
              await master.save()
              
              console.log(`Copy trading commission applied: $${masterShare.toFixed(2)} to master ${master._id}`)
            }
          }
        }
      } catch (copyError) {
        console.error('Error processing copy trading commission on withdrawal:', copyError)
        // Don't fail the withdrawal if commission processing fails
      }
      
      wallet.pendingWithdrawals -= transaction.amount
    }

    transaction.status = 'Approved'
    transaction.adminRemarks = adminRemarks || ''
    transaction.processedAt = new Date()

    // If crypto withdrawal, trigger OxaPay payout automatically
    if (transaction.type === 'Withdrawal' && transaction.paymentMethod === 'Crypto' && transaction.cryptoAddress) {
      try {
        const payoutApiKey = process.env.OXAPAY_PAYOUT_API_KEY
        if (payoutApiKey) {
          // Check OxaPay account balance before processing payout
          console.log(`[OxaPay Balance] Checking balance for withdrawal amount: $${transaction.amount}`)
          
          const balanceRes = await fetch('https://api.oxapay.com/v1/balance', {
            method: 'GET',
            headers: {
              'payout_api_key': payoutApiKey,
              'Content-Type': 'application/json'
            }
          })
          
          const balanceData = await balanceRes.json()
          
          if (balanceData.status === 200 && balanceData.data) {
            const availableBalance = parseFloat(balanceData.data.balance || 0)
            console.log(`[OxaPay Balance] Available balance: $${availableBalance}, Requested: $${transaction.amount}`)
            
            if (availableBalance < transaction.amount) {
              // Insufficient balance in OxaPay account
              const shortage = transaction.amount - availableBalance
              transaction.status = 'Failed'
              transaction.adminRemarks = `Insufficient OxaPay balance. Available: $${availableBalance.toFixed(2)}, Requested: $${transaction.amount.toFixed(2)}, Shortage: $${shortage.toFixed(2)}`
              
              console.error(`[OxaPay Balance] INSUFFICIENT FUNDS - Available: $${availableBalance.toFixed(2)}, Requested: $${transaction.amount.toFixed(2)}`)
              
              // Send email notification about insufficient balance
              try {
                const EmailSettings = (await import('../models/EmailSettings.js')).default
                const { sendTemplateEmail } = await import('../services/emailService.js')
                const settings = await EmailSettings.findOne()
                const adminEmail = settings?.supportEmail || 'admin@Extrede.com'
                
                await sendTemplateEmail('admin_notification', adminEmail, {
                  subject: 'URGENT: OxaPay Balance Insufficient',
                  firstName: 'Admin',
                  message: `Withdrawal of $${transaction.amount.toFixed(2)} could not be processed due to insufficient OxaPay balance.\n\nAvailable: $${availableBalance.toFixed(2)}\nRequested: $${transaction.amount.toFixed(2)}\nShortage: $${shortage.toFixed(2)}\n\nPlease top up your OxaPay account immediately.`,
                  platformName: settings?.platformName || 'Extrede',
                  year: new Date().getFullYear().toString()
                })
              } catch (emailError) {
                console.error('Error sending insufficient balance email:', emailError)
              }
              
              await wallet.save()
              await transaction.save()
              
              return res.status(400).json({ 
                message: 'Withdrawal cannot be processed due to insufficient funds in payment system. Please contact support.',
                error: 'INSUFFICIENT_OXAPAY_BALANCE',
                availableBalance,
                requestedAmount: transaction.amount
              })
            }
            
            // Proceed with payout if balance is sufficient
            const backendUrl = process.env.BACKEND_URL || 'https://extrede.com/api'
            const payoutData = {
              address: transaction.cryptoAddress,
              amount: transaction.amount,
              currency: transaction.cryptoCurrency || 'USDT',
              network: transaction.cryptoNetwork,
              callback_url: `${backendUrl}/api/oxapay/webhook`,
              description: `Extrede Withdrawal - ${transaction._id}`
            }

          const oxaRes = await fetch('https://api.oxapay.com/v1/payout', {
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
            transaction.adminRemarks = (transaction.adminRemarks || '') + ` | OxaPay payout initiated (track: ${oxaData.data.track_id}) | Balance: $${availableBalance.toFixed(2)}`
            console.log(`[OxaPay Payout] Initiated for transaction ${transaction._id}, track: ${oxaData.data.track_id}`)
          } else {
            console.error('[OxaPay Payout] Failed:', oxaData)
            transaction.adminRemarks = (transaction.adminRemarks || '') + ` | OxaPay payout failed: ${oxaData.message || 'Unknown error'}`
          }
        } else {
          console.error('[OxaPay Balance] Failed to check balance:', balanceData)
          transaction.adminRemarks = (transaction.adminRemarks || '') + ` | OxaPay balance check failed: ${balanceData.message || 'Unknown error'}`
        }
        }
      } catch (payoutError) {
        console.error('[OxaPay Payout] Error:', payoutError)
        transaction.adminRemarks = (transaction.adminRemarks || '') + ` | OxaPay payout error: ${payoutError.message}`
      }
    }

    await wallet.save()
    await transaction.save()

    // Activate bonus if this is a deposit with bonus
    if (transaction.type === 'Deposit' && transaction.bonusAmount > 0 && transaction.bonusId) {
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
        console.log(`Bonus activated: $${transaction.bonusAmount} for user ${transaction.userId}`)
      } catch (bonusError) {
        console.error('Error activating bonus:', bonusError)
      }
    }

    // Send email notification
    try {
      const user = await User.findById(transaction.userId)
      if (user && user.email) {
        const settings = await EmailSettings.findOne()
        const templateSlug = transaction.type === 'Deposit' ? 'deposit_success' : 'withdrawal_success'
        await sendTemplateEmail(templateSlug, user.email, {
          firstName: user.firstName || user.email.split('@')[0],
          amount: transaction.amount.toFixed(2),
          transactionId: transaction._id.toString(),
          paymentMethod: transaction.paymentMethod || 'Wallet',
          date: new Date().toLocaleString(),
          newBalance: wallet.balance.toFixed(2),
          platformName: settings?.platformName || 'Extrede',
          supportEmail: settings?.supportEmail || 'support@Extrede.com',
          year: new Date().getFullYear().toString()
        })
      }
    } catch (emailError) {
      console.error('Error sending transaction email:', emailError)
    }

    res.json({ message: 'Transaction approved', transaction })
  } catch (error) {
    res.status(500).json({ message: 'Error approving transaction', error: error.message })
  }
})

// PUT /api/wallet/transaction/:id/update-date - Update transaction date (admin)
router.put('/transaction/:id/update-date', async (req, res) => {
  try {
    const { createdAt } = req.body
    
    if (!createdAt) {
      return res.status(400).json({ success: false, message: 'Date is required' })
    }

    // Use MongoDB native driver to bypass Mongoose timestamps
    const mongoose = (await import('mongoose')).default
    const ObjectId = mongoose.Types.ObjectId
    
    const result = await mongoose.connection.db.collection('transactions').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { createdAt: new Date(createdAt) } }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' })
    }

    const transaction = await Transaction.findById(req.params.id)
    console.log('Transaction date updated:', req.params.id, 'New date:', createdAt, 'DB Result:', result)
    res.json({ success: true, message: 'Transaction date updated', transaction })
  } catch (error) {
    console.error('Error updating transaction date:', error)
    res.status(500).json({ success: false, message: 'Error updating date', error: error.message })
  }
})

// PUT /api/wallet/transaction/:id/reject - Reject transaction (admin)
router.put('/transaction/:id/reject', async (req, res) => {
  try {
    const { adminRemarks } = req.body
    const transaction = await Transaction.findById(req.params.id)
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    if (transaction.status !== 'Pending') {
      return res.status(400).json({ message: 'Transaction already processed' })
    }

    const wallet = await Wallet.findById(transaction.walletId)

    if (transaction.type === 'Deposit') {
      wallet.pendingDeposits -= transaction.amount
    } else {
      // Refund withdrawal amount
      wallet.balance += transaction.amount
      wallet.pendingWithdrawals -= transaction.amount
    }

    transaction.status = 'Rejected'
    transaction.adminRemarks = adminRemarks || ''
    transaction.processedAt = new Date()

    await wallet.save()
    await transaction.save()

    res.json({ message: 'Transaction rejected', transaction })
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting transaction', error: error.message })
  }
})

// DELETE /api/wallet/transaction/:id - Delete transaction (admin)
router.delete('/transaction/:id', async (req, res) => {
  try {
    console.log('[Delete Transaction] Attempting to delete:', req.params.id)
    const transaction = await Transaction.findById(req.params.id)
    if (!transaction) {
      console.log('[Delete Transaction] Transaction not found:', req.params.id)
      return res.status(404).json({ message: 'Transaction not found' })
    }

    console.log('[Delete Transaction] Found transaction:', transaction.type, transaction.status)

    // If transaction is pending, revert any pending amounts
    if (transaction.status === 'Pending') {
      const wallet = await Wallet.findById(transaction.walletId)
      if (wallet) {
        if (transaction.type === 'Deposit' && wallet.pendingDeposits) {
          wallet.pendingDeposits -= transaction.amount
        } else if (transaction.type === 'Withdrawal' && wallet.pendingWithdrawals) {
          wallet.pendingWithdrawals -= transaction.amount
          // Refund the withdrawal amount back to balance
          wallet.balance += transaction.amount
        }
        await wallet.save()
      }
    }

    await Transaction.findByIdAndDelete(req.params.id)
    console.log('[Delete Transaction] Successfully deleted:', req.params.id)
    res.json({ success: true, message: 'Transaction deleted successfully' })
  } catch (error) {
    console.error('[Delete Transaction] Error:', error)
    res.status(500).json({ message: 'Error deleting transaction', error: error.message })
  }
})

export default router
