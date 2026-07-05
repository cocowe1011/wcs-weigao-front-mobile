<template>
  <view class="loading-spin" :style="{ width: size + 'rpx', height: size + 'rpx' }">
    <view class="loading-spin-ring" :style="{ borderWidth: ringWidth + 'rpx' }"></view>
  </view>
</template>

<script>
export default {
  name: 'LoadingSpin',
  props: {
    size: {
      type: [Number, String],
      default: 48
    },
    ringWidth: {
      type: [Number, String],
      default: 6
    }
  }
}
</script>

<style lang="scss" scoped>
.loading-spin {
  display: inline-block;
  animation: loading-rotate 0.8s linear infinite;
}

.loading-spin-ring {
  width: 100%;
  height: 100%;
  border-style: solid;
  border-color: #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  box-sizing: border-box;
}

@keyframes loading-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style> 