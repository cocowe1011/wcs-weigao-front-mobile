<template>
  <view class="scan-recheck">
    <view class="page-layout" :style="{ opacity: pageReady ? 1 : 0 }">

      <!-- 页面级 loading 遮罩 -->
      <view v-if="pageLoading" class="page-loading-overlay">
        <view class="page-loading-box">
          <loading-spin :size="48"></loading-spin>
          <text class="page-loading-text">{{ pageLoadingText }}</text>
        </view>
      </view>

      <!-- 顶部：扫码复检标题 + 刷新 + 扫码按钮 -->
      <view class="section section-header-bar">
        <view class="section-header">
          <view class="section-dot dot-red"></view>
          <text class="section-title">扫码复检</text>
          <view
            class="refresh-btn"
            :class="{ 'btn-loading': loading }"
            @tap="handleRefresh"
          >
            <uni-icons type="refresh" size="18" :color="loading ? '#9ca3af' : '#3b82f6'"></uni-icons>
          </view>
        </view>
        <view class="section-card action-card">
          <view
            class="scan-recheck-btn"
            :class="{ 'btn-loading': scanning, 'btn-disabled': !currentPallet }"
            @tap="handleScanBtnTap"
          >
            <uni-icons v-if="!scanning" type="scan" size="18" color="#fff" style="margin-right:8rpx;"></uni-icons>
            <text class="scan-recheck-btn-text">{{ scanning ? '扫码中…' : '扫码复核' }}</text>
          </view>
          <view v-if="currentPallet" class="progress-info">
            <text class="progress-text">已扫 {{ scannedCount }} / {{ totalCount }}</text>
            <view class="progress-bar-wrap">
              <view
                class="progress-bar-fill"
                :style="{ width: totalCount > 0 ? (scannedCount / totalCount * 100) + '%' : '0%' }"
              ></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 中部：托盘扫码信息（弹性高度，内部滚动） -->
      <view class="section section-goods">
        <view class="section-header">
          <view class="section-dot dot-green"></view>
          <text class="section-title">托盘扫码信息</text>
          <view v-if="currentPallet" class="badge-tag" :class="'ptag-' + currentPallet.trayStatus">
            {{ { '0': '未扫描', '1': '部分完成', '2': '全部完成' }[currentPallet.trayStatus] || '未知' }}
          </view>
        </view>

        <!-- 有托盘数据 -->
        <view v-if="currentPallet" class="section-card goods-card">
          <!-- 托盘基本信息 -->
          <view class="pallet-info-row">
            <view class="pallet-index-badge">{{ currentPallet.palletNo || 'P' }}</view>
            <view class="pallet-meta">
              <text class="pallet-name">托盘 {{ currentPallet.palletNo || currentPallet.id }}</text>
              <text class="pallet-sub">虚拟ID：{{ currentPallet.virtualId || '—' }}</text>
            </view>
          </view>
          <view class="goods-divider"></view>

          <!-- 货物列表（未扫排前面） -->
          <scroll-view scroll-y class="goods-scroll">
            <view class="goods-list">
              <view
                class="goods-item"
                :class="{ 'is-scanned': item.scanStatus === '1' }"
                v-for="(item, index) in sortedGoods"
                :key="item.uid || index"
              >
                <view class="goods-status-dot" :class="item.scanStatus === '1' ? 'dot-scanned' : 'dot-unscanned'"></view>
                <view class="goods-info">
                  <view class="goods-row-top">
                    <text class="goods-name">{{ item.productName || '—' }}</text>
                    <view class="goods-scan-badge" :class="item.scanStatus === '1' ? 'badge-scanned' : 'badge-unscanned'">
                      {{ item.scanStatus === '1' ? '已扫' : '未扫' }}
                    </view>
                  </view>
                  <text class="goods-uid">{{ item.uid || '—' }}</text>
                  <text v-if="item.scanStatus === '1'" class="goods-location">
                    {{ item.scanLocation || '—' }}  {{ item.scanTime || '' }}
                  </text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 无异常托盘 -->
        <view v-else class="section-card empty-card">
          <uni-icons type="checkmark-circle-filled" size="52" color="#10b981"></uni-icons>
          <text class="empty-title">暂无异常托盘</text>
          <text class="empty-hint">{{ loading ? '加载中…' : '当前批次所有已上货托盘均已全部扫码' }}</text>
        </view>
      </view>

      <!-- 底部：下发通行命令 -->
      <view class="section section-cmd">
        <view
          class="cmd-btn"
          :class="{ 'btn-disabled': !canSendCmd, 'btn-loading': sendingCmd }"
          @tap="handleSendCommand"
        >
          <text class="cmd-btn-text">{{ sendingCmd ? '下发中…' : '下发通行命令' }}</text>
        </view>
      </view>

    </view>

    <!-- PDA 扫码组件 -->
    <pda-scan
      :visible="showPdaScan"
      @close="onPdaClose"
      @confirm="onPdaConfirm"
    />
  </view>
