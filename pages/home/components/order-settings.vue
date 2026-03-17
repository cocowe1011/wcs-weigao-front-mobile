<template>
  <view class="order-settings">
    <!-- 可滚动的内容区域 -->
    <scroll-view 
      class="scroll-content"
      scroll-y
      :style="{ opacity: pageReady ? 1 : 0 }"
    >
      <view class="content">
        <!-- 上货队列（参考 workshop-one 卡片样式） -->
        <view class="queue-section">
          <view class="queue-header">
            <text class="queue-title">上货队列</text>
            <view class="header-right">
              <text class="queue-count">共 {{ trayQueue.length }} 个托盘</text>
            </view>
          </view>
          <view v-if="trayQueue.length === 0" class="queue-empty">
            <text class="empty-icon">📋</text>
            <text class="empty-text">暂无托盘，点击「扫码上货」添加</text>
          </view>
          <view v-else class="pallet-list">
            <view 
              class="pallet-card" 
              v-for="(item, index) in trayQueue" 
              :key="item.id"
            >
              <view class="card-header">
                <view class="position-badge">#{{ index + 1 }}</view>
                <view class="header-right">
                  <view class="remove-tray-btn" @tap.stop="removeTray(item)">移除</view>
                </view>
              </view>
              <view class="card-content">
                <view class="left-section">
                  <view class="info-item">
                    <text class="info-label">托盘码</text>
                    <text class="info-value">{{ item.trayCode }}</text>
                  </view>
                  <view class="info-item">
                    <text class="info-label">添加时间</text>
                    <text class="info-value">{{ formatTrayTime(item.addTime) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
	
	<!-- 扫码悬浮按钮：点击直接扫码 -->
	<view class="fab-btn scan-fab" @tap="openScanDirect">
	  <text class="fab-text">扫码</text>
	  <text class="fab-text">上货</text>
	</view>
    
    <!-- PLC控制悬浮按钮 -->
    <view class="fab-btn plc-fab" @tap="showPlcModal">
      <text class="fab-text">PLC</text>
      <text class="fab-text">控制</text>
    </view>
    
    <!-- 报警日志悬浮按钮 -->
    <view class="fab-btn alarm-fab" :class="{'has-unread-alarms': unreadAlarmCount > 0}" @tap="toggleAlarmModal">
      <text class="fab-text">报警</text>
      <text class="fab-text">日志</text>
      <view v-if="unreadAlarmCount > 0" class="alarm-badge">{{ unreadAlarmCount }}</view>
    </view>
    
    
    
    <!-- 报警日志弹窗 -->
    <view class="modal-overlay" v-if="showAlarmModal" @tap="toggleAlarmModal">
      <view class="alarm-modal-content" @tap.stop>
        <view class="alarm-modal-header">
          <text class="alarm-modal-title">消毒车间报警日志</text>
          <view class="alarm-actions">
            <view class="connection-status" :class="{'connected': wsStatus.isConnected, 'disconnected': !wsStatus.isConnected}">
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
            <!-- 空状态提示 -->
            <view class="empty-state alarm-empty-state" v-if="alarmLogs.length === 0">
              <text class="empty-icon">🚨</text>
              <text class="empty-text">暂无报警日志</text>
              <text class="empty-desc">电脑端产生报警时会自动推送到此处</text>
            </view>

            <!-- 报警日志列表 -->
            <view v-if="alarmLogs.length > 0">
              <view 
                v-for="alarm in alarmLogs" 
                :key="alarm.id" 
                class="alarm-card"
                :class="{'unread': alarm.unread}"
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
            <view class="alarm-btn clear-btn" @tap="clearAllAlarms" v-if="alarmLogs.length > 0">
              清空日志
            </view>
            <view class="alarm-btn mark-read-btn" @tap="markAllAlarmsAsRead" v-if="unreadAlarmCount > 0">
              全部已读
            </view>
            <view class="alarm-btn close-btn" @tap="toggleAlarmModal">
              关闭
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- PLC控制弹窗（暂为占位页） -->
    <view class="modal-overlay" v-if="showPlcPage" @tap="hidePlcModal">
      <view class="plc-modal-content" @tap.stop>
        <view class="plc-modal-header">
          <text class="plc-modal-title">PLC控制</text>
          <view class="plc-close-btn" @tap="hidePlcModal">
            <text class="close-text">×</text>
          </view>
        </view>
        <view class="plc-modal-body">
          <text class="plc-placeholder">PLC控制页面，后续完善。</text>
        </view>
      </view>
    </view>

    <!-- PDA 扫码弹窗组件 -->
    <pda-scan
      :visible="showPdaScan"
      @close="onPdaClose"
      @confirm="onPdaConfirm"
    />
  </view>
</template>

<script>
import AlarmWebSocketClient from '@/utils/WebSocketClient.js'
import PdaScan from '@/components/pda-scan.vue'

export default {
  name: 'OrderSettings',
  components: {
    PdaScan
  },
  data() {
    return {
      pageReady: false,
      // WebSocket相关数据
      wsClient: null,
      wsStatus: {
        isConnected: false
      },
      alarmLogs: [],
      showAlarmModal: false,
      // 上货队列（前端模拟）
      trayQueue: [],
      _trayId: 0,
      // 扫码
      showPdaScan: false,
      // PLC控制
      showPlcPage: false
    }
  },
  computed: {
    // 未读报警数量
    unreadAlarmCount() {
      return this.alarmLogs.filter(alarm => alarm.unread).length;
    }
  },
  mounted() {
    // 初始化WebSocket连接
    this.initWebSocket()
    // 显示页面
    this.pageReady = true
  },
  beforeDestroy() {
    // 组件销毁前断开WebSocket连接
    if (this.wsClient) {
      this.wsClient.disconnect();
      this.wsClient = null;
    }
  },
  methods: {
    // ============ WebSocket和报警日志相关方法 ============
    // 初始化WebSocket连接
    initWebSocket() {
      this.wsClient = new AlarmWebSocketClient({
        onConnected: this.onWebSocketConnected,
        onDisconnected: this.onWebSocketDisconnected,
        onAlarmReceived: this.onAlarmReceived,
        onError: this.onWebSocketError,
        onScanResponse: this.onScanResponse,
        onScanResult: this.onScanResult
      });
      
      this.wsClient.connect();
    },

    // WebSocket连接成功
    onWebSocketConnected() {
      console.log('WebSocket连接成功');
      this.wsStatus.isConnected = true;
      uni.showToast({
        title: '连接服务器成功',
        icon: 'success',
        duration: 2000
      });
    },

    // WebSocket连接断开
    onWebSocketDisconnected() {
      console.log('WebSocket连接断开');
      this.wsStatus.isConnected = false;
      uni.showToast({
        title: '服务器连接断开',
        icon: 'none',
        duration: 2000
      });
    },

    // 收到报警消息
    onAlarmReceived(alarmLog) {
      // 添加到本地报警列表
      this.alarmLogs.unshift(alarmLog);
      // 保持日志数量在合理范围内
      if (this.alarmLogs.length > 100) {
        this.alarmLogs.pop();
      }
      // 显示通知
      uni.showToast({
        title: `报警: ${alarmLog.message}`,
        icon: 'error',
        position: 'top'
      });
      // 震动提醒（需要用户交互后才能生效）
      this.tryVibrate();
    },

    // WebSocket错误
    onWebSocketError(error) {
      console.error('WebSocket错误:', error);
      this.wsStatus.isConnected = false;
    },

    // 切换报警日志弹窗
    toggleAlarmModal() {
      this.showAlarmModal = !this.showAlarmModal;
    },

    // 刷新报警日志
    refreshAlarmLogs() {
      if (this.wsClient) {
        const status = this.wsClient.getConnectionStatus();
        this.wsStatus.isConnected = status.isConnected;
        this.alarmLogs = this.wsClient.getAlarmLogs();
      }
      
      uni.showToast({
        title: '刷新完成',
        icon: 'success',
        duration: 1000
      });
    },

    // 标记单个报警为已读
    markAlarmAsRead(alarm) {
      alarm.unread = false;
      
      // 同步到WebSocket客户端
      if (this.wsClient) {
        const clientAlarms = this.wsClient.getAlarmLogs();
        const clientAlarm = clientAlarms.find(a => a.id === alarm.id);
        if (clientAlarm) {
          clientAlarm.unread = false;
        }
      }
    },

    // 标记所有报警为已读
    markAllAlarmsAsRead() {
      this.alarmLogs.forEach(alarm => {
        alarm.unread = false;
      });
      
      // 同步到WebSocket客户端
      if (this.wsClient) {
        this.wsClient.markAlarmsAsRead();
      }
      
      uni.showToast({
        title: '已全部标记为已读',
        icon: 'success',
        duration: 1000
      });
    },

    // 清空所有报警日志
    clearAllAlarms() {
      uni.showModal({
        title: '确认清空',
        content: '确定要清空所有报警日志吗？',
        success: (res) => {
          if (res.confirm) {
            this.alarmLogs = [];
            
            // 同步到WebSocket客户端
            if (this.wsClient) {
              this.wsClient.clearAlarmLogs();
            }
            
            uni.showToast({
              title: '已清空报警日志',
              icon: 'success',
              duration: 1000
            });
          }
        }
      });
    },

    // 格式化报警时间
    formatAlarmTime(timestamp) {
      if (!timestamp) return '--';
      const date = new Date(timestamp);
      
      // 手动格式化时分秒，避免时区信息显示
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      
      return `${hours}:${minutes}:${seconds}`;
    },

    // 尝试震动提醒（处理浏览器用户激活策略）
    tryVibrate() {
      try {
        // 检查是否支持震动
        if (typeof uni.vibrateLong === 'function') {
          uni.vibrateLong();
        }
      } catch (error) {
        // 静默处理震动失败（通常是因为缺少用户交互）
        console.log('震动提醒被浏览器阻止，需要用户交互后才能生效');
      }
    },

    // ============ 上货队列（前端模拟）============
    formatTrayTime(timestamp) {
      if (!timestamp) return '--';
      const d = new Date(timestamp);
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      const s = d.getSeconds().toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
    },
    addMockTray(trayCode) {
      this._trayId += 1;
      this.trayQueue.push({
        id: this._trayId,
        trayCode: trayCode || `TRAY-${this._trayId}`,
        addTime: Date.now()
      });
    },
    removeTray(item) {
      this.trayQueue = this.trayQueue.filter(t => t.id !== item.id);
      uni.showToast({ title: '已移除', icon: 'success', duration: 1000 });
    },

    // ============ 扫码相关（直接扫码，连接PC时发往电脑端）============
    openScanDirect() {
      this.showPdaScan = true;
    },
    onPdaClose() {
      this.showPdaScan = false;
    },
    onPdaConfirm(scanCode) {
      this.showPdaScan = false;
      if (!scanCode) return;
      // 已连接电脑端时：通过 WebSocket 发送到 PC 上货区
      if (this.wsStatus.isConnected && this.wsClient) {
        uni.showLoading({ title: '处理中...', mask: true });
        const sent = this.wsClient.sendScanCode('上货区', scanCode);
        if (!sent) {
          uni.hideLoading();
          uni.showToast({ title: '发送失败，请检查连接', icon: 'none' });
          this.addMockTray(scanCode);
        }
        setTimeout(() => uni.hideLoading(), 10000);
        return;
      }
      // 未连接时：仅加入本地队列
      this.addMockTray(scanCode);
      uni.showToast({ title: '已加入上货队列', icon: 'success' });
    },

    // ============ PLC控制 ============
    showPlcModal() {
      this.showPlcPage = true;
    },
    hidePlcModal() {
      this.showPlcPage = false;
    },

    // 处理扫码响应（PC 端确认收到）
    onScanResponse(data) {
      uni.hideLoading();
      if (!data.success) {
        uni.showToast({ title: data.message || '扫码处理失败', icon: 'none' });
      }
    },
    // 处理扫码结果（PC 端处理完成）
    onScanResult(data) {
      if (data.success) {
        const trayCode = (data.data && data.data.trayCode) || '';
        if (trayCode) this.addMockTray(trayCode);
        uni.showToast({ title: '扫码成功，已同步到电脑端', icon: 'success' });
      } else {
        uni.showToast({ title: data.message || '扫码处理失败', icon: 'none' });
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.order-settings {
  height: 100%;
  background: #f5f7fa;
}

.scroll-content {
  height: 100%;
  transition: opacity 0.3s ease;
}

.content {
  padding: 30rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 220rpx);
  
  .queue-section {
    .queue-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24rpx;
      padding: 0 8rpx;
      .queue-title {
        font-size: 32rpx;
        font-weight: 600;
        color: #1f2937;
      }
      .header-right {
        display: flex;
        align-items: center;
      }
      .queue-count {
        font-size: 24rpx;
        color: #6b7280;
        background: rgba(107, 114, 128, 0.08);
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
      }
    }
    .queue-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60rpx 30rpx;
      .empty-icon {
        font-size: 80rpx;
        margin-bottom: 16rpx;
      }
      .empty-text {
        font-size: 28rpx;
        color: #999;
      }
    }
    .pallet-list {
      display: flex;
      flex-direction: column;
    }
    .pallet-card {
      background: #ffffff;
      border-radius: 16rpx;
      overflow: hidden;
      box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.12);
      margin-bottom: 30rpx;
      position: relative;
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20rpx 24rpx;
        background: #f9fafb;
        border-bottom: 1px solid #f3f4f6;
        .position-badge {
          background: #2563eb;
          color: #fff;
          font-size: 26rpx;
          font-weight: 500;
          padding: 6rpx 16rpx;
          border-radius: 8rpx;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 12rpx;
        }
        .remove-tray-btn {
          background: #ef4444;
          color: #fff;
          padding: 6rpx 16rpx;
          border-radius: 6rpx;
          font-size: 24rpx;
          font-weight: 500;
          &:active {
            background: #dc2626;
          }
        }
      }
      .card-content {
        padding: 20rpx 24rpx;
        display: flex;
        .left-section {
          flex: 1;
        }
        .info-item {
          display: flex;
          margin-bottom: 16rpx;
          &:last-child {
            margin-bottom: 0;
          }
          .info-label {
            flex: 0 0 140rpx;
            font-size: 26rpx;
            color: #6b7280;
          }
          .info-value {
            flex: 1;
            font-size: 28rpx;
            color: #1f2937;
            font-weight: 500;
          }
        }
      }
    }
  }
}

/* 通用模态框覆盖层 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* 悬浮按钮基础样式 */
.fab-btn {
  position: fixed;
  right: 30rpx;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.2);
  z-index: 999;
  font-size: 24rpx;
  font-weight: 600;
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.95);
    opacity: 0.8;
  }

  .fab-text {
    line-height: 1;
    font-size: 24rpx;
    font-weight: 600;
    color: #fff;
  }
}

