<template>
  <view class="info-edit">
    <view class="page-layout">

      <!-- 修改信息区域 -->
      <view class="section">
        <view class="section-header">
          <view class="section-dot"></view>
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

    </view>
  </view>
</template>

<script>
// PLC 写入地址常量（对应 DB1001 数据块 - 修改信息相关）
const PLC_ADDRESSES = {
  MOTOR_CODE: 'W_DBW24',       // WCS修改电机编号 (01001-09039)
  DEST_CODE: 'W_DBW26',        // WCS修改目的地 (3201-3215 / 02013故障)
  MOCK_ID: 'W_DBW28',          // WCS下修改模拟ID (10001-50000)
  MODIFY_CMD: 'W_DBW30',       // WCS下发修改命令 (01=修改, PLC修改完清零)
  MOTOR_TARGET_COUNT: 'W_DBW56' // WCS修改目标数量 (0-100)
}

export default {
  name: 'InfoEdit',
  inject: ['provideWsClient', 'provideWsConnected'],
  data() {
    return {
      submitting: false,
      form: {
        motorCode: '',
        destCode: '',
        mockId: '',
        motorTargetCount: ''
      }
    }
  },
  methods: {
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

.page-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 24rpx;
  padding-bottom: 24rpx;
}

.page-layout > .section {
  margin-bottom: 24rpx;
}

/* ---- 区域公共 ---- */
.section {
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
  padding-left: 4rpx;
  padding-right: 4rpx;
}

.section-dot {
  width: 10rpx;
  height: 32rpx;
  border-radius: 6rpx;
  background: #3b82f6;
  margin-right: 14rpx;
  flex-shrink: 0;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.section-card {
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.07);
  overflow: hidden;
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
