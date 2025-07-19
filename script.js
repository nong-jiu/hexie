// 家教订单数据
let orderData = [];

// 从服务器JSON文件加载数据（每天更新）
async function loadOrderData() {
    try {
        // 添加时间戳防止缓存
        const response = await fetch('./data.json?' + Date.now());
        if (response.ok) {
            orderData = await response.json();
            // 标准化区域字段
            orderData = processOrderRegions(orderData);
            // 自动标记高价单
            orderData = processHighPriceOrders(orderData);
            // 保存到localStorage作为备份
            localStorage.setItem('tutorOrders', JSON.stringify(orderData));
            localStorage.setItem('dataUpdateTime', new Date().toISOString());
        } else {
            throw new Error('加载数据失败');
        }
    } catch (error) {
        console.error('从服务器加载数据失败:', error);
        
        // 如果服务器加载失败，使用localStorage备份或默认数据
        const savedData = localStorage.getItem('tutorOrders');
        if (savedData) {
            try {
                orderData = JSON.parse(savedData);
                console.log('使用本地备份数据');
                // 处理高价单标记
                orderData = processHighPriceOrders(orderData);
            } catch (parseError) {
                console.error('解析本地数据失败:', parseError);
                orderData = getDefaultData();
                orderData = processHighPriceOrders(orderData);
            }
        } else {
            orderData = getDefaultData();
            orderData = processHighPriceOrders(orderData);
        }
    }
    return orderData;
}

// 处理订单区域标准化
function processOrderRegions(orders) {
    return orders.map(order => {
        // 如果已经有标准区域字段，则使用它，否则从地址解析
        if (order.region && isStandardRegion(order.region)) {
            return order;
        }
        
        // 从地址解析区域
        const normalizedRegion = normalizeRegion(order.address);
        return {
            ...order,
            region: normalizedRegion
        };
    });
}

// 解析课酬并判断是否为高价单
function processHighPriceOrders(orders) {
    return orders.map(order => {
        const isHighPrice = isHighPriceOrder(order.salary);
        
        // 更新category数组
        let newCategories = [...order.category];
        
        if (isHighPrice && !newCategories.includes('high-price')) {
            newCategories.push('high-price');
        } else if (!isHighPrice && newCategories.includes('high-price')) {
            newCategories = newCategories.filter(cat => cat !== 'high-price');
        }
        
        return {
            ...order,
            category: newCategories
        };
    });
}

// 判断是否为高价单（单次课酬≥500元）
function isHighPriceOrder(salary) {
    if (!salary) return false;
    
    const salaryStr = salary.toString();
    
    // 匹配单次课酬的数字
    // 支持格式：500/次、500-600/次、500~600/次、500/2小时等
    const patterns = [
        /(\d+(?:\d+|\.\d+)?)\s*[\/／]\s*(?:次|课时|课|次课)/g,  // 500/次
        /(\d+(?:\d+|\.\d+)?)\s*-\s*(\d+(?:\d+|\.\d+)?)\s*[\/／]\s*(?:次|课时|课|次课)/g,  // 500-600/次
        /(\d+(?:\d+|\.\d+)?)\s*~\s*(\d+(?:\d+|\.\d+)?)\s*[\/／]\s*(?:次|课时|课|次课)/g  // 500~600/次
    ];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(salaryStr)) !== null) {
            let amount = 0;
            
            if (match.length === 2) {
                // 单一价格 500/次
                amount = parseFloat(match[1]);
            } else if (match.length === 3) {
                // 价格区间 500-600/次，取最低值
                amount = parseFloat(match[1]);
            }
            
            if (amount >= 500) {
                return true;
            }
        }
    }
    
    // 如果没有找到/次的格式，尝试直接提取数字
    const numbers = salaryStr.match(/\d+(?:\.\d+)?/g);
    if (numbers) {
        const amounts = numbers.map(n => parseFloat(n));
        return amounts.some(amount => amount >= 500);
    }
    
    return false;
}

// 检查是否是标准区域名称
function isStandardRegion(region) {
    const standardRegions = [
        '福田区', '罗湖区', '盐田区', '南山区', '宝安区', 
        '龙岗区', '龙华区', '坪山区', '光明区', '大鹏新区', '其他大亚湾区'
    ];
    return standardRegions.includes(region);
}

