<template>
  <view class="home-container">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="welcome">欢迎回来，{{ username }}</view>
      <view class="header-actions">
        <!-- 报警铃铛 -->
        <view class="alarm-bell" :class="{ 'has-unread': unreadAlarmCount > 0 }" @tap="toggleAlarmModal">
          <uni-icons type="notification-filled" size="24" color="#fff"></uni-icons>
          <view v-if="unreadAlarmCount > 0" class="alarm-badge">{{ unreadAlarmCount > 99 ? '99+' : unreadAlarmCount }}</view>
        </view>
        <!-- 退出登录 -->
        <view class="logout" @tap="handleLogout">退出登录</view>
      </view>
    </view>

    <!-- 内容区域 -->
    <view class="page-body">
      <order-settings v-show="activeTab === 'order'" />
      <scan-recheck v-show="activeTab === 'scan'" />
      <info-edit v-show="activeTab === 'info'" />
      <manual-control v-show="activeTab === 'manual'" />
    </view>

    <!-- 底部标签导航 -->
    <view class="tab-bar">
      <!-- 订单设置 -->
      <view
        class="tab-item"
        :class="{ active: activeTab === 'order' }"
        @tap="activeTab = 'order'"
      >
        <view class="tab-icon">
          <uni-icons type="list" size="24" :color="activeTab === 'order' ? '#1a2a6c' : '#9ca3af'"></uni-icons>
        </view>
        <text class="tab-label">订单设置</text>
      </view>

      <!-- 扫码复检 -->
      <view
        class="tab-item"
        :class="{ active: activeTab === 'scan' }"
        @tap="activeTab = 'scan'"
      >
        <view class="tab-icon">
          <uni-icons type="scan" size="24" :color="activeTab === 'scan' ? '#1a2a6c' : '#9ca3af'"></uni-icons>
        </view>
        <text class="tab-label">扫码复检</text>
      </view>

      <!-- 信息修改 -->
      <view
        class="tab-item"
        :class="{ active: activeTab === 'info' }"
        @tap="activeTab = 'info'"
      >
        <view class="tab-icon">
          <uni-icons type="compose" size="24" :color="activeTab === 'info' ? '#1a2a6c' : '#9ca3af'"></uni-icons>
        </view>
        <text class="tab-label">信息修改</text>
      </view>

      <!-- 手动控制 -->
      <view
        class="tab-item"
        :class="{ active: activeTab === 'manual' }"
        @tap="activeTab = 'manual'"
      >
        <view class="tab-icon">
          <uni-icons type="settings" size="24" :color="activeTab === 'manual' ? '#1a2a6c' : '#9ca3af'"></uni-icons>
        </view>
        <text class="tab-label">手动控制</text>
      </view>
    </view>

    <!-- 报警日志弹窗 -->
    <view class="modal-overlay" v-if="showAlarmModal" @tap="toggleAlarmModal">
      <view class="alarm-modal-content" @tap.stop>
        <view class="alarm-modal-header">
          <text class="alarm-modal-title">消毒车间报警日志</text>
          <view class="alarm-actions">
            <view class="connection-status" :class="{ connected: wsStatus.isConnected, disconnected: !wsStatus.isConnected }">
              <text class="status-dot"></text>
              <text class="status-text">{{ wsStatus.isConnected ? '已连接' : '未连接' }}</text>
            </view>
            <view class="alarm-refresh-btn" @tap="refreshAlarmLogs">
              <text class="refresh-text">刷新</text>
            </view>
          </view>
        </view>

        <view class="alarm-modal-body">
          <scroll-view scroll-y="true" class="alarm-list">
            <view class="alarm-empty-state" v-if="alarmLogs.length === 0">
              <text class="empty-icon">🚨</text>
              <text class="empty-text">暂无报警日志</text>
              <text class="empty-desc">电脑端产生报警时会自动推送到此处</text>
            </view>
            <view v-if="alarmLogs.length > 0">
              <view
                v-for="alarm in alarmLogs"
                :key="alarm.id"
                class="alarm-card"
                :class="{ unread: alarm.unread }"
                @tap="markAlarmAsRead(alarm)"
              >
                <view class="alarm-card-header">
                  <view class="alarm-source">{{ alarm.source }}</view>
                  <view class="alarm-time">{{ formatAlarmTime(alarm.timestamp) }}</view>
                </view>
                <view class="alarm-message">{{ alarm.message }}</view>
                <view v-if="alarm.unread" class="unread-indicator">
                  <text class="unread-text">未读</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="alarm-modal-footer">
          <view class="alarm-footer-actions">
            <view class="alarm-btn clear-btn" @tap="clearAllAlarms" v-if="alarmLogs.length > 0">清空日志</view>
            <view class="alarm-btn mark-read-btn" @tap="markAllAlarmsAsRead" v-if="unreadAlarmCount > 0">全部已读</view>
            <view class="alarm-btn close-btn" @tap="toggleAlarmModal">关闭</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import OrderSettings from './components/order-settings.vue'
