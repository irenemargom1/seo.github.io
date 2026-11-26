const STORAGE_KEY = 'eladio_vinyl_cart_v1';

/* =========================================
   GESTIÓN DEL CARRITO (LOCALSTORAGE)
   ========================================= */
function getCart() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartBadges();
}

function parsePrice(priceText) {
    const clean = priceText.replace(/[^\d,.-]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return Number.isNaN(num) ? 0 : num;
}

function formatPrice(amount) {
    return amount.toFixed(2).replace('.', ',') + ' €';
}

function getTotalItems(cart = getCart()) {
    return cart.reduce((acc, item) => acc + item.qty, 0);
}

function updateCartBadges() {
    const total = getTotalItems();
    document.querySelectorAll('.cart-count-link').forEach((link) => {
        link.textContent = `Carrito (${total})`;
    });
}

function addToCart(product) {
    const cart = getCart();
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    saveCart(cart);
    showToast(`Añadido: ${product.title}`);
}

function changeItemQty(id, delta) {
    const cart = getCart();
    const index = cart.findIndex((item) => item.id === id);
    if (index === -1) return;

    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    saveCart(cart);
    renderCartPage();
}

function clearCart() {
    saveCart([]);
    renderCartPage();
}

/* =========================================
   BOTONES "AÑADIR AL CARRITO" EN TARJETAS
   ========================================= */
function initProductCards() {
    const cards = document.querySelectorAll('.producto-card');
    cards.forEach((card, idx) => {
        if (card.querySelector('.btn-add-cart')) return;

        const titleEl = card.querySelector('h3');
        const priceEl = card.querySelector('.precio');
        const imgEl = card.querySelector('img');

        if (!titleEl || !priceEl) return;

        const title = titleEl.textContent.trim();
        const price = parsePrice(priceEl.textContent);
        const img = imgEl ? imgEl.getAttribute('src') : '';
        const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${idx}`;

        card.dataset.title = title.toLowerCase();

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-add-cart';
        btn.textContent = 'Añadir al carrito';
        btn.addEventListener('click', () => {
            addToCart({ id, title, price, img });
        });

        card.appendChild(btn);
    });
}

/* =========================================
   FILTRO Y BUSCADOR EN CATALOGO.HTML
   ========================================= */
function initCatalogFilter() {
    const catalogMain = document.querySelector('.catalogo-titulo');
    if (!catalogMain) return;

    const grid = catalogMain.nextElementSibling;
    if (!grid || !grid.classList.contains('grid-productos')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'catalog-toolbar';
    toolbar.innerHTML = `
        <input type="search" id="catalogSearch" class="catalog-search" placeholder="Buscar vinilo o álbum (ej. Sol María, 3MEN2, DON KBRN)...">
        <div class="catalog-filters" role="group" aria-label="Filtrar por edición">
            <button type="button" class="filter-btn active" data-filter="all">Todos</button>
            <button type="button" class="filter-btn" data-filter="sauce">Sauce Boyz</button>
            <button type="button" class="filter-btn" data-filter="kbrn">KBRN</button>
            <button type="button" class="filter-btn" data-filter="edicion">Ediciones / LP</button>
        </div>
    `;

    catalogMain.insertAdjacentElement('afterend', toolbar);

    const searchInput = toolbar.querySelector('#catalogSearch');
    const filterButtons = toolbar.querySelectorAll('.filter-btn');
    const cards = Array.from(grid.querySelectorAll('.producto-card'));

    let activeFilter = 'all';

    function applyFilters() {
        const query = searchInput.value.trim().toLowerCase();
        let visibleCount = 0;

        cards.forEach((card) => {
            const text = card.textContent.toLowerCase();
            const matchesQuery = !query || text.includes(query);

            let matchesFilter = true;
            if (activeFilter === 'sauce') {
                matchesFilter = text.includes('sauce');
            } else if (activeFilter === 'kbrn') {
                matchesFilter = text.includes('kbrn');
            } else if (activeFilter === 'edicion') {
                matchesFilter = text.includes('coleccionista') || text.includes('doble') || text.includes('dorado');
            }

            const show = matchesQuery && matchesFilter;
            card.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        let emptyMsg = grid.querySelector('.no-results-msg');
        if (visibleCount === 0) {
            if (!emptyMsg) {
                emptyMsg = document.createElement('p');
                emptyMsg.className = 'no-results-msg';
                emptyMsg.textContent = 'No se encontraron vinilos con ese criterio.';
                grid.appendChild(emptyMsg);
            }
        } else if (emptyMsg) {
            emptyMsg.remove();
        }
    }

    searchInput.addEventListener('input', applyFilters);

    filterButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            filterButtons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            applyFilters();
        });
    });
}

/* =========================================
   RENDERIZADO DINÁMICO EN CART.HTML
   ========================================= */
function renderCartPage() {
    const cartContainer = document.querySelector('.cart-container');
    if (!cartContainer) return;

    const cart = getCart();
    const emptyNotice = cartContainer.querySelector('.cart-vacio');
    const exploreLink = cartContainer.querySelector('a.btn-enviar');

    let dynamicBox = cartContainer.querySelector('.cart-items-box');
    if (!dynamicBox) {
        dynamicBox = document.createElement('div');
        dynamicBox.className = 'cart-items-box';
        cartContainer.appendChild(dynamicBox);
    }

    if (cart.length === 0) {
        if (emptyNotice) emptyNotice.style.display = '';
        if (exploreLink) exploreLink.style.display = 'inline-block';
        dynamicBox.innerHTML = '';
        return;
    }

    if (emptyNotice) emptyNotice.style.display = 'none';
    if (exploreLink) exploreLink.style.display = 'none';

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const isSubpage = window.location.pathname.includes('/html/');
    const imgPrefix = isSubpage && !cart[0].img.startsWith('..') && !cart[0].img.startsWith('/') ? '../' : '';

    dynamicBox.innerHTML = `
        <ul class="cart-list">
            ${cart.map((item) => `
                <li class="cart-row" data-id="${item.id}">
                    <div class="cart-item-info">
                        ${item.img ? `<img src="${imgPrefix}${item.img}" alt="${item.title}" class="cart-thumb">` : ''}
                        <div>
                            <h3>${item.title}</h3>
                            <p class="precio">${formatPrice(item.price)} c/u</p>
                        </div>
                    </div>
                    <div class="cart-controls">
                        <button type="button" class="qty-btn dec-btn" aria-label="Restar unidad">−</button>
                        <span class="cart-qty">${item.qty}</span>
                        <button type="button" class="qty-btn inc-btn" aria-label="Sumar unidad">+</button>
                    </div>
                    <strong class="cart-line-total">${formatPrice(item.price * item.qty)}</strong>
                </li>
            `).join('')}
        </ul>
        <div class="cart-summary">
            <p>Total estimado: <strong>${formatPrice(subtotal)}</strong></p>
            <div class="cart-actions">
                <button type="button" class="btn-secondary clear-cart-btn">Vaciar carrito</button>
                <button type="button" class="btn-enviar checkout-btn">Tramitar pedido</button>
            </div>
        </div>
    `;

    dynamicBox.querySelectorAll('.inc-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('.cart-row').dataset.id;
            changeItemQty(id, 1);
        });
    });

    dynamicBox.querySelectorAll('.dec-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('.cart-row').dataset.id;
            changeItemQty(id, -1);
        });
    });

    const clearBtn = dynamicBox.querySelector('.clear-cart-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCart);
    }

    const checkoutBtn = dynamicBox.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            showToast('¡Pedido simulado con éxito! Gracias por tu compra.');
            clearCart();
        });
    }
}

/* =========================================
   MODAL DE INICIO DE SESIÓN / REGISTRO
   ========================================= */
function initAuthModal() {
    const authLinks = document.querySelectorAll('.auth-buttons .btn-auth');
    if (!authLinks.length) return;

    const modal = document.createElement('div');
    modal.className = 'auth-modal-backdrop';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
        <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
            <button type="button" class="auth-close-btn" aria-label="Cerrar ventana">&times;</button>
            <h2 id="authModalTitle">Iniciar Sesión</h2>
            <form class="auth-form">
                <div class="form-group">
                    <label for="authEmail">Correo electrónico</label>
                    <input type="email" id="authEmail" required placeholder="tuemail@ejemplo.com">
                </div>
                <div class="form-group">
                    <label for="authPassword">Contraseña</label>
                    <input type="password" id="authPassword" required minlength="4" placeholder="••••••••">
                </div>
                <button type="submit" class="btn-enviar" id="authSubmitBtn">Entrar</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const titleEl = modal.querySelector('#authModalTitle');
    const submitBtn = modal.querySelector('#authSubmitBtn');
    const closeBtn = modal.querySelector('.auth-close-btn');
    const form = modal.querySelector('.auth-form');

    function openModal(isRegister) {
        titleEl.textContent = isRegister ? 'Crear Cuenta' : 'Iniciar Sesión';
        submitBtn.textContent = isRegister ? 'Registrarse' : 'Entrar';
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        modal.querySelector('#authEmail').focus();
    }

    function closeModal() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        form.reset();
    }

    authLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(link.classList.contains('btn-registro'));
        });
    });

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeModal();
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = modal.querySelector('#authEmail').value.trim();
        showToast(`Sesión iniciada como ${email}`);
        closeModal();
    });
}

/* =========================================
   FORMULARIO DE CONTACTO
   ========================================= */
function initContactForm() {
    const contactContainer = document.querySelector('.contacto-container');
    if (!contactContainer) return;

    const form = contactContainer.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = form.querySelector('#email')?.value.trim() || '';
        form.reset();
        showToast(`Consulta enviada. Te responderemos a ${email}`);
    });
}

/* =========================================
   NOTIFICACIÓN TOAST
   ========================================= */
function showToast(message) {
    let toast = document.querySelector('.vinyl-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'vinyl-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('visible');

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('visible');
    }, 2800);
}

/* =========================================
   ARRANQUE
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-menu a').forEach((a) => {
        if (a.textContent.trim().startsWith('Carrito')) {
            a.classList.add('cart-count-link');
        }
    });

    updateCartBadges();
    initProductCards();
    initCatalogFilter();
    renderCartPage();
    initAuthModal();
    initContactForm();
});