// 手动检查数据更新
async function checkForDataUpdate() {
    const loadingMsg = document.createElement('div');
    loadingMsg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #007bff;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    loadingMsg.textContent = '📊 正在检查数据更新...';
    document.body.appendChild(loadingMsg);
    
    try {
        await loadOrderData();
        filteredData = orderData;
        filterOrders();
        
        loadingMsg.textContent = '✅ 数据已更新！';
        loadingMsg.style.background = '#28a745';
        
        setTimeout(() => {
            if (loadingMsg.parentNode) {
                loadingMsg.parentNode.removeChild(loadingMsg);
            }
        }, 2000);
        
    } catch (error) {
        loadingMsg.textContent = '❌ 更新失败，请稍后重试';
        loadingMsg.style.background = '#dc3545';
        
        setTimeout(() => {
            if (loadingMsg.parentNode) {
                loadingMsg.parentNode.removeChild(loadingMsg);
            }
        }, 3000);
    }
}

// 默认数据
function getDefaultData() {
    return [
        {
            "id": "25071209y",
            "parentName": "",
            "grade": "准初三",
            "subject": "全科辅导",
            "score": "",
            "studentGender": "女",
            "salary": "130-150/时 260-300/次",
            "teacherGender": "女",
            "requirements": "准大一新生，刚高考完的",
            "frequency": "暑假30次课",
            "time": "暑假7、8月上课，每次课两小时",
            "address": "龙岗区宇宏公元盛世",
            "region": "龙岗区",
            "category": ["latest", "high-price", "summer"]
        },
        {
            "id": "25071206x",
            "parentName": "",
            "grade": "准高二",
            "subject": "数学",
            "score": "50-70",
            "studentGender": "男",
            "salary": "300/时 600/次",
            "teacherGender": "不限",
            "requirements": "专职老师",
            "frequency": "待定",
            "time": "暑假7、8月上课，每次课两小时（周二下午试课）",
            "address": "南山区12号线中山公园A出口",
            "region": "南山区",
            "category": ["latest", "high-price", "summer"]
        },
        {
            "id": "25071205-c",
            "parentName": "",
            "grade": "准高三",
            "subject": "英语",
            "score": "50/150",
            "studentGender": "",
            "salary": "350/时 700/次",
            "teacherGender": "不限",
            "requirements": "专职老师，有经验",
            "frequency": "暑假每周两次课",
            "time": "暑假7月上课，每次课两小时，开学继续",
            "address": "龙岗区布吉大芬地铁站附近",
            "region": "龙岗区",
            "category": ["latest", "high-price", "summer"]
        },
        {
            "id": "25071205-b",
            "parentName": "",
            "grade": "准高三",
            "subject": "数学",
            "score": "90-100/150",
            "studentGender": "",
            "salary": "350/时 700/次",
            "teacherGender": "不限",
            "requirements": "专职老师，有经验",
            "frequency": "暑假每周两次课",
            "time": "暑假7月上课，每次课两小时",
            "address": "龙岗区布吉大芬地铁站附近",
            "region": "龙岗区",
            "category": ["latest", "high-price", "summer"]
        },
        {
            "id": "25071204-b",
            "parentName": "",
            "grade": "准高三",
            "subject": "化学",
            "score": "82",
            "studentGender": "",
            "salary": "350/时 700/次",
            "teacherGender": "不限",
            "requirements": "专职老师，有经验",
            "frequency": "暑假15次课",
            "time": "暑假7月13-30号上午上课",
            "address": "南山区南山地铁站附近A出口附近（走路大约十分钟）",
            "region": "南山区",
            "category": ["latest", "high-price", "summer"]
        },
        {
            "id": "25071204-a",
            "parentName": "",
            "grade": "准高三",
            "subject": "物理",
            "score": "48",
            "studentGender": "",
            "salary": "350/时 700/次",
            "teacherGender": "不限",
            "requirements": "专职老师，有经验",
            "frequency": "暑假15次课",
            "time": "暑假7月13-30号上午上课",
            "address": "南山区南山地铁站附近A出口附近（走路大约十分钟）",
            "region": "南山区",
            "category": ["latest", "high-price", "summer"]
        },
        {
            "id": "25071203x",
            "parentName": "",
            "grade": "四升五",
            "subject": "语文",
            "score": "",
            "studentGender": "男（一对二）",
            "salary": "250/时 500/次",
            "teacherGender": "不限",
            "requirements": "专职老师，有经验，主要教阅读和作文的方法",
            "frequency": "暑假12次",
            "time": "暑假7月14-26日下午1-4点（除周日），每次两小时",
            "address": "罗湖区深南东路地王大厦",
            "region": "罗湖区",
            "category": ["latest", "summer", "weekend"]
        }
    ];
}

// 全局变量
let filteredData = orderData;
let currentCategory = 'all';