/* PLC控制悬浮按钮 */
.fab-btn.plc-fab {
  bottom: 280rpx;
  background: #10b981 !important;
  &:active {
    background: #059669 !important;
  }
}

/* 报警悬浮按钮（最下） */
.alarm-fab {
  bottom: 140rpx;
  background-color: #f59e0b;

  &:active {
    background-color: #d97706;
  }
  
  // 脉冲效果 - 只在有未读报警时显示
  &.has-unread-alarms::before {
    content: '';
    position: absolute;
    top: -6rpx;
    left: -6rpx;
    right: -6rpx;
    bottom: -6rpx;
    background-color: #ef4444;
    border-radius: 50%;
    opacity: 0;
    animation: alarm-pulse 2s infinite;
    z-index: -1;
  }
  
  .alarm-badge {
    position: absolute;
    top: -10rpx;
    right: -10rpx;
    min-width: 36rpx;
    height: 36rpx;
    background-color: #ef4444;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20rpx;
    font-weight: 600;
    border: 2rpx solid #fff;
    box-shadow: 0 2rpx 8rpx rgba(239, 68, 68, 0.4);
  }
}

/* 扫码悬浮按钮（最上/前面） */
.fab-btn.scan-fab {
  bottom: 420rpx;
  background: #3b82f6 !important;

  &:active {
    background: #2563eb !important;
  }
}

