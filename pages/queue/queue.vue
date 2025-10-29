<template>
  <view class="queue-container">
    <!-- 导航栏 -->
    <uni-nav-bar
      fixed
      status-bar
      left-icon="left"
      :border="false"
      title="队列详情"
      background-color="#1a2a6c"
      color="#FFFFFF"
      @clickLeft="goBack"
    />
    
    <!-- 固定区域 -->
    <view class="fixed-section">
      <!-- 区域信息卡片 -->
      <view class="area-card">
        <view class="area-info">
          <text class="area-name">{{ getQueueDisplayName(areaName) || areaName }}</text>
          <text class="pallet-count">托盘数量：{{ palletList.length }}</text>
        </view>
        <button class="scan-btn" :class="{ loading: scanning }" @tap="handleScan">
          <text class="iconfont icon-scan"></text>
          <text class="btn-text">扫码添加</text>
        </button>
      </view>
    </view>
    
    <!-- 可滚动区域 -->
    <scroll-view 
      class="scroll-section"
      scroll-y
    >
      <view class="main-content">
        <view v-if="loading" class="loading-wrapper">
          <view class="loading-icon"></view>
          <text class="loading-text">加载中...</text>
        </view>
        <pallet-list 
          v-else
          :pallets="palletList"
          @delete="handleDelete"
          :loading="loading"
          @pallet-tap="onPalletTap"
        ></pallet-list>
      </view>
    </scroll-view>
    
    <!-- 订单信息弹窗 -->
    <uni-popup ref="orderPopup" type="center">
      <view class="order-popup">
        <view class="order-popup-header">
          <text class="title">订单信息</text>
          <text class="close-btn" @tap="closeOrderPopup">×</text>
        </view>
        <view class="order-popup-content">
          <view class="info-item" v-if="orderInfo.orderId">
            <text class="label">订单编号：</text>
            <text class="value">{{ orderInfo.orderId }}</text>
          </view>
          <view class="info-item" v-if="orderInfo.productName">
            <text class="label">产品名称：</text>
            <text class="value">{{ orderInfo.productName }}</text>
          </view>
          <view class="info-item" v-if="orderInfo.batchId">
            <text class="label">批次号：</text>
            <text class="value">{{ orderInfo.batchId }}</text>
          </view>
          <view class="info-section" v-if="orderInfo.isPrint1 || orderInfo.isPrint2">
            <view class="section-title">生产设备</view>
            <view class="section-content">
              <view class="device-item" v-if="orderInfo.isPrint1">
                <text class="iconfont icon-preheat"></text>
                <view class="item-content">
                  <text class="label">预热房</text>
                  <text class="value">{{ orderInfo.isPrint1 }}</text>
                </view>
              </view>
              <view class="device-item" v-if="orderInfo.isPrint2">
                <text class="iconfont icon-sterilizer"></text>
                <view class="item-content">
                  <text class="label">灭菌柜</text>
                  <text class="value">{{ orderInfo.isPrint2 }}</text>
                </view>
              </view>
            </view>
          </view>
          <view class="info-section" v-if="orderInfo.inPut || orderInfo.isPrint3">
            <view class="section-title">出入口</view>
            <view class="section-content">
              <view class="device-item" v-if="orderInfo.inPut">
                <text class="iconfont icon-in"></text>
                <view class="item-content">
                  <text class="label">进货口</text>
                  <text class="value">{{ formatInPut(orderInfo.inPut) }}</text>
                </view>
              </view>
              <view class="device-item" v-if="orderInfo.isPrint3">
                <text class="iconfont icon-out"></text>
                <view class="item-content">
                  <text class="label">出货口</text>
                  <text class="value">{{ formatOutPut(orderInfo.isPrint3) }}</text>
                </view>
              </view>
            </view>
          </view>
          <view v-if="!orderInfo.orderId" class="no-data">
            暂无订单信息
          </view>
        </view>
      </view>
    </uni-popup>

    <!-- PDA 扫码弹窗组件 -->
    <pda-scan
      :visible="showPdaScan"
      @close="onPdaClose"
      @confirm="onPdaConfirm"
    />
    
    <!-- 无码模式托盘信息表单弹窗 -->
    <uni-popup ref="noCodeFormPopup" type="bottom" :safe-area="false">
      <view class="no-code-form-popup">
        <view class="form-header">
          <text class="form-title">填写托盘信息（无码模式）</text>
          <text class="close-btn" @tap="closeNoCodeForm">×</text>
        </view>
        <view class="form-content-wrapper">
          <scroll-view scroll-y class="form-content">
            <view class="form-item">
              <text class="form-label">托盘编号</text>
              <view class="form-input-disabled">{{ noCodeForm.trayCode || '请先扫码' }}</view>
            </view>
            <view class="form-item">
              <text class="form-label">批次号</text>
              <input 
                class="form-input" 
                v-model="noCodeForm.batchId" 
                placeholder="请输入批次号"
                maxlength="50"
              />
            </view>
            <view class="form-item">
              <text class="form-label">订单号</text>
              <input 
                class="form-input" 
                v-model="noCodeForm.orderId" 
                placeholder="请输入订单号"
                maxlength="50"
              />
            </view>
            <view class="form-item">
              <text class="form-label">指定预热房</text>
              <picker 
                mode="selector" 
                :range="preheatingRooms" 
                :value="noCodeForm.isPrint1Index"
                @change="onPreheatingChange"
              >
                <view class="picker-view">
                  <text :class="{ 'placeholder': !noCodeForm.isPrint1 }">
                    {{ noCodeForm.isPrint1 || '请选择指定预热房' }}
                  </text>
                  <text class="iconfont icon-right"></text>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">指定灭菌柜</text>
              <picker 
                mode="selector" 
                :range="sterilizationRooms" 
                :value="noCodeForm.isPrint2Index"
                @change="onSterilizationChange"
              >
                <view class="picker-view">
                  <text :class="{ 'placeholder': !noCodeForm.isPrint2 }">
                    {{ noCodeForm.isPrint2 || '请选择指定灭菌柜' }}
                  </text>
                  <text class="iconfont icon-right"></text>
                </view>
              </picker>
            </view>
            <view class="form-item">
              <text class="form-label">产品名称</text>
              <input 
                class="form-input" 
                v-model="noCodeForm.productName" 
                placeholder="请输入产品名称"
                maxlength="100"
              />
            </view>
            <view class="form-item">
              <text class="form-label">产品编码</text>
              <input 
                class="form-input" 
                v-model="noCodeForm.productCode" 
                placeholder="请输入产品编码"
                maxlength="50"
              />
            </view>
          </scroll-view>
        </view>
        <view class="form-footer">
          <button class="form-btn cancel-btn" @tap="closeNoCodeForm">取消</button>
          <button class="form-btn confirm-btn" @tap="submitNoCodeForm">确定</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import PalletList from '@/components/pallet-list.vue'
