/**
 * admin.js – административные функции и синхронизация с GitHub
 * Содержит обработку поля ввода токена и кнопок.
 */

// ===== КОНФИГУРАЦИЯ GITHUB =====
const GITHUB_CONFIG = {
    owner: 'eduardkalimbetov0408',   // Замените на ваш GitHub username
    repo: 'zoopet',                   // Название репозитория
    path: 'products.json'             // Путь к файлу в репозитории
};

// ===== РАБОТА С ТОКЕНОМ =====
function getGitHubToken() {
    return localStorage.getItem('github_token');
}

function setGitHubToken(token) {
    localStorage.setItem('github_token', token);
}

function hasGitHubToken() {
    return !!getGitHubToken();
}

function updateTokenStatus() {
    const statusEl = document.getElementById('tokenStatus');
    const inputEl = document.getElementById('githubTokenInput');
    if (statusEl) {
        const hasToken = hasGitHubToken();
        statusEl.textContent = hasToken ? '✅ Токен установлен' : '❌ Токен не установлен';
        statusEl.style.color = hasToken ? 'var(--accent-green)' : 'var(--accent-orange)';
    }
    if (inputEl) {
        const token = getGitHubToken();
        if (token) {
            inputEl.value = token;
        } else {
            inputEl.value = '';
        }
    }
}

// ===== СИНХРОНИЗАЦИЯ JSON С GITHUB =====
async function syncProductsToGitHub(products) {
    const token = getGitHubToken();
    if (!token) {
        showToast('❌ GitHub токен не найден. Введите токен в поле и нажмите "Сохранить токен".');
        return false;
    }

    const { owner, repo, path } = GITHUB_CONFIG;

    try {
        // 1. Получаем текущий SHA файла
        const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const getResponse = await fetch(getUrl, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getResponse.ok) {
            throw new Error(`Не удалось получить файл: ${getResponse.status} - ${getResponse.statusText}`);
        }

        const fileData = await getResponse.json();
        const sha = fileData.sha;

        // 2. Кодируем новое содержимое в Base64 (UTF-8)
        const newContent = JSON.stringify(products, null, 2);
        const encoder = new TextEncoder();
        const data = encoder.encode(newContent);
        const encodedContent = btoa(String.fromCharCode(...data));

        // 3. Отправляем PUT-запрос на обновление
        const updateUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const updateResponse = await fetch(updateUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Обновление товаров от ${new Date().toLocaleString()}`,
                content: encodedContent,
                sha: sha
            })
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`Ошибка обновления: ${updateResponse.status} - ${errorData.message}`);
        }

        console.log('✅ products.json обновлён на GitHub');
        showToast('✅ Товары синхронизированы с GitHub!');
        return true;
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        showToast('❌ Ошибка синхронизации: ' + error.message);
        return false;
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ =====
document.addEventListener('DOMContentLoaded', function() {
    // Поле ввода токена и кнопка сохранения
    const inputEl = document.getElementById('githubTokenInput');
    const saveBtn = document.getElementById('saveGitHubTokenBtn');
    const syncBtn = document.getElementById('syncToGitHubBtn');

    if (saveBtn && inputEl) {
        saveBtn.addEventListener('click', function() {
            const token = inputEl.value.trim();
            if (token) {
                setGitHubToken(token);
                updateTokenStatus();
                showToast('✅ Токен сохранён!');
            } else {
                showToast('⚠️ Введите токен');
            }
        });
    }

    if (syncBtn) {
        syncBtn.addEventListener('click', async function() {
            if (typeof state !== 'undefined' && state.products) {
                await syncProductsToGitHub(state.products);
            } else {
                showToast('❌ Товары не загружены');
            }
        });
    }

    // Обновляем статус при загрузке
    updateTokenStatus();
});