// DOM元素
const orderList = document.getElementById('orderList');
const regionFilter = document.getElementById('regionFilter');
const gradeFilter = document.getElementById('gradeFilter');
const teacherTypeFilter = document.getElementById('teacherTypeFilter');
const orderSearch = document.getElementById('orderSearch');
const tabBtns = document.querySelectorAll('.tab-btn');

// 显示数据更新时间
function displayDataUpdateTime() {
    const updateTimeSpan = document.getElementById('dataUpdateTime');
    const lastUpdate = localStorage.getItem('dataUpdateTime');
    
    if (lastUpdate) {
        const updateDate = new Date(lastUpdate);
        const now = new Date();
        const diffHours = Math.floor((now - updateDate) / (1000 * 60 * 60));
        
        if (diffHours < 1) {
            updateTimeSpan.textContent = `数据已更新（${Math.floor((now - updateDate) / (1000 * 60))}分钟前）`;
        } else if (diffHours < 24) {
            updateTimeSpan.textContent = `数据已更新（${diffHours}小时前）`;
        } else {
            updateTimeSpan.textContent = `数据已更新（${Math.floor(diffHours / 24)}天前）`;
        }
    } else {
        updateTimeSpan.textContent = '';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 加载数据
    await loadOrderData();
    filteredData = orderData;
    
    // 打印区域分布统计
    const regionStats = {};
    orderData.forEach(order => {
        regionStats[order.region] = (regionStats[order.region] || 0) + 1;
    });
    console.log('区域分布统计:', regionStats);
    
    // 打印高价单统计
    const highPriceStats = orderData.filter(order => order.category.includes('high-price'));
    console.log('高价单数量:', highPriceStats.length);
    console.log('高价单详情:', highPriceStats.map(order => ({
        id: order.id,
        salary: order.salary,
        subject: order.subject
    })));
    
    // 渲染页面
    renderOrders(orderData);
    bindEvents();
    displayDataUpdateTime();
    
    // 监听 localStorage 变化
    window.addEventListener('storage', function(e) {
        if (e.key === 'tutorOrders') {
            loadOrderData().then(() => {
                filteredData = orderData;
                filterOrders();
                displayDataUpdateTime();
                showUpdateNotification();
            });
        }
    });
    
    // 监听BroadcastChannel消息（跨标签页通信）
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('tutor-orders-update');
        channel.addEventListener('message', function(e) {
            if (e.data.type === 'data-updated') {
                loadOrderData().then(() => {
                    filteredData = orderData;
                    filterOrders();
                    displayDataUpdateTime();
                    showUpdateNotification();
                });
            }
        });
    }
    
    // 监听postMessage（如果在iframe中）
    window.addEventListener('message', function(e) {
        if (e.data.type === 'tutor-orders-updated') {
            loadOrderData().then(() => {
                filteredData = orderData;
                filterOrders();
                displayDataUpdateTime();
                showUpdateNotification();
            });
        }
    });
});

// 显示更新通知
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = '📢 家教单已更新！';
    document.body.appendChild(notification);
    
    // 添加动画样式
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// 绑定事件
function bindEvents() {
    // 筛选器事件
    regionFilter.addEventListener('change', filterOrders);
    gradeFilter.addEventListener('change', filterOrders);
    teacherTypeFilter.addEventListener('change', filterOrders);
    orderSearch.addEventListener('input', debounce(filterOrders, 300));
    
    // 分类标签事件
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 更新活跃状态
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentCategory = this.dataset.category;
            filterOrders();
        });
    });
}

// 渲染订单列表
function renderOrders(orders) {
    if (!orders || orders.length === 0) {
        orderList.innerHTML = '<div class="empty-state">暂无符合条件的订单</div>';
        return;
    }
    
    const ordersHtml = orders.map(order => createOrderCard(order)).join('');
    orderList.innerHTML = ordersHtml;
    
    // 绑定复制按钮事件
    bindCopyEvents();
}

