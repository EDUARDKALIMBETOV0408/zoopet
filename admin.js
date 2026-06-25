/**
 * admin.js – административные функции и синхронизация с GitHub
 */

const GITHUB_CONFIG = {
    owner: 'eduardkalimbetov0408',   // Замените на ваш GitHub username
    repo: 'zoopet',                   // Название репозитория
    path: 'products.json'             // Путь к файлу в репозитории
};

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

async function syncProductsToGitHub(products) {
    const token = getGitHubToken();
    if (!token) {
        showToast('❌ GitHub токен не найден.');
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
            throw new Error(`Не удалось получить файл: ${getResponse.status}`);
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

        showToast('✅ Товары синхронизированы с GitHub!');
        return true;
    } catch (error) {
        console.error('Ошибка синхронизации:', error);
        showToast('❌ Ошибка синхронизации: ' + error.message);
        return false;
    }
}

function openAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.classList.add('open');
    } else {
        console.error('Модальное окно #addProductModal не найдено');
        showToast('❌ Ошибка: модальное окно не найдено');
    }
}

function closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.classList.remove('open');
        const status = document.getElementById('addProductStatus');
        if (status) status.textContent = '';
    }
}

function handleAddProductSubmit(e) {
    e.preventDefault();

    const brand = document.getElementById('addBrand').value.trim();
    const category = document.getElementById('addCategory').value.trim();
    const price = parseFloat(document.getElementById('addPrice').value);
    const stock = parseInt(document.getElementById('addStock').value);
    const nameRu = document.getElementById('addNameRu').value.trim();

    if (!brand || !category || !price || !stock || !nameRu) {
        document.getElementById('addProductStatus').textContent =
            '⚠️ Заполните обязательные поля: Бренд, Категория, Цена, Количество, Название (RU)';
        return;
    }

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

    if (typeof state === 'undefined' || !state.products) {
        showToast('❌ Ошибка: состояние не загружено');
        return;
    }

    state.products.push(newProduct);
    if (typeof saveProducts === 'function') saveProducts();
    if (typeof renderAll === 'function') renderAll();

    if (document.getElementById('profileModal').classList.contains('open')) {
        if (typeof updateAdminProducts === 'function') updateAdminProducts();
    }

    closeAddProductModal();

    showToast('✅ Товар добавлен!');

    const token = getGitHubToken();
    if (token) {
        syncProductsToGitHub(state.products).catch(err => {
            console.warn('Ошибка синхронизации с GitHub:', err);
            showToast('⚠️ Товар добавлен, но синхронизация с GitHub не удалась');
        });
    }
}

function exportJsonData() {
    if (typeof state === 'undefined' || !state.products) {
        showToast('❌ Товары не загружены');
        return;
    }
    const dataStr = JSON.stringify(state.products, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 JSON скачан!');
}

async function loadJsonData() {
    const status = document.getElementById('loadJsonStatus');
    if (!status) return;
    try {
        const baseUrl = window.location.pathname.replace(/\/[^/]*$/, '/');
        const response = await fetch(baseUrl + 'products.json');
        if (!response.ok) throw new Error('Файл products.json не найден');
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error('Файл пуст или невалиден');
        if (typeof state !== 'undefined') {
            state.products = data;
            if (typeof saveProducts === 'function') saveProducts();
            if (typeof applyFiltersAndPagination === 'function') applyFiltersAndPagination();
            if (typeof updateAdminProducts === 'function') updateAdminProducts();
            status.textContent = '✅ Загружено ' + data.length + ' товаров!';
            status.style.color = 'var(--accent-green)';
        }
    } catch (error) {
        status.textContent = '⚠️ Ошибка: ' + error.message;
        status.style.color = 'var(--accent-orange)';
    }
}

function initAdmin() {
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

    // Открытие модального окна добавления товара (делегирование)
    document.addEventListener('click', function(e) {
        const target = e.target.closest('#openAddProductBtn');
        if (target) {
            e.preventDefault();
            e.stopPropagation();
            openAddProductModal();
        }
    });

    // Закрытие по крестику
    const closeBtn = document.getElementById('addProductCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeAddProductModal();
        });
    }

    // Закрытие по клику на фон
    const modalOverlay = document.getElementById('addProductModal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAddProductModal();
            }
        });
    }

    // Закрытие по кнопке "Отмена"
    const cancelBtn = document.getElementById('addProductCancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            closeAddProductModal();
        });
    }

    // Обработчик формы добавления
    const addForm = document.getElementById('addProductForm');
    if (addForm) {
        addForm.removeEventListener('submit', handleAddProductSubmit);
        addForm.addEventListener('submit', handleAddProductSubmit);
    }

    // Экспорт JSON
    const exportBtn = document.getElementById('exportJsonBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportJsonData);
    }

    // Загрузка JSON
    const loadBtn = document.getElementById('loadJsonBtn');
    if (loadBtn) {
        loadBtn.addEventListener('click', loadJsonData);
    }

    updateTokenStatus();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}

window.updateTokenStatus = updateTokenStatus;
window.syncProductsToGitHub = syncProductsToGitHub;
window.openAddProductModal = openAddProductModal;
window.closeAddProductModal = closeAddProductModal;
window.exportJsonData = exportJsonData;
window.loadJsonData = loadJsonData;
