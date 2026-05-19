// ============================================================
// 短剧人格测试 - 数据埋点系统
// ============================================================
// 数据先存 localStorage，待 Supabase 就绪后开启远程推送
// ============================================================

const TRACKER = {
  // Supabase 配置
  supabaseUrl: 'https://rokizgtbaajukolbfjsu.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJva2l6Z3RiYWFqdWtvbGJmanN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzU0MjgsImV4cCI6MjA5NDc1MTQyOH0.JQpPnF1TdmRqes8Wv7M2czQqUsoWlOJcCLfqlMaR6nQ',
  enabled: true,  // 开启远程推送

  // 初始化
  init(supabaseUrl, supabaseKey) {
    this.supabaseUrl = supabaseUrl
    this.supabaseKey = supabaseKey
    this.enabled = true
    // 启动时把积压的数据发一次
    this.flush()
  },

  // 记录事件
  track(event, data = {}) {
    const record = {
      event,
      ...data,
      ts: new Date().toISOString(),
      page: window.location.hash || '#welcome',
      user_agent: navigator.userAgent.slice(0, 120),
    }

    // 1. 存本地（持久化，防止丢失）
    this._saveLocal(record)

    // 2. 如果远程已配，异步发送
    if (this.enabled) {
      this._sendRemote(record)
    }
  },

  // 本地存储（localStorage 队列）
  _saveLocal(record) {
    try {
      const key = 'sd_tracker'
      const raw = localStorage.getItem(key)
      const queue = raw ? JSON.parse(raw) : []
      queue.push(record)
      // 最多保留最近 2000 条，防止撑爆
      if (queue.length > 2000) queue.splice(0, queue.length - 2000)
      localStorage.setItem(key, JSON.stringify(queue))
    } catch (e) {
      // localStorage 可能满，忽略
    }
  },

  // 远程发送到 Supabase
  _sendRemote(record) {
    if (!this.supabaseUrl || !this.supabaseKey) return

    fetch(`${this.supabaseUrl}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
      },
      body: JSON.stringify(record),
    }).catch(() => {
      // 失败不处理，本地有备份
    })
  },

  // 批量推送积压数据
  flush() {
    if (!this.enabled) return
    try {
      const key = 'sd_tracker'
      const raw = localStorage.getItem(key)
      if (!raw) return
      const queue = JSON.parse(raw)
      if (queue.length === 0) return

      // 一次最多发 50 条
      const batch = queue.splice(0, 50)

      fetch(`${this.supabaseUrl}/rest/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify(batch),
      }).then(res => {
        if (res.ok) {
          localStorage.setItem(key, JSON.stringify(queue))
        }
      }).catch(() => {})
    } catch (e) {}
  },

  // 导出本地数据（用于手动查看/导出）
  exportLocalData() {
    try {
      const raw = localStorage.getItem('sd_tracker')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  },

  // 清除本地数据
  clearLocalData() {
    localStorage.removeItem('sd_tracker')
  },

  // 获取统计摘要
  getSummary() {
    const data = this.exportLocalData()
    const summary = {}
    data.forEach(d => {
      const evt = d.event || 'unknown'
      summary[evt] = (summary[evt] || 0) + 1
    })
    return summary
  },
}
