<template>
  <view class="info-edit">
    <view class="placeholder-wrap">
      <view class="placeholder-icon">
        <view class="pen-body"></view>
        <view class="pen-underline"></view>
      </view>
      <text class="placeholder-title">信息修改</text>
      <text class="placeholder-desc">功能开发中，敬请期待</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'InfoEdit'
}
</script>

<style lang="scss" scoped>
.info-edit {
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

    .pen-body {
      position: absolute;
      width: 64rpx;
      height: 22rpx;
      background: #d1d5db;
      border-radius: 4rpx 12rpx 12rpx 4rpx;
      top: 16rpx;
      left: 8rpx;
      transform: rotate(-38deg);
      transform-origin: left center;
    }

    .pen-underline {
      position: absolute;
      bottom: 8rpx; left: 0; right: 0;
      height: 8rpx;
      background: #d1d5db;
      border-radius: 4rpx;
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
