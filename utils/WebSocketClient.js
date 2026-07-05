import serverConfig from '../config/common.js'

class AlarmWebSocketClient {
  constructor(config = {}) {
    this.url = config.url || serverConfig.getWebSocketUrl(); // WebSocket服务器地址
    this.socketTask = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 360;
    this.reconnectInterval = 5000; // 5秒，360次×5秒≈30分钟
    this.isReconnecting = false; // 防止onError和onClose双重触发重连
    this.heartbeatInterval = null;
    this.pingTimer = null;
    
    // 事件回调
    this.onConnected = config.onConnected || null;
    this.onDisconnected = config.onDisconnected || null;
    this.onAlarmReceived = config.onAlarmReceived || null;
    this.onError = config.onError || null;
    this.onScanResponse = config.onScanResponse || null;
    this.onScanResult = config.onScanResult || null;
    this.onPlcWriteResponse = config.onPlcWriteResponse || null;
    
    this.alarmLogs = []; // 存储接收到的报警日志

    // MSE 订单查询请求/响应关联表：requestId -> { resolve, reject, timer }
    this.msePending = {};
    this.mseRequestSeq = 0;
  }

  // 连接WebSocket服务器
  connect() {
    try {
      console.log(`尝试连接WebSocket服务器: ${this.url}`);
      
      this.socketTask = uni.connectSocket({
        url: this.url,
        success: () => {
          console.log('WebSocket连接请求已发送');
        },
        fail: (error) => {
          console.error('WebSocket连接请求失败:', error);
          if (this.onError) {
            this.onError(error);
          }
          this.attemptReconnect();
        }
      });
      
      // 监听WebSocket连接打开事件
      this.socketTask.onOpen((res) => {
        console.log('WebSocket连接已建立');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        
        // 注册客户端
        this.register();
        
        // 启动心跳
        this.startHeartbeat();
        
        if (this.onConnected) {
          this.onConnected(res);
        }
      });

      // 监听WebSocket接受到服务器的消息事件
      this.socketTask.onMessage((res) => {
        try {
          const data = JSON.parse(res.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('解析消息失败:', error);
        }
      });

      // 监听WebSocket连接关闭事件
      this.socketTask.onClose((res) => {
        console.log('WebSocket连接已关闭:', res.code, res.reason);
        this.isConnected = false;
        this.stopHeartbeat();
        
        if (this.onDisconnected) {
          this.onDisconnected(res);
        }
        
        // 自动重连
        this.attemptReconnect();
      });

      // 监听WebSocket错误事件
      this.socketTask.onError((error) => {
        console.error('WebSocket错误:', error);
        
        if (this.onError) {
          this.onError(error);
        }
        
        // onError后也需要尝试重连（某些情况下onClose不会触发）
        this.attemptReconnect();
      });

    } catch (error) {
      console.error('WebSocket连接失败:', error);
      if (this.onError) {
        this.onError(error);
      }
      this.attemptReconnect();
    }
  }

  // 注册客户端
  register() {
    if (this.isConnected) {
      const message = {
        type: 'register'
      };
      this.send(message);
    }
  }

  // 处理收到的消息
  handleMessage(data) {
    console.log('收到消息:', data);
    
    switch (data.type) {
      case 'connected':
        console.log('服务器确认连接:', data.message);
        break;
        
      case 'registered':
        console.log('注册成功:', data.message);
        break;
        
      case 'alarm':
        // 处理报警消息
        this.handleAlarmMessage(data);
        break;
        
      case 'scan_response':
        // 处理扫码响应
        this.handleScanResponse(data);
        break;
        
      case 'scan_result':
        // 处理扫码结果
        this.handleScanResult(data);
        break;

      case 'mse_order_result':
        // 处理 MSE 订单查询结果
        this.handleMseOrderResult(data);
        break;
        
      case 'plc_write_response':
        // 处理 PLC 写入响应
        this.handlePlcWriteResponse(data);
        break;
        
      case 'pong':
        // 心跳响应
        break;
        
      default:
        console.log('未知消息类型:', data.type);
    }
  }

  // 处理报警消息
  handleAlarmMessage(data) {
    const alarmLog = {
      id: data.data.id,
      message: data.data.message,
      timestamp: data.data.timestamp,
      source: data.data.source,
      type: data.data.type,
      receivedAt: new Date().toISOString(),
      unread: true
    };
    
    // 添加到本地报警日志列表
    this.alarmLogs.unshift(alarmLog);
    
    // 保持日志数量在合理范围内
    if (this.alarmLogs.length > 100) {
      this.alarmLogs.pop();
    }
    
    // 触发回调
    if (this.onAlarmReceived) {
      this.onAlarmReceived(alarmLog);
    }
  }

  // 处理扫码响应
  handleScanResponse(data) {
    console.log('收到扫码响应:', data);
    if (this.onScanResponse) {
      this.onScanResponse(data);
    }
  }

  // 处理扫码结果
  handleScanResult(data) {
    console.log('收到扫码结果:', data);
    if (this.onScanResult) {
      this.onScanResult(data);
    }
  }

  // 处理 PLC 写入响应
  handlePlcWriteResponse(data) {
    console.log('收到 PLC 写入响应:', data);
    if (this.onPlcWriteResponse) {
      this.onPlcWriteResponse(data);
    }
  }

  // 发送扫码消息
  sendScanCode(location, trayCode) {
    const message = {
      type: 'scan_code',
      location: location,
      trayCode: trayCode,
      timestamp: new Date().toISOString()
    };
    
    return this.send(message);
  }

  /**
   * 发送 MSE 订单查询请求，返回 Promise（PC 端处理完通过 mse_order_result 回传结果）
   * @param {string} udi - PDA 扫码得到的条码（去括号形式）
   * @param {number} timeout - 超时兜底毫秒（默认 6000，略大于 PC 端 MSE 2s 超时 + 写库耗时）
   * @returns {Promise<{success:boolean, message:string}>}
   */
  sendMseQuery(udi, timeout = 6000) {
    return new Promise((resolve, reject) => {
      if (!this.socketTask || !this.isConnected) {
        reject(new Error('WebSocket未连接'));
        return;
      }
      const requestId = `mse_${Date.now()}_${++this.mseRequestSeq}`;
      const timer = setTimeout(() => {
        if (this.msePending[requestId]) {
          delete this.msePending[requestId];
          reject(new Error('MSE查询超时，请重试'));
        }
      }, timeout);
      this.msePending[requestId] = { resolve, reject, timer };

      const ok = this.send({
        type: 'query_mse_order',
        udi: udi,
        requestId: requestId,
        timestamp: new Date().toISOString()
      });
      if (!ok) {
        clearTimeout(timer);
        delete this.msePending[requestId];
        reject(new Error('消息发送失败，WebSocket未连接'));
      }
    });
  }

  // 处理 MSE 订单查询结果（按 requestId 关联对应请求的 Promise）
  handleMseOrderResult(data) {
    const pending = data && data.requestId && this.msePending[data.requestId];
    if (!pending) {
      console.warn('收到未匹配的 MSE 查询结果:', data);
      return;
    }
    clearTimeout(pending.timer);
    delete this.msePending[data.requestId];
    if (data.success) {
      pending.resolve({ success: true, message: data.message || '查询成功' });
    } else {
      pending.reject(new Error((data && data.message) || 'MSE查询失败'));
    }
  }

  // 发送托盘数据变更通知（PC端收到后更新队列中对应托盘状态）
  sendTrayDataChanged(data) {
    const message = {
      type: 'tray_data_changed',
      timestamp: new Date().toISOString(),
      data: data || {}
    };
    
    return this.send(message);
  }

  /**
   * 发送 PLC 写入命令到 PC 端
   * @param {string} address - PLC 地址（如 'W_DBW44'）
   * @param {number|boolean} value - 写入的值（1/0 或 true/false）
   */
  sendPlcWrite(address, value) {
    const message = {
      type: 'plc_write',
      address: address,
      value: value,
      timestamp: new Date().toISOString()
    };
    
    return this.send(message);
  }

  /**
   * 发送 PLC 取消写入命令到 PC 端
   * @param {string} address - 要取消的 PLC 地址（如 'W_DBW30'）
   */
  sendPlcCancelWrite(address) {
    const message = {
      type: 'plc_cancel_write',
      address: address,
      timestamp: new Date().toISOString()
    };
    
    return this.send(message);
  }

  // 发送消息
  send(message) {
    if (this.socketTask && this.isConnected) {
      this.socketTask.send({
        data: JSON.stringify(message),
        success: () => {
          // console.log('消息发送成功');
        },
        fail: (error) => {
          console.error('消息发送失败:', error);
        }
      });
      return true;
    } else {
      console.warn('WebSocket未连接，无法发送消息');
      return false;
    }
  }

  // 启动心跳
  startHeartbeat() {
    this.stopHeartbeat(); // 先停止之前的心跳
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, 15000); // 每15秒发送一次心跳
  }