</template>

<script>
import PdaScan from '@/components/pda-scan.vue'
import LoadingSpin from '@/components/loading-spin.vue'
import request from '@/config/request.js'

export default {
  name: 'ScanRecheck',
  components: { PdaScan, LoadingSpin },
  inject: ['provideWsClient', 'provideWsConnected'],
  data() {
    return {
      pageReady: false,
      loading: false,
      pageLoading: false,
      pageLoadingText: '加载中…',
      scanning: false,
      sendingCmd: false,
      showPdaScan: false,
      currentBatch: null,
      currentPallet: null,  // 当前最新的999异常托盘
      currentDestination: null
    }
  },
  computed: {
    // 货物排序：未扫的排前面
    sortedGoods() {
      const goods = (this.currentPallet && this.currentPallet.goods) || []
      return [...goods].sort((a, b) => {
        if (a.scanStatus === b.scanStatus) return 0
        return a.scanStatus === '1' ? 1 : -1
      })
    },
    scannedCount() {
      const goods = (this.currentPallet && this.currentPallet.goods) || []
      return goods.filter(g => g.scanStatus === '1').length
    },
    totalCount() {
      return ((this.currentPallet && this.currentPallet.goods) || []).length
    },
    // 下发通行命令：需要有托盘、目的地、且全部扫完
    canSendCmd() {
      if (!this.currentPallet || !this.currentDestination || this.sendingCmd || this.loading) return false
      return this.totalCount > 0 && this.scannedCount === this.totalCount
    }
  },
  async mounted() {
    await this.loadData()
    this.pageReady = true
  },
  methods: {

    // ============ 数据加载 ============

    async loadData() {
      this.loading = true
      this.pageLoading = true
      this.pageLoadingText = '加载中…'
      try {
        // 1. 查当前执行批次
        const batchRes = await request.get('/produce_batch/getCurrentExecuting')
        if (!batchRes || batchRes.code !== '200' || !batchRes.data) {
          this.currentBatch = null
          this.currentPallet = null
          this.currentDestination = null
          return
        }
        this.currentBatch = batchRes.data
        const batchId = batchRes.data.batch.id

        // 2. 查目的地
        const destRes = await request.get('/produce_batch_destination/current', { batchId })
        this.currentDestination = (destRes && destRes.code === '200' && destRes.data) ? destRes.data : null

        // 3. 查最新一个999异常托盘（sendDestinationCode='999'）
        const palletRes = await request.get('/produce_pallet/listByBatchId', { batchId })
        if (palletRes && palletRes.code === '200' && palletRes.data) {
          const pallets = palletRes.data
          const abnormal = pallets.find(p => '999' === p.sendDestinationCode)
          this.currentPallet = abnormal || null
        }
      } catch (e) {
        console.error('扫码复检加载失败:', e)
        uni.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        this.loading = false
        this.pageLoading = false
      }
    },

    async handleRefresh() {
      if (this.loading || this.pageLoading) return
      await this.loadData()
      uni.showToast({ title: '刷新成功', icon: 'success', duration: 1200 })
    },

    // ============ 扫码 ============

    handleScanBtnTap() {
      if (!this.currentPallet) return
      this.showPdaScan = true
    },

    onPdaClose() {
      this.showPdaScan = false
    },

    async onPdaConfirm(uid) {
      this.showPdaScan = false
      if (!uid) return
      await this.doMarkScanned(this.cleanBarcode(uid))
    },

    cleanBarcode(code) {
      if (!code) return ''
      return String(code).replace(/[^a-zA-Z0-9]/g, '').trim()
    },

    async doMarkScanned(uid) {
      if (!uid) {
        uni.showToast({ title: '请输入货物条码', icon: 'none' })
        return
      }
      // 校验 uid 是否属于当前托盘
      const goods = (this.currentPallet && this.currentPallet.goods) || []
      const target = goods.find(g => g.uid === uid)
      if (!target) {
        uni.showToast({ title: '该条码不属于当前托盘，请重新扫码', icon: 'none', duration: 2000 })
        return
      }
      if (target.scanStatus === '1') {
        uni.showToast({ title: '该货物已扫码', icon: 'none', duration: 1500 })
        return
      }
      this.scanning = true
      try {
        const res = await request.post('/produce_goods/markScanned', {
          uid: uid,
          scanLocation: 'PDA-RECHECK'
        })
        if (res && res.code === '200') {
          // 本地更新避免等待刷新
          target.scanStatus = '1'
          target.scanLocation = 'PDA-RECHECK'
          // 重新计算托盘扫码状态
          const scanned = goods.filter(g => g.scanStatus === '1').length
          if (scanned === 0) {
            this.currentPallet.trayStatus = '0'
          } else if (scanned < goods.length) {
            this.currentPallet.trayStatus = '1'
          } else {
            this.currentPallet.trayStatus = '2'
          }
          uni.showToast({ title: '扫码成功', icon: 'success', duration: 1200 })
        } else {
          uni.showToast({ title: res?.message || '扫码失败，请重试', icon: 'none', duration: 2000 })
        }
      } catch (e) {
        console.error('扫码更新失败:', e)
        uni.showToast({ title: '网络异常，请重试', icon: 'none' })
      } finally {
        this.scanning = false
      }
    },

    // ============ 下发通行命令 ============

    // 发送 PLC 写入命令（复用 home.vue 的 WebSocket 连接）
    sendPlcCommand(address, value) {
      const wsClient = this.provideWsClient()
      const wsConnected = this.provideWsConnected()
      if (!wsClient || !wsConnected) {
        uni.showToast({ title: '未连接到服务器', icon: 'none', duration: 1500 })
        return false
      }
      return wsClient.sendPlcWrite(address, value)
    },

    // 发送 PLC 取消写入命令
    sendPlcCancelWrite(address) {
      const wsClient = this.provideWsClient()
      if (!wsClient) return false
      return wsClient.sendPlcCancelWrite(address)
    },

    async handleSendCommand() {
      if (!this.canSendCmd) {
        if (this.currentPallet && this.scannedCount < this.totalCount) {
          uni.showToast({ title: `还有 ${this.totalCount - this.scannedCount} 件货物未扫码，请全部扫完后再下发`, icon: 'none', duration: 2000 })
        }
        return
      }
      // 先检查WebSocket连接，避免后端接口已执行但PLC命令未发送
      const wsClient = this.provideWsClient()
      const wsConnected = this.provideWsConnected()
      if (!wsClient || !wsConnected) {
        uni.showToast({ title: '未连接到服务器，无法下发PLC命令', icon: 'none', duration: 2000 })
        return
      }
      uni.showModal({
        title: '下发通行命令',
        content: `确认为托盘 ${this.currentPallet.palletNo || this.currentPallet.id} 下发通行命令？`,
        confirmText: '确认',
        cancelText: '取消',
        success: async (modal) => {
          if (!modal.confirm) return
          this.sendingCmd = true
          this.pageLoading = true
          this.pageLoadingText = '下发中…'
          try {
            // 1. 调后端重新发送目的地（999→正确目的地+1/2后缀）
            const res = await request.post('/produce_pallet/resendDestination', {
              palletId: String(this.currentPallet.id),
              virtualId: this.currentPallet.virtualId,
              destinationCode: this.currentDestination.destinationCode
            })
            if (res && res.code === '200' && res.data) {
              const updated = res.data
              const destValue = parseInt(updated.sendDestinationCode, 10)

              // 2. 写PLC：DB1001.DBW24=1006，DB1001.DBW26=目的地值，DB1001.DBW182=1，持续2秒后取消
              //    DB1001.DBW184=1 晚1秒再发，持续2秒后取消
              const writtenAddresses = []
              this.sendPlcCommand('W_DBW24', 1006)
              writtenAddresses.push('W_DBW24')
              this.sendPlcCommand('W_DBW26', destValue)
              writtenAddresses.push('W_DBW26')
              this.sendPlcCommand('W_DBW182', 1)
              writtenAddresses.push('W_DBW182')
              setTimeout(() => {
                writtenAddresses.forEach(addr => {
                  this.sendPlcCancelWrite(addr)
                })
              }, 2000)
              setTimeout(() => {
                this.sendPlcCommand('W_DBW184', 1)
                setTimeout(() => {
                  this.sendPlcCancelWrite('W_DBW184')
                }, 2000)
              }, 1000)

              uni.showToast({ title: `通行命令已下发：${updated.sendDestinationCode}`, icon: 'success', duration: 2000 })
              // 通知PC端托盘数据变更（带上palletId和新目的地编码）
              const wsClient = this.provideWsClient()
              if (wsClient) {
                wsClient.sendTrayDataChanged({
                  palletId: String(updated.id),
                  sendDestinationCode: updated.sendDestinationCode
                })
              }
              // 刷新拿到下一个异常托盘
              await this.loadData()
            } else {
              uni.showToast({ title: res?.message || '下发失败，请重试', icon: 'none', duration: 2000 })
            }
          } catch (e) {
            console.error('下发通行命令失败:', e)
            uni.showToast({ title: '网络异常，请重试', icon: 'none' })
          } finally {
            this.sendingCmd = false
            this.pageLoading = false
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.scan-recheck {
  height: 100%;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.page-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 24rpx;
  padding-bottom: 24rpx;
  transition: opacity 0.3s ease;
  overflow: hidden;
  position: relative;
}

.page-layout > .section:not(:last-child) {
  margin-bottom: 24rpx;
}

/* ---- 区域公共 ---- */
.section {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-header-bar {
  flex-shrink: 0;
}

.section-goods {
  flex: 1;
  min-height: 0;
}

.section-cmd {
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
  &.dot-red   { background: #ef4444; }
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
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
  margin-left: 16rpx;

  &:active { opacity: 0.7; background: #dbeafe; }
  &.btn-loading { opacity: 0.6; pointer-events: none; }
}

.section-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.07);
}

/* ---- 顶部操作卡 ---- */
.action-card {
  display: flex;
  align-items: center;
}

.scan-recheck-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  padding: 0 28rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 4rpx 12rpx rgba(239, 68, 68, 0.35);

  &:active { opacity: 0.85; }

  &.btn-loading {
    background: #fca5a5;
    box-shadow: none;
  }

  &.btn-disabled {
    background: #f3f4f6 !important;
    box-shadow: none !important;
    .scan-recheck-btn-text { color: #9ca3af !important; }
  }
}

.scan-recheck-btn-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.progress-info {
  flex: 1;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
}

.progress-text {
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
  font-weight: 500;
}

.progress-bar-wrap {
  height: 8rpx;
  background: #e5e7eb;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

/* ---- 货物区 badge ---- */
.badge-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  font-weight: 500;

  &.ptag-0 { color: #6b7280; background: #f3f4f6; }
  &.ptag-1 { color: #b45309; background: #fef3c7; }
  &.ptag-2 { color: #047857; background: #d1fae5; }
}

/* ---- 货物卡片 ---- */
.goods-card {
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pallet-info-row {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 20rpx 28rpx;
  background: #f8faff;
}

.pallet-index-badge {
  flex-shrink: 0;
  width: 56rpx;
  height: 56rpx;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 700;
  margin-right: 16rpx;
}

.pallet-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.pallet-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
}

.pallet-sub {
  font-size: 22rpx;
  color: #9ca3af;
  margin-top: 4rpx;
  font-family: monospace;
}

.goods-divider {
  height: 1rpx;
  background: #f3f4f6;
  flex-shrink: 0;
}

.goods-scroll {
  flex: 1;
  min-height: 0;
}

.goods-list {
  padding: 12rpx 20rpx 20rpx;
  display: flex;
  flex-direction: column;
}

.goods-list .goods-item + .goods-item {
  margin-top: 16rpx;
}

.goods-item {
  display: flex;
  align-items: flex-start;
  background: #f8faff;
  border-radius: 14rpx;
  border: 1rpx solid #e8f0fe;
  padding: 16rpx;
  position: relative;

  &.is-scanned {
    background: #f0fdf4;
    border-color: #a7f3d0;
  }
}

.goods-status-dot {
  flex-shrink: 0;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-top: 8rpx;
  margin-right: 16rpx;

  &.dot-unscanned {
    background: #f59e0b;
    box-shadow: 0 0 0 4rpx rgba(245, 158, 11, 0.2);
  }

  &.dot-scanned {
    background: #10b981;
    box-shadow: 0 0 0 4rpx rgba(16, 185, 129, 0.2);
  }
}

.goods-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.goods-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6rpx;
}

.goods-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
  margin-right: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goods-scan-badge {
  flex-shrink: 0;
  font-size: 20rpx;
  font-weight: 500;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;

  &.badge-unscanned {
    color: #b45309;
    background: #fef3c7;
  }

  &.badge-scanned {
    color: #047857;
    background: #d1fae5;
  }
}

.goods-uid {
  font-size: 22rpx;
  color: #6b7280;
  font-family: monospace;
  word-break: break-all;
}

.goods-location {
  font-size: 20rpx;
  color: #9ca3af;
  margin-top: 4rpx;
}

/* ---- 空状态 ---- */
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 30rpx;
}

.empty-title {
  margin-top: 20rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #374151;
}

.empty-hint {
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #9ca3af;
  text-align: center;
}

/* section-goods 的 card 要撑满 */
.section-goods .section-card {
  flex: 1;
  min-height: 0;
}

/* ---- 下发通行命令 ---- */
.cmd-btn {
  height: 88rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 6rpx 20rpx rgba(37, 99, 235, 0.35);

  &:active { opacity: 0.85; }

  &.btn-disabled {
    background: #f3f4f6 !important;
    box-shadow: none !important;
    .cmd-btn-text { color: #9ca3af !important; }
  }

  &.btn-loading {
    opacity: 0.7;
    box-shadow: none;
  }
}

.cmd-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
}

/* ---- 页面级 loading 遮罩 ---- */
.page-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.page-loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 48rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.12);
}

.page-loading-text {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #6b7280;
}
</style>