import ScanRecheck from './components/scan-recheck.vue'
import InfoEdit from './components/info-edit.vue'
import ManualControl from './components/manual-control.vue'
import AlarmWebSocketClient from '@/utils/WebSocketClient.js'

export default {
  components: { OrderSettings, ScanRecheck, InfoEdit, ManualControl },
  // 向子组件提供 WebSocket 客户端，避免每个子组件各自建连接
  provide() {
    return {
      provideWsClient: () => this.wsClient,
      provideWsConnected: () => this.wsStatus.isConnected
    }
  },
  data() {
    return {
      statusBarHeight: 0,
      username: '用户',
      activeTab: 'order',
      // WebSocket / 报警
      wsClient: null,
      wsStatus: { isConnected: false },
      alarmLogs: [],
      showAlarmModal: false
    }
  },
  computed: {
    unreadAlarmCount() {
      return this.alarmLogs.filter(a => a.unread).length
    }
  },
  onLoad() {
    const sysInfo = uni.getSystemInfoSync()
    this.statusBarHeight = sysInfo.statusBarHeight
    try {
      const saved = uni.getStorageSync('username')
      if (saved) this.username = saved
    } catch (e) {
      console.error('读取用户信息失败:', e)
    }
  },
  mounted() {
    this.initWebSocket()
  },
  beforeDestroy() {
    if (this.wsClient) {
      this.wsClient.disconnect()
      this.wsClient = null
    }
  },
  methods: {
    handleLogout() {
      uni.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        confirmText: '确认退出',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            uni.removeStorageSync('token')
            uni.removeStorageSync('username')
            uni.removeStorageSync('current_workshop')
            uni.reLaunch({ url: '/pages/login/login' })
          }
        }
      })
    },

    // ============ WebSocket / 报警 ============

    initWebSocket() {
      this.wsClient = new AlarmWebSocketClient({
        onConnected: this.onWebSocketConnected,
        onDisconnected: this.onWebSocketDisconnected,
        onAlarmReceived: this.onAlarmReceived,
        onPlcWriteResponse: this.onPlcWriteResponse,
        onError: this.onWebSocketError
      })
      this.wsClient.connect()
    },

    onWebSocketConnected() {
      this.wsStatus.isConnected = true
      uni.showToast({ title: '连接服务器成功', icon: 'success', duration: 2000 })
    },

    onWebSocketDisconnected() {
      this.wsStatus.isConnected = false
    },

    onAlarmReceived(alarmLog) {
      this.alarmLogs.unshift(alarmLog)
      if (this.alarmLogs.length > 100) this.alarmLogs.pop()
      uni.showToast({ title: `报警: ${alarmLog.message}`, icon: 'error', position: 'top' })
      try { uni.vibrateLong() } catch (e) {}
    },

    onWebSocketError(error) {
      console.error('WebSocket错误:', error)
      this.wsStatus.isConnected = false
    },

    onPlcWriteResponse(data) {
      if (!data.success) {
        uni.showToast({
          title: data.message || 'PLC 写入失败',
          icon: 'none',
          duration: 1500
        })
      }
    },

    toggleAlarmModal() {
      this.showAlarmModal = !this.showAlarmModal
    },

    refreshAlarmLogs() {
      if (this.wsClient) {
        this.wsStatus.isConnected = this.wsClient.getConnectionStatus().isConnected
        this.alarmLogs = this.wsClient.getAlarmLogs()
      }
      uni.showToast({ title: '刷新完成', icon: 'success', duration: 1000 })
    },

    markAlarmAsRead(alarm) {
      alarm.unread = false
      if (this.wsClient) {
        const ca = this.wsClient.getAlarmLogs().find(a => a.id === alarm.id)
        if (ca) ca.unread = false
      }
    },

    markAllAlarmsAsRead() {
      this.alarmLogs.forEach(a => { a.unread = false })
      if (this.wsClient) this.wsClient.markAlarmsAsRead()
      uni.showToast({ title: '已全部标记为已读', icon: 'success', duration: 1000 })
    },

    clearAllAlarms() {
      uni.showModal({
        title: '确认清空',
        content: '确定要清空所有报警日志吗？',
        success: (res) => {
          if (res.confirm) {
            this.alarmLogs = []
            if (this.wsClient) this.wsClient.clearAlarmLogs()
            uni.showToast({ title: '已清空报警日志', icon: 'success', duration: 1000 })
          }
        }
      })
    },

    formatAlarmTime(timestamp) {
      if (!timestamp) return '--'
      const d = new Date(timestamp)
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      const s = d.getSeconds().toString().padStart(2, '0')
      return `${h}:${m}:${s}`
    }
  }
}
</script>

