<template>
  <view class="home-container">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="welcome">欢迎回来，{{ username }}</view>
      <view class="logout" @tap="handleLogout">退出登录</view>
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
        <view class="tab-icon icon-order">
          <view class="bar b-full"></view>
          <view class="bar b-full"></view>
          <view class="bar b-short"></view>
        </view>
        <text class="tab-label">订单设置</text>
      </view>

      <!-- 扫码复检 -->
      <view
        class="tab-item"
        :class="{ active: activeTab === 'scan' }"
        @tap="activeTab = 'scan'"
      >
        <view class="tab-icon icon-scan">
          <view class="corner c-tl"></view>
          <view class="corner c-tr"></view>
          <view class="corner c-bl"></view>
          <view class="corner c-br"></view>
          <view class="center-sq"></view>
        </view>
        <text class="tab-label">扫码复检</text>
      </view>

      <!-- 信息修改 -->
      <view
        class="tab-item"
        :class="{ active: activeTab === 'info' }"
        @tap="activeTab = 'info'"
      >
        <view class="tab-icon icon-edit">
          <view class="pen-body"></view>
          <view class="pen-underline"></view>
        </view>
        <text class="tab-label">信息修改</text>
      </view>

      <!-- 手动控制 -->
      <view
        class="tab-item"
        :class="{ active: activeTab === 'manual' }"
        @tap="activeTab = 'manual'"
      >
        <view class="tab-icon icon-ctrl">
          <view class="ctrl-ring"></view>
          <view class="ctrl-v"></view>
          <view class="ctrl-h"></view>
        </view>
        <text class="tab-label">手动控制</text>
      </view>
    </view>
  </view>
</template>

<script>
import OrderSettings from './components/order-settings.vue'
import ScanRecheck from './components/scan-recheck.vue'
import InfoEdit from './components/info-edit.vue'
import ManualControl from './components/manual-control.vue'

export default {
  components: { OrderSettings, ScanRecheck, InfoEdit, ManualControl },
  data() {
    return {
      statusBarHeight: 0,
      username: '用户',
      activeTab: 'order'
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

  .logout {
    font-size: 28rpx;
    padding: 10rpx 20rpx;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 30rpx;
  }
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
  width: 44rpx;
  height: 44rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

// 订单设置：三横线（列表）
.icon-order {
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 8rpx;

  .bar {
    height: 4rpx;
    border-radius: 2rpx;
    background: var(--icon-c);
    transition: background 0.2s;
  }

  .b-full { width: 44rpx; }
  .b-short { width: 28rpx; }
}

// 扫码复检：扫描框（四角 + 中心方块）
.icon-scan {
  .corner {
    position: absolute;
    width: 14rpx;
    height: 14rpx;
    border-style: solid;
    border-color: var(--icon-c);
    transition: border-color 0.2s;
  }

  .c-tl { top: 0; left: 0; border-width: 4rpx 0 0 4rpx; }
  .c-tr { top: 0; right: 0; border-width: 4rpx 4rpx 0 0; }
  .c-bl { bottom: 0; left: 0; border-width: 0 0 4rpx 4rpx; }
  .c-br { bottom: 0; right: 0; border-width: 0 4rpx 4rpx 0; }

  .center-sq {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16rpx;
    height: 16rpx;
    border: 3rpx solid var(--icon-c);
    transition: border-color 0.2s;
  }
}

// 信息修改：钢笔（斜矩形 + 底划线）
.icon-edit {
  .pen-body {
    position: absolute;
    width: 28rpx;
    height: 10rpx;
    background: var(--icon-c);
    border-radius: 2rpx 6rpx 6rpx 2rpx;
    top: 6rpx;
    right: 0;
    transform: rotate(-38deg);
    transform-origin: right center;
    transition: background 0.2s;
  }

  .pen-underline {
    position: absolute;
    bottom: 2rpx;
    left: 0;
    right: 0;
    height: 4rpx;
    background: var(--icon-c);
    border-radius: 2rpx;
    transition: background 0.2s;
  }
}

// 手动控制：准星（圆环 + 十字线）
.icon-ctrl {
  .ctrl-ring {
    position: absolute;
    top: 8rpx;
    left: 8rpx;
    right: 8rpx;
    bottom: 8rpx;
    border: 3rpx solid var(--icon-c);
    border-radius: 50%;
    transition: border-color 0.2s;
  }

  .ctrl-v {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 3rpx;
    margin-left: -1.5rpx;
    background: var(--icon-c);
    transition: background 0.2s;
  }

  .ctrl-h {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 3rpx;
    margin-top: -1.5rpx;
    background: var(--icon-c);
    transition: background 0.2s;
  }
}
</style>
