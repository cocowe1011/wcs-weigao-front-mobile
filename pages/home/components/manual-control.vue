<template>
  <view class="manual-control">
    <view class="placeholder-wrap">
      <view class="placeholder-icon">
        <view class="ctrl-ring"></view>
        <view class="ctrl-v"></view>
        <view class="ctrl-h"></view>
        <view class="ctrl-dot"></view>
      </view>
      <text class="placeholder-title">手动控制</text>
      <text class="placeholder-desc">功能开发中，敬请期待</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'ManualControl'
}
</script>

<style lang="scss" scoped>
.manual-control {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.placeholder-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx;

  .placeholder-icon {
    width: 100rpx;
    height: 100rpx;
    position: relative;
    margin-bottom: 36rpx;

    .ctrl-ring {
      position: absolute;
      top: 10rpx; left: 10rpx; right: 10rpx; bottom: 10rpx;
      border: 6rpx solid #d1d5db;
      border-radius: 50%;
    }

    .ctrl-v {
      position: absolute;
      top: 0; bottom: 0;
      left: 50%; width: 5rpx; margin-left: -2.5rpx;
      background: #d1d5db;
    }

    .ctrl-h {
      position: absolute;
      left: 0; right: 0;
      top: 50%; height: 5rpx; margin-top: -2.5rpx;
      background: #d1d5db;
    }

    .ctrl-dot {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 16rpx; height: 16rpx;
      background: #d1d5db;
      border-radius: 50%;
    }
  }

  .placeholder-title {
    font-size: 36rpx;
    font-weight: 600;
    color: #374151;
    margin-bottom: 16rpx;
  }

  .placeholder-desc {
    font-size: 28rpx;
    color: #9ca3af;
  }
}
</style>