import ScanButton from '@/components/scan-button.vue'
import request from '@/config/request'
import PdaScan from '@/components/pda-scan.vue'
import AlarmWebSocketClient from '@/utils/WebSocketClient.js'

export default {
  components: {
    PalletList,
    ScanButton,
    PdaScan
  },
  data() {
    return {
      areaId: '',
      areaName: '',
      palletList: [],
      scanning: false,
      loading: true,
      navBgColor: '#2B32B2',
      navTextColor: '#FFFFFF',
      pageReady: false,
      isLoaded: false,
      isReady: false,
      currentOrder: null,
      orderInfo: {},  // 添加订单信息对象
      // PDA 扫码弹窗
      showPdaScan: false,
      // 无码模式状态
      isNoCodeMode: false,
      // 无码模式表单数据
      noCodeForm: {
        trayCode: '',
        batchId: '',
        orderId: '',
        isPrint1: '',
        isPrint1Index: -1,
        isPrint2: '',
        isPrint2Index: -1,
        productName: '',
        productCode: ''
      },
      // 预热房选项
      preheatingRooms: ['YR01', 'YR02', 'YR03', 'YR04', 'YR05', 'YR06', 'YR07'],
      // 灭菌柜选项
      sterilizationRooms: ['B', 'C', 'D', 'E', 'F', 'G', 'H'],
      // WebSocket客户端
      wsClient: null
    }
  },
  async onLoad(options) {
    this.areaId = options.queueId
    this.areaName = options.name
    
    // 初始化WebSocket连接
    this.initWebSocket()
    
    // 从本地存储读取无码模式状态
    try {
      const savedNoCodeMode = uni.getStorageSync('noCodeMode')
      if (savedNoCodeMode !== null && savedNoCodeMode !== undefined) {
        this.isNoCodeMode = savedNoCodeMode
      }
    } catch (error) {
      console.error('读取无码模式状态失败:', error)
    }
    
    // 获取当前运行的订单
    await this.getCurrentOrder()
    // 获取托盘数据
    await this.fetchPalletList()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    // 初始化WebSocket连接
    initWebSocket() {
      this.wsClient = new AlarmWebSocketClient({
        onConnected: () => {
          console.log('WebSocket连接成功');
        },
        onDisconnected: () => {
          console.log('WebSocket连接断开');
        },
        onError: (error) => {
          console.error('WebSocket错误:', error);
        }
      });
      
      this.wsClient.connect();
    },
    // 发送托盘数据变更通知
    notifyTrayDataChanged() {
      if (this.wsClient && this.wsClient.isConnected) {
        this.wsClient.sendTrayDataChanged();
      }
    },
    // 队列名称映射函数（与PC端保持一致）
    getQueueDisplayName(queueName) {
      const mapping = {
        // A1-G1 映射为 YR01A-YR07A
        A1: 'YR01A',
        B1: 'YR02A',
        C1: 'YR03A',
        D1: 'YR04A',
        E1: 'YR05A',
        F1: 'YR06A',
        G1: 'YR07A',
        // A2-G2 映射为 YR01B-YR07B
        A2: 'YR01B',
        B2: 'YR02B',
        C2: 'YR03B',
        D2: 'YR04B',
        E2: 'YR05B',
        F2: 'YR06B',
        G2: 'YR07B',
        // A3-G3 映射为 B-H
        A3: 'B',
        B3: 'C',
        C3: 'D',
        D3: 'E',
        E3: 'F',
        F3: 'G',
        G3: 'H'
      }
      return mapping[queueName] || queueName
    },
    // 将内部队列名称（A-G）转换为预热房名称（YR01-YR07）
    convertInternalToPreheating(internalName) {
      const conversionMap = {
        A: 'YR01',
        B: 'YR02',
        C: 'YR03',
        D: 'YR04',
        E: 'YR05',
        F: 'YR06',
        G: 'YR07'
      }
      return conversionMap[internalName] || internalName
    },
    async handleScan() {
      if (this.scanning) return
      
      // 无码模式：先扫码获取托盘编号，再填写其他信息
      if (this.isNoCodeMode) {
        // 重置表单
        this.resetNoCodeForm()
        // 打开扫码弹窗
        this.showPdaScan = true
        return
      }
      
      // 有码模式：直接打开PDA扫码弹窗
      this.showPdaScan = true
    },
    // 重置无码模式表单
    resetNoCodeForm() {
      this.noCodeForm = {
        trayCode: '',
        batchId: '',
        orderId: '',
        isPrint1: '',
        isPrint1Index: -1,
        isPrint2: '',
        isPrint2Index: -1,
        productName: '',
        productCode: ''
      }
    },
    // PDA 扫码回调
    onPdaClose() {
      this.showPdaScan = false
    },
    async onPdaConfirm(scanCode) {
      this.showPdaScan = false
      if (!scanCode) {
        uni.showToast({ title: '无效的扫码结果', icon: 'none' })
        return
      }
      
      // 无码模式：扫码后打开表单填写其他信息
      if (this.isNoCodeMode) {
        this.noCodeForm.trayCode = scanCode
        this.$refs.noCodeFormPopup.open()
        return
      }
      
      // 有码模式：直接处理
      if (this.scanning) return
      this.scanning = true
      
      try {
        // 有码模式：检查是否有当前订单
        if (!this.currentOrder?.orderId) {
          uni.showToast({
            title: '请先选择订单',
            icon: 'none'
          })
          this.scanning = false
          return
        }
        
        // 构建有码模式的托盘信息（与PC端保持一致）
        const currentTime = new Date().toISOString().replace('T', ' ').split('.')[0]
        const newTray = {
          trayCode: scanCode,
          trayTime: currentTime,
          batchId: this.currentOrder.batchId || '',
          infoId: this.currentOrder.id || '',
          orderId: this.currentOrder.orderId || '',
          isPrint1: this.currentOrder.isPrint1 || '',
          isPrint2: this.currentOrder.isPrint2 || '',
          isPrint3: this.currentOrder.isPrint3 || '',
          inPut: this.currentOrder.inPut || '',
          productName: this.currentOrder.productName || '',
          productCode: this.currentOrder.productCode || '',
          spec: this.currentOrder.spec || '',
          hasSentPreheatCommand: false,
          trayOrderCount: this.currentOrder.qrCode ? this.currentOrder.qrCode.split(',').length : 1
        }
        
        // 添加到现有托盘列表（保持完整参数）
        const updatedTrayInfo = this.palletList.map(tray => ({
          trayCode: tray.code || tray.trayCode,
          trayTime: tray.createTime || tray.trayTime,
          batchId: tray.batchId || '',
          infoId: tray.infoId || '',
          orderId: tray.orderId || '',
          isPrint1: tray.isPrint1 || '',
          isPrint2: tray.isPrint2 || '',
          isPrint3: tray.isPrint3 || '',
          inPut: tray.inPut || '',
          productName: tray.productName || '',
          productCode: tray.productCode || '',
          spec: tray.spec || '',
          hasSentPreheatCommand: tray.hasSentPreheatCommand || false,
          trayOrderCount: tray.trayOrderCount || 1
        }))
        updatedTrayInfo.push(newTray)
        
        // 更新队列信息
        const success = await this.updateQueueInfo(updatedTrayInfo)
        if (success) {
          uni.showToast({ title: '添加成功', icon: 'success' })
        }
      } catch (error) {
        console.error('扫码处理错误:', error)
        uni.showToast({ title: '扫描失败', icon: 'error' })
      } finally {
        this.scanning = false
      }
    },
    async handleDelete(pallet) {
      // 过滤掉要删除的托盘，保持完整参数格式
      const updatedTrayInfo = this.palletList
        .filter(p => p.id !== pallet.id)  // 先过滤掉要删除的托盘
        .map(tray => ({                   // 然后转换格式，保持完整参数
          trayCode: tray.code || tray.trayCode,
          trayTime: tray.createTime || tray.trayTime,
          batchId: tray.batchId || '',
          infoId: tray.infoId || '',
          orderId: tray.orderId || '',
          isPrint1: tray.isPrint1 || '',
          isPrint2: tray.isPrint2 || '',
          isPrint3: tray.isPrint3 || '',
          inPut: tray.inPut || '',
          productName: tray.productName || '',
          productCode: tray.productCode || '',
          spec: tray.spec || '',
          hasSentPreheatCommand: tray.hasSentPreheatCommand || false,
          trayOrderCount: tray.trayOrderCount || 1
        }))
      
      // 更新队列信息
      const success = await this.updateQueueInfo(updatedTrayInfo)
      
      if (success) {
        uni.showToast({
          title: '删除成功',
          icon: 'success'
        })
      }
    },
    async fetchPalletList() {
      try {
        console.log('请求参数:', { id: this.areaId })
        // 直接拼接在URL中传递参数
        const res = await request.get(`/queue_info/getQueueInfoById?id=${this.areaId}`)
        
        console.log('返回结果:', JSON.stringify(res))
        if (res.code === '200' && res.data) {
          let trayInfo = []
          try {
            trayInfo = res.data.trayInfo ? JSON.parse(res.data.trayInfo) : []
          } catch (e) {
            console.error('解析托盘信息失败:', e)
          }
          
          // 转换托盘数据格式
          this.palletList = trayInfo.map(tray => ({
            id: tray.trayCode, // 使用托盘编号作为唯一标识
            code: tray.trayCode,
            createTime: tray.trayTime,
            batchId: tray.batchId || '',
            infoId: tray.infoId || '',
            orderId: tray.orderId || '',
            isPrint1: tray.isPrint1 || '',
            isPrint2: tray.isPrint2 || '',
            isPrint3: tray.isPrint3 || '',
            inPut: tray.inPut || '',
            productName: tray.productName || '',
            productCode: tray.productCode || '',
            spec: tray.spec || '',
            hasSentPreheatCommand: tray.hasSentPreheatCommand || false,
            trayOrderCount: tray.trayOrderCount || 1
          }))
        } else {
          this.palletList = []
          uni.showToast({
            title: res.message || '获取数据失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('获取托盘列表失败:', error)
        uni.showToast({
          title: '网络异常',
          icon: 'error'
        })
        this.palletList = []
      } finally {
        this.loading = false
      }
    },
    async onPalletTap(item) {
      if (item.batchId) {
        await this.fetchOrderInfo(item.batchId)
      } else {
        uni.showToast({
          title: '该托盘未关联订单',
          icon: 'none'
        })
      }
    },
    // 更新队列信息的公共方法
    async updateQueueInfo(trayInfo) {
      try {
        // 确保每个托盘都有必要的字段，保持与PC端一致的完整参数格式
        const formattedTrayInfo = trayInfo.map(tray => ({
          trayCode: tray.trayCode,
          trayTime: tray.trayTime,
          batchId: tray.batchId || '',
          infoId: tray.infoId || '',
          orderId: tray.orderId || '',
          isPrint1: tray.isPrint1 || '',
          isPrint2: tray.isPrint2 || '',
          isPrint3: tray.isPrint3 || '',
          inPut: tray.inPut || '',
          productName: tray.productName || '',
          productCode: tray.productCode || '',
          spec: tray.spec || '',
          hasSentPreheatCommand: tray.hasSentPreheatCommand || false,
          trayOrderCount: tray.trayOrderCount || 1
        }))
        
        // 构建更新参数
        const params = {
          id: Number(this.areaId),
          trayInfo: JSON.stringify(formattedTrayInfo)
        }
        
        const res = await request.post('/queue_info/update', params)
        
        if (res.code === '200') {
          // 更新成功后重新获取最新数据
          await this.fetchPalletList()
          // 发送WebSocket通知
          this.notifyTrayDataChanged()
          return true
        } else {
          uni.showToast({
            title: res.message || '操作失败',
            icon: 'none'
          })
          return false
        }
      } catch (error) {
        console.error('更新失败:', error)
        uni.showToast({
          title: '网络异常',
          icon: 'error'
        })
        return false
      }
    },
    // 获取当前运行的订单
    async getCurrentOrder() {
      try {
        const res = await request.post('/order_info/getNowRunningOrder')
        if (res.code === '200' && res.data) {
          this.currentOrder = res.data
        }
      } catch (error) {
        console.error('获取当前订单失败:', error)
      }
    },
    // 查询订单信息
    async fetchOrderInfo(batchId) {
      try {
        const res = await request.get(`/order_info/getOrderInfoByBatchId?batchId=${batchId}`)
        if (res.code === '200' && res.data) {
          this.orderInfo = res.data
          this.$refs.orderPopup.open()
        } else {
          this.orderInfo = {}
          uni.showToast({
            title: '未找到订单信息',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('获取订单信息失败:', error)
        uni.showToast({
          title: '获取订单信息失败',
          icon: 'none'
        })
      }
    },
    // 格式化进货口信息
    formatInPut(value) {
      const inPutMap = {
        1: '一楼外部进货',
        2: '二楼进货',
        3: '三楼进货',
        4: '不解析出口'
      }
      return inPutMap[value] || '未知'
    },
    // 格式化出货口信息
    formatOutPut(value) {
      const outPutMap = {
        0: '不解析',
        1: '解析库',
        2: '立体库'
      }
      return outPutMap[value] || '未知'
    },
    // 关闭订单弹窗
    closeOrderPopup() {
      this.$refs.orderPopup.close()
    },
    // 关闭无码模式表单
    closeNoCodeForm() {
      this.$refs.noCodeFormPopup.close()
      this.resetNoCodeForm()
    },
    // 预热房选择变化
    onPreheatingChange(e) {
      const index = parseInt(e.detail.value)
      this.noCodeForm.isPrint1Index = index
      this.noCodeForm.isPrint1 = this.preheatingRooms[index]
    },
    // 灭菌柜选择变化
    onSterilizationChange(e) {
      const index = parseInt(e.detail.value)
      this.noCodeForm.isPrint2Index = index
      this.noCodeForm.isPrint2 = this.sterilizationRooms[index]
    },
    // 提交无码模式表单
    async submitNoCodeForm() {
      // 验证必填字段
      if (!this.noCodeForm.trayCode) {
        uni.showToast({ title: '请先扫码获取托盘编号', icon: 'none' })
        return
      }
      if (!this.noCodeForm.batchId) {
        uni.showToast({ title: '请输入批次号', icon: 'none' })
        return
      }
      if (!this.noCodeForm.orderId) {
        uni.showToast({ title: '请输入订单号', icon: 'none' })
        return
      }
      if (!this.noCodeForm.isPrint1) {
        uni.showToast({ title: '请选择指定预热房', icon: 'none' })
        return
      }
      if (!this.noCodeForm.isPrint2) {
        uni.showToast({ title: '请选择指定灭菌柜', icon: 'none' })
        return
      }
      if (!this.noCodeForm.productName) {
        uni.showToast({ title: '请输入产品名称', icon: 'none' })
        return
      }
      if (!this.noCodeForm.productCode) {
        uni.showToast({ title: '请输入产品编码', icon: 'none' })
        return
      }
      
      if (this.scanning) return
      this.scanning = true
      
      try {
        // 构建无码模式的托盘信息（与PC端保持一致）
        const currentTime = new Date().toISOString().replace('T', ' ').split('.')[0]
        const newTray = {
          trayCode: this.noCodeForm.trayCode, // 扫码获取的托盘编号
          trayTime: currentTime,
          batchId: this.noCodeForm.batchId,
          infoId: '',
          orderId: this.noCodeForm.orderId,
          isPrint1: this.noCodeForm.isPrint1,
          isPrint2: this.noCodeForm.isPrint2,
          isPrint3: '',
          inPut: '',
          productName: this.noCodeForm.productName,
          productCode: this.noCodeForm.productCode,
          spec: '',
          hasSentPreheatCommand: false,
          trayOrderCount: 1
        }
        
        // 添加到现有托盘列表（保持完整参数）
        const updatedTrayInfo = this.palletList.map(tray => ({
          trayCode: tray.code || tray.trayCode,
          trayTime: tray.createTime || tray.trayTime,
          batchId: tray.batchId || '',
          infoId: tray.infoId || '',
          orderId: tray.orderId || '',
          isPrint1: tray.isPrint1 || '',
          isPrint2: tray.isPrint2 || '',
          isPrint3: tray.isPrint3 || '',
          inPut: tray.inPut || '',
          productName: tray.productName || '',
          productCode: tray.productCode || '',
          spec: tray.spec || '',
          hasSentPreheatCommand: tray.hasSentPreheatCommand || false,
          trayOrderCount: tray.trayOrderCount || 1
        }))
        updatedTrayInfo.push(newTray)
        
        // 更新队列信息
        const success = await this.updateQueueInfo(updatedTrayInfo)
        if (success) {
          uni.showToast({ title: '添加成功', icon: 'success' })
          this.closeNoCodeForm()
        }
      } catch (error) {
        console.error('添加托盘失败:', error)
        uni.showToast({ title: '添加失败', icon: 'error' })
      } finally {
        this.scanning = false
      }
    }
  },
  beforeDestroy() {
    // 组件销毁前断开WebSocket连接
    if (this.wsClient) {
      this.wsClient.disconnect();
      this.wsClient = null;
    }
  }
}
</script> 
<style lang="scss" scoped>
.queue-container {
  min-height: 100vh;
  background: $bg-light;
  padding-top: 0;
  display: flex;
  flex-direction: column;
  
  :deep(.uni-nav-bar) {
    /* #ifdef APP-PLUS */
    padding-top: var(--status-bar-height);
    /* #endif */
  }
  
  :deep(.uni-nav-bar-fixed) {
    background: linear-gradient(90deg, #1a2a6c, #b21f1f);
  }
  
  :deep(.uni-navbar__header) {
    background: transparent !important;
  }
  
  :deep(.uni-navbar__header-container) {
    background: transparent !important;
  }
  
  :deep(.uni-nav-bar-text) {
    color: #fff;
    font-size: 32rpx;
    font-weight: bold;
  }
  
  :deep(.uni-nav-bar__btn-icon) {
    color: #fff !important;
    font-size: 36rpx;
  }
  
  .fixed-section {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1;
    background: $bg-light;
    margin-top: 44px;
    /* #ifdef APP-PLUS */
    margin-top: calc(44px + var(--status-bar-height));
    /* #endif */
  }
  
  .area-card {
    margin: 20rpx;
    padding: 24rpx 30rpx;
    background: #fff;
    border-radius: $border-radius;
    background: linear-gradient(135deg, #1a2a6c, #4286f4);
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    overflow: hidden;
    
    &::after {
      content: '';
      position: absolute;
      right: -60rpx;
      top: -60rpx;
      width: 200rpx;
      height: 200rpx;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      z-index: 0;
    }
    
    .area-info {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      z-index: 1;
      
      .area-name {
        font-size: 34rpx;
        color: #fff;
        font-weight: 600;
      }
      
      .pallet-count {
        font-size: 26rpx;
        color: rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.15);
        padding: 4rpx 16rpx;
        border-radius: 20rpx;
        display: inline-block;
      }
    }
    
    .scan-btn {
      height: 72rpx;
      padding: 0 30rpx;
      background: #fff;
      border: none;
      border-radius: 36rpx;
      color: #fff;
      font-size: 28rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      z-index: 1;
      margin-right: -10rpx;
      
      .iconfont {
        font-size: 32rpx;
        margin-right: 8rpx;
        color: #1a2a6c;
        transition: transform 0.3s ease;
      }
      
      .btn-text {
        color: #1a2a6c;
        font-weight: 500;
      }
      
      &.loading {
        opacity: 0.8;
        .iconfont {
          animation: rotate 1s linear infinite;
        }
      }
      
      &:active {
        transform: translateY(2rpx);
        box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
        
        .iconfont {
          transform: scale(0.95);
        }
      }
    }
  }
  
  .scroll-section {
    position: fixed;
    top: calc(140rpx + 50px);
    /* #ifdef APP-PLUS */
    top: calc(140rpx + 50px + var(--status-bar-height));
    /* #endif */
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 0;
    background: $bg-light;
  }
  
  .main-content {
    padding: 30rpx;
  }
  
  .loading-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60rpx 0;
    
    .loading-icon {
      width: 60rpx;
      height: 60rpx;
      border: 4rpx solid #f3f3f3;
      border-top: 4rpx solid $primary-color;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20rpx;
    }
    
    .loading-text {
      font-size: 28rpx;
      color: $text-secondary;
    }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.order-popup {
  background: #fff;
  width: 600rpx;
  border-radius: 20rpx;
  overflow: hidden;
  
  .order-popup-header {
    padding: 30rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
    
    .title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    
    .close-btn {
      font-size: 40rpx;
      color: #999;
      padding: 0 20rpx;
    }
  }
  
  .order-popup-content {
    padding: 30rpx;
    max-height: 60vh;
    overflow-y: auto;
    
    .info-item {
      margin-bottom: 20rpx;
      display: flex;
      align-items: flex-start;
      
      .label {
        color: #666;
        font-size: 28rpx;
        width: 160rpx;
        flex-shrink: 0;
      }
      
      .value {
        color: #333;
        font-size: 28rpx;
        flex: 1;
      }
    }

    .info-section {
      margin-bottom: 30rpx;
      
      .section-title {
        font-size: 28rpx;
        color: #333;
        font-weight: bold;
        margin-bottom: 16rpx;
        padding-left: 16rpx;
        border-left: 4rpx solid $primary-color;
      }
      
      .section-content {
        display: flex;
        margin: -10rpx;
        
        .device-item {
          flex: 1;
          display: flex;
          align-items: center;
          margin: 10rpx;
          padding: 20rpx;
          background: #e5eaf2;
          border-radius: $border-radius;
          transition: all 0.3s ease;
          
          .iconfont {
            font-size: 40rpx;
            color: $primary-color;
            margin-right: 16rpx;
          }
          
          .item-content {
            flex: 1;
            
            .label {
              font-size: 24rpx;
              color: $text-secondary;
              margin-bottom: 6rpx;
              display: block;
            }
            
            .value {
              font-size: 28rpx;
              color: $text-primary;
              font-weight: 500;
            }
          }
        }
      }
    }
    
    .no-data {
      text-align: center;
      color: #999;
      font-size: 28rpx;
      padding: 40rpx 0;
    }
  }
}

// 无码模式表单弹窗样式
.no-code-form-popup {
  background: #fff;
  border-radius: 20rpx 20rpx 0 0;
  max-height: 80vh;
  height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  .form-header {
    padding: 30rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
    
    .form-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    
    .close-btn {
      font-size: 40rpx;
      color: #999;
      padding: 0 20rpx;
    }
  }
  
  .form-content-wrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    
    .form-content {
      height: 100%;
      padding: 30rpx;
      box-sizing: border-box;
    }
  }
  
  .form-item {
    margin-bottom: 30rpx;
    
    .form-label {
      display: block;
      font-size: 28rpx;
      color: #333;
      margin-bottom: 16rpx;
      font-weight: 500;
    }
    
    .form-input {
      width: 100%;
      height: 80rpx;
      padding: 0 20rpx;
      border: 1px solid #ddd;
      border-radius: 8rpx;
      font-size: 28rpx;
      background: #fff;
      box-sizing: border-box;
      
      &:focus {
        border-color: #1a2a6c;
      }
    }
    
    .form-input-disabled {
      width: 100%;
      height: 80rpx;
      padding: 0 20rpx;
      border: 1px solid #ddd;
      border-radius: 8rpx;
      font-size: 28rpx;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      color: #333;
      box-sizing: border-box;
    }
    
    .picker-view {
      width: 100%;
      height: 80rpx;
      padding: 0 20rpx;
      border: 1px solid #ddd;
      border-radius: 8rpx;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fff;
      box-sizing: border-box;
      
      .placeholder {
        color: #999;
      }
      
      .iconfont {
        font-size: 24rpx;
        color: #999;
      }
    }
  }
  
  .form-footer {
    padding: 20rpx 30rpx;
    padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
    border-top: 1px solid #eee;
    display: flex;
    gap: 20rpx;
    flex-shrink: 0;
    
    .form-btn {
      flex: 1;
      height: 80rpx;
      border-radius: 8rpx;
      font-size: 28rpx;
      border: none;
      
      &.cancel-btn {
        background: #f5f5f5;
        color: #666;
      }
      
      &.confirm-btn {
        background: #1a2a6c;
        color: #fff;
      }
    }
  }
}
</style>