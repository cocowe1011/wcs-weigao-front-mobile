---
trigger: always_on
---
# Android 9 WebView CSS 兼容性规范

## 规则目的

确保所有Vue组件的CSS样式在Android 9（基于Chrome 69-70 WebView）上正常显示，避免因CSS特性不兼容导致的布局异常。

## 适用范围

- 所有 `*.vue` 文件的 `<style>` 部分
- 特别是使用SCSS/Less预处理器编写的样式

## 禁止使用的CSS特性

### 1. ❌ 禁止嵌套CSS选择器

**错误示例**：
```scss
.page-layout {
  padding: 24rpx;
  
  // ❌ 嵌套在内部的选择器
  > .section:not(:last-child) {
    margin-bottom: 24rpx;
  }
  
  .section-header {
    > .title + .badge {
      margin-left: 12rpx;
    }
  }
}

.header-actions {
  display: flex;
  
  // ❌ 使用 > * + * 通用相邻选择器
  > * + * {
    margin-left: 16rpx;
  }
}
```

**正确写法**：
```scss
.page-layout {
  padding: 24rpx;
}

// ✅ 所有选择器必须是顶层独立规则
.page-layout > .section:not(:last-child) {
  margin-bottom: 24rpx;
}

.section-header .title + .badge {
  margin-left: 12rpx;
}

.header-actions {
  display: flex;
}

// ✅ 直接指定具体元素的间距
.header-actions .btn + .btn {
  margin-left: 16rpx;
}
```

### 2. ❌ 禁止使用 env() 函数

`env(safe-area-inset-*)` 是iOS特有的安全区域API，Android 9完全不识别。

**错误示例**：
```scss
.page-layout {
  // ❌ Android 9不认识 env()
  padding: 24rpx 24rpx calc(env(safe-area-inset-bottom) + 24rpx);
}
```

**正确写法**：
```scss
.page-layout {
  // ✅ 使用固定值，避免 env()
  padding: 24rpx;
  padding-bottom: 24rpx;
}
```

### 3. ❌ 禁止在 calc() 中混用不兼容函数

**错误示例**：
```scss
.container {
  // ❌ calc() 中包含 env() 会导致整个属性失效
  padding-bottom: calc(env(safe-area-inset-bottom) + 16rpx);
  height: calc(100vh - env(safe-area-inset-top));
}
```

### 4. ❌ 避免使用简写 padding/margin（当包含复杂值时）

**错误示例**：
```scss
.section-header {
  // ❌ 如果其中某个值计算失败，整个 padding 会被忽略
  padding: 0 4rpx;
}
```

**正确写法**：
```scss
.section-header {
  // ✅ 展开为独立属性，互不影响
  padding-left: 4rpx;
  padding-right: 4rpx;
}
```

## 必须遵循的编写规范

### ✅ 1. 所有CSS选择器必须是顶层规则

```scss
// ✅ 正确：所有选择器都在顶层
.parent {
  display: flex;
}

.parent > .child {
  margin: 10rpx;
}

.parent .child + .child {
  margin-left: 12rpx;
}

// ❌ 错误：嵌套选择器
.parent {
  > .child {
    margin: 10rpx;
  }
}
```

### ✅ 2. 使用独立的长属性替代简写

```scss
// ✅ 推荐：明确指定每个方向
.container {
  padding-top: 20rpx;
  padding-right: 24rpx;
  padding-bottom: 24rpx;
  padding-left: 24rpx;
}

// ⚠️ 可以使用简单值的简写（不含 calc/env）
.simple {
  padding: 24rpx;  // 仅当所有值都是简单数字时
}
```

### ✅ 3. 使用 margin 替代 > * + *

```scss
// ✅ 推荐：给前一个元素设置 margin-right
.list-item {
  margin-right: 16rpx;
}

.list-item:last-child {
  margin-right: 0;
}

// ❌ 避免：通用相邻选择器
.list {
  > * + * {
    margin-left: 16rpx;
  }
}
```

## 检查清单

在编写或审查CSS代码时，必须检查以下项目：

- [ ] 所有选择器都是顶层独立规则，无嵌套
- [ ] 未使用 `env()` 函数
- [ ] `calc()` 中未使用不兼容函数
- [ ] padding/margin 已展开为独立属性（当包含复杂值时）
- [ ] 未使用 `> * + *` 通用相邻选择器
- [ ] 未使用 CSS Gap 属性（Android 9对flex gap支持差）

## 参考案例

本次修复涉及的兼容性问题和解决方案来源于实际项目经验，详见项目记忆库中的修复记录。

## 何时可以例外

**不允许任何例外**——所有面向Android 9及以下版本的代码必须严格遵守此规范。

如果目标平台仅包含Android 10+，可以在代码审查时临时放宽限制，但仍建议保持此规范以确保最大兼容性。
