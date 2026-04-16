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
export default {
  name: 'InfoEdit',
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
    async handleSubmit() {
      if (this.submitting) return
      const { motorCode } = this.form
      if (!motorCode || !motorCode.trim()) {
        uni.showToast({ title: '电机编号为必填项', icon: 'none' })
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
          // 暂不接接口：先提示下发成功，后续可在此接入 request.post('/motor/modify', this.form)
          uni.showToast({ title: '下发成功', icon: 'success', duration: 1500 })
          this.form = { motorCode: '', destCode: '', mockId: '', motorTargetCount: '' }
          this.submitting = false
        }
      })
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
  padding: 24rpx 24rpx calc(env(safe-area-inset-bottom) + 24rpx);

  > .section {
    margin-bottom: 24rpx;
  }
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
  padding: 0 4rpx;
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