// 脉冲动画
@keyframes alarm-pulse {
  0% {
    opacity: 0;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.2);
  }
  100% {
    opacity: 0;
    transform: scale(1.4);
  }
}

// 报警日志弹窗样式
.alarm-modal-content {
  width: 90%;
  max-width: 700rpx;
  height: 80vh;
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.15);
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
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;

  .alarm-modal-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1f2937;
  }

  .alarm-actions {
    display: flex;
    align-items: center;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 6rpx 12rpx;
    border-radius: 12rpx;
    background: #f3f4f6;
    font-size: 22rpx;
    margin-right: 16rpx;

    .status-dot {
      width: 12rpx;
      height: 12rpx;
      border-radius: 50%;
      display: block;
    }

    &.connected .status-dot {
      background: #10b981;
    }

    &.disconnected .status-dot {
      background: #ef4444;
    }

    .status-text {
      color: #6b7280;
      font-weight: 500;
    }
  }

  .alarm-refresh-btn {
    background: #2563eb;
    color: #fff;
    padding: 8rpx 16rpx;
    border-radius: 8rpx;
    font-size: 22rpx;
    font-weight: 500;

    &:active {
      background: #1d4ed8;
    }
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
  overflow-x: hidden;
  overflow-y: auto;
}

.alarm-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
  text-align: center;

  .empty-icon {
    font-size: 100rpx;
    margin-bottom: 30rpx;
  }

  .empty-text {
    font-size: 32rpx;
    color: #666;
    margin-bottom: 20rpx;
  }

  .empty-desc {
    font-size: 28rpx;
    color: #999;
  }
}

