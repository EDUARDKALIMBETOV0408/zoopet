/**
 * admin.js – функции для администрирования и синхронизации с GitHub
 * Подключается к основному файлу index.html
 */

// ===== КОНФИГУРАЦИЯ GITHUB =====
// Замените на свои данные (они не секретные, их можно публиковать)
const GITHUB_CONFIG = {
    owner: 'eduardkalimbetov0408',   // Ваш username на GitHub
    repo: 'zoopet',                   // Название репозитория
    path: 'products.json'             // Путь к файлу в репозитории
};

// ===== ПОЛУЧЕНИЕ / СОХРАНЕНИЕ ТОКЕНА =====
function getGitHubToken() {
    return localStorage.getItem('github_token');
}

function setGitHubToken(token) {
    localStorage.setItem('github_token', token);
}

function hasGitHubToken() {
    return !!getGitHubToken();
}

// ===== СИНХРОНИЗАЦИЯ JSON С GITHUB =====
async function syncProductsToGitHub(products) {
    const token = getGitHubToken();
    if (!token) {
        showToast('❌ GitHub токен не найден. Установите токен через кнопку "Установить токен".');
        return false;
    }

    const { owner, repo, path } = GITHUB_CONFIG;

    try {
        // 1. Получаем текущий SHA файла (обязательно для обновления)
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

        // 2. Кодируем новое содержимое в Base64
        const newContent = JSON.stringify(products, null, 2);
        // Используем TextEncoder для корректной работы с UTF-8
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

// ===== ОБРАБОТЧИКИ ДЛЯ АДМИН-ПАНЕЛИ =====
// Эти функции нужно вызвать после загрузки DOM, когда элементы уже существуют.

function initAdminHandlers() {
    // Кнопка установки токена
    const setTokenBtn = document.getElementById('setGitHubTokenBtn');
    if (setTokenBtn) {
        setTokenBtn.addEventListener('click', function() {
            const token = prompt('Введите ваш GitHub Personal Access Token:');
            if (token) {
                setGitHubToken(token);
                showToast('✅ Токен сохранён!');
                // Обновляем статус
                updateTokenStatus();
            }
        });
    }

    // Кнопка ручной синхронизации
    const syncBtn = document.getElementById('syncToGitHubBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async function() {
            // Предполагается, что state.products доступен глобально
            if (typeof state !== 'undefined' && state.products) {
                await syncProductsToGitHub(state.products);
            } else {
                showToast('❌ Товары не загружены');
            }
        });
    }

    // Обновляем статус токена при загрузке
    updateTokenStatus();
}

function updateTokenStatus() {
    const statusEl = document.getElementById('tokenStatus');
    if (statusEl) {
        const hasToken = hasGitHubToken();
        statusEl.textContent = hasToken ? '✅ Токен установлен' : '❌ Токен не установлен';
        statusEl.style.color = hasToken ? 'var(--accent-green)' : 'var(--accent-orange)';
    }
}

// Вызываем инициализацию после загрузки DOM
document.addEventListener('DOMContentLoaded', initAdminHandlers);