// 创建订单卡片
function createOrderCard(order) {
    const tags = getOrderTags(order);
    
    return `
        <div class="order-card" data-id="${order.id}">
            <div class="order-header">
                <div class="order-id">
                    【订单：${order.id}】
                    ${tags}
                </div>
                <button class="copy-btn" data-copy="${order.id}">复制本单</button>
            </div>
            
            <div class="order-content">
                <div class="order-item">
                    <span class="order-label">孩子年级：</span>
                    <span class="order-value">${order.grade}</span>
                </div>
                
                <div class="order-item">
                    <span class="order-label">科目：</span>
                    <span class="order-value">${order.subject}</span>
                </div>
                
                <div class="order-item">
                    <span class="order-label">成绩：</span>
                    <span class="order-value">${order.score}</span>
                </div>
                
                <div class="order-item">
                    <span class="order-label">孩子性别：</span>
                    <span class="order-value">${order.studentGender}</span>
                </div>
                
                <div class="order-item">
                    <span class="order-label">课酬：</span>
                    <span class="order-value order-salary">${order.salary}</span>
                </div>
                
                <div class="order-item">
                    <span class="order-label">老师性别：</span>
                    <span class="order-value">${order.teacherGender}</span>
                </div>
                
                <div class="order-item">
                    <span class="order-label">次数：</span>
                    <span class="order-value">${order.frequency}</span>
                </div>
                
                <div class="order-address">
                    <div class="order-item">
                        <span class="order-label">上门地址：</span>
                        <span class="order-value">${order.address}</span>
                        <button class="copy-address" data-copy-address="${order.address}">复制地址</button>
                    </div>
                </div>
                
                <div class="order-item">
                    <span class="order-label">辅导时间：</span>
                    <span class="order-value">${order.time}</span>
                </div>
                
                <div class="order-requirements">
                    <strong>对老师的要求：</strong>${order.requirements}
                </div>
            </div>
        </div>
    `;
}

// 获取订单标签
function getOrderTags(order) {
    let tags = '';
    
    if (order.category.includes('urgent')) {
        tags += '<span class="order-tag urgent">加急</span>';
    }
    if (order.category.includes('high-price')) {
        tags += '<span class="order-tag high-price">高价</span>';
    }
    if (order.category.includes('summer')) {
        tags += '<span class="order-tag summer">暑假单</span>';
    }
    if (order.category.includes('daily')) {
        tags += '<span class="order-tag daily">日常</span>';
    }
    
    return tags;
}

// 根据年级字符串匹配对应的年级类别
function matchGradeCategory(grade, targetCategory) {
    if (!grade || !targetCategory) return false;
    
    const gradeStr = grade.toLowerCase();
    
    switch (targetCategory) {
        case '幼儿':
            return gradeStr.includes('幼儿') || gradeStr.includes('幼儿园') || gradeStr.includes('学前');
        case '小学':
            return gradeStr.includes('小学') || 
                   gradeStr.includes('一年级') || gradeStr.includes('二年级') || 
                   gradeStr.includes('三年级') || gradeStr.includes('四年级') || 
                   gradeStr.includes('五年级') || gradeStr.includes('六年级');
        case '初中':
            return gradeStr.includes('初中') || gradeStr.includes('初一') || 
                   gradeStr.includes('初二') || gradeStr.includes('初三');
        case '高中':
            return gradeStr.includes('高中') || gradeStr.includes('高一') || 
                   gradeStr.includes('高二') || gradeStr.includes('高三') ||
                   gradeStr.includes('准高') ||
                   gradeStr.includes('高考') || gradeStr.includes('高考生');
        case '成人':
            return gradeStr.includes('成人') || gradeStr.includes('大学');
        default:
            return false;
    }
}

// 地址区域标准化函数
function normalizeRegion(address) {
    if (!address) return '其他大亚湾区';
    
    const addressStr = address.toLowerCase();
    
    // 定义区域映射
    const regionMappings = {
        '福田': ['福田', '福田区'],
        '罗湖区': ['罗湖', '罗湖区'],
        '盐田区': ['盐田', '盐田区'],
        '南山区': ['南山', '南山区'],
        '宝安区': ['宝安', '宝安区'],
        '龙岗区': ['龙岗', '龙岗区'],
        '龙华区': ['龙华', '龙华区'],
        '坪山区': ['坪山', '坪山区'],
        '光明区': ['光明', '光明区'],
        '大鹏新区': ['大鹏', '大鹏新区', '大鹏新区']
    };
    
    // 检查是否包含任一区域关键词
    for (const [standardRegion, keywords] of Object.entries(regionMappings)) {
        for (const keyword of keywords) {
            if (addressStr.includes(keyword.toLowerCase())) {
                return standardRegion;
            }
        }
    }
    
    // 如果没有匹配到任何区域，返回"其他大亚湾区"
    return '其他大亚湾区';
}

