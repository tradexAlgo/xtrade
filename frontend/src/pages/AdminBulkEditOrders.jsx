import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { Search, Filter, RefreshCw, CheckSquare, Square, Edit, X, Save } from 'lucide-react'
import { API_URL } from '../config/api'

const AdminBulkEditOrders = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Selection
  const [selectedIds, setSelectedIds] = useState([])
  
  // Bulk Edit Modal
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Bulk Edit Form (Empty means no change)
  const [bulkForm, setBulkForm] = useState({
    closePrice: '',
    realizedPnl: '',
    status: '', // '' represents no change, otherwise 'CLOSED' etc.
    openedAt: '',
    closedAt: '',
    stopLoss: '',
    takeProfit: ''
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTrades, setTotalTrades] = useState(0)
  const tradesPerPage = 50 // Show more per page for bulk editing

  useEffect(() => {
    fetchTrades()
  }, [filterStatus, currentPage])

  const fetchTrades = async () => {
    setLoading(true)
    try {
      const offset = (currentPage - 1) * tradesPerPage
      const statusParam = filterStatus !== 'all' ? `&status=${filterStatus.toUpperCase()}` : ''
      const res = await fetch(`${API_URL}/admin/trade/all?limit=${tradesPerPage}&offset=${offset}${statusParam}`)
      const data = await res.json()
      if (data.trades) {
        setTrades(data.trades)
        setTotalTrades(data.total || data.trades.length)
      }
      // Reset selection when data changes
      setSelectedIds([])
    } catch (error) {
      console.error('Error fetching trades:', error)
    }
    setLoading(false)
  }

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTrades.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredTrades.map(t => t._id))
    }
  }

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selId => selId !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return
    
    // Build payload of only fields that are NOT empty
    const payload = {}
    if (bulkForm.closePrice !== '') payload.closePrice = parseFloat(bulkForm.closePrice)
    if (bulkForm.realizedPnl !== '') payload.realizedPnl = parseFloat(bulkForm.realizedPnl)
    if (bulkForm.stopLoss !== '') payload.stopLoss = parseFloat(bulkForm.stopLoss)
    if (bulkForm.takeProfit !== '') payload.takeProfit = parseFloat(bulkForm.takeProfit)
    if (bulkForm.openedAt !== '') payload.openedAt = bulkForm.openedAt
    if (bulkForm.closedAt !== '') payload.closedAt = bulkForm.closedAt
    
    // Handling status change to CLOSED by piggybacking on closePrice or realizedPnl
    // the backend will auto-close if closePrice is provided, or we can just send the request
    // Note: The backend route /api/admin/trade/edit/:tradeId automatically closes if closePrice is sent

    if (Object.keys(payload).length === 0 && bulkForm.status === '') {
      alert("Please fill at least one field to bulk edit.")
      return
    }

    // Since we don't have a specific 'status' override in the PUT edit route natively except via closePrice,
    // if Admin explicitly wants to close without closePrice, it might be tricky. But usually setting closePrice closes it.

    const confirmMsg = `Are you sure you want to update ${selectedIds.length} orders?\n` + 
                       `This action cannot be undone and will apply silently.`
    
    if (!window.confirm(confirmMsg)) return

    setIsUpdating(true)
    let successCount = 0
    let failCount = 0

    try {
      // Execute in parallel chunks of 10 to avoid overwhelming server
      const chunkSize = 10
      for (let i = 0; i < selectedIds.length; i += chunkSize) {
        const chunk = selectedIds.slice(i, i + chunkSize)
        
        await Promise.all(chunk.map(async (tradeId) => {
          try {
            const res = await fetch(`${API_URL}/admin/trade/edit/${tradeId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (data.success) {
              successCount++
            } else {
              failCount++
            }
          } catch (e) {
            failCount++
          }
        }))
      }

      alert(`Bulk edit complete.\nSuccessful: ${successCount}\nFailed: ${failCount}`)
      setShowBulkModal(false)
      // Reset form
      setBulkForm({
        closePrice: '', realizedPnl: '', status: '', openedAt: '', closedAt: '', stopLoss: '', takeProfit: ''
      })
      fetchTrades()
    } catch (error) {
      console.error('Bulk update error', error)
      alert("A critical error occurred during bulk update.")
    }
    
    setIsUpdating(false)
  }

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'OPEN': return 'bg-green-500/20 text-green-500'
      case 'CLOSED': return 'bg-gray-500/20 text-gray-400'
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-500'
      case 'CANCELLED': return 'bg-red-500/20 text-red-500'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.tradeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.userId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <AdminLayout title="Bulk Edit Orders" subtitle="Apply changes to multiple user orders simultaneously">
      
      {/* Action Bar */}
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden mb-6 p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={() => setShowBulkModal(true)}
            disabled={selectedIds.length === 0}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
              selectedIds.length > 0 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-dark-700 text-gray-500 cursor-not-allowed border border-gray-700'
            }`}
          >
            <Edit size={18} /> Edit Selected ({selectedIds.length})
          </button>
          {selectedIds.length > 0 && (
             <button 
                onClick={() => setSelectedIds([])}
                className="text-gray-400 hover:text-white text-sm underline"
             >
                Clear Selection
             </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by ID, User, Symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setCurrentPage(1)
            }}
            className="bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gray-600 outline-none"
          >
            <option value="all">All Status</option>
            <option value="open">Open Only</option>
            <option value="closed">Closed Only</option>
          </select>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500 flex flex-col items-center">
            <RefreshCw className="animate-spin mb-3 text-blue-500" size={24} />
            Loading orders...
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No orders found matching criteria</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-dark-900/50">
                  <th className="py-3 px-4 text-left">
                    <button 
                      onClick={handleSelectAll}
                      className="text-gray-400 hover:text-white flex items-center"
                    >
                      {selectedIds.length === filteredTrades.length && filteredTrades.length > 0 ? (
                        <CheckSquare size={18} className="text-blue-500" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">Trade ID</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">Date</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">User</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">Symbol</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4 text-right">Lots</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4 text-right">Open Price</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4 text-right">Close Price</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4 text-right">P&L</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade) => {
                  const isSelected = selectedIds.includes(trade._id)
                  return (
                    <tr 
                      key={trade._id} 
                      onClick={() => handleSelectOne(trade._id)}
                      className={`border-b border-gray-800 hover:bg-dark-700/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-900/10' : ''}`}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleSelectOne(trade._id)} className="text-gray-400 hover:text-white flex items-center">
                          {isSelected ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} />}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-white font-mono">{trade.tradeId}</td>
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(trade.openedAt || trade.createdAt).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-white">{trade.userId?.firstName || trade.userId?.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white font-medium">{trade.symbol}</span>
                        <span className={`ml-2 text-xs font-semibold ${trade.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>{trade.side}</span>
                      </td>
                      <td className="py-3 px-4 text-white text-right">{trade.quantity}</td>
                      <td className="py-3 px-4 text-gray-300 text-right">{trade.openPrice?.toFixed(5)}</td>
                      <td className="py-3 px-4 text-gray-300 text-right">{trade.closePrice ? trade.closePrice.toFixed(5) : '-'}</td>
                      <td className={`py-3 px-4 font-medium text-right ${trade.realizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.realizedPnl != null ? `${trade.realizedPnl >= 0 ? '+' : ''}$${trade.realizedPnl.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {totalTrades > tradesPerPage && (
          <div className="p-4 border-t border-gray-800 flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              Showing {((currentPage - 1) * tradesPerPage) + 1} - {Math.min(currentPage * tradesPerPage, totalTrades)} of {totalTrades} orders
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                Previous
              </button>
              <span className="text-white px-3 font-medium">
                Page {currentPage} of {Math.ceil(totalTrades / tradesPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalTrades / tradesPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(totalTrades / tradesPerPage)}
                className="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Form Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl border border-gray-700 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-dark-900/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit size={20} className="text-blue-500" /> Bulk Edit ({selectedIds.length} orders)
              </h2>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                <p className="text-blue-400 text-sm">
                  <strong>Note:</strong> Leave a field empty if you do not want to alter it. 
                  Any value entered below will gracefully override that attribute for <strong>ALL</strong> selected orders.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1 font-medium">New Close Price</label>
                  <input
                    type="number"
                    step="0.00001"
                    placeholder="No Change"
                    value={bulkForm.closePrice}
                    onChange={(e) => setBulkForm({ ...bulkForm, closePrice: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">Applying close price will close open trades.</p>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1 font-medium">New Realized P&L</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="No Change"
                    value={bulkForm.realizedPnl}
                    onChange={(e) => setBulkForm({ ...bulkForm, realizedPnl: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">Force set a direct P&L output.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1 font-medium">Stop Loss</label>
                  <input
                    type="number"
                    step="0.00001"
                    placeholder="No Change"
                    value={bulkForm.stopLoss}
                    onChange={(e) => setBulkForm({ ...bulkForm, stopLoss: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1 font-medium">Take Profit</label>
                  <input
                    type="number"
                    step="0.00001"
                    placeholder="No Change"
                    value={bulkForm.takeProfit}
                    onChange={(e) => setBulkForm({ ...bulkForm, takeProfit: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-gray-800 pt-5">
                <div>
                  <label className="block text-gray-400 text-sm mb-1 font-medium">Opened At Override</label>
                  <input
                    type="datetime-local"
                    value={bulkForm.openedAt}
                    onChange={(e) => setBulkForm({ ...bulkForm, openedAt: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1 font-medium">Closed At Override</label>
                  <input
                    type="datetime-local"
                    value={bulkForm.closedAt}
                    onChange={(e) => setBulkForm({ ...bulkForm, closedAt: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-gray-700 bg-dark-900/80 flex gap-3 justify-end items-center">
              <button 
                onClick={() => setShowBulkModal(false)}
                className="px-5 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-dark-700 transition-colors font-medium border border-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkUpdate}
                disabled={isUpdating}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {isUpdating ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                {isUpdating ? 'Applying...' : 'Apply Build Edits'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  )
}

export default AdminBulkEditOrders
