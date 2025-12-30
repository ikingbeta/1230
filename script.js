document.addEventListener('DOMContentLoaded', function() {
    // --- 变量定义 ---
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const overlay = document.getElementById('overlay');
    const messageInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatContainer = document.getElementById('chat-container');
    const saveConfigBtn = document.getElementById('save-config');
    const testConfigBtn = document.getElementById('test-config');
    const apiUrlInput = document.getElementById('api-url');
    const apiKeyInput = document.getElementById('api-key');
    const modelNameInput = document.getElementById('model-name');
    const loader = document.getElementById('loader');

    // 默认配置
    const defaultConfig = {
        apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        modelName: 'glm-4'
    };

    // --- 初始化 ---
    initCountdown();
    loadConfig();

    // --- 事件监听 ---

    // 设置面板开关
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.add('active');
            overlay.classList.add('active');
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettings);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeSettings);
    }

    function closeSettings() {
        if (settingsPanel) settingsPanel.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    // 消息发送
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // 自动调整输入框高度
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.value === '') {
                this.style.height = '';
            }
        });
    }

    // 配置保存
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', saveConfig);
    }
    
    if (testConfigBtn) {
        testConfigBtn.addEventListener('click', testConfig);
    }

    // --- 功能函数 ---

    // 倒计时功能
    function initCountdown() {
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;

        // 初始化 HTML 结构
        countdownElement.innerHTML = `
            <span id="days">00</span>天
            <span id="hours">00</span>时
            <span id="minutes">00</span>分
            <span id="seconds">00</span>秒
        `;

        const targetDate = new Date('2025-01-01T00:00:00').getTime();
        
        function updateCountdown() {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                // 如果已过元旦，显示新年快乐
                const title = document.querySelector('.card-title');
                if (title) title.textContent = "2025年元旦快乐！";
                
                countdownElement.innerHTML = '<div style="width: 100%; font-size: 1.2rem;">🎉 新年快乐 🎉</div>';
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            const daysEl = document.getElementById('days');
            const hoursEl = document.getElementById('hours');
            const minutesEl = document.getElementById('minutes');
            const secondsEl = document.getElementById('seconds');

            if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
            if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
            if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
            if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
        }

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // 加载配置
    async function loadConfig() {
        try {
            const response = await fetch('/api/get-config');
            const data = await response.json();
            
            if (data.success && data.config) {
                if (apiUrlInput) apiUrlInput.value = data.config.apiUrl || defaultConfig.apiUrl;
                if (modelNameInput) modelNameInput.value = data.config.modelName || defaultConfig.modelName;
                if (data.config.hasApiKey && apiKeyInput) {
                    apiKeyInput.placeholder = "已配置 (输入新密钥以覆盖)";
                }
            } else {
                if (apiUrlInput) apiUrlInput.value = defaultConfig.apiUrl;
                if (modelNameInput) modelNameInput.value = defaultConfig.modelName;
            }
        } catch (error) {
            console.error('加载配置失败:', error);
            showToast('无法加载配置，请检查网络', 'error');
        }
    }

    // 保存配置
    async function saveConfig() {
        if (!apiUrlInput || !apiKeyInput || !modelNameInput) return;

        const apiUrl = apiUrlInput.value.trim();
        const apiKey = apiKeyInput.value.trim();
        const modelName = modelNameInput.value.trim();

        if (!apiUrl || !modelName) {
            showToast('API地址和模型名称不能为空', 'error');
            return;
        }

        // 如果apiKey为空，且之前已经配置过（placeholder提示已配置），则提示用户
        // 由于后端全量更新，建议用户重新输入，或者后端做部分更新支持。
        // 为简单起见，如果这里没填，我们就不传apiKey给后端吗？
        // 不，后端server.js检查 !apiUrl || !apiKey || !modelName
        // 所以必须填。
        if (!apiKey) {
             showToast('请输入API Key', 'error');
             return;
        }

        showLoader(true);
        try {
            const response = await fetch('/api/save-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiUrl, apiKey, modelName })
            });
            const data = await response.json();

            if (data.success) {
                showToast(data.message, 'success');
                closeSettings();
            } else {
                showToast(data.error || '保存失败', 'error');
            }
        } catch (error) {
            console.error('保存配置出错:', error);
            showToast('保存配置出错', 'error');
        } finally {
            showLoader(false);
        }
    }

    // 测试配置
    async function testConfig() {
        if (!apiUrlInput || !apiKeyInput) return;

        const apiUrl = apiUrlInput.value.trim();
        const apiKey = apiKeyInput.value.trim();

        if (!apiUrl || !apiKey) {
            showToast('请填写API地址和API Key', 'error');
            return;
        }

        showLoader(true);
        try {
            const response = await fetch('/api/test-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiUrl, apiKey })
            });
            const data = await response.json();

            if (data.success) {
                showToast(data.message, 'success');
            } else {
                showToast(data.error || '连接测试失败', 'error');
            }
        } catch (error) {
            console.error('测试配置出错:', error);
            showToast('测试配置出错', 'error');
        } finally {
            showLoader(false);
        }
    }

    // 发送消息
    async function sendMessage() {
        if (!messageInput) return;
        const text = messageInput.value.trim();
        if (!text) return;

        // 添加用户消息
        addMessage(text, 'user');
        messageInput.value = '';
        messageInput.style.height = '';

        // 显示加载状态
        const loadingId = addLoadingMessage();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    config: {
                        timestamp: new Date().toISOString()
                    }
                })
            });

            const data = await response.json();
            
            // 移除加载消息
            removeMessage(loadingId);

            if (data.success) {
                addMessage(data.reply, 'bot');
            } else {
                addMessage(`❌ 出错了: ${data.error || '无法获取回复'}`, 'bot');
            }

        } catch (error) {
            console.error('发送消息出错:', error);
            removeMessage(loadingId);
            addMessage('❌ 网络错误，请稍后重试。', 'bot');
        }
    }

    // 添加消息到界面
    function addMessage(text, type) {
        if (!chatContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const sender = type === 'user' ? '您' : '元旦助手';
        const icon = type === 'user' ? '🧑' : '🏮';

        messageDiv.innerHTML = `
            <div class="message-header">
                <span>${icon} ${sender}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${formatMessage(text)}</div>
        `;

        chatContainer.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv;
    }

    // 添加加载消息
    function addLoadingMessage() {
        if (!chatContainer) return;

        const id = 'loading-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.id = id;
        messageDiv.innerHTML = `
            <div class="message-header">
                <span>🏮 元旦助手</span>
            </div>
            <div class="message-content">
                <span class="typing-indicator">正在思考... 🎇</span>
            </div>
        `;
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
        return id;
    }

    // 移除消息
    function removeMessage(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    // 格式化消息 (简单的换行处理)
    function formatMessage(text) {
        if (!text) return '';
        return text.replace(/\n/g, '<br>');
    }

    // 滚动到底部
    function scrollToBottom() {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    // 显示加载遮罩
    function showLoader(show) {
        if (!loader) return;
        if (show) {
            loader.classList.add('active');
        } else {
            loader.classList.remove('active');
        }
    }

    // 显示提示 (Toast)
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '20px';
        toast.style.color = '#fff';
        toast.style.zIndex = '3000';
        toast.style.animation = 'slideIn 0.3s ease';
        toast.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
        toast.style.fontWeight = 'bold';

        if (type === 'error') {
            toast.style.background = 'linear-gradient(135deg, #ff4d4d 0%, #c1121f 100%)';
        } else if (type === 'success') {
            toast.style.background = 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)';
        } else {
            toast.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
        }

        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