  // 停止心跳
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 尝试重连
  attemptReconnect() {
    // 防止onError和onClose双重触发重连
    if (this.isReconnecting) return;
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.isReconnecting = true;
      this.reconnectAttempts++;
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.isReconnecting = false;
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.log('达到最大重连次数，停止重连');
    }
  }

  // 断开连接
  disconnect() {
    this.stopHeartbeat();
    
    if (this.socketTask) {
      this.socketTask.close({
        code: 1000,
        reason: '主动断开连接',
        success: () => {
          console.log('WebSocket连接已主动关闭');
        },
        fail: (error) => {
          console.error('关闭WebSocket连接失败:', error);
        }
      });
      this.socketTask = null;
    }
    
    this.isConnected = false;
    this.isReconnecting = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // 阻止自动重连
  }

  // 获取连接状态
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      url: this.url,
      reconnectAttempts: this.reconnectAttempts,
      alarmCount: this.alarmLogs.length,
      unreadCount: this.alarmLogs.filter(log => log.unread).length
    };
  }

  // 获取报警日志
  getAlarmLogs() {
    return this.alarmLogs;
  }

  // 标记报警为已读
  markAlarmsAsRead() {
    this.alarmLogs.forEach(alarm => {
      alarm.unread = false;
    });
  }

  // 清空报警日志
  clearAlarmLogs() {
    this.alarmLogs = [];
  }

  // 更新连接地址
  updateUrl(url) {
    const wasConnected = this.isConnected;
    
    // 先断开当前连接
    if (wasConnected) {
      this.disconnect();
    }
    
    // 更新URL
    this.url = url;
    
    // 如果之前是连接状态，重新连接
    if (wasConnected) {
      this.reconnectAttempts = 0; // 重置重连计数
      setTimeout(() => {
        this.connect();
      }, 1000);
    }
  }
}

export default AlarmWebSocketClient; 