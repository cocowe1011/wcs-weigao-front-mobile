<template>
  <view class="order-settings">
    <view class="page-layout" :style="{ opacity: pageReady ? 1 : 0 }">

      <!-- 来货查询区域（固定高度） -->
      <view class="section section-query">
        <view class="section-header">
          <view class="section-dot"></view>
          <text class="section-title">来货查询</text>
        </view>
        <view class="section-card">
          <view class="query-row">
            <input
              class="barcode-input"
              v-model="barcodeInput"
              placeholder="请输入条码或点击扫码"
              placeholder-class="input-placeholder"
              @confirm="doQuery"
            />
            <view
              class="scan-query-btn"
              :class="{ 'btn-loading': scanning }"
              @tap="handleScanBtnTap"
            >
              <uni-icons v-if="!scanning" type="scan" size="18" color="#fff" style="margin-right:6rpx;"></uni-icons>
              <text class="scan-btn-text">{{ scanning ? '查询中…' : '扫码查询' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- MSE信息区域（弹性高度，内部滚动） -->
      <view class="section section-mse">
        <view class="section-header">
          <view class="section-dot dot-green"></view>
          <text class="section-title">MSE信息</text>
          <button
            v-if="currentBatch"
            class="add-pallet-btn"
            size="mini"
            type="primary"
            :disabled="addingPallet"
            @tap="handleAddPallet"
          >{{ addingPallet ? '添加中…' : '+ 添加托盘' }}</button>
          <view class="header-spacer"></view>
          <view
            class="refresh-btn"
            :class="{ 'btn-loading': refreshing }"
            @tap="handleRefresh"
          >
            <uni-icons type="refresh" size="18" :color="refreshing ? '#9ca3af' : '#3b82f6'"></uni-icons>
          </view>
          <view v-if="currentBatch" class="badge-tag" :class="{ 'tag-confirmed': currentBatch.batch && currentBatch.batch.status !== '0' }">
            {{ currentBatch.batch && currentBatch.batch.status !== '0' ? '已确认' : '已加载' }}
          </view>
        </view>

        <!-- 有数据时 -->
        <view v-if="currentBatch" class="section-card mse-card">
          <view class="mse-batch-row">
            <text class="field-label">批次号</text>
            <text class="field-value batch-id">{{ currentBatch.batch && currentBatch.batch.batchNo }}</text>
          </view>
          <view class="mse-divider"></view>

          <scroll-view scroll-y class="goods-scroll">
            <!-- 托盘列表 -->
            <view class="pallet-list">
              <view
                class="pallet-block"
                v-for="(pallet, pIndex) in parsedPallets"
                :key="pallet.id || pIndex"
              >
                <!-- 托盘头 -->
                <view class="pallet-header">
                  <view class="pallet-index-badge">{{ pIndex + 1 }}</view>
                  <text class="pallet-no">托盘 {{ pallet.palletNo || ('P' + (pIndex + 1)) }}</text>
                  <button
                    class="add-goods-btn"
                    size="mini"
                    type="primary"
                    plain
                    :disabled="addGoodsPalletId === pallet.id"
                    @tap="handleAddGoodsBtnTap(pallet)"
                  >+ 扫码添加箱子</button>
                  <view class="pallet-header-spacer"></view>
                  <view class="pallet-status-badge" :class="'pstatus-' + pallet.trayStatus">
                    {{ { '0': '待扫', '1': '部分扫', '2': '已完成' }[pallet.trayStatus] || '待扫' }}
                  </view>
                  <view class="goods-count-badge">{{ (pallet.goods || []).length }} 件</view>
                </view>

                <!-- 货物：横向小卡片（紧凑三行：品名 / 规格 / UID） -->
                <scroll-view scroll-x class="pallet-goods-scroll" :show-scrollbar="false">
                  <view class="pallet-goods-row">
                    <view
                      class="goods-chip"
                      :class="{ 'is-scanned': !!scannedUidMap[String(item.uid || '')] }"
                      v-for="(item, gIndex) in (pallet.goods || [])"
                      :key="item.uid || gIndex"
                    >
                      <text class="goods-chip-name">{{ item.productName || '—' }}</text>
                      <text class="goods-chip-spec">{{ item.spec || '—' }}</text>
                      <text class="goods-chip-uid">{{ item.uid || '—' }}</text>
                    </view>
                  </view>
                </scroll-view>
              </view>
            </view>
          </scroll-view>

          <!-- 确认/取消订单按钮 -->
          <view class="action-btn-row">
            <view
              class="action-btn confirm-btn"
              :class="{ 'btn-disabled': !canConfirm, 'btn-loading': confirming, 'btn-producing': isProducing }"
              @tap="confirmOrder"
            >
              <text class="btn-text">
                {{ confirming ? '确认中…' : (isProducing ? '正在生产中' : '允许生产') }}
              </text>
            </view>
            <view
              class="action-btn cancel-btn"
              :class="{ 'btn-disabled': !canCancel, 'btn-loading': canceling }"
              @tap="cancelOrder"
            >
              <text class="btn-text">{{ canceling ? '取消中…' : '取消执行' }}</text>
            </view>
          </view>
        </view>

        <!-- 无数据时 -->
        <view v-else class="section-card empty-card">
          <uni-icons type="info-filled" size="44" color="#d1d5db"></uni-icons>
          <text class="empty-hint">暂无数据，请先扫码查询</text>
        </view>
      </view>

      <!-- 设置目的地区域（固定高度） -->
      <view class="section section-dest">
        <view class="section-header">
          <view class="section-dot dot-orange"></view>
          <text class="section-title">设置目的地</text>
          <view v-if="currentDest" class="badge-tag tag-orange">{{ currentDest }}</view>
          <view v-if="!isProducing && currentBatch" class="badge-tag tag-locked">需先允许生产</view>
        </view>
        <view class="section-card">
          <!-- 目的地选择框 -->
          <picker
            :disabled="!isProducing || !!currentDest || destSettting"
            mode="selector"
            :range="destOptions"
            :value="destIndex"
            @change="onDestPickerChange"
          >
            <view class="dest-picker-row" :class="{ 'picker-disabled': !isProducing || !!currentDest || destSettting }">
              <text class="dest-picker-text" :class="{ 'placeholder-text': destIndex < 0 }">
                {{ destIndex >= 0 ? destOptions[destIndex] : '请选择预热房目的地' }}
              </text>
              <uni-icons type="arrowdown" size="16" color="#9ca3af"></uni-icons>
            </view>
          </picker>
          <view class="dest-btn-row">
            <view
              class="dest-set-btn"
              :class="{ 'btn-disabled': !canSetDest, 'btn-loading': destSettting }"
              @tap="handleSetDest"
            >
              <text class="dest-btn-text">{{ destSettting ? '设置中…' : '设置' }}</text>
            </view>
            <view
              class="dest-cancel-btn"
              :class="{ 'btn-disabled': !canCancelDest, 'btn-loading': destCanceling }"
              @tap="handleCancelDest"
            >
              <text class="dest-btn-text">{{ destCanceling ? '取消中…' : '取消设置' }}</text>
            </view>
          </view>
        </view>
      </view>

    </view>

    <!-- PDA 扫码组件（来货查询用） -->
    <pda-scan
      :visible="showPdaScan"
      @close="onPdaClose"
      @confirm="onPdaConfirm"
    />

    <!-- PDA 扫码组件（添加箱子用） -->
    <pda-scan
      :visible="showAddGoodsScan"
      @close="onAddGoodsPdaClose"
      @confirm="onAddGoodsPdaConfirm"
    />
  </view>
</template>

<script>
import PdaScan from '@/components/pda-scan.vue'
import request from '@/config/request.js'

export default {
  name: 'OrderSettings',
  components: { PdaScan },
  data() {
    return {
      pageReady: false,
      // 来货查询
      barcodeInput: '',
      scanning: false,
      confirming: false,
      canceling: false,
      // MSE信息（BatchDetailDTO: { batch, pallets: [{ palletNo, trayStatus, goods: [...] }] }）
      currentBatch: null,
      // 目的地选择
      destOptions: ['3201','3202','3203','3204','3205','3206','3207','3208','3209','3210','3211','3212','3213','3214','3215'],
      destIndex: -1,
      currentDest: '',
      currentDestRecordId: null,
      destSettting: false,
      destCanceling: false,
      // 扫码弹窗
      showPdaScan: false,
      // 刷新状态
      refreshing: false,
      // 添加托盘/箱子
      addingPallet: false,
      addGoodsPalletId: null,
      showAddGoodsScan: false
    }
  },
  computed: {
    parsedPallets() {
      return (this.currentBatch && this.currentBatch.pallets) || []
    },
    scannedUidMap() {
      const map = {}
      this.parsedPallets.forEach(pallet => {
        const goods = pallet.goods || []
        goods.forEach(item => {
          if (item.scanStatus === '1' && item.uid) {
            map[String(item.uid)] = true
          }
        })
      })
      return map
    },
    isProducing() {
      return this.currentBatch &&
        this.currentBatch.batch &&
        (this.currentBatch.batch.status === '1' || this.currentBatch.batch.status === '2')
    },
    canConfirm() {
      return this.currentBatch &&
        this.currentBatch.batch &&
        this.currentBatch.batch.status === '0' &&
        !this.confirming &&
        !this.canceling
    },
    canCancel() {
      return this.currentBatch &&
        this.currentBatch.batch &&
        (this.currentBatch.batch.status === '1' || this.currentBatch.batch.status === '2') &&
        !this.confirming &&
        !this.canceling
    },
    canSetDest() {
      return this.isProducing &&
        !this.currentDest &&
        this.destIndex >= 0 &&
        !this.destSettting &&
        !this.destCanceling
    },
    canCancelDest() {
      return this.isProducing &&
        !!this.currentDest &&
        !this.destSettting &&
        !this.destCanceling
    }
  },
  async mounted() {
    await this.loadCurrentExecuting()
    if (this.isProducing && this.currentBatch && this.currentBatch.batch) {
      await this.loadCurrentDest(this.currentBatch.batch.id)
    }
    this.pageReady = true
  },
  methods: {

    // ============ 来货查询 ============

    async loadCurrentExecuting() {
      try {
        const res = await request.get('/produce_batch/getCurrentExecuting')
        if (res && res.code === '200' && res.data) {
          this.currentBatch = res.data
        }
      } catch (e) {
        console.error('加载正在执行批次失败:', e)
      }
    },

    async handleRefresh() {
      if (this.refreshing) return
      this.refreshing = true
      try {
        await this.loadCurrentExecuting()
        if (this.isProducing && this.currentBatch && this.currentBatch.batch) {
          await this.loadCurrentDest(this.currentBatch.batch.id)
        } else {
          this.currentDest = ''
          this.currentDestRecordId = null
          this.destIndex = -1
        }
        uni.showToast({ title: '刷新成功', icon: 'success', duration: 1500 })
      } catch (e) {
        console.error('刷新失败:', e)
        uni.showToast({ title: '刷新失败', icon: 'none' })
      } finally {
        this.refreshing = false
      }
    },

    async loadCurrentDest(batchId) {
      try {
        const res = await request.get('/produce_batch_destination/current', { batchId })
        if (res && res.code === '200' && res.data) {
          this.currentDest = res.data.destinationCode
          this.currentDestRecordId = res.data.id
          const idx = this.destOptions.indexOf(res.data.destinationCode)
          this.destIndex = idx >= 0 ? idx : -1
        } else {
          this.currentDest = ''
          this.currentDestRecordId = null
          this.destIndex = -1
        }
      } catch (e) {
        console.error('加载当前目的地失败:', e)
      }
    },

    handleScanBtnTap() {
      if (this.barcodeInput.trim()) {
        this.doQuery()
      } else {
        this.showPdaScan = true
      }
    },

    onPdaClose() {
      this.showPdaScan = false
    },

    onPdaConfirm(scanCode) {
      this.showPdaScan = false
      if (!scanCode) return
      this.barcodeInput = this.cleanBarcode(scanCode)
      this.doQuery()
    },

    async doQuery() {
      const uid = this.cleanBarcode(this.barcodeInput)
      if (!uid) {
        uni.showToast({ title: '请输入条码', icon: 'none' })
        return
      }
      this.scanning = true
      try {
        const res = await request.get('/produce_batch/getByGoodsUid', { uid })
        if (res && res.data) {
          this.currentBatch = res.data
          uni.showToast({ title: '查询到批次信息', icon: 'success', duration: 1500 })
        } else {
          await this.createMockBatch(uid)
        }
      } catch (e) {
        console.error('查询批次失败:', e)
        uni.showToast({ title: '网络异常，请重试', icon: 'none' })
      } finally {
        this.scanning = false
      }
    },

    async createMockBatch(uid) {
      const dto = {
        batch: { batchNo: String(Date.now()), status: '0' },
        pallets: [
          {
            palletNo: 'TP-01',
            trayStatus: '0',
            goods: [{ productName: '一次性口罩', spec: '1000个/箱', remark: '', uid }]
          }
        ]
      }
      try {
        const saveRes = await request.post('/produce_batch/save', dto)
        if (saveRes && saveRes.data) {
          this.currentBatch = saveRes.data
          uni.showToast({ title: '已创建新批次', icon: 'success', duration: 1500 })
        }
      } catch (e) {
        console.error('保存批次失败:', e)
        uni.showToast({ title: '创建批次失败', icon: 'none' })
      }
    },

    async confirmOrder() {
      if (!this.canConfirm) return
      uni.showModal({
        title: '确认订单',
        content: `确认批次 ${this.currentBatch.batch.batchNo} 投入生产？`,
        success: async (res) => {
          if (!res.confirm) return
          this.confirming = true
          try {
            const ret = await request.post('/produce_batch/confirm', { batchId: this.currentBatch.batch.id })
            if (ret && ret.code === '200') {
              this.currentBatch.batch.status = '1'
              uni.showToast({ title: '批次已确认', icon: 'success', duration: 1500 })
              this.loadCurrentDest(this.currentBatch.batch.id)
            } else {
              uni.showToast({ title: ret?.message || '确认失败，请重试', icon: 'none', duration: 2500 })
            }
          } catch (e) {
            console.error('确认批次失败:', e)
            uni.showToast({ title: '确认失败，请重试', icon: 'none' })
          } finally {
            this.confirming = false
          }
        }
      })
    },

    async cancelOrder() {
      if (!this.canCancel) return
      uni.showModal({
        title: '取消执行',
        content: `确认取消执行批次 ${this.currentBatch.batch.batchNo} 吗？`,
        confirmColor: '#ef4444',
        success: async (res) => {
          if (!res.confirm) return
          this.canceling = true
          try {
            const ret = await request.post('/produce_batch/cancel', { batchId: this.currentBatch.batch.id })
            if (ret && ret.code === '200') {
              this.currentBatch.batch.status = '0'
              this.currentDest = ''
              this.currentDestRecordId = null
              this.destIndex = -1
              uni.showToast({ title: '批次已取消执行', icon: 'success', duration: 1500 })
            } else {
              uni.showToast({ title: ret?.message || '取消失败，请重试', icon: 'none', duration: 2500 })
            }
          } catch (e) {
            console.error('取消批次失败:', e)
            uni.showToast({ title: '取消失败，请重试', icon: 'none' })
          } finally {
            this.canceling = false
          }
        }
      })
    },

    generateUid() {
      const ts = Date.now().toString(36).toUpperCase()
      const rand = Math.random().toString(36).substr(2, 8).toUpperCase()
      return `UID-${ts}-${rand}`
    },

    cleanBarcode(code) {
      if (!code) return ''
      return String(code).replace(/[^a-zA-Z0-9]/g, '').trim()
    },

    // ============ 添加托盘 / 添加箱子 ============

    async handleAddPallet() {
      if (!this.currentBatch || !this.currentBatch.batch || this.addingPallet) return
      this.addingPallet = true
      try {
        const ret = await request.post('/produce_batch/addPallet', {
          batchId: this.currentBatch.batch.id
        })
        if (ret && ret.code === '200' && ret.data) {
          // 将新托盘追加到当前批次
          if (!this.currentBatch.pallets) {
            this.$set(this.currentBatch, 'pallets', [])
          }
          this.currentBatch.pallets.push(ret.data)
          uni.showToast({ title: '已添加空托盘', icon: 'success', duration: 1500 })
        } else {
          uni.showToast({ title: ret?.message || '添加托盘失败', icon: 'none' })
        }
      } catch (e) {
        console.error('添加托盘失败:', e)
        uni.showToast({ title: '网络异常，请重试', icon: 'none' })
      } finally {
        this.addingPallet = false
      }
    },

    handleAddGoodsBtnTap(pallet) {
      if (!pallet || !pallet.id) return
      this.addGoodsPalletId = pallet.id
      this.showAddGoodsScan = true
    },

    onAddGoodsPdaClose() {
      this.showAddGoodsScan = false
      this.addGoodsPalletId = null
    },

    async onAddGoodsPdaConfirm(scanCode) {
      this.showAddGoodsScan = false
      const palletId = this.addGoodsPalletId
      this.addGoodsPalletId = null
      const uid = this.cleanBarcode(scanCode)
      if (!uid || !palletId) return
      if (!this.currentBatch || !this.currentBatch.batch) return

      try {
        const ret = await request.post('/produce_batch/addGoods', {
          batchId: String(this.currentBatch.batch.id),
          palletId: String(palletId),
          uid: uid
        })
        if (ret && ret.code === '200' && ret.data) {
          // 找到对应托盘，将新货物追加进去
          const pallet = this.currentBatch.pallets.find(p => String(p.id) === String(palletId))
          if (pallet) {
            if (!pallet.goods) {
              this.$set(pallet, 'goods', [])
            }
            pallet.goods.push(ret.data)
          }
          uni.showToast({ title: '已添加箱子', icon: 'success', duration: 1500 })
        } else {
          uni.showToast({ title: ret?.message || '添加箱子失败', icon: 'none', duration: 2000 })
        }
      } catch (e) {
        console.error('添加箱子失败:', e)
        uni.showToast({ title: '网络异常，请重试', icon: 'none' })
      }
    },

    // ============ 设置目的地 ============

    onDestPickerChange(e) {
      this.destIndex = Number(e.detail.value)
    },

    async handleSetDest() {
      if (!this.canSetDest) return
      if (!this.isProducing) {
        uni.showToast({ title: '请先允许生产', icon: 'none' })
        return
      }
      const destCode = this.destOptions[this.destIndex]
      uni.showModal({
        title: '确认设置目的地',
        content: `确认将目的地设置为：${destCode}？`,
        confirmText: '确认',
        cancelText: '取消',
        success: async (modal) => {
          if (!modal.confirm) return
          this.destSettting = true
          try {
            const ret = await request.post('/produce_batch_destination/set', {
              batchId: String(this.currentBatch.batch.id),
              destinationCode: destCode
            })
            if (ret && ret.code === '200') {
              this.currentDest = destCode
              this.currentDestRecordId = ret.data && ret.data.id
              uni.showToast({ title: `目的地已设为：${destCode}`, icon: 'success', duration: 1500 })
            } else {
              uni.showToast({ title: ret?.message || '设置失败，请重试', icon: 'none', duration: 2000 })
            }
          } catch (e) {
            console.error('设置目的地失败:', e)
            uni.showToast({ title: '网络异常，请重试', icon: 'none' })
          } finally {
            this.destSettting = false
          }
        }
      })
    },

    async handleCancelDest() {
      if (!this.canCancelDest) return
      uni.showModal({
        title: '确认取消目的地',
        content: `确认取消当前目的地：${this.currentDest}？`,
        confirmText: '确认',
        cancelText: '取消',
        success: async (modal) => {
          if (!modal.confirm) return
          this.destCanceling = true
          try {
            const ret = await request.post('/produce_batch_destination/cancel', {
              batchId: String(this.currentBatch.batch.id)
            })
            if (ret && ret.code === '200') {
              this.currentDest = ''
              this.currentDestRecordId = null
              this.destIndex = -1
              uni.showToast({ title: '已取消目的地设置', icon: 'none', duration: 1200 })
            } else {
              uni.showToast({ title: ret?.message || '取消失败，请重试', icon: 'none', duration: 2000 })
            }
          } catch (e) {
            console.error('取消目的地失败:', e)
            uni.showToast({ title: '网络异常，请重试', icon: 'none' })
          } finally {
            this.destCanceling = false
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.order-settings {
  height: 100%;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}

/* 整体布局容器：flex 列，撑满父级 */
.page-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 24rpx;
  padding-bottom: 24rpx;
  /* 不用 gap：部分 Android WebView 对 flex gap 支持差，改用 margin */
  transition: opacity 0.3s ease;
  overflow: hidden;
}

.page-layout > .section:not(:last-child) {
  margin-bottom: 24rpx;
}

/* ---- 区域公共样式 ---- */
.section {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 来货查询 — 固定高度，不伸缩 */
.section-query {
  flex-shrink: 0;
}

/* MSE信息 — 占满剩余空间 */
.section-mse {
  flex: 1;
  min-height: 0;
}

/* 设置目的地 — 固定高度，不伸缩 */
.section-dest {
  flex-shrink: 0;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
  padding-left: 4rpx;
  padding-right: 4rpx;
  flex-shrink: 0;
}

.section-dot {
  width: 10rpx;
  height: 32rpx;
  border-radius: 6rpx;
  background: #3b82f6;
  margin-right: 14rpx;
  flex-shrink: 0;

  &.dot-green { background: #10b981; }
  &.dot-orange { background: #f59e0b; }
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
  flex-shrink: 0;
}

.header-spacer {
  flex: 1;
  min-width: 12rpx;
}

.refresh-btn {
  flex-shrink: 0;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #eff6ff;
  margin-left: 8rpx;

  &:active {
    opacity: 0.7;
    background: #dbeafe;
  }

  &.btn-loading {
    opacity: 0.6;
    pointer-events: none;
  }
}

.badge-tag {
  font-size: 22rpx;
  color: #10b981;
  background: #d1fae5;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  font-weight: 500;

  &.tag-orange {
    color: #f59e0b;
    background: #fef3c7;
    max-width: 240rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.tag-confirmed {
    color: #2563eb;
    background: #dbeafe;
  }

  &.tag-locked {
    color: #ef4444;
    background: #fee2e2;
  }
}

.section-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.07);
}

/* ---- 来货查询 ---- */
.query-row {
  display: flex;
  align-items: center;
}

.barcode-input {
  flex: 1;
  margin-right: 16rpx;
  height: 80rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #1f2937;
  background: #f9fafb;
  box-sizing: border-box;
  transition: border-color 0.2s;

  &:focus {
    border-color: #3b82f6;
    background: #fff;
  }
}

.scan-query-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  padding: 0 28rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.35);

  &:active { opacity: 0.85; }

  &.btn-loading {
    background: #93c5fd;
    box-shadow: none;
  }

  .scan-btn-text {
    font-size: 26rpx;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
  }
}

/* section-card 在 MSE 区域要撑满 */
.section-mse .section-card {
  flex: 1;
  min-height: 0;
}

/* ---- MSE 信息卡片 ---- */
.mse-card {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 货物列表滚动区域 */
.goods-scroll {
  flex: 1;
  min-height: 0;
}

/* ---- 托盘块（高度随内容，渐变底 + 白卡片反差；横向滚动区给明确高度以兼容各端）---- */
.pallet-list {
  padding: 12rpx 20rpx 20rpx;
  display: flex;
  flex-direction: column;
}

.pallet-list .pallet-block + .pallet-block {
  margin-top: 20rpx;
}

.pallet-block {
  flex-shrink: 0;
  align-self: stretch;
  border-radius: 16rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: linear-gradient(150deg, #eef2ff 0%, #e0e7ff 42%, #dbeafe 100%);
  box-shadow: 0 4rpx 20rpx rgba(59, 130, 246, 0.1);
}

.pallet-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 12rpx 16rpx 10rpx;
  background: rgba(255, 255, 255, 0.4);
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.65);
}

.pallet-index-badge {
  margin-right: 12rpx;
}

.pallet-index-badge {
  flex-shrink: 0;
  width: 40rpx;
  height: 40rpx;
  background: #2563eb;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 700;
}

.pallet-no {
  font-size: 26rpx;
  font-weight: 600;
  color: #1e293b;
  flex-shrink: 0;
}

.pallet-header-spacer {
  flex: 1;
  min-width: 8rpx;
}

.pallet-status-badge {
  font-size: 20rpx;
  font-weight: 500;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;

  &.pstatus-0 { color: #64748b; background: rgba(255, 255, 255, 0.75); }
  &.pstatus-1 { color: #b45309; background: rgba(254, 243, 199, 0.95); }
  &.pstatus-2 { color: #047857; background: rgba(209, 250, 229, 0.95); }
}

.pallet-header .goods-count-badge {
  background: rgba(255, 255, 255, 0.72);
  color: #475569;
}

/* 托盘内横向滚动：高度与单行货物卡片对齐，避免托盘被固定高度撑出空白 */
.pallet-goods-scroll {
  flex-shrink: 0;
  width: 100%;
  height: 128rpx;
  box-sizing: border-box;
}

.pallet-goods-row {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  padding: 0 16rpx;
  box-sizing: border-box;
  height: 128rpx;
}

.pallet-goods-row > .goods-chip + .goods-chip {
  margin-left: 14rpx;
}

.goods-chip {
  flex-shrink: 0;
  width: 236rpx;
  max-width: 236rpx;
  padding: 8rpx 12rpx 10rpx;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 10rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2rpx 8rpx rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  position: relative;
}

.goods-chip-name {
  font-size: 22rpx;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
  word-break: break-all;
}

.goods-chip-spec {
  margin-top: 2rpx;
  font-size: 20rpx;
  color: #64748b;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
  word-break: break-all;
}

.goods-chip-uid {
  margin-top: 2rpx;
  font-size: 19rpx;
  color: #94a3b8;
  line-height: 1.2;
  font-family: monospace;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
  word-break: break-all;
}

.goods-chip.is-scanned {
  padding-right: 22rpx;
  border-color: #6ee7b7;
  box-shadow: 0 2rpx 10rpx rgba(16, 185, 129, 0.12);
}

.goods-chip.is-scanned::after {
  content: '';
  position: absolute;
  top: 6rpx;
  right: 8rpx;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #10b981;
}

/* ---- 确认/取消订单按钮 ---- */
.action-btn-row {
  display: flex;
  padding: 20rpx 28rpx;
  background: #fff;
  border-top: 1rpx solid #f3f4f6;
  flex-shrink: 0;
}

.action-btn-row .action-btn + .action-btn {
  margin-left: 16rpx;
}

.action-btn {
  flex: 1;
  height: 76rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active { opacity: 0.82; }

  &.btn-disabled {
    background: #f3f4f6 !important;
    border: 1rpx solid #e5e7eb !important;
    box-shadow: none !important;
    .btn-text { color: #9ca3af !important; }
  }

  &.btn-loading {
    opacity: 0.7;
    box-shadow: none;
  }

  .btn-text {
    font-size: 28rpx;
    font-weight: 600;
  }
}

.confirm-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 4rpx 12rpx rgba(16, 185, 129, 0.3);
  .btn-text { color: #fff; }

  &.btn-producing {
    animation: producing-pulse 1.5s ease-in-out infinite;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      animation: producing-shine 2s ease-in-out infinite;
    }
  }
}

@keyframes producing-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

@keyframes producing-shine {
  0% {
    left: -100%;
  }
  50%, 100% {
    left: 100%;
  }
}

.cancel-btn {
  background: #f3f4f6;
  border: 1rpx solid #e5e7eb;
  .btn-text { color: #6b7280; }
}

.mse-batch-row {
  display: flex;
  align-items: center;
  padding: 24rpx 28rpx;
  background: #f8faff;
  flex-shrink: 0;
}

.field-label {
  flex-shrink: 0;
  width: 100rpx;
  font-size: 26rpx;
  color: #6b7280;
  font-weight: 500;
}

.field-value {
  flex: 1;
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 600;
}

.batch-id {
  color: #2563eb;
  font-family: monospace;
  font-size: 26rpx;
  word-break: break-all;
}

.mse-divider {
  height: 1rpx;
  background: #f3f4f6;
  flex-shrink: 0;
}

.goods-count-badge {
  margin-left: 16rpx;
  font-size: 22rpx;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
}

/* 空状态 */
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 30rpx;
}

.empty-hint {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #9ca3af;
}

/* ---- 设置目的地 ---- */
.dest-picker-row {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  padding: 0 20rpx;
  background: #f9fafb;
  box-sizing: border-box;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &.picker-disabled {
    background: #f3f4f6;
    border-color: #e5e7eb;
    opacity: 0.6;
  }
}

.dest-picker-text {
  font-size: 28rpx;
  color: #1f2937;
  flex: 1;

  &.placeholder-text {
    color: #9ca3af;
  }
}

.dest-btn-row {
  display: flex;

  > .dest-cancel-btn {
    margin-left: 16rpx;
  }
}

.dest-set-btn,
.dest-cancel-btn {
  flex: 1;
  height: 76rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active { opacity: 0.82; }

  &.btn-disabled {
    background: #f3f4f6 !important;
    border: 1rpx solid #e5e7eb !important;
    box-shadow: none !important;
    .dest-btn-text { color: #9ca3af !important; }
  }

  &.btn-loading {
    opacity: 0.7;
    box-shadow: none;
  }
}

.dest-set-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 4rpx 12rpx rgba(16, 185, 129, 0.3);
}

.dest-cancel-btn {
  background: #f3f4f6;
  border: 1rpx solid #e5e7eb;
}

.dest-btn-text {
  font-size: 28rpx;
  font-weight: 600;
}

.dest-set-btn .dest-btn-text { color: #fff; }
.dest-cancel-btn .dest-btn-text { color: #6b7280; }

.input-placeholder {
  color: #9ca3af;
  font-size: 26rpx;
}

/* ---- 添加托盘按钮（MSE标题旁） ---- */
.add-pallet-btn {
  flex-shrink: 0;
  margin-left: 16rpx;
  font-size: 22rpx;
  height: 44rpx;
  line-height: 44rpx;
  padding: 0 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

/* ---- 添加箱子按钮（托盘头内） ---- */
.add-goods-btn {
  flex-shrink: 0;
  margin-left: 12rpx;
  font-size: 20rpx;
  height: 40rpx;
  line-height: 40rpx;
  padding: 0 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
</style>
