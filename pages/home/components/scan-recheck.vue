<template>
  <view class="scan-recheck">
    <view class="placeholder-wrap">
      <view class="placeholder-icon">
        <view class="pi-corner pi-tl"></view>
        <view class="pi-corner pi-tr"></view>
        <view class="pi-corner pi-bl"></view>
        <view class="pi-corner pi-br"></view>
        <view class="pi-center"></view>
      </view>
      <text class="placeholder-title">扫码复检</text>
      <text class="placeholder-desc">功能开发中，敬请期待</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'ScanRecheck'
}
</script>

<style lang="scss" scoped>
.scan-recheck {
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

    .pi-corner {
      position: absolute;
      width: 24rpx;
      height: 24rpx;
      border-style: solid;
      border-color: #d1d5db;
    }
    .pi-tl { top: 0; left: 0; border-width: 5rpx 0 0 5rpx; }
    .pi-tr { top: 0; right: 0; border-width: 5rpx 5rpx 0 0; }
    .pi-bl { bottom: 0; left: 0; border-width: 0 0 5rpx 5rpx; }
    .pi-br { bottom: 0; right: 0; border-width: 0 5rpx 5rpx 0; }

    .pi-center {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 36rpx; height: 36rpx;
      border: 4rpx solid #d1d5db;
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
