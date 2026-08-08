<template>
  <view class="order-settings">
    <!-- loading 放在 opacity 容器外，避免首屏请求时整页（含转圈）不可见 -->
    <view v-if="pageLoading" class="page-loading-overlay">
      <view class="page-loading-box">
        <loading-spin :size="48"></loading-spin>
        <text class="page-loading-text">{{ pageLoadingText }}</text>
      </view>
    </view>

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
              @confirm="handleManualConfirm"
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
          <view
            v-if="currentBatch"
            class="badge-tag"
            :class="{
              'tag-confirmed': batchStatus === '1' || batchStatus === '2',
              'tag-finished': batchStatus === '3'
            }"
          >
            {{ batchStatusText }}
          </view>
        </view>

        <!-- 有数据时 -->
        <view v-if="currentBatch" class="section-card mse-card">
          <view class="mse-batch-row">
            <text class="field-label">批次号</text>
            <text class="field-value batch-id">{{ currentBatch.batch && currentBatch.batch.batchNo }}</text>
            <view
              v-if="(currentBatch.batch && currentBatch.batch.sterilizerNameCode) || currentDest"
              class="batch-dest-tag"
            >
              {{ (currentBatch.batch && currentBatch.batch.sterilizerNameCode) || currentDest }}
            </view>
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
                  <text class="pallet-no">{{ pallet.palletNo }}</text>
                  <button
                    class="add-goods-btn"
                    size="mini"
                    type="primary"
                    plain
                    :disabled="addGoodsPalletId === pallet.id"
                    @tap="handleAddGoodsBtnTap(pallet)"
                  >+ 添加箱子</button>
                  <view class="pallet-header-spacer"></view>
                  <view class="pallet-status-badge" :class="'pstatus-' + pallet.trayStatus">
                    {{ { '0': '待扫', '1': '部分扫', '2': '已完成' }[pallet.trayStatus] || '待扫' }}
                  </view>
                  <view class="goods-count-badge">{{ (pallet.goods || []).length }} 件</view>
                  <view
                    class="delete-btn pallet-delete-btn"
                    :class="{ 'btn-loading': deletingPalletId === pallet.id }"
                    @tap.stop="handleDeletePallet(pallet)"
                  >
                    <uni-icons type="closeempty" size="14" color="#fff"></uni-icons>
                  </view>
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
                      <view
                        class="goods-delete-btn"
                        :class="{ 'btn-loading': deletingGoodsUid === item.uid }"
                        @tap.stop="handleDeleteGoods(pallet, item)"
                      >
                        <uni-icons type="closeempty" size="10" color="#fff"></uni-icons>
                      </view>
                      <text class="goods-chip-name">{{ item.productName || '—' }}</text>
                      <text class="goods-chip-spec">{{ item.spec || '—' }}</text>
                      <text class="goods-chip-uid">{{ item.uid || '—' }}</text>
                    </view>
                  </view>
                </scroll-view>
              </view>
            </view>
          </scroll-view>

          <!-- 确认/取消/完成订单按钮 -->
          <view class="action-btn-row">
            <view
              class="action-btn confirm-btn"
              :class="{
                'btn-disabled': !canConfirm && !isFinished,
                'btn-loading': confirming,
                'btn-producing': isProducing,
                'btn-finished': isFinished
              }"
              @tap="confirmOrder"
            >
              <text class="btn-text">
                {{ confirming ? '确认中…' : (isFinished ? '已完成' : (isProducing ? '正在生产中' : '允许生产')) }}
              </text>
            </view>
            <view
              class="action-btn cancel-btn"
              :class="{ 'btn-disabled': !canCancel, 'btn-loading': canceling }"
              @tap="cancelOrder"
            >
              <text class="btn-text">{{ canceling ? '取消中…' : '取消执行' }}</text>
            </view>
            <view
              class="action-btn finish-btn"
              :class="{ 'btn-disabled': !canFinish, 'btn-loading': finishing }"
              @tap="finishOrder"
            >
              <text class="btn-text">{{ finishing ? '完成中…' : '完成订单' }}</text>
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
          <view v-if="isFinished && currentBatch" class="badge-tag tag-finished">订单已完成</view>
          <view v-else-if="!isProducing && currentBatch" class="badge-tag tag-locked">需先允许生产</view>
        </view>
        <view class="section-card">
          <!-- 目的地选择框：MSE 模式不允许手动改；MOCK 模式可手动选/设/取消 -->
          <picker
            :disabled="isMseMode || !isProducing || !!currentDest || destSettting"
            mode="selector"
            :range="destOptions"
            :value="destIndex"
            @change="onDestPickerChange"
          >
            <view class="dest-picker-row" :class="{ 'picker-disabled': isMseMode || !isProducing || !!currentDest || destSettting }">
              <text class="dest-picker-text" :class="{ 'placeholder-text': destIndex < 0 }">
                {{ destIndex >= 0 ? destOptions[destIndex] : '请选择预热房目的地' }}
              </text>
              <uni-icons type="arrowdown" size="16" color="#9ca3af"></uni-icons>
            </view>
          </picker>
          <view v-if="!isMseMode" class="dest-btn-row">
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
          <view v-else class="dest-btn-row">
            <text class="dest-locked-hint">MSE 模式目的地由订单自动设定，不可手动修改</text>
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
import LoadingSpin from '@/components/loading-spin.vue'
import request from '@/config/request.js'

