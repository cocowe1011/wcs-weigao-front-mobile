<template>
  <view class="info-edit">
    <scroll-view scroll-y class="page-scroll" :show-scrollbar="false">

      <!-- 扫码获取托盘信息区域 -->
      <view class="section">
        <view class="section-header">
          <view class="section-dot dot-blue"></view>
          <text class="section-title">扫码获取托盘信息</text>
        </view>

        <view class="section-card scan-card">
          <!-- 扫码按钮 -->
          <view
            class="scan-btn"
            :class="{ 'btn-loading': scanning }"
            @tap="handleScanTap"
          >
            <uni-icons v-if="!scanning" type="scan" size="20" color="#fff" style="margin-right:10rpx;"></uni-icons>
            <text class="scan-btn-text">{{ scanning ? '扫码中…' : '扫描货物UDI码' }}</text>
          </view>

          <!-- 扫码结果展示 -->
          <view v-if="scannedPallet" class="scan-result-area">
            <view class="scan-result-header">
              <uni-icons type="checkmark-filled" size="18" color="#10b981"></uni-icons>
              <text class="scan-result-title">托盘信息已获取</text>
            </view>

            <view class="scan-result-content">
              <!-- 托盘基本信息 -->
              <view class="result-row">
                <text class="result-label">托盘编号：</text>
                <text class="result-value">{{ scannedPallet.palletNo || scannedPallet.id }}</text>
              </view>
              <view class="result-row">
                <text class="result-label">虚拟ID：</text>
                <text class="result-value">{{ scannedPallet.virtualId || '未分配' }}</text>
              </view>
              <view class="result-row">
                <text class="result-label">目的地：</text>
                <text class="result-value destination-tag" :class="getDestinationClass(scannedPallet.sendDestinationCode)">
                  {{ scannedPallet.sendDestinationCode || '未发送' }}
                </text>
              </view>
              <view class="result-row">
                <text class="result-label">货物数量：</text>
                <text class="result-value">{{ (scannedPallet.goods && scannedPallet.goods.length) || 0 }} 件</text>
              </view>
            </view>

            <!-- 横向滚动显示货物信息 -->
            <view v-if="scannedPallet.goods && scannedPallet.goods.length > 0" class="goods-scroll-area">
              <scroll-view scroll-x class="pallet-goods-scroll" :show-scrollbar="false">
                <view class="pallet-goods-row">
                  <view
                    class="goods-chip"
                    v-for="(item, gIndex) in scannedPallet.goods"
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

          <!-- 目的地信息展示已移除 -->
        </view>
      </view>

      <!-- 修改信息区域 -->
      <view class="section">
        <view class="section-header">
          <view class="section-dot dot-green"></view>
          <text class="section-title">修改信息</text>
        </view>

        <view class="section-card">
          <!-- 电机编号（必填） -->
          <view class="form-row">
            <view class="form-label-wrap">
              <text class="required-star">*</text>
              <text class="form-label">电机编号</text>
            </view>
            <input
              class="form-input"
              v-model="form.motorCode"
              placeholder="01001-09039"
              placeholder-class="input-placeholder"
              type="text"
            />
          </view>
          <view class="form-divider"></view>

          <!-- 目的地编号 -->
          <view class="form-row">
            <view class="form-label-wrap">
              <text class="form-label">目的地编号</text>
            </view>
            <input
              class="form-input"
              v-model="form.destCode"
              placeholder="3201-3215"
              placeholder-class="input-placeholder"
              type="text"
            />
          </view>
          <view class="form-divider"></view>

          <!-- 模拟id -->
          <view class="form-row">
            <view class="form-label-wrap">
              <text class="form-label">模拟id</text>
            </view>
            <input
              class="form-input"
              v-model="form.mockId"
              placeholder="10001-50000"
              placeholder-class="input-placeholder"
              type="number"
            />
          </view>
          <view class="form-divider"></view>

          <!-- 电机目标数量 -->
          <view class="form-row">
            <view class="form-label-wrap">
              <text class="form-label">电机目标数量</text>
            </view>
            <input
              class="form-input"
              v-model="form.motorTargetCount"
              placeholder="0-100"
              placeholder-class="input-placeholder"
              type="number"
            />
          </view>
        </view>
      </view>

      <!-- 下发按钮 -->
      <view class="section-cmd">
        <view
          class="cmd-btn"
          :class="{ 'btn-loading': submitting }"
          @tap="handleSubmit"
        >
          <text class="cmd-btn-text">{{ submitting ? '下发中…' : '下发修改命令' }}</text>
        </view>
      </view>

    </scroll-view>

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
import request from '@/config/request.js'