// 筛选订单
function filterOrders() {
    const region = regionFilter.value;
    const grade = gradeFilter.value;
    const teacherType = teacherTypeFilter.value;
    const searchTerm = orderSearch.value.toLowerCase();
    
    filteredData = orderData.filter(order => {
        // 分类筛选
        let isMatch = true;
        if (currentCategory !== 'all' && !order.category.includes(currentCategory)) {
            isMatch = false;
        }
        if (isMatch) isMatch = region ? order.region === region : true;
        if (isMatch) isMatch = grade ? matchGradeCategory(order.grade, grade) : true;
        if (isMatch) isMatch = teacherType ? order.teacherType && order.teacherType.includes(teacherType) : true;
        
        // 关键词搜索
        if (isMatch && searchTerm) {
            const searchContent = `
                ${order.id.toLowerCase().includes(searchTerm) ? '订单号' : ''}
                ${order.parentName ? order.parentName.toLowerCase().includes(searchTerm) ? '家长称呼' : '' : ''}
                ${order.grade.toLowerCase().includes(searchTerm) ? '孩子年级' : ''}
                ${order.subject.toLowerCase().includes(searchTerm) ? '科目' : ''}
                ${order.score.toLowerCase().includes(searchTerm) ? '成绩' : ''}
                ${order.studentGender.toLowerCase().includes(searchTerm) ? '孩子性别' : ''}
                ${order.salary.toLowerCase().includes(searchTerm) ? '课酬' : ''}
                ${order.teacherGender.toLowerCase().includes(searchTerm) ? '老师性别' : ''}
                ${order.frequency.toLowerCase().includes(searchTerm) ? '次数' : ''}
                ${order.time.toLowerCase().includes(searchTerm) ? '辅导时间' : ''}
                ${order.address.toLowerCase().includes(searchTerm) ? '上门地址' : ''}
                ${order.requirements.toLowerCase().includes(searchTerm) ? '对老师的要求' : ''}
            `;
            if (searchContent.trim() === '') {
                isMatch = false; // 如果没有匹配到任何内容，则不匹配
            }
        }
        
        return isMatch;
    });
    
    renderOrders(filteredData);
}

// 绑定复制事件
function bindCopyEvents() {
    // 复制订单按钮
    const copyBtns = document.querySelectorAll('[data-copy]');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const orderId = this.dataset.copy;
            const order = orderData.find(o => o.id === orderId);
            if (order) {
                const orderText = formatOrderForCopy(order);
                copyToClipboard(orderText, '订单信息已复制');
            }
        });
    });
    
    // 复制地址按钮
    const copyAddressBtns = document.querySelectorAll('[data-copy-address]');
    copyAddressBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const address = this.dataset.copyAddress;
            copyToClipboard(address, '地址已复制');
        });
    });
}

// 格式化订单用于复制
function formatOrderForCopy(order) {
    return `【订单：${order.id}】
家长称呼：${order.parentName || ''}
孩子年级：${order.grade}
科目：${order.subject}
成绩：${order.score}
孩子性别：${order.studentGender}
课酬：${order.salary}
老师性别：${order.teacherGender}
对老师的要求：${order.requirements}
次数：${order.frequency}
辅导时间：${order.time}
上门地址：${order.address}`;
}

// 复制到剪贴板
function copyToClipboard(text, message = '已复制') {
    if (navigator.clipboard && window.isSecureContext) {
        // 现代浏览器支持
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(message);
        }).catch(() => {
            fallbackCopy(text, message);
        });
    } else {
        // 兼容旧浏览器
        fallbackCopy(text, message);
    }
}

// 兼容旧浏览器的复制方法
function fallbackCopy(text, message) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess(message);
    } catch (err) {
        console.error('复制失败:', err);
        showCopySuccess('复制失败，请手动复制');
    }
    
    document.body.removeChild(textArea);
}

// 显示复制成功提示
function showCopySuccess(message) {
    // 移除已存在的提示
    const existingToast = document.querySelector('.copy-success');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 创建新提示
    const toast = document.createElement('div');
    toast.className = 'copy-success';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 2秒后自动移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 2000);
}

// 重置所有筛选条件
function resetAllFilters() {
    // 重置下拉选择框
    regionFilter.value = '';
    gradeFilter.value = '';
    teacherTypeFilter.value = '';
    
    // 重置搜索框
    orderSearch.value = '';
    
    // 重置分类标签（选择"全部"）
    tabBtns.forEach(btn => btn.classList.remove('active'));
    const allBtn = document.querySelector('[data-category="all"]');
    if (allBtn) {
        allBtn.classList.add('active');
    }
    
    // 重置当前分类
    currentCategory = 'all';
    
    // 重置筛选数据并重新渲染
    filteredData = orderData;
    filterOrders();
    
    // 显示重置成功提示
    showResetSuccess();
}

// 显示重置成功提示
function showResetSuccess() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = '✅ 筛选条件已重置';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 2000);
}

// 搜索功能增强
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 使用防抖优化搜索
orderSearch.addEventListener('input', debounce(filterOrders, 300));