export default {
  name: 'OrderSettings',
  components: { PdaScan, LoadingSpin },
  inject: ['provideWsClient', 'provideWsConnected'],
  props: {
    active: { type: Boolean, default: true }
  },
  data() {
    return {
      pageReady: false,
      // 来货查询
      barcodeInput: '',
      // 扫码查询模式：mock-自动创建数据 / mse-调用MSE接口
      scanMode: 'mock',
      scanning: false,
      confirming: false,
      canceling: false,
      finishing: false,
      // 执行中订单状态轮询（同步 WCS 上货自动完单等）
      statusPollTimer: null,
      statusPolling: false,
      componentAlive: true,
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
      showAddGoodsScan: false,
      // 删除状态追踪
      deletingPalletId: null,
      deletingGoodsUid: null,
      // 页面级 loading
      pageLoading: false,
      pageLoadingText: '加载中…'
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
    batchStatus() {
      return (this.currentBatch && this.currentBatch.batch && this.currentBatch.batch.status) || ''
    },
    batchStatusText() {
      const map = { '0': '待确认', '1': '已确认', '2': '生产中', '3': '已完成' }
      return map[this.batchStatus] || '已加载'
    },
    isProducing() {
      return this.batchStatus === '1' || this.batchStatus === '2'
    },
    isFinished() {
      return this.batchStatus === '3'
    },
    canConfirm() {
      return this.currentBatch &&
        this.currentBatch.batch &&
        this.batchStatus === '0' &&
        !this.confirming &&
        !this.canceling &&
        !this.finishing
    },
    canCancel() {
      return this.currentBatch &&
        this.currentBatch.batch &&
        this.isProducing &&
        !this.confirming &&
        !this.canceling &&
        !this.finishing
    },
    canFinish() {
      return this.currentBatch &&
        this.currentBatch.batch &&
        this.isProducing &&
        !this.confirming &&
        !this.canceling &&
        !this.finishing
    },
    isMseMode() {
      return this.scanMode === 'mse'
    },
    canSetDest() {
      return !this.isMseMode &&
        this.isProducing &&
        !this.currentDest &&
        this.destIndex >= 0 &&
        !this.destSettting &&
        !this.destCanceling
    },
    canCancelDest() {
      return !this.isMseMode &&
        this.isProducing &&
        !!this.currentDest &&
        !this.destSettting &&
        !this.destCanceling
    }
  },
  watch: {
    // 切回订单设置 tab 时重新查询（首屏由 mounted 负责）
    active(val) {
      if (val) {
        this.loadExecutingOrder().finally(() => {
          this.syncStatusPoll()
        })
      } else {
        // 切走 tab：立即停轮询，避免后台叠加请求
        this.stopStatusPoll()
      }
    },
    // 允许生产 / 完成 / 取消后同步启停轮询
    isProducing() {
      this.syncStatusPoll()
    }
  },
  async mounted() {
    await this.loadExecutingOrder()
    this.pageReady = true
    this.syncStatusPoll()
  },
  beforeDestroy() {
    // 退出登录 reLaunch / 页面销毁时必须清理，防止重新登录叠加定时器
    this.componentAlive = false
    this.stopStatusPoll()
  },
  methods: {

    // ============ 来货查询 ============

    /** 查当前执行中订单 + 目的地；无执行中订单则清空 */
    async loadExecutingOrder() {
      this.pageLoading = true
      this.pageLoadingText = '加载当前订单…'
      try {
        await this.loadCurrentExecuting()
        if (this.isProducing && this.currentBatch && this.currentBatch.batch) {
          await this.loadCurrentDest(this.currentBatch.batch.id)
        } else {
          this.currentBatch = null
          this.currentDest = ''
          this.currentDestRecordId = null
          this.destIndex = -1
        }
      } finally {
        this.pageLoading = false
        this.syncStatusPoll()
      }
    },

    async loadCurrentExecuting() {
      try {
        const res = await request.get('/produce_batch/getCurrentExecuting')
        if (res && res.code === '200') {
          this.currentBatch = res.data || null
        }
      } catch (e) {
        console.error('加载正在执行批次失败:', e)
      }
    },

    /**
     * 根据批次ID重新加载当前批次的完整数据（含托盘+货物）
     */
    async reloadCurrentBatch() {
      if (!this.currentBatch || !this.currentBatch.batch || !this.currentBatch.batch.id) return
      try {
        const res = await request.get('/produce_batch/getById', { id: this.currentBatch.batch.id })
        if (res && res.code === '200' && res.data) {
          this.currentBatch = res.data
        }
      } catch (e) {
        console.error('重新加载批次数据失败:', e)
      }
    },

    /** 仅在「订单设置 tab 可见 + 执行中」时轮询；启动前先 stop，保证单实例 */
    syncStatusPoll() {
      if (
        this.active &&
        this.isProducing &&
        this.currentBatch &&
        this.currentBatch.batch &&
        this.currentBatch.batch.id
      ) {
        this.startStatusPoll()
      } else {
        this.stopStatusPoll()
      }
    },

    startStatusPoll() {
      this.stopStatusPoll()
      this.statusPollTimer = setInterval(() => {
        this.pollBatchStatus()
      }, 4000)
    },

    stopStatusPoll() {
      if (this.statusPollTimer != null) {
        clearInterval(this.statusPollTimer)
        this.statusPollTimer = null
      }
      this.statusPolling = false
    },

    /** 静默按 ID 拉最新状态；检测到自动完单后停轮询并提示 */
    async pollBatchStatus() {
      if (!this.componentAlive || !this.active || !this.isProducing || this.statusPolling) return
      const batchId = this.currentBatch && this.currentBatch.batch && this.currentBatch.batch.id
      if (!batchId) {
        this.stopStatusPoll()
        return
      }
      this.statusPolling = true
      const prevStatus = this.batchStatus
      try {
        const res = await request.get('/produce_batch/getById', { id: batchId })
        // 请求回来时组件可能已销毁 / tab 已切走 / 定时器已停
        if (!this.componentAlive || !this.active || this.statusPollTimer == null) return
        if (res && res.code === '200' && res.data) {
          this.currentBatch = res.data
          if (this.isFinished) {
            this.currentDest = ''
            this.currentDestRecordId = null
            this.destIndex = -1
            this.stopStatusPoll()
            if (prevStatus === '1' || prevStatus === '2') {
              uni.showToast({ title: '订单已完成', icon: 'success', duration: 1500 })
            }
          } else if (this.isProducing) {
            await this.loadCurrentDest(batchId)
          } else {
            this.stopStatusPoll()
          }
        }
      } catch (e) {
        console.error('轮询批次状态失败:', e)
      } finally {
        if (this.componentAlive) {
          this.statusPolling = false
        }
      }
    },

    async handleRefresh() {
      if (this.refreshing) return
      this.refreshing = true
      this.pageLoading = true
      this.pageLoadingText = '刷新中…'
      try {
        if (this.currentBatch && this.currentBatch.batch && this.currentBatch.batch.id) {
          // 当前已有批次，按ID重新加载完整数据
          await this.reloadCurrentBatch()
        } else {
          // 无当前批次，尝试加载正在执行的批次
          await this.loadCurrentExecuting()
        }
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
        this.pageLoading = false
        this.syncStatusPoll()
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

    // 点“扫码查询”按钮：弹二选一 → 每次都打开扫码组件（忽略文本框里的旧码）
    handleScanBtnTap() {
      this.pickMode((mode) => this.openScan(mode))
    },

    // 输入框回车：手动输入条码时用输入值查询（同样弹二选一选择模式）
    handleManualConfirm() {
      const uid = this.cleanBarcode(this.barcodeInput)
      if (!uid) return
      this.pickMode((mode) => {
        this.scanMode = mode
        if (mode === 'mse') {
          this.runMseQuery(uid)
        } else {
          this.doQuery(uid)
        }
      })
    },

    // 弹出“自动创建数据 / 调用MSE接口”二选一
    pickMode(onPick) {
      uni.showActionSheet({
        itemList: ['自动创建数据', '调用MSE接口'],
        success: (res) => {
          if (res.tapIndex === 0) onPick('mock')
          else if (res.tapIndex === 1) onPick('mse')
        }
      })
    },

    // 忽略文本框内容，清空后直接打开扫码组件（每次扫码查询都重新扫）
    openScan(mode) {
      this.scanMode = mode
      this.barcodeInput = ''
      // MSE 模式扫码前先判断 SOCKET 连接是否正常
      if (mode === 'mse' && !this.ensureSocketConnected()) return
      this.showPdaScan = true
    },

    // 判断与 WCS 的 SOCKET(WebSocket) 连接是否正常
    ensureSocketConnected() {
      const wsClient = this.provideWsClient && this.provideWsClient()
      const connected = this.provideWsConnected && this.provideWsConnected()
      if (!wsClient || !connected) {
        uni.showToast({ title: 'WCS(SOCKET)未连接，无法调用MSE接口', icon: 'none', duration: 2500 })
        return false
      }
      return true
    },

    onPdaClose() {
      this.showPdaScan = false
    },

    onPdaConfirm(scanCode) {
      this.showPdaScan = false
      const uid = this.cleanBarcode(scanCode)
      if (!uid) return
      if (this.scanMode === 'mse') {
        this.runMseQuery(uid)
      } else {
        this.doQuery(uid)
      }
    },

    // 按 uid 查询批次并填充，返回是否查询到
    async loadBatchByUid(uid) {
      const res = await request.get('/produce_batch/getByGoodsUid', { uid })
      if (res && res.data) {
        this.currentBatch = res.data
        return true
      }
      return false
    },

    /** 切换/加载批次后同步目的地 UI，避免沿用上一单的 currentDest */
    async syncDestStateForCurrentBatch() {
      if (this.isProducing && this.currentBatch && this.currentBatch.batch) {
        await this.loadCurrentDest(this.currentBatch.batch.id)
      } else {
        this.currentDest = ''
        this.currentDestRecordId = null
        this.destIndex = -1
      }
      const orderDest = this.currentBatch &&
        this.currentBatch.batch &&
        this.currentBatch.batch.sterilizerNameCode &&
        String(this.currentBatch.batch.sterilizerNameCode).trim()
      if (orderDest) {
        const idx = this.destOptions.indexOf(orderDest)
        if (idx >= 0) this.destIndex = idx
      }
    },

    // 自动创建数据流程：查不到则 mock 创建
    async doQuery(uid) {
      uid = this.cleanBarcode(uid || this.barcodeInput)
      if (!uid) {
        uni.showToast({ title: '请输入条码', icon: 'none' })
        return
      }
      this.scanning = true
      this.pageLoading = true
      this.pageLoadingText = '查询中…'
      try {
        const found = await this.loadBatchByUid(uid)
        if (found) {
          await this.syncDestStateForCurrentBatch()
          uni.showToast({ title: '查询到批次信息', icon: 'success', duration: 1500 })
        } else {
          await this.createMockBatch(uid)
        }
      } catch (e) {
        console.error('查询批次失败:', e)
        uni.showToast({ title: '网络异常，请重试', icon: 'none' })
      } finally {
        this.scanning = false
        this.pageLoading = false
        // 处理完清空文本框，避免下次复用旧码
        this.barcodeInput = ''
      }
    },

    // 调用MSE接口流程：先判断是否已建档；无论是否建档都经 SOCKET 调 MSE（已建档则比较并更新目的地），再用条码查询展示
    async runMseQuery(uid) {
      if (!uid) {
        uni.showToast({ title: '请输入或扫描条码', icon: 'none' })
        return
      }
      this.scanning = true
      this.pageLoading = true
      this.pageLoadingText = '查询中…'
      try {
        // 1. 先查本地是否已建档（用于 Toast 文案区分）
        const existedBefore = await this.loadBatchByUid(uid)
        // 2. 始终走 MSE（需 SOCKET 连接）：未建档则写库，已建档则比较更新目的地
        if (!this.ensureSocketConnected()) return
        const wsClient = this.provideWsClient()
        this.pageLoadingText = 'MSE查询中…'
        const mseRet = await wsClient.sendMseQuery(uid)
        // 成功后用刚才的条码查询订单信息并展示
        this.pageLoadingText = '加载订单中…'
        const found = await this.loadBatchByUid(uid)
        if (found) {
          await this.syncDestStateForCurrentBatch()
          const msg = (mseRet && mseRet.message) || (existedBefore ? '已建档，已刷新' : 'MSE查询成功')
          uni.showToast({ title: msg, icon: 'success', duration: 1500 })
        } else {
          uni.showToast({ title: '已写入但未查询到订单，请刷新重试', icon: 'none', duration: 2500 })
        }
      } catch (e) {
        console.error('MSE查询失败:', e)
        uni.showToast({ title: (e && e.message) || 'MSE查询失败', icon: 'none', duration: 2500 })
      } finally {
        this.scanning = false
        this.pageLoading = false
        // 处理完清空文本框，避免下次复用旧码
        this.barcodeInput = ''
      }
    },

    async createMockBatch(uid) {
      const now = String(Date.now())
      const dto = {
        batch: {
          batchNo: now,
          sterilizationOrderNo: now + '-MJ',
          palletQuantity: 1,
          sterilizerNameCode: '',
          processPlanNameCode: 'EO',
          status: '0'
        },
        pallets: [
          {
            palletNo: 'MJF' + now.slice(-12),
            toWarehouse: '1',
            trayStatus: '0',
            goods: [
              {
                productName: '一次性口罩',
                spec: '1000个/箱',
                productCode: '01.02.01.0615',
                productionBatchNumber: '20260621',
                productionDate: '2026-06-24',
                remark: '',
                uid,
                udi: uid
              }
            ]
          }
        ]
      }
      try {
        const saveRes = await request.post('/produce_batch/save', dto)
        if (saveRes && saveRes.data) {
          this.currentBatch = saveRes.data
          // 新建 mock 无目的地，必须清掉上一单残留的 currentDest，否则标签会误显示
          this.currentDest = ''
          this.currentDestRecordId = null
          this.destIndex = -1
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
            const ret = await request.post('/produce_batch/confirm', { id: this.currentBatch.batch.id })
            if (ret && ret.code === '200') {
              this.currentBatch.batch.status = '1'
              await this.loadCurrentDest(this.currentBatch.batch.id)
              // MSE：订单自带目的地则自动落库；MOCK：仅预填选择框，仍走手动「设置」
              if (!this.currentDest) {
                const destCode = this.currentBatch.batch.sterilizerNameCode &&
                  String(this.currentBatch.batch.sterilizerNameCode).trim()
                if (destCode) {
                  const idx = this.destOptions.indexOf(destCode)
                  this.destIndex = idx >= 0 ? idx : -1
                  if (this.isMseMode && idx >= 0) {
                    const setOk = await this.applyDestination(destCode, { silent: true })
                    if (!setOk) {
                      uni.showToast({ title: '批次已确认，但目的地设置失败', icon: 'none', duration: 2500 })
                      return
                    }
                  }
                }
              }
              uni.showToast({ title: '批次已确认', icon: 'success', duration: 1500 })
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
            const ret = await request.post('/produce_batch/cancel', { id: this.currentBatch.batch.id })
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

    async finishOrder() {
      if (!this.canFinish) return
      uni.showModal({
        title: '完成订单',
        content: `确认完成批次 ${this.currentBatch.batch.batchNo} 吗？完成后将不再作为执行中订单。`,
        success: async (res) => {
          if (!res.confirm) return
          this.finishing = true
          try {
            const ret = await request.post('/produce_batch/finish', { id: this.currentBatch.batch.id })
            if (ret && ret.code === '200') {
              this.currentBatch.batch.status = '3'
              this.currentDest = ''
              this.currentDestRecordId = null
              this.destIndex = -1
              uni.showToast({ title: '订单已完成', icon: 'success', duration: 1500 })
            } else {
              uni.showToast({ title: ret?.message || '完成失败，请重试', icon: 'none', duration: 2500 })
            }
          } catch (e) {
            console.error('完成批次失败:', e)
            uni.showToast({ title: '完成失败，请重试', icon: 'none' })
          } finally {
            this.finishing = false
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
      this.pageLoading = true
      this.pageLoadingText = '添加托盘中…'
      try {
        const ret = await request.post('/produce_batch/addPallet', {
          batchId: this.currentBatch.batch.id
        })
        if (ret && ret.code === '200') {
          // 从服务端重新加载完整批次数据，确保状态一致
          await this.reloadCurrentBatch()
          uni.showToast({ title: '已添加空托盘', icon: 'success', duration: 1500 })
        } else {
          uni.showToast({ title: ret?.message || '添加托盘失败', icon: 'none' })
        }
      } catch (e) {
        console.error('添加托盘失败:', e)
        uni.showToast({ title: '网络异常，请重试', icon: 'none' })
      } finally {
        this.addingPallet = false
        this.pageLoading = false
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

      this.pageLoading = true
      this.pageLoadingText = '添加箱子中…'
      try {
        const ret = await request.post('/produce_batch/addGoods', {
          batchId: String(this.currentBatch.batch.id),
          palletId: String(palletId),
          uid: uid
        })
        if (ret && ret.code === '200') {
          // 从服务端重新加载完整批次数据，确保托盘状态等字段同步
          await this.reloadCurrentBatch()
          uni.showToast({ title: '已添加箱子', icon: 'success', duration: 1500 })
        } else {
          uni.showToast({ title: ret?.message || '添加箱子失败', icon: 'none', duration: 2000 })
        }
      } catch (e) {
        console.error('添加箱子失败:', e)
        uni.showToast({ title: '网络异常，请重试', icon: 'none' })
      } finally {
        this.pageLoading = false
      }
    },

    // ============ 删除托盘 / 删除货物 ============

    async handleDeletePallet(pallet) {
      if (!pallet || !pallet.id || this.deletingPalletId) return
      uni.showModal({
        title: '确认删除',
        content: `确认删除托盘 ${pallet.palletNo || pallet.id} 及其所有货物？`,
        confirmColor: '#ef4444',
        success: async (res) => {
          if (!res.confirm) return
          this.deletingPalletId = pallet.id
          try {
            const ret = await request.post('/produce_pallet/delete', { id: String(pallet.id) })
            if (ret && ret.code === '200') {
              // 从服务端重新加载完整批次数据
              await this.reloadCurrentBatch()
              uni.showToast({ title: '托盘已删除', icon: 'success', duration: 1500 })
            } else {
              uni.showToast({ title: ret?.message || '删除失败', icon: 'none' })
            }
          } catch (e) {
            console.error('删除托盘失败:', e)
            uni.showToast({ title: '网络异常，请重试', icon: 'none' })
          } finally {
            this.deletingPalletId = null
          }
        }
      })
    },

    async handleDeleteGoods(pallet, item) {
      if (!item || !item.id || this.deletingGoodsUid) return
      uni.showModal({
        title: '确认删除',
        content: `确认删除货物 ${item.uid}？`,
        confirmColor: '#ef4444',
        success: async (res) => {
          if (!res.confirm) return
          this.deletingGoodsUid = item.uid
          try {
            const ret = await request.post('/produce_goods/delete', { id: String(item.id) })
            if (ret && ret.code === '200') {
              // 从服务端重新加载完整批次数据，确保托盘状态等字段同步
              await this.reloadCurrentBatch()
              uni.showToast({ title: '货物已删除', icon: 'success', duration: 1500 })
            } else {
              uni.showToast({ title: ret?.message || '删除失败', icon: 'none' })
            }
          } catch (e) {
            console.error('删除货物失败:', e)
            uni.showToast({ title: '网络异常，请重试', icon: 'none' })
          } finally {
            this.deletingGoodsUid = null
          }
        }
      })
    },

    // ============ 设置目的地 ============

    onDestPickerChange(e) {
      this.destIndex = Number(e.detail.value)
    },

    /**
     * 落库目的地（与手动「设置」同一接口）
     * @param {string} destCode
     * @param {{ silent?: boolean }} options silent=true 时不弹成功 Toast（由调用方统一提示）
     * @returns {Promise<boolean>}
     */
    async applyDestination(destCode, options = {}) {
      const silent = !!options.silent
      if (!destCode || !this.currentBatch || !this.currentBatch.batch) return false
      this.destSettting = true
      try {
        const ret = await request.post('/produce_batch_destination/set', {
          batchId: String(this.currentBatch.batch.id),
          destinationCode: destCode
        })
        if (ret && ret.code === '200') {
          this.currentDest = destCode
          this.currentDestRecordId = ret.data && ret.data.id
          const idx = this.destOptions.indexOf(destCode)
          this.destIndex = idx >= 0 ? idx : -1
          if (!silent) {
            uni.showToast({ title: `目的地已设为：${destCode}`, icon: 'success', duration: 1500 })
          }
          return true
        }
        if (!silent) {
          uni.showToast({ title: ret?.message || '设置失败，请重试', icon: 'none', duration: 2000 })
        }
        return false
      } catch (e) {
        console.error('设置目的地失败:', e)
        if (!silent) {
          uni.showToast({ title: '网络异常，请重试', icon: 'none' })
        }
        return false
      } finally {
        this.destSettting = false
      }
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
          await this.applyDestination(destCode)
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
  position: relative;
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

  &.tag-finished {
    color: #059669;
    background: #d1fae5;
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

.goods-delete-btn {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 6rpx rgba(239, 68, 68, 0.4);
  z-index: 2;

  &:active { opacity: 0.7; }

  &.btn-loading {
    opacity: 0.5;
    pointer-events: none;
  }
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

.finish-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 4rpx 12rpx rgba(37, 99, 235, 0.28);
  .btn-text { color: #fff; }
}

.confirm-btn.btn-finished {
  background: #d1fae5 !important;
  box-shadow: none !important;
  animation: none !important;
  .btn-text { color: #059669 !important; }
  &::before { display: none; }
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

.batch-dest-tag {
  flex-shrink: 0;
  margin-left: 16rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  background: #fff7ed;
  color: #ea580c;
  font-size: 24rpx;
  font-weight: 600;
  font-family: monospace;
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

/* ---- 删除按钮（通用） ---- */
.delete-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 2rpx 6rpx rgba(239, 68, 68, 0.35);

  &:active { opacity: 0.7; }

  &.btn-loading {
    opacity: 0.5;
    pointer-events: none;
  }
}

.pallet-delete-btn {
  width: 40rpx;
  height: 40rpx;
  margin-left: 12rpx;
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

.dest-locked-hint {
  flex: 1;
  font-size: 24rpx;
  color: #9ca3af;
  text-align: center;
  line-height: 1.4;
  padding: 12rpx 0;
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
