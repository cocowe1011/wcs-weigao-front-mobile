<template>
  <view class="pallet-list">
    <view 
      class="pallet-item" 
      v-for="pallet in pallets" 
      :key="pallet.id"
      @tap="handleTap(pallet)"
    >
      <view class="area-content">
        <text class="pallet-code">{{ pallet.code }}</text>
        <text class="create-time">{{ pallet.createTime }}</text>
      </view>
      
      <view class="actions">
        <button 
          class="action-btn delete" 
          @tap.stop="handleDelete(pallet)"
        >
          <text class="iconfont icon-delete"></text>
          <text class="btn-text">删除</text>
        </button>
      </view>
    </view>
    
    <view class="empty" v-if="pallets.length === 0">
      <text class="iconfont icon-empty"></text>
      <text class="empty-text">暂无托盘数据</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'PalletList',
  props: {
    pallets: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
    }
  },
  methods: {
    handleDelete(pallet) {
      uni.showModal({
        title: '确认删除',
        content: '是否确认删除该托盘？',
        success: (res) => {
          if (res.confirm) {
            this.$emit('delete', pallet)
          }
        }
      })
    },
    handleTap(item) {
      this.$emit('pallet-tap', item);
    }
  },
  mounted() {
    this.$emit('loaded')
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.pallet-list {
  .pallet-item {
    background: #fff;
    padding: 30rpx;
    border-radius: $border-radius;
    margin-bottom: 20rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: $card-shadow;
    transition: all $transition-fast;
    position: relative;
    overflow: hidden;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 6rpx;
      height: 100%;
      background: linear-gradient(to bottom, #1a2a6c, #b21f1f);
      opacity: 0.8;
    }
    
    &:active {
      transform: scale(0.98);
    }
    
    .area-content {
      flex: 1;
      margin-left: 20rpx;
      
      .pallet-code {
        font-size: 32rpx;
        color: $text-primary;
        font-weight: bold;
        margin-bottom: 8rpx;
        display: block;
      }
      
      .create-time {
        font-size: 26rpx;
        color: $text-secondary;
        display: flex;
        align-items: center;
        
        &::before {
          content: '';
          width: 6rpx;
          height: 6rpx;
          background: #1a2a6c;
          border-radius: 50%;
          margin-right: 8rpx;
        }
      }
    }
    
    .actions {
      display: flex;
      
      .action-btn {
        display: flex;
        align-items: center;
        padding: 16rpx 32rpx;
        border-radius: 12rpx;
        border: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        margin-right: 24rpx;
        
        .iconfont {
          font-size: 28rpx;
          transition: transform 0.3s ease;
        }
        
        &.delete {
          background: linear-gradient(135deg, #ff4757, #ff6b81);
          color: #fff;
          box-shadow: 0 4rpx 15rpx rgba(#ff4757, 0.3);
          
          &:active {
            transform: translateY(2rpx);
            box-shadow: 0 2rpx 8rpx rgba(#ff4757, 0.2);
            
            .iconfont {
              transform: rotate(15deg);
            }
          }
        }
        
        &[disabled] {
          opacity: 0.5;
          pointer-events: none;
          background: linear-gradient(135deg, #ccc, #999);
          box-shadow: none;
        }
        
        .btn-text {
          font-size: 26rpx;
          margin-left: 8rpx;
          font-weight: 500;
          letter-spacing: 1rpx;
        }
        
        &:last-child {
          margin-right: 0;
        }
      }
    }
  }
  
  .empty {
    text-align: center;
    padding: 100rpx 0;
    color: $text-light;
    
    .iconfont {
      font-size: 80rpx;
      margin-bottom: 20rpx;
      display: block;
    }
    
    .empty-text {
      font-size: 28rpx;
    }
  }
}
</style> 