<style lang="scss" scoped>
// ---- 整体布局 ----
.home-container {
  position: fixed;
  top: 0; bottom: 0; left: 0; right: 0;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

// ---- 状态栏 ----
.status-bar {
  flex-shrink: 0;
  background: linear-gradient(90deg, #1a2a6c, #b21f1f);
}

// ---- 顶部导航栏 ----
.header {
  flex-shrink: 0;
  background: linear-gradient(90deg, #1a2a6c, #b21f1f);
  padding: 20rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;

  .welcome {
    font-size: 32rpx;
  }

  .header-actions {
    display: flex;
    align-items: center;

    > * + * {
      margin-left: 24rpx;
    }
  }

  .alarm-bell {
    position: relative;
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    transition: all 0.2s;

    &:active {
      background: rgba(255, 255, 255, 0.25);
      transform: scale(0.95);
    }

    &.has-unread {
      animation: bell-shake 0.5s ease-in-out infinite;
    }

    .alarm-badge {
      position: absolute;
      top: -4rpx;
      right: -4rpx;
      min-width: 32rpx;
      height: 32rpx;
      background: #ef4444;
      color: #fff;
      border-radius: 16rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20rpx;
      font-weight: 600;
      padding: 0 8rpx;
      border: 2rpx solid #fff;
      box-shadow: 0 2rpx 8rpx rgba(239, 68, 68, 0.4);
    }
  }

  .logout {
    font-size: 28rpx;
    padding: 10rpx 20rpx;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 30rpx;
  }
}

@keyframes bell-shake {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(10deg); }
  75% { transform: rotate(-10deg); }
}

// ---- 内容区域 ----
.page-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}

// ---- 底部标签栏 ----
.tab-bar {
  flex-shrink: 0;
  background: #fff;
  border-top: 1rpx solid #e5e7eb;
  display: flex;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.tab-item {
  flex: 1;
  height: 100rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  --icon-c: #9ca3af;
  transition: background 0.15s;

  &:active {
    background: #f9fafb;
  }

  &.active {
    --icon-c: #1a2a6c;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 25%;
      right: 25%;
      height: 4rpx;
      background: linear-gradient(90deg, #1a2a6c, #b21f1f);
      border-radius: 0 0 4rpx 4rpx;
    }
  }

  .tab-label {
    font-size: 22rpx;
    color: var(--icon-c);
    margin-top: 8rpx;
    font-weight: 500;
    transition: color 0.2s;
  }
}

// ---- Tab 图标基础 ----
.tab-icon {
  width: 48rpx;
  height: 48rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

// ---- 报警弹窗样式 ----
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.alarm-modal-content {
  width: 90%;
  max-width: 700rpx;
  height: 80vh;
  background: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  color: #333;
}

.alarm-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #f8f9fa;
  border-bottom: 1rpx solid #e9ecef;
  flex-shrink: 0;

  .alarm-modal-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1f2937;
  }

  .alarm-actions {
    display: flex;
    align-items: center;

    > .alarm-refresh-btn {
      margin-left: 12rpx;
    }
  }

  .connection-status {
    display: flex;
    align-items: center;

    .status-text {
      margin-left: 8rpx;
    }
    padding: 6rpx 12rpx;
    border-radius: 12rpx;
    background: #f3f4f6;
    font-size: 22rpx;

    .status-dot {
      width: 12rpx; height: 12rpx;
      border-radius: 50%;
      display: block;
    }

    &.connected .status-dot { background: #10b981; }
    &.disconnected .status-dot { background: #ef4444; }

    .status-text { color: #6b7280; font-weight: 500; }
  }

  .alarm-refresh-btn {
    background: #2563eb;
    color: #fff;
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
    font-size: 22rpx;
    font-weight: 500;
    &:active { background: #1d4ed8; }
    .refresh-text { color: #fff; }
  }
}

.alarm-modal-body {
  flex: 1;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
}

.alarm-list {
  flex: 1;
  padding: 16rpx;
  box-sizing: border-box;
}

.alarm-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
  text-align: center;

  .empty-icon { font-size: 100rpx; margin-bottom: 30rpx; }
  .empty-text { font-size: 32rpx; color: #666; margin-bottom: 20rpx; }
  .empty-desc { font-size: 28rpx; color: #999; }
}

.alarm-card {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  border-left: 4rpx solid #e5e7eb;

  &.unread {
    border-left-color: #ef4444;
    background: #fef2f2;
  }

  .alarm-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;

    .alarm-source { font-size: 24rpx; color: #6366f1; font-weight: 600; }
    .alarm-time { font-size: 22rpx; color: #9ca3af; }
  }

  .alarm-message {
    font-size: 26rpx; color: #1f2937; line-height: 1.5;
    font-weight: 500; margin-bottom: 8rpx; word-break: break-all;
  }

  .unread-indicator {
    text-align: right;
    .unread-text {
      font-size: 20rpx; color: #ef4444; background: #fee2e2;
      padding: 2rpx 8rpx; border-radius: 8rpx; font-weight: 500;
    }
  }
}

.alarm-modal-footer {
  padding: 20rpx 24rpx;
  background: #ffffff;
  border-top: 1rpx solid #e5e7eb;
  flex-shrink: 0;

  .alarm-footer-actions {
    display: flex;

    > .alarm-btn + .alarm-btn {
      margin-left: 12rpx;
    }
  }

  .alarm-btn {
    flex: 1;
    text-align: center;
    padding: 16rpx 0;
    font-size: 26rpx;
    font-weight: 500;
    border-radius: 8rpx;
    color: #fff;

    &.clear-btn { background: #ef4444; &:active { background: #dc2626; } }
    &.mark-read-btn { background: #10b981; &:active { background: #059669; } }
    &.close-btn { background: #6b7280; &:active { background: #4b5563; } }
  }
}
</style>