// PLC 写入地址常量（对应 DB1001 数据块 - 修改信息相关）
const PLC_ADDRESSES = {
  MOTOR_CODE: 'W_DBW24',       // WCS修改电机编号 (01001-09039)
  DEST_CODE: 'W_DBW26',        // WCS修改目的地 (3201-3215 / 02013故障)
  MOCK_ID: 'W_DBW28',          // WCS下修改模拟ID (10001-50000)
  MODIFY_CMD: 'W_DBW30',       // WCS下发修改命令 (01=修改, PLC修改完清零)
  MOTOR_TARGET_COUNT: 'W_DBW56', // WCS修改目标数量 (0-100)
  RESET_SIGNAL: 'W_DBW184'     // 复位信号 DB1001.DBW184
}

export default {
  name: 'InfoEdit',
  components: { PdaScan },
  inject: ['provideWsClient', 'provideWsConnected'],
  data() {
    return {
      submitting: false,
      scanning: false,
      showPdaScan: false,
      scannedPallet: null,     // 扫码获取的托盘信息
      form: {
        motorCode: '',
        destCode: '',
        mockId: '',
        motorTargetCount: ''
      }
    }
  },
  methods: {
    // ============ 扫码获取托盘信息 ============

    handleScanTap() {
      if (this.scanning) return
      this.showPdaScan = true
    },

    onPdaClose() {
      this.showPdaScan = false
    },

    async onPdaConfirm(uid) {
      this.showPdaScan = false
      if (!uid) return
      await this.fetchPalletInfo(this.cleanBarcode(uid))
    },

    cleanBarcode(code) {
      if (!code) return ''
      return String(code).replace(/[^a-zA-Z0-9]/g, '').trim()
    },

    // 根据UDI码获取托盘信息
    async fetchPalletInfo(uid) {
      if (!uid) {
        uni.showToast({ title: '请扫描货物UDI码', icon: 'none' })
        return
      }
      this.scanning = true
      try {
        // 直接调用简化接口，返回托盘详情（不需要从批次中查找）
        const res = await request.get('/produce_pallet/getByGoodsUid', { uid })
        if (!res || res.code !== '200' || !res.data) {
          uni.showToast({ title: '未找到该UDI码对应的托盘信息', icon: 'none', duration: 2000 })
          this.scannedPallet = null
          return
        }

        this.scannedPallet = res.data
        uni.showToast({ title: '托盘信息获取成功', icon: 'success', duration: 1500 })
      } catch (e) {
        console.error('获取托盘信息失败:', e)
        uni.showToast({ title: '获取托盘信息失败', icon: 'none' })
      } finally {
        this.scanning = false
      }
    },

    // 目的地编码样式
    getDestinationClass(code) {
      if (!code) return 'dest-none'
      if (code === '999') return 'dest-error'
      return 'dest-normal'
    },

    // ============ PLC 命令 ============

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

    async handleSubmit() {
      if (this.submitting) return
      const { motorCode, destCode, mockId, motorTargetCount } = this.form

      // 校验：电机编号必填
      if (!motorCode || !motorCode.trim()) {
        uni.showToast({ title: '电机编号为必填项', icon: 'none' })
        return
      }

      // 校验：至少填写一项修改内容
      if (!destCode && !mockId && !motorTargetCount) {
        uni.showToast({ title: '请至少填写一项修改内容', icon: 'none' })
        return
      }

      uni.showModal({
        title: '确认下发',
        content: '确认下发修改命令？',
        confirmText: '确认',
        cancelText: '取消',
        success: (modal) => {
          if (!modal.confirm) return
          this.submitting = true
          this.executePlcWrite()
        }
      })
    },

    // 执行 PLC 写入（按点位规定顺序）
    executePlcWrite() {
      const { motorCode, destCode, mockId, motorTargetCount } = this.form

      // 记录本次写入的所有地址，用于2s后取消
      const writtenAddresses = []

      // 1. 写入电机编号（必填）
      this.sendPlcCommand(PLC_ADDRESSES.MOTOR_CODE, parseInt(motorCode, 10))
      writtenAddresses.push(PLC_ADDRESSES.MOTOR_CODE)

      // 2. 写入目的地编号（选填）
      if (destCode) {
        this.sendPlcCommand(PLC_ADDRESSES.DEST_CODE, parseInt(destCode, 10))
        writtenAddresses.push(PLC_ADDRESSES.DEST_CODE)
      }

      // 3. 写入模拟ID（选填）
      if (mockId) {
        this.sendPlcCommand(PLC_ADDRESSES.MOCK_ID, parseInt(mockId, 10))
        writtenAddresses.push(PLC_ADDRESSES.MOCK_ID)
      }

      // 4. 写入电机目标数量（选填，配合修改命令）
      if (motorTargetCount) {
        this.sendPlcCommand(PLC_ADDRESSES.MOTOR_TARGET_COUNT, parseInt(motorTargetCount, 10))
        writtenAddresses.push(PLC_ADDRESSES.MOTOR_TARGET_COUNT)
      }

      // 5. 最后发送修改命令（值为1，发送2秒后取消）
      this.sendPlcCommand(PLC_ADDRESSES.MODIFY_CMD, 1)
      writtenAddresses.push(PLC_ADDRESSES.MODIFY_CMD)

      // 6. 发送复位信号 DB1001.DBW184（发送2秒后取消）
      this.sendPlcCommand(PLC_ADDRESSES.RESET_SIGNAL, 1)
      writtenAddresses.push(PLC_ADDRESSES.RESET_SIGNAL)

      // 2秒后取消所有已写入的地址
      setTimeout(() => {
        writtenAddresses.forEach(addr => {
          this.sendPlcCancelWrite(addr)
        })
      }, 2000)

      uni.showToast({ title: '下发成功', icon: 'success', duration: 1500 })
      this.form = { motorCode: '', destCode: '', mockId: '', motorTargetCount: '' }
      this.submitting = false
    }
  }
}
</script>