.alarm-card {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  border-left: 4rpx solid #e5e7eb;
  transition: all 0.2s ease;

  &.unread {
    border-left-color: #ef4444;
    background: #fef2f2;
  }

  .alarm-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;

    .alarm-source {
      font-size: 24rpx;
      color: #6366f1;
      font-weight: 600;
    }

    .alarm-time {
      font-size: 22rpx;
      color: #9ca3af;
    }
  }

  .alarm-message {
    font-size: 26rpx;
    color: #1f2937;
    line-height: 1.5;
    font-weight: 500;
    margin-bottom: 8rpx;
    word-wrap: break-word;
    word-break: break-all;
    white-space: normal;
    overflow-wrap: break-word;
  }

  .unread-indicator {
    text-align: right;

    .unread-text {
      font-size: 20rpx;
      color: #ef4444;
      background: #fee2e2;
      padding: 2rpx 8rpx;
      border-radius: 8rpx;
      font-weight: 500;
    }
  }
}

.alarm-modal-footer {
  padding: 20rpx 24rpx;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;

  .alarm-footer-actions {
    display: flex;

    .alarm-btn {
      flex: 1;
      text-align: center;
      padding: 16rpx 0;
      font-size: 26rpx;
      font-weight: 500;
      border-radius: 8rpx;
      color: #fff;
      margin-right: 12rpx;
      
      &:last-child {
        margin-right: 0;
      }

      &.clear-btn {
        background: #ef4444;

        &:active {
          background: #dc2626;
        }
      }

      &.mark-read-btn {
        background: #10b981;

        &:active {
          background: #059669;
        }
      }

      &.close-btn {
        background: #6b7280;

        &:active {
          background: #4b5563;
        }
      }
    }
  }
}

