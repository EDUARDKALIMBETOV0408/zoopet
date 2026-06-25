/**
 * admin.js – административные функции и синхронизация с GitHub
 * Содержит:
 * - управление GitHub токеном
 * - синхронизацию товаров с репозиторием
 * - открытие формы добавления товара (с валидацией)
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
        inputEl.value = token || '';
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

// ===== ОТКРЫТИЕ ФОРМЫ ДОБАВЛЕНИЯ ТОВАРА (С ВАЛИДАЦИЕЙ) =====
function openAddProductModal() {
    const modal = document.getElementById('addProductModal');
    const form = document.getElementById('addProductForm');
    const status = document.getElementById('addProductStatus');
    if (modal) {
        if (form) form.reset();
        if (status) status.textContent = '';
        modal.classList.add('open');
    }
}

// Валидация и отправка формы добавления товара
function handleAddProductSubmit(e) {
    e.preventDefault();

    const brand = document.getElementById('addBrand').value.trim();
    const category = document.getElementById('addCategory').value.trim();
    const price = parseFloat(document.getElementById('addPrice').value);
    const stock = parseInt(document.getElementById('addStock').value);
    const nameRu = document.getElementById('addNameRu').value.trim();

    // Проверка обязательных полей
    if (!brand || !category || !price || !stock || !nameRu) {
        document.getElementById('addProductStatus').textContent =
            '⚠️ Заполните обязательные поля: Бренд, Категория, Цена, Количество, Название (RU)';
        return;
    }

    // Если поля заполнены, вызываем основную логику из глобальной области (она уже есть в index.html)
    // Но чтобы не дублировать код, можно просто вызвать событие submit основной формы,
    // однако проще выполнить добавление здесь и синхронизировать.
    // Мы можем использовать существующий обработчик из основного скрипта, если он доступен.
    // Так как основной скрипт уже содержит всю логику, просто вызовем его через dispatchEvent.
    const form = document.getElementById('addProductForm');
    // Если у формы есть атрибут data-submit-handler, мы можем вызвать его.
    // Но проще: мы уже знаем, что в основном коде есть обработчик, который сработает при submit.
    // Поэтому мы просто позволяем событию submit продолжиться, но мы уже остановили его preventDefault.
    // Значит, нам нужно самим выполнить добавление.
    // Для простоты скопируем логику добавления из основного скрипта сюда (она уже есть, но продублируем).
    // Но чтобы избежать дублирования, лучше вызвать функцию из основного скрипта.
    // Предположим, что в основном скрипте определена глобальная функция addProductFromForm,
    // или мы можем получить доступ к state и выполнить добавление напрямую.
    // Поскольку мы не можем полагаться на глобальные функции, продублируем логику здесь (это безопасно).

    // Собираем все данные
    const image = document.getElementById('addImage').value.trim() ||
        'https://placehold.co/300x300/ccc?text=Новый+товар';
    const nameSr = document.getElementById('addNameSr').value.trim() || nameRu;
    const nameEn = document.getElementById('addNameEn').value.trim() || nameRu;
    const descRu = document.getElementById('addDescRu').value.trim();
    const descSr = document.getElementById('addDescSr').value.trim() || descRu;
    const descEn = document.getElementById('addDescEn').value.trim() || descRu;
    const weightRu = document.getElementById('addWeightRu').value.trim() || '—';
    const foodRu = document.getElementById('addFoodRu').value.trim() || '—';
    const ageRu = document.getElementById('addAgeRu').value.trim() || '—';

    const newProduct = {
        id: Date.now(),
        brand,
        category,
        price_rsd: price,
        stock: stock,
        image: image,
        name: { ru: nameRu, sr: nameSr, en: nameEn },
        description: { ru: descRu, sr: descSr, en: descEn },
        attributes: {
            weight: { ru: weightRu, sr: weightRu, en: weightRu },
            food_type: { ru: foodRu, sr: foodRu, en: foodRu },
            age: { ru: ageRu, sr: ageRu, en: ageRu }
        },
        reviews: []
    };

    // Добавляем в глобальный state (если доступен)
    if (typeof state !== 'undefined' && state.products) {
        state.products.push(newProduct);
        if (typeof saveProducts === 'function') saveProducts();
        if (typeof renderAll === 'function') renderAll();
        // Обновляем админ-список, если открыт
        if (document.getElementById('profileModal').classList.contains('open')) {
            if (typeof renderAdminProducts === 'function') renderAdminProducts();
        }
        showToast('✅ Товар добавлен!');

        // Закрываем модалку
        const modal = document.getElementById('addProductModal');
        if (modal) modal.classList.remove('open');

        // Синхронизация с GitHub
        if (typeof syncProductsToGitHub === 'function') {
            const token = getGitHubToken();
            if (token) {
                syncProductsToGitHub(state.products).catch(err => {
                    console.warn('Ошибка синхронизации с GitHub:', err);
                    showToast('⚠️ Товар добавлен, но синхронизация с GitHub не удалась');
                });
            }
        }
    } else {
        showToast('❌ Ошибка: состояние не найдено');
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ =====
function initAdmin() {
    // 1. GitHub токен
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

    // 2. Добавление товара – используем делегирование для кнопки открытия формы
    document.addEventListener('click', function(e) {
        const target = e.target.closest('#openAddProductBtn');
        if (target) {
            e.preventDefault();
            openAddProductModal();
        }
    });

    // 3. Обработчик отправки формы добавления (перехватываем submit)
    const addForm = document.getElementById('addProductForm');
    if (addForm) {
        // Удаляем предыдущие обработчики (если есть) и добавляем свой
        addForm.removeEventListener('submit', handleAddProductSubmit);
        addForm.addEventListener('submit', handleAddProductSubmit);
    }

    // 4. Обновляем статус токена
    updateTokenStatus();
}

// Запускаем инициализацию после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}

// Делаем функции доступными глобально для вызова из основного кода (если нужно)
window.updateTokenStatus = updateTokenStatus;
window.syncProductsToGitHub = syncProductsToGitHub;
window.openAddProductModal = openAddProductModal;
