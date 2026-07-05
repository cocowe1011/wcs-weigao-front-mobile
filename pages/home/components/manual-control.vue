<template>
  <view class="manual-control">
    <view class="page-layout">

      <!-- 顶部：模式切换 -->
      <view class="section section-mode">
        <view class="section-header">
          <view class="section-dot"></view>
          <text class="section-title">电机控制</text>
          <view class="mode-badge" :class="isManual ? 'mode-manual' : 'mode-auto'">
            {{ isManual ? '手动模式' : '自动模式' }}
          </view>
        </view>
        <view
          class="toggle-btn"
          :class="isManual ? 'toggle-manual' : 'toggle-auto'"
          @tap="toggleMode"
        >
          <view class="toggle-track">
            <view class="toggle-thumb" :class="{ 'thumb-right': !isManual }"></view>
          </view>
          <text class="toggle-label">{{ isManual ? '当前：手动 — 点击切换为自动' : '当前：自动 — 点击切换为手动' }}</text>
        </view>
      </view>

      <!-- 电机选择 -->
      <view class="section section-motors">
        <view class="section-header">
          <view class="section-dot dot-amber"></view>
          <text class="section-title">电机选择</text>
          <text class="section-hint">可多选</text>
        </view>
        <view class="section-card motors-card">
          <view
            class="motor-row"
            v-for="(motor, idx) in motors"
            :key="idx"
          >
            <text class="motor-label">电机编号{{ idx + 1 }}</text>
            <input
              class="motor-input"
              v-model="motor.code"
              placeholder="01001-09039"
              placeholder-class="input-placeholder"
              type="text"
            />
            <view
              class="motor-sel-btn"
              :class="{ 'sel-active': motor.selected }"
              @tap="toggleMotor(idx)"
            >
              <uni-icons
                v-if="motor.selected"
                type="checkmarkempty"
                size="14"
                color="#fff"
              ></uni-icons>
              <text class="motor-sel-text">{{ motor.selected ? '已选' : '选中' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 控制按键 -->
      <view class="section section-ctrl">
        <view class="section-header">
          <view class="section-dot dot-red"></view>
          <text class="section-title">控制按键</text>
          <text v-if="!isManual" class="ctrl-disabled-hint">自动模式下不可操作</text>
        </view>
        <view class="ctrl-wrap" :class="{ 'ctrl-disabled': !isManual }">

          <!-- 电机 -->
          <view class="ctrl-group">
            <text class="ctrl-group-label">电机</text>
            <view class="ctrl-row">
              <view
                class="ctrl-btn"
                :class="{ pressing: pressState.motorForward }"
                @touchstart.prevent="onPressStart('motorForward')"
                @touchend="onPressEnd('motorForward')"
                @touchcancel="onPressEnd('motorForward')"
              >
                <uni-icons
                  type="arrow-right"
                  size="16"
                  :color="pressState.motorForward ? '#fff' : '#3b82f6'"
                  style="margin-right:8rpx;"
                ></uni-icons>
                <text class="ctrl-btn-text">{{ pressState.motorForward ? '正在前进…' : '电机前进' }}</text>
              </view>
              <view
                class="ctrl-btn"
                :class="{ pressing: pressState.motorBackward }"
                @touchstart.prevent="onPressStart('motorBackward')"
                @touchend="onPressEnd('motorBackward')"
                @touchcancel="onPressEnd('motorBackward')"
              >
                <uni-icons
                  type="arrow-left"
                  size="16"
                  :color="pressState.motorBackward ? '#fff' : '#3b82f6'"
                  style="margin-right:8rpx;"
                ></uni-icons>
                <text class="ctrl-btn-text">{{ pressState.motorBackward ? '正在后退…' : '电机后退' }}</text>
              </view>
            </view>
          </view>

          <!-- 顶升 -->
          <view class="ctrl-group">
            <text class="ctrl-group-label">顶升</text>
            <view class="ctrl-row">
              <view
                class="ctrl-btn ctrl-btn-up"
                :class="{ pressing: pressState.liftUp }"
                @touchstart.prevent="onPressStart('liftUp')"
                @touchend="onPressEnd('liftUp')"
                @touchcancel="onPressEnd('liftUp')"
              >
                <uni-icons
                  type="top"
                  size="16"
                  :color="pressState.liftUp ? '#fff' : '#10b981'"
                  style="margin-right:8rpx;"
                ></uni-icons>
                <text class="ctrl-btn-text">{{ pressState.liftUp ? '正在上升…' : '顶升上升' }}</text>
              </view>
              <view
                class="ctrl-btn ctrl-btn-down"
                :class="{ pressing: pressState.liftDown }"
                @touchstart.prevent="onPressStart('liftDown')"
                @touchend="onPressEnd('liftDown')"
                @touchcancel="onPressEnd('liftDown')"
              >
                <uni-icons
                  type="bottom"
                  size="16"
                  :color="pressState.liftDown ? '#fff' : '#10b981'"
                  style="margin-right:8rpx;"
                ></uni-icons>
                <text class="ctrl-btn-text">{{ pressState.liftDown ? '正在下降…' : '顶升下降' }}</text>
              </view>
            </view>
          </view>

          <!-- 小车 -->
          <view class="ctrl-group">
            <text class="ctrl-group-label">小车</text>
            <view class="ctrl-row">
              <view
                class="ctrl-btn ctrl-btn-left"
                :class="{ pressing: pressState.cartLeft }"
                @touchstart.prevent="onPressStart('cartLeft')"
                @touchend="onPressEnd('cartLeft')"
                @touchcancel="onPressEnd('cartLeft')"
              >
                <uni-icons
                  type="left"
                  size="16"
                  :color="pressState.cartLeft ? '#fff' : '#f59e0b'"
                  style="margin-right:8rpx;"
                ></uni-icons>
                <text class="ctrl-btn-text">{{ pressState.cartLeft ? '正在左移…' : '小车左移' }}</text>
              </view>
              <view
                class="ctrl-btn ctrl-btn-right"
                :class="{ pressing: pressState.cartRight }"
                @touchstart.prevent="onPressStart('cartRight')"
                @touchend="onPressEnd('cartRight')"
                @touchcancel="onPressEnd('cartRight')"
              >
                <uni-icons
                  type="right"
                  size="16"
                  :color="pressState.cartRight ? '#fff' : '#f59e0b'"
                  style="margin-right:8rpx;"
                ></uni-icons>
                <text class="ctrl-btn-text">{{ pressState.cartRight ? '正在右移…' : '小车右移' }}</text>
              </view>
            </view>
          </view>

        </view>
      </view>

    </view>
  </view>
</template>

<script>
// PLC 写入地址常量（对应 DB1001 数据块）
const PLC_ADDRESSES = {
  MODE_TOGGLE: 'W_DBW34',      // 手自动切换
  MOTOR_CODE_1: 'W_DBW36',     // 选定电机编号1
  MOTOR_CODE_2: 'W_DBW38',     // 选定电机编号2
  MOTOR_CODE_3: 'W_DBW40',     // 选定电机编号3
  MOTOR_CODE_4: 'W_DBW42',     // 选定电机编号4
  MOTOR_FORWARD: 'W_DBW44',    // 电机前进
  MOTOR_BACKWARD: 'W_DBW46',   // 电机后退
  LIFT_UP: 'W_DBW48',          // 顶升上升
  LIFT_DOWN: 'W_DBW50',        // 顶升下降
  CART_LEFT: 'W_DBW52',        // 小车左移
  CART_RIGHT: 'W_DBW54'        // 小车右移
}

// 电机编号1-4对应的PLC地址
const MOTOR_CODE_ADDRESSES = [
  PLC_ADDRESSES.MOTOR_CODE_1,
  PLC_ADDRESSES.MOTOR_CODE_2,
  PLC_ADDRESSES.MOTOR_CODE_3,
  PLC_ADDRESSES.MOTOR_CODE_4
]

export default {
  name: 'ManualControl',
  inject: ['provideWsClient', 'provideWsConnected'],
  data() {
    return {
      isManual: true,
      motors: [
        { code: '', selected: false },
        { code: '', selected: false },
        { code: '', selected: false },
        { code: '', selected: false }
      ],
      pressState: {
        motorForward: false,
        motorBackward: false,
        liftUp: false,
        liftDown: false,
        cartLeft: false,
        cartRight: false
      }
    }
  },
  methods: {
    // 发送 PLC 写入命令（复用 home.vue 的 WebSocket 连接）
    sendPlcCommand(address, value) {
      const wsClient = this.provideWsClient()
      const wsConnected = this.provideWsConnected()
      if (!wsClient || !wsConnected) {
        uni.showToast({
          title: '未连接到服务器',
          icon: 'none',
          duration: 1500
        })
        return false
      }
      return wsClient.sendPlcWrite(address, value)
    },

    toggleMode() {
      // 先检查WebSocket连接，未连接则不切换模式
      const wsClient = this.provideWsClient()
      const wsConnected = this.provideWsConnected()
      if (!wsClient || !wsConnected) {
        uni.showToast({ title: '未连接到服务器', icon: 'none', duration: 1500 })
        return
      }
      const newMode = !this.isManual
      
      // 发送模式切换命令到 PLC
      // 02 表示手动模式
      const modeValue = newMode ? 2 : 1
      this.sendPlcCommand(PLC_ADDRESSES.MODE_TOGGLE, modeValue)
      
      this.isManual = newMode
      uni.showToast({
        title: this.isManual ? '已切换为手动模式' : '已切换为自动模式',
        icon: 'none',
        duration: 1200
      })
    },
    toggleMotor(idx) {
      // 先检查WebSocket连接，未连接则不切换选中状态
      const wsClient = this.provideWsClient()
      const wsConnected = this.provideWsConnected()
      if (!wsClient || !wsConnected) {
        uni.showToast({ title: '未连接到服务器', icon: 'none', duration: 1500 })
        return
      }
      const motor = this.motors[idx]
      motor.selected = !motor.selected
      
      const address = MOTOR_CODE_ADDRESSES[idx]
      if (motor.selected) {
        // 选中：将电机编号写入PLC
        if (motor.code) {
          this.sendPlcCommand(address, parseInt(motor.code, 10))
        } else {
          // 没填编号就选中，提示用户
          motor.selected = false
          uni.showToast({
            title: '请先输入电机编号',
            icon: 'none',
            duration: 1500
          })
        }
      } else {
        // 取消选中：写入0清空
        this.sendPlcCommand(address, 0)
      }
    },
    onPressStart(key) {
      if (!this.isManual) return
      // 先检查WebSocket连接，未连接则不执行
      const wsClient = this.provideWsClient()
      const wsConnected = this.provideWsConnected()
      if (!wsClient || !wsConnected) {
        uni.showToast({ title: '未连接到服务器', icon: 'none', duration: 1500 })
        return
      }
      this.pressState[key] = true
      
      // 发送 PLC 命令：按下写 1
      const addressMap = {
        motorForward: PLC_ADDRESSES.MOTOR_FORWARD,
        motorBackward: PLC_ADDRESSES.MOTOR_BACKWARD,
        liftUp: PLC_ADDRESSES.LIFT_UP,
        liftDown: PLC_ADDRESSES.LIFT_DOWN,
        cartLeft: PLC_ADDRESSES.CART_LEFT,
        cartRight: PLC_ADDRESSES.CART_RIGHT
      }
      
      const address = addressMap[key]
      if (address) {
        this.sendPlcCommand(address, 1)
        uni.vibrateShort({ type: 'medium' })
      }
    },
    onPressEnd(key) {
      this.pressState[key] = false
      
      // 发送 PLC 命令：松开写 0
      const addressMap = {
        motorForward: PLC_ADDRESSES.MOTOR_FORWARD,
        motorBackward: PLC_ADDRESSES.MOTOR_BACKWARD,
        liftUp: PLC_ADDRESSES.LIFT_UP,
        liftDown: PLC_ADDRESSES.LIFT_DOWN,
        cartLeft: PLC_ADDRESSES.CART_LEFT,
        cartRight: PLC_ADDRESSES.CART_RIGHT
      }
      
      const address = addressMap[key]
      if (address) {
        this.sendPlcCommand(address, 0)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
/* ===================== 整体布局 ===================== */
.manual-control {
  height: 100%;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 20rpx;
  padding-bottom: 16rpx;
  overflow: hidden;
}

/* ===================== 区域公共 ===================== */
.section {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.section-mode {
  margin-bottom: 18rpx;
}

.section-motors {
  margin-bottom: 18rpx;
}

.section-ctrl {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
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
.dot-amber { background: #f59e0b; }
.dot-red   { background: #ef4444; }

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
}

.section-hint {
  margin-left: 14rpx;
  font-size: 22rpx;
  color: #9ca3af;
  background: #f3f4f6;
  border-radius: 20rpx;
  padding: 4rpx 14rpx;
}

.ctrl-disabled-hint {
  margin-left: 14rpx;
  font-size: 22rpx;
  color: #f59e0b;
  background: #fffbeb;
  border-radius: 20rpx;
  padding: 4rpx 14rpx;
}

.section-card {
  background: #fff;
  border-radius: 18rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* ===================== 模式切换 ===================== */
.mode-badge {
  margin-left: auto;
  font-size: 22rpx;
  font-weight: 600;
  border-radius: 20rpx;
  padding: 6rpx 18rpx;
}
.mode-manual {
  background: #eff6ff;
  color: #2563eb;
}
.mode-auto {
  background: #f0fdf4;
  color: #16a34a;
}

.toggle-btn {
  border-radius: 18rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
  transition: all 0.25s;
}
.toggle-manual {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}
.toggle-auto {
  background: linear-gradient(135deg, #16a34a, #15803d);
}

.toggle-track {
  width: 80rpx;
  height: 44rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.3);
  position: relative;
  flex-shrink: 0;
  margin-right: 20rpx;
}

.toggle-thumb {
  position: absolute;
  top: 6rpx;
  left: 6rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.2);
  transition: left 0.25s;
}
.thumb-right {
  left: 42rpx;
}

.toggle-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
}

/* ===================== 电机选择 ===================== */
.motors-card {
  padding: 8rpx 0;
}

.motor-row {
  display: flex;
  align-items: center;
  padding: 14rpx 24rpx;
}

.motor-row + .motor-row {
  border-top: 1rpx solid #f3f4f6;
}

.motor-label {
  flex-shrink: 0;
  width: 156rpx;
  font-size: 26rpx;
  color: #374151;
  font-weight: 500;
}

.motor-input {
  flex: 1;
  height: 64rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  padding: 0 18rpx;
  font-size: 26rpx;
  color: #1f2937;
  background: #f9fafb;
  box-sizing: border-box;
  margin-right: 16rpx;
}

.input-placeholder {
  color: #9ca3af;
  font-size: 24rpx;
}

.motor-sel-btn {
  flex-shrink: 0;
  height: 56rpx;
  min-width: 96rpx;
  border-radius: 12rpx;
  border: 2rpx solid #d1d5db;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.motor-sel-btn.sel-active {
  background: #2563eb;
  border-color: #2563eb;
  box-shadow: 0 4rpx 12rpx rgba(37, 99, 235, 0.35);
}

.motor-sel-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #6b7280;
  margin-left: 4rpx;
}

.motor-sel-btn.sel-active .motor-sel-text {
  color: #fff;
}

/* ===================== 控制按键 ===================== */
.ctrl-wrap {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 18rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  padding: 16rpx 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.ctrl-wrap.ctrl-disabled {
  opacity: 0.45;
  pointer-events: none;
}

.ctrl-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.ctrl-group + .ctrl-group {
  border-top: 1rpx solid #f3f4f6;
}

.ctrl-group-label {
  font-size: 22rpx;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 2rpx;
  padding: 8rpx 4rpx 8rpx;
}

.ctrl-row {
  display: flex;
  align-items: center;
  padding-bottom: 8rpx;
}

.ctrl-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 14rpx;
  background: #f0f5ff;
  border: 2rpx solid #bfdbfe;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
  /* 防止触摸时选中文字 */
  user-select: none;
  -webkit-user-select: none;
}

.ctrl-btn + .ctrl-btn {
  margin-left: 16rpx;
}

.ctrl-btn.pressing {
  background: #2563eb;
  border-color: #2563eb;
  box-shadow: 0 6rpx 20rpx rgba(37, 99, 235, 0.45);
  transform: scale(0.96);
}

/* 顶升 — 绿色系 */
.ctrl-btn-up,
.ctrl-btn-down {
  background: #f0fdf4;
  border-color: #a7f3d0;
}
.ctrl-btn-up.pressing,
.ctrl-btn-down.pressing {
  background: #10b981;
  border-color: #10b981;
  box-shadow: 0 6rpx 20rpx rgba(16, 185, 129, 0.45);
}

/* 小车 — 琥珀色系 */
.ctrl-btn-left,
.ctrl-btn-right {
  background: #fffbeb;
  border-color: #fde68a;
}
.ctrl-btn-left.pressing,
.ctrl-btn-right.pressing {
  background: #f59e0b;
  border-color: #f59e0b;
  box-shadow: 0 6rpx 20rpx rgba(245, 158, 11, 0.45);
}

.ctrl-btn-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #1e40af;
}

.ctrl-btn-up .ctrl-btn-text,
.ctrl-btn-down .ctrl-btn-text {
  color: #065f46;
}

.ctrl-btn-left .ctrl-btn-text,
.ctrl-btn-right .ctrl-btn-text {
  color: #92400e;
}

.ctrl-btn.pressing .ctrl-btn-text {
  color: #fff;
}
</style>
