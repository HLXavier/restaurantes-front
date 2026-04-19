// API Configuration
const API_URL = 'https://restaurantes-8918.onrender.com';

// State
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let restaurants = [];
let reviews = [];

// Score to emoji mapping
function getScoreEmoji(score, isGoat = false) {
    if (score === 0) return { emoji: '👻', text: 'Sem avaliações' };
    if (isGoat) return { emoji: '🐐', text: 'GOAT' };
    if (score >= 4.5) return { emoji: '🎖️', text: 'Perfect' };
    if (score >= 3.5) return { emoji: '👏', text: 'Top' };
    if (score >= 2.5) return { emoji: '😐', text: 'Blé' };
    if (score >= 1.5) return { emoji: '🫩', text: 'Vei Podi' };
    return { emoji: '🤮', text: 'Gorfo Extremo' };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateAuthUI();
    loadRestaurants();
});

function setupEventListeners() {
    // Auth buttons
    document.getElementById('loginBtn').addEventListener('click', () => openAuthModal('login'));
    document.getElementById('registerBtn').addEventListener('click', () => openAuthModal('register'));
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Auth form
    document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);

    // Restaurant button and form
    document.getElementById('addRestaurantBtn').addEventListener('click', openAddRestaurantModal);
    document.getElementById('addRestaurantForm').addEventListener('submit', handleAddRestaurant);

    // Image preview
    document.getElementById('restaurantImage').addEventListener('change', handleImagePreview);

    // Review form
    document.getElementById('reviewForm').addEventListener('submit', handleReviewSubmit);

    // Search input
    document.getElementById('searchInput').addEventListener('input', filterRestaurants);

    // Rating sliders
    const ratingInputs = document.querySelectorAll('.rating-slider input[type="range"]');
    ratingInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.nextElementSibling.textContent = parseFloat(e.target.value).toFixed(1);
        });
    });

    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
}

function updateAuthUI() {
    const authSection = document.getElementById('authSection');
    const userSection = document.getElementById('userSection');
    const userName = document.getElementById('userName');
    const restaurantList = document.getElementById('restaurantList');

    if (authToken && currentUser) {
        authSection.classList.add('hidden');
        userSection.classList.remove('hidden');
        restaurantList.classList.remove('hidden');
        userName.textContent = `👋 ${currentUser.name}`;
    } else {
        authSection.classList.remove('hidden');
        userSection.classList.add('hidden');
        restaurantList.classList.add('hidden');
    }
}

// Auth functions
function openAuthModal(type) {
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authTitle');
    const nameInput = document.getElementById('authName');
    const form = document.getElementById('authForm');

    form.dataset.type = type;
    title.textContent = type === 'login' ? 'Entrar' : 'Cadastrar';

    if (type === 'register') {
        nameInput.classList.remove('hidden');
        nameInput.required = true;
    } else {
        nameInput.classList.add('hidden');
        nameInput.required = false;
    }

    form.reset();
    document.getElementById('authError').classList.add('hidden');
    modal.classList.remove('hidden');
}

async function handleAuthSubmit(e) {
    e.preventDefault();

    const type = e.target.dataset.type;
    const name = document.getElementById('authName').value;
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');

    try {
        const endpoint = type === 'login' ? '/auth/login' : '/auth/register';
        const body = type === 'login'
            ? { email, password }
            : { name, email, password };

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Falha na autenticação');
        }

        authToken = data.access_token;
        currentUser = data.user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        document.getElementById('authModal').classList.add('hidden');
        updateAuthUI();
        loadRestaurants();
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    updateAuthUI();
    loadRestaurants();
}