// PLC控制弹窗
.plc-modal-content {
  width: 90%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}
.plc-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  .plc-modal-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1f2937;
  }
  .plc-close-btn {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #e5e7eb;
    .close-text { font-size: 40rpx; color: #6b7280; }
  }
}
.plc-modal-body {
  padding: 80rpx 40rpx;
  min-height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  .plc-placeholder {
    font-size: 28rpx;
    color: #6b7280;
  }
}

// 扫码弹窗样式（保留供 pda-scan 等使用）
.scan-modal-content {
  width: 90%;
  max-width: 600rpx;
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  color: #333;
}

.scan-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;

  .scan-modal-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1f2937;
  }

  .scan-header-actions {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 6rpx 12rpx;
    border-radius: 12rpx;
    background: #f3f4f6;
    font-size: 22rpx;

    .status-dot {
      width: 12rpx;
      height: 12rpx;
      border-radius: 50%;
      display: block;
    }

    &.connected .status-dot {
      background: #10b981;
    }

    &.disconnected .status-dot {
      background: #ef4444;
    }

    .status-text {
      color: #6b7280;
      font-weight: 500;
    }
  }

  .scan-close-btn {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #e5e7eb;
    
    &:active {
      background: #d1d5db;
    }

    .close-text {
      font-size: 40rpx;
      color: #6b7280;
      font-weight: 300;
    }
  }
}

.scan-modal-body {
  padding: 0;
  max-height: 60vh;
  overflow-y: auto;
}

.scan-location-list {
  .scan-location-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx 24rpx;
    border-bottom: 1px solid #f3f4f6;
    transition: all 0.2s ease;

    &:active {
      background: #f9fafb;
    }

    &:last-child {
      border-bottom: none;
    }

    .location-name {
      font-size: 28rpx;
      color: #1f2937;
      font-weight: 500;
    }

    .iconfont {
      font-size: 24rpx;
      color: #9ca3af;
    }
  }
}
</style> 