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

        const newContent = JSON.stringify(products, null, 2);
        const encoder = new TextEncoder();
        const data = encoder.encode(newContent);
        const encodedContent = btoa(String.fromCharCode(...data));

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

// ===== ОТКРЫТИЕ / ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА =====
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
        if (typeof renderAdminProducts === 'function') renderAdminProducts();
    }

    closeAddProductModal(); // закрываем после сохранения

    showToast('✅ Товар добавлен!');

    const token = getGitHubToken();
    if (token) {
        syncProductsToGitHub(state.products).catch(err => {
            console.warn('Ошибка синхронизации с GitHub:', err);
            showToast('⚠️ Товар добавлен, но синхронизация с GitHub не удалась');
        });
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
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

    // === ОТКРЫТИЕ МОДАЛЬНОГО ОКНА (кнопка "Открыть форму добавления") ===
    document.addEventListener('click', function(e) {
        const target = e.target.closest('#openAddProductBtn');
        if (target) {
            e.preventDefault();
            e.stopPropagation();
            openAddProductModal();
        }
    });

    // === ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА (крестик) ===
    const closeBtn = document.getElementById('addProductCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeAddProductModal();
        });
    }

    // === ЗАКРЫТИЕ ПО КЛИКУ НА ФОН ===
    const modalOverlay = document.getElementById('addProductModal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAddProductModal();
            }
        });
    }

    // === ОБРАБОТЧИК ФОРМЫ ДОБАВЛЕНИЯ ===
    const addForm = document.getElementById('addProductForm');
    if (addForm) {
        addForm.removeEventListener('submit', handleAddProductSubmit);
        addForm.addEventListener('submit', handleAddProductSubmit);
    }
    // === КНОПКА "ОТМЕНА" В МОДАЛКЕ ===
const cancelBtn = document.getElementById('addProductCancelBtn');
if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
        closeAddProductModal();
    });
}

    // === КНОПКА "ОТМЕНА" ВНУТРИ МОДАЛЬНОГО ОКНА ===
    // Добавим кнопку "Отмена" в HTML (если её нет), или используем существующую.
    // В разметке у нас есть только кнопка "Добавить товар". Добавим кнопку "Отмена" динамически,
    // но проще добавить её в HTML. В текущем HTML её нет, поэтому добавим сейчас.
    // Мы можем также использовать крестик как отмену, но пользователь хочет кнопку.
    // Я добавлю кнопку "Отмена" прямо здесь, вставив её в модалку.
    // Но лучше сделать это в HTML, чтобы сохранить структуру. Поскольку я даю полный код,
    // я обновлю HTML-разметку с кнопкой "Отмена".
    // Но для совместимости добавим обработчик, если кнопка "Отмена" уже есть в разметке.
    // Для этого добавим поиск кнопки с классом "cancel-btn" внутри модалки и навесим обработчик.
    // Однако в текущей разметке такой кнопки нет. Поэтому я добавлю её в HTML-код.
    // В финальном ответе я дам обновлённый index.html с кнопкой "Отмена".
    // Пока здесь просто заглушка.

    updateTokenStatus();
}

// Запускаем инициализацию
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}

window.updateTokenStatus = updateTokenStatus;
window.syncProductsToGitHub = syncProductsToGitHub;
window.openAddProductModal = openAddProductModal;
window.closeAddProductModal = closeAddProductModal;