<style lang="scss" scoped>
.info-edit {
  height: 100%;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.page-scroll {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 16rpx;
  box-sizing: border-box;
}


.section {
  display: flex;
  flex-direction: column;
  margin-bottom: 16rpx;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
  padding-left: 4rpx;
  padding-right: 4rpx;
}

.section-dot {
  width: 10rpx;
  height: 32rpx;
  border-radius: 6rpx;
  margin-right: 14rpx;
  flex-shrink: 0;

  &.dot-blue { background: #3b82f6; }
  &.dot-green { background: #10b981; }
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.section-card {
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* ---- 扫码区域 ---- */
.scan-card {
  padding: 20rpx;
}

.scan-btn {
  height: 72rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 4rpx 12rpx rgba(59, 130, 246, 0.35);
  margin-bottom: 16rpx;

  &:active { opacity: 0.85; }

  &.btn-loading {
    background: #93c5fd;
    box-shadow: none;
  }
}

.scan-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}

/* ---- 扫码结果展示 ---- */
.scan-result-area {
  background: #f0fdf4;
  border: 1rpx solid #a7f3d0;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
}

.scan-result-header {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.scan-result-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #047857;
  margin-left: 8rpx;
}

.scan-result-content {
  display: flex;
  flex-direction: column;
}

.result-row {
  display: flex;
  align-items: center;
  margin-bottom: 6rpx;

  &:last-child { margin-bottom: 0; }
}

.result-label {
  font-size: 22rpx;
  color: #6b7280;
  flex-shrink: 0;
  width: 120rpx;
}

.result-value {
  font-size: 22rpx;
  color: #1f2937;
  font-weight: 500;
}

.destination-tag {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 600;

  &.dest-none {
    color: #6b7280;
    background: #f3f4f6;
  }

  &.dest-error {
    color: #ef4444;
    background: #fee2e2;
  }

  &.dest-normal {
    color: #047857;
    background: #d1fae5;
  }
}

/* ---- 横向滚动货物信息 ---- */
.goods-scroll-area {
  margin-top: 10rpx;
  padding-top: 10rpx;
  border-top: 1rpx dashed #d1fae5;
}

.pallet-goods-scroll {
  width: 100%;
  height: 100rpx;
  box-sizing: border-box;
}

.pallet-goods-row {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  padding: 0 6rpx;
  box-sizing: border-box;
  height: 100rpx;
}

.pallet-goods-row > .goods-chip + .goods-chip {
  margin-left: 10rpx;
}

.goods-chip {
  flex-shrink: 0;
  width: 180rpx;
  max-width: 180rpx;
  padding: 6rpx 10rpx 8rpx;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 8rpx;
  border: 1rpx solid #e5e7eb;
  box-shadow: 0 2rpx 6rpx rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
}

.goods-chip-name {
  font-size: 20rpx;
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
  margin-top: 1rpx;
  font-size: 18rpx;
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
  margin-top: 1rpx;
  font-size: 17rpx;
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

.tip-text {
  font-size: 22rpx;
  color: #3b82f6;
  margin-left: 6rpx;
}

/* ---- 表单行 ---- */
.form-row {
  display: flex;
  align-items: center;
  padding: 0 28rpx;
  min-height: 100rpx;
}

.form-label {
  font-size: 28rpx;
  color: #374151;
  font-weight: 500;
}

.form-input {
  flex: 1;
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

.input-placeholder {
  color: #9ca3af;
  font-size: 26rpx;
}

.form-divider {
  height: 1rpx;
  background: #f3f4f6;
  margin: 0 28rpx;
}

/* ---- 必填标签 ---- */
.form-label-wrap {
  flex-shrink: 0;
  width: 180rpx;
  display: flex;
  align-items: center;
}

.required-star {
  color: #ef4444;
  font-size: 28rpx;
  font-weight: 600;
  margin-right: 4rpx;
  line-height: 1;
}

/* ---- 下发按钮（与 scan-recheck 保持一致） ---- */
.section-cmd {
  flex-shrink: 0;
  margin-top: 8rpx;
}

.cmd-btn {
  height: 88rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 6rpx 20rpx rgba(37, 99, 235, 0.35);

  &:active { opacity: 0.85; }

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
</style>