// Restaurant functions
async function loadRestaurants() {
    const container = document.getElementById('restaurants');
    container.innerHTML = '<div class="loading">Carregando restaurantes...</div>';

    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${API_URL}/restaurant`, { headers });
        restaurants = await response.json();

        if (restaurants.length === 0) {
            container.innerHTML = '<div class="no-reviews">Nenhum restaurante ainda</div>';
            return;
        }

        renderRestaurants(restaurants);
    } catch (error) {
        container.innerHTML = `<div class="error">Falha ao carregar restaurantes: ${error.message}</div>`;
    }
}

function filterRestaurants() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filtered = restaurants.filter(restaurant =>
        restaurant.name.toLowerCase().includes(searchTerm)
    );
    renderRestaurants(filtered);
}

function renderRestaurants(restaurantList) {
    const container = document.getElementById('restaurants');

    if (restaurantList.length === 0) {
        container.innerHTML = '<div class="no-reviews">Nenhum restaurante encontrado</div>';
        return;
    }

    // Find GOAT (highest score)
    const maxScore = Math.max(...restaurantList.map(r => r.averageReview || 0));

    container.innerHTML = restaurantList.map(restaurant => {
        const score = restaurant.averageReview || 0;
        const isGoat = score > 0 && score === maxScore && maxScore > 0;
        const scoreInfo = getScoreEmoji(score, isGoat);

        return `
            <div class="restaurant-card">
                <img src="${API_URL}/images/restaurants/${restaurant.image}"
                     alt="${restaurant.name}"
                     class="restaurant-image"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22%3E%3Crect fill=%22%23e2e8f0%22 width=%22400%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22%2364748b%22 text-anchor=%22middle%22 dy=%22.3em%22%3ESem Imagem%3C/text%3E%3C/svg%3E'">
                <div class="restaurant-info">
                    <div class="restaurant-header">
                        <div>
                            <div class="restaurant-name">${restaurant.name}</div>
                            <div class="restaurant-location">📍 ${restaurant.location}</div>
                        </div>
                        <div class="score-badge">
                            <div class="score-emoji">${scoreInfo.emoji}</div>
                            <div class="score-text">${scoreInfo.text}</div>
                            <div class="score-number">${score.toFixed(1)}</div>
                        </div>
                    </div>
                    <div class="restaurant-description">${restaurant.description}</div>
                    <div class="restaurant-actions">
                        <button class="btn btn-primary" onclick="openReviewModal('${restaurant.name}')">
                            ⭐ Avaliar
                        </button>
                        <button class="btn btn-secondary" onclick="loadReviews('${restaurant.name}')">
                            📋 Avaliações
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Review functions
function openReviewModal(restaurantName) {
    if (!authToken) {
        alert('Por favor, faça login para avaliar restaurantes');
        openAuthModal('login');
        return;
    }

    const modal = document.getElementById('reviewModal');
    document.getElementById('reviewRestaurantName').textContent = restaurantName;
    document.getElementById('reviewRestaurantId').value = restaurantName;
    document.getElementById('reviewForm').reset();
    document.getElementById('reviewError').classList.add('hidden');

    // Reset rating displays
    document.querySelectorAll('.rating-value').forEach(el => {
        el.textContent = '3.0';
    });

    modal.classList.remove('hidden');
}

async function handleReviewSubmit(e) {
    e.preventDefault();

    const restaurantName = document.getElementById('reviewRestaurantId').value;
    const food = parseFloat(document.getElementById('foodRating').value);
    const service = parseFloat(document.getElementById('serviceRating').value);
    const atmosphere = parseFloat(document.getElementById('atmosphereRating').value);
    const price = parseFloat(document.getElementById('priceRating').value);
    const waitTime = parseFloat(document.getElementById('waitTimeRating').value);
    const location = parseFloat(document.getElementById('locationRating').value);
    const comments = document.getElementById('reviewComments').value.trim();
    const errorEl = document.getElementById('reviewError');

    try {
        const body = {
            restaurantName,
            food: Math.round(food * 2) / 2, // Round to nearest 0.5
            service: Math.round(service * 2) / 2,
            atmosphere: Math.round(atmosphere * 2) / 2,
            price: Math.round(price * 2) / 2,
            waitTime: Math.round(waitTime * 2) / 2,
            location: Math.round(location * 2) / 2
        };

        if (comments) {
            body.comments = comments;
        }

        const response = await fetch(`${API_URL}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Falha ao enviar avaliação');
        }

        document.getElementById('reviewModal').classList.add('hidden');
        loadRestaurants(); // Reload to show updated scores
        alert('Avaliação enviada com sucesso!');
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
    }
}

async function loadReviews(restaurantName) {
    const modal = document.getElementById('reviewsModal');
    const container = document.getElementById('reviewsList');
    document.getElementById('reviewsRestaurantName').textContent = restaurantName;

    container.innerHTML = '<div class="loading">Carregando avaliações...</div>';
    modal.classList.remove('hidden');

    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${API_URL}/review?restaurantName=${encodeURIComponent(restaurantName)}`, { headers });
        const reviews = await response.json();

        if (reviews.length === 0) {
            container.innerHTML = '<div class="no-reviews">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</div>';
            return;
        }

        container.innerHTML = reviews.map(review => {
            const date = new Date(review.createdAt).toLocaleDateString('pt-BR');
            const userScoreInfo = getScoreEmoji(review.userScore, false);
            return `
                <div class="review-item">
                    <div class="review-header">
                        <div class="review-user">👤 ${review.userName}</div>
                        <div class="user-score-badge">
                            <span class="score-emoji">${userScoreInfo.emoji}</span>
                            <span class="score-text">${userScoreInfo.text}</span>
                            <span class="score-number">${review.userScore.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="review-date-small">${date}</div>
                    <div class="review-scores">
                        <div class="review-score-item">
                            <span class="review-score-label">Comida:</span> ${review.food}
                        </div>
                        <div class="review-score-item">
                            <span class="review-score-label">Atendimento:</span> ${review.service}
                        </div>
                        <div class="review-score-item">
                            <span class="review-score-label">Ambiente:</span> ${review.atmosphere}
                        </div>
                        <div class="review-score-item">
                            <span class="review-score-label">Preço:</span> ${review.price}
                        </div>
                        <div class="review-score-item">
                            <span class="review-score-label">Espera:</span> ${review.waitTime}
                        </div>
                        <div class="review-score-item">
                            <span class="review-score-label">Localização:</span> ${review.location}
                        </div>
                    </div>
                    ${review.comments ? `<div class="review-comments">💬 ${review.comments}</div>` : ''}
                    <div class="review-weighted">
                        Nota Ponderada: ${review.weightedScore.toFixed(2)}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = `<div class="error">Falha ao carregar avaliações: ${error.message}</div>`;
    }
}

// Add Restaurant functions
function openAddRestaurantModal() {
    if (!authToken) {
        alert('Por favor, faça login para adicionar restaurantes');
        openAuthModal('login');
        return;
    }

    const modal = document.getElementById('addRestaurantModal');
    document.getElementById('addRestaurantForm').reset();
    document.getElementById('addRestaurantError').classList.add('hidden');
    document.getElementById('imagePreview').classList.add('hidden');
    modal.classList.remove('hidden');
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('imagePreview');
            const img = document.getElementById('previewImg');
            img.src = event.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

async function handleAddRestaurant(e) {
    e.preventDefault();

    const name = document.getElementById('restaurantName').value;
    const location = document.getElementById('restaurantLocation').value;
    const description = document.getElementById('restaurantDescription').value;
    const imageFile = document.getElementById('restaurantImage').files[0];
    const errorEl = document.getElementById('addRestaurantError');

    if (!imageFile) {
        errorEl.textContent = 'Por favor, selecione uma imagem';
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        // Convert image to base64
        const base64Image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });

        const response = await fetch(`${API_URL}/restaurant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                name,
                location,
                description,
                image: base64Image
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Falha ao adicionar restaurante');
        }

        document.getElementById('addRestaurantModal').classList.add('hidden');
        loadRestaurants(); // Reload to show new restaurant
        alert('Restaurante adicionado com sucesso!');
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
    }
}
