// API Configuration
const API_URL = 'http://localhost:3000';

// State
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let restaurants = [];
let reviews = [];

// Score to emoji mapping (1-10 scale)
function getScoreEmoji(score, isGoat = false) {
  if (score === 0) return { emoji: '👻', text: 'Sem avaliações' };
  if (isGoat) return { emoji: '🐐', text: 'GOAT' };
  if (score >= 10) return { emoji: '👩‍🍳', text: 'Dauzi Mode' };
  if (score >= 9) return { emoji: '🤩', text: 'Supremo' };
  if (score >= 8) return { emoji: '🥰', text: 'Top' };
  if (score >= 7) return { emoji: '😊', text: 'Bom' };
  if (score >= 6) return { emoji: '🙂', text: 'Ok' };
  if (score >= 5) return { emoji: '😐', text: 'Blé' };
  if (score >= 4) return { emoji: '🥴', text: 'Ruinzinho' };
  if (score >= 3) return { emoji: '🫩', text: 'Véi Podi' };
  if (score >= 2) return { emoji: '🤢', text: 'Horrível' };
  return { emoji: '🤮', text: 'Gorfo extremo' };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateAuthUI();
  loadRestaurants();
});

function setupEventListeners() {
  // Auth buttons
  document
    .getElementById('loginBtn')
    .addEventListener('click', () => openAuthModal('login'));
  document
    .getElementById('registerBtn')
    .addEventListener('click', () => openAuthModal('register'));
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Server wake buttons
  document
    .getElementById('wakeServerBtnAuth')
    .addEventListener('click', wakeServer);
  document
    .getElementById('wakeServerBtnUser')
    .addEventListener('click', wakeServer);

  // Auth form
  document
    .getElementById('authForm')
    .addEventListener('submit', handleAuthSubmit);

  // Restaurant button and form
  document
    .getElementById('addRestaurantBtn')
    .addEventListener('click', openAddRestaurantModal);
  document
    .getElementById('addRestaurantForm')
    .addEventListener('submit', handleAddRestaurant);

  // Image preview
  document
    .getElementById('restaurantImage')
    .addEventListener('change', handleImagePreview);

  // Review form
  document
    .getElementById('reviewForm')
    .addEventListener('submit', handleReviewSubmit);

  // Search input
  document
    .getElementById('searchInput')
    .addEventListener('input', filterRestaurants);

  // Server wake close button
  document
    .getElementById('serverWakeCloseBtn')
    .addEventListener('click', () => {
      document.getElementById('serverWakeModal').classList.add('hidden');
      resetServerWakeModal();
    });

  // Delete confirmation
  document
    .getElementById('cancelDeleteBtn')
    .addEventListener('click', closeDeleteConfirmModal);
  document
    .getElementById('confirmDeleteBtn')
    .addEventListener('click', handleConfirmDelete);

  // Rating sliders
  const ratingInputs = document.querySelectorAll(
    '.rating-slider input[type="range"]',
  );
  ratingInputs.forEach((input) => {
    input.addEventListener('input', (e) => {
      e.target.nextElementSibling.textContent = parseInt(e.target.value);
    });
  });

  // Close modals
  document.querySelectorAll('.close').forEach((closeBtn) => {
    closeBtn.addEventListener('click', (e) => {
      e.target.closest('.modal').classList.add('hidden');
    });
  });

  // Close modal on outside click
  document.querySelectorAll('.modal').forEach((modal) => {
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
    userName.textContent = currentUser.name;
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
    const body =
      type === 'login' ? { email, password } : { name, email, password };

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
      container.innerHTML =
        '<div class="no-reviews">Nenhum restaurante ainda</div>';
      return;
    }

    renderRestaurants(restaurants);
  } catch (error) {
    container.innerHTML = `<div class="error">Falha ao carregar restaurantes: ${error.message}</div>`;
  }
}

function filterRestaurants() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const filtered = restaurants.filter((restaurant) =>
    restaurant.name.toLowerCase().includes(searchTerm),
  );
  renderRestaurants(filtered);
}

function renderRestaurants(restaurantList) {
  const container = document.getElementById('restaurants');

  if (restaurantList.length === 0) {
    container.innerHTML =
      '<div class="no-reviews">Nenhum restaurante encontrado</div>';
    return;
  }

  // Sort restaurants by average review (highest to lowest)
  const sortedRestaurants = [...restaurantList].sort((a, b) => {
    const scoreA = a.averageReview || 0;
    const scoreB = b.averageReview || 0;
    return scoreB - scoreA;
  });

  // Find GOAT (highest score)
  const maxScore = Math.max(...sortedRestaurants.map((r) => r.averageReview || 0));

  container.innerHTML = sortedRestaurants
    .map((restaurant) => {
      const score = restaurant.averageReview || 0;
      const isGoat = score > 0 && score === maxScore && maxScore > 0;
      const scoreInfo = getScoreEmoji(score, isGoat);

      // Escape strings for safe onclick attribute usage
      const escapedName = restaurant.name.replace(/'/g, "\\'");
      const escapedLocation = restaurant.location.replace(/'/g, "\\'");
      const escapedDescription = restaurant.description.replace(/'/g, "\\'");
      const escapedImage = restaurant.image.replace(/'/g, "\\'");

      return `
            <div class="restaurant-card">
                <div class="restaurant-menu">
                    <button class="menu-btn" onclick="toggleMenu(event, '${escapedName}')">⋯</button>
                    <div class="menu-dropdown hidden" id="menu-${restaurant.id}">
                        <button class="menu-item" onclick="openEditRestaurantModal('${restaurant.id}', '${escapedName}', '${escapedLocation}', '${escapedDescription}', '${escapedImage}')">
                            Editar
                        </button>
                        <button class="menu-item menu-item-danger" onclick="confirmDeleteRestaurant('${escapedName}')">
                            Deletar
                        </button>
                    </div>
                </div>
                <img src="${API_URL}/images/restaurants/${restaurant.image}"
                     alt="${restaurant.name}"
                     class="restaurant-image"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22%3E%3Crect fill=%22%23e2e8f0%22 width=%22400%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22%2364748b%22 text-anchor=%22middle%22 dy=%22.3em%22%3ESem Imagem%3C/text%3E%3C/svg%3E'">
                <div class="restaurant-info">
                    <div class="restaurant-header">
                        <div class="restaurant-main-content">
                            <div class="restaurant-name">${restaurant.name}</div>
                            <div class="restaurant-location">📍 ${restaurant.location}</div>
                            <div class="restaurant-description">${restaurant.description}</div>
                        </div>
                        <div class="score-badge">
                            <div class="score-emoji">${scoreInfo.emoji}</div>
                            <div class="score-text ${isGoat ? 'goat-text' : ''}">${scoreInfo.text}</div>
                            <div class="score-number">${score.toFixed(1)}</div>
                        </div>
                    </div>
                    <div class="restaurant-actions">
                        <button class="btn btn-primary" onclick="openReviewModal('${restaurant.name}')">
                            Avaliar
                        </button>
                        <button class="btn btn-secondary" onclick="loadReviews('${restaurant.name}')">
                            Avaliações
                        </button>
                    </div>
                </div>
            </div>
        `;
    })
    .join('');
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
  document.getElementById('reviewId').value = ''; // Clear review ID for new reviews
  document.getElementById('reviewForm').reset();
  document.getElementById('reviewError').classList.add('hidden');

  // Reset rating displays
  document.querySelectorAll('.rating-value').forEach((el) => {
    el.textContent = '5';
  });

  modal.classList.remove('hidden');
}

async function handleReviewSubmit(e) {
  e.preventDefault();

  const restaurantName = document.getElementById('reviewRestaurantId').value;
  const reviewId = document.getElementById('reviewId').value;
  const food = parseFloat(document.getElementById('foodRating').value);
  const service = parseFloat(document.getElementById('serviceRating').value);
  const atmosphere = parseFloat(
    document.getElementById('atmosphereRating').value,
  );
  const price = parseFloat(document.getElementById('priceRating').value);
  const waitTime = parseFloat(document.getElementById('waitTimeRating').value);
  const location = parseFloat(document.getElementById('locationRating').value);
  const comments = document.getElementById('reviewComments').value.trim();
  const errorEl = document.getElementById('reviewError');

  try {
    const body = {
      food: Math.round(food),
      service: Math.round(service),
      atmosphere: Math.round(atmosphere),
      price: Math.round(price),
      waitTime: Math.round(waitTime),
      location: Math.round(location),
    };

    if (comments) {
      body.comments = comments;
    }

    // Check if we're updating or creating
    const isUpdate = reviewId !== '';
    const url = isUpdate ? `${API_URL}/review/${reviewId}` : `${API_URL}/review`;
    const method = isUpdate ? 'PUT' : 'POST';

    // Add restaurantName only for new reviews
    if (!isUpdate) {
      body.restaurantName = restaurantName;
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Falha ao enviar avaliação');
    }

    document.getElementById('reviewModal').classList.add('hidden');
    loadRestaurants(); // Reload to show updated scores

    // If it was an update, reopen the reviews list
    if (isUpdate) {
      setTimeout(() => loadReviews(restaurantName), 300); // Small delay for smooth transition
    }

    alert(isUpdate ? 'Avaliação atualizada com sucesso!' : 'Avaliação enviada com sucesso!');
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove('hidden');
  }
}

async function openEditReviewModal(reviewId, restaurantName) {
  if (!authToken) {
    alert('Por favor, faça login para editar avaliações');
    return;
  }

  // Close the reviews list modal first
  document.getElementById('reviewsModal').classList.add('hidden');

  try {
    // Fetch the review data
    const response = await fetch(
      `${API_URL}/review?restaurantName=${encodeURIComponent(restaurantName)}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
    const reviews = await response.json();
    const review = reviews.find((r) => r.id === reviewId);

    if (!review) {
      alert('Avaliação não encontrada');
      return;
    }

    // Open modal and populate with existing data
    const modal = document.getElementById('reviewModal');
    document.getElementById('reviewRestaurantName').textContent = restaurantName;
    document.getElementById('reviewRestaurantId').value = restaurantName;
    document.getElementById('reviewId').value = reviewId;
    document.getElementById('reviewError').classList.add('hidden');

    // Set the rating values
    document.getElementById('foodRating').value = review.food;
    document.getElementById('serviceRating').value = review.service;
    document.getElementById('atmosphereRating').value = review.atmosphere;
    document.getElementById('priceRating').value = review.price;
    document.getElementById('waitTimeRating').value = review.waitTime;
    document.getElementById('locationRating').value = review.location;
    document.getElementById('reviewComments').value = review.comments || '';

    // Update rating displays
    document.querySelectorAll('.rating-value').forEach((el, index) => {
      const values = [review.food, review.service, review.atmosphere, review.price, review.waitTime, review.location];
      el.textContent = values[index];
    });

    modal.classList.remove('hidden');
  } catch (error) {
    alert(`Erro ao carregar avaliação: ${error.message}`);
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

    const response = await fetch(
      `${API_URL}/review?restaurantName=${encodeURIComponent(restaurantName)}`,
      { headers },
    );
    const reviews = await response.json();

    if (reviews.length === 0) {
      container.innerHTML =
        '<div class="no-reviews">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</div>';
      return;
    }

    container.innerHTML = reviews
      .map((review) => {
        const date = new Date(review.createdAt).toLocaleDateString('pt-BR');
        const userScoreInfo = getScoreEmoji(review.userScore, false);
        const isOwnReview = currentUser && review.userId === currentUser.id;
        return `
                <div class="review-item">
                    <div class="review-header">
                        <div class="review-user">👤 ${review.userName}</div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            ${isOwnReview ? `
                                <button class="btn btn-primary" style="padding: 0.5rem 0.75rem; font-size: 0.75rem;" onclick="openEditReviewModal('${review.id}', '${review.restaurantName}')">
                                    Editar
                                </button>
                            ` : ''}
                            <div class="user-score-badge">
                                <span class="score-emoji">${userScoreInfo.emoji}</span>
                                <span class="score-text">${userScoreInfo.text}</span>
                                <span class="score-number">${review.userScore.toFixed(1)}</span>
                            </div>
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
      })
      .join('');
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
  document.getElementById('addRestaurantTitle').textContent = 'Adicionar Restaurante';
  document.getElementById('restaurantSubmitBtn').textContent = 'Adicionar';
  document.getElementById('addRestaurantForm').reset();
  document.getElementById('restaurantId').value = '';
  document.getElementById('currentRestaurantImage').value = '';

  // Show input, hide display
  document.getElementById('restaurantName').classList.remove('hidden');
  document.getElementById('restaurantNameDisplay').classList.add('hidden');

  document.getElementById('restaurantImage').required = true;
  document.getElementById('addRestaurantError').classList.add('hidden');
  document.getElementById('imagePreview').classList.add('hidden');
  modal.classList.remove('hidden');
}

function openEditRestaurantModal(id, name, location, description, image) {
  if (!authToken) {
    alert('Por favor, faça login para editar restaurantes');
    return;
  }

  const modal = document.getElementById('addRestaurantModal');
  document.getElementById('addRestaurantTitle').textContent = 'Editar Restaurante';
  document.getElementById('restaurantSubmitBtn').textContent = 'Atualizar';
  document.getElementById('restaurantId').value = id;
  document.getElementById('currentRestaurantImage').value = image;

  // Hide input, show display
  document.getElementById('restaurantName').classList.add('hidden');
  document.getElementById('restaurantNameDisplay').textContent = name;
  document.getElementById('restaurantNameDisplay').classList.remove('hidden');

  document.getElementById('restaurantLocation').value = location;
  document.getElementById('restaurantDescription').value = description;
  document.getElementById('restaurantImage').required = false;
  document.getElementById('addRestaurantError').classList.add('hidden');

  // Show current image preview
  const preview = document.getElementById('imagePreview');
  const img = document.getElementById('previewImg');
  img.src = `${API_URL}/images/restaurants/${image}`;
  preview.classList.remove('hidden');

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

  const restaurantId = document.getElementById('restaurantId').value;
  const name = document.getElementById('restaurantName').value;
  const location = document.getElementById('restaurantLocation').value;
  const description = document.getElementById('restaurantDescription').value;
  const imageFile = document.getElementById('restaurantImage').files[0];
  const currentImage = document.getElementById('currentRestaurantImage').value;
  const errorEl = document.getElementById('addRestaurantError');

  const isUpdate = restaurantId !== '';

  // Image is required for new restaurants, optional for updates
  if (!isUpdate && !imageFile) {
    errorEl.textContent = 'Por favor, selecione uma imagem';
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    const body = {
      location,
      description,
    };

    // Only include name for new restaurants
    if (!isUpdate) {
      body.name = name;
    }

    // If there's a new image, convert it to base64
    if (imageFile) {
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      body.image = base64Image;
    } else if (isUpdate) {
      // Keep the existing image if no new one is provided
      body.image = currentImage;
    }

    const url = isUpdate ? `${API_URL}/restaurant/${restaurantId}` : `${API_URL}/restaurant`;
    const method = isUpdate ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Falha ao ${isUpdate ? 'atualizar' : 'adicionar'} restaurante`);
    }

    document.getElementById('addRestaurantModal').classList.add('hidden');
    loadRestaurants(); // Reload to show new/updated restaurant
    alert(isUpdate ? 'Restaurante atualizado com sucesso!' : 'Restaurante adicionado com sucesso!');
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove('hidden');
  }
}

// Menu functions
function toggleMenu(event, restaurantName) {
  event.stopPropagation();

  // Close all other menus
  document.querySelectorAll('.menu-dropdown').forEach((menu) => {
    if (menu.id !== `menu-${restaurantName}`) {
      menu.classList.add('hidden');
    }
  });

  // Toggle current menu
  const menu = document.getElementById(
    `menu-${getRestaurantId(restaurantName)}`,
  );
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

// Close menu when clicking outside
document.addEventListener('click', (event) => {
  if (!event.target.closest('.restaurant-menu')) {
    document.querySelectorAll('.menu-dropdown').forEach((menu) => {
      menu.classList.add('hidden');
    });
  }
});

function getRestaurantId(name) {
  // Generate same ID as backend
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

let restaurantToDelete = null;

function confirmDeleteRestaurant(restaurantName) {
  restaurantToDelete = restaurantName;
  const modal = document.getElementById('deleteConfirmModal');
  const text = document.getElementById('deleteConfirmText');
  text.textContent = `Tem certeza que deseja deletar o restaurante "${restaurantName}"? Esta ação não pode ser desfeita e todas as avaliações associadas serão removidas.`;
  modal.classList.remove('hidden');
}

function closeDeleteConfirmModal() {
  document.getElementById('deleteConfirmModal').classList.add('hidden');
  restaurantToDelete = null;
}

function handleConfirmDelete() {
  if (restaurantToDelete) {
    deleteRestaurant(restaurantToDelete);
    closeDeleteConfirmModal();
  }
}

async function deleteRestaurant(restaurantName) {
  if (!authToken) {
    alert('Por favor, faça login para deletar restaurantes');
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/restaurant/${encodeURIComponent(restaurantName)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Falha ao deletar restaurante');
    }

    alert('Restaurante deletado com sucesso!');
    loadRestaurants(); // Reload restaurants list
  } catch (error) {
    alert(`Erro ao deletar restaurante: ${error.message}`);
  }
}

// Server wake function
function resetServerWakeModal() {
  document.getElementById('serverWakeTitle').textContent = 'Iniciando Servidor';
  document.getElementById('serverWakeMessage').textContent = 'Aguarde, o servidor está inicializando...';
  document.getElementById('serverWakeSubtext').textContent = 'Isso pode levar até 1 minuto.';
  document.getElementById('serverWakeSubtext').classList.remove('hidden');
  document.getElementById('serverSpinner').classList.remove('hidden');
  document.getElementById('serverWakeCloseBtn').classList.add('hidden');
}

async function wakeServer() {
  const modal = document.getElementById('serverWakeModal');
  const title = document.getElementById('serverWakeTitle');
  const message = document.getElementById('serverWakeMessage');
  const subtext = document.getElementById('serverWakeSubtext');
  const spinner = document.getElementById('serverSpinner');
  const closeBtn = document.getElementById('serverWakeCloseBtn');

  modal.classList.remove('hidden');
  resetServerWakeModal();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const response = await fetch(`${API_URL}/`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      // Success state
      title.textContent = 'Servidor Iniciado! ✅';
      message.textContent = 'O servidor está pronto e funcionando.';
      subtext.classList.add('hidden');
      spinner.classList.add('hidden');
      closeBtn.classList.remove('hidden');
      loadRestaurants();
    } else {
      throw new Error('Falha ao conectar com o servidor');
    }
  } catch (error) {
    // Error state
    title.textContent = 'Erro ao Iniciar ❌';
    spinner.classList.add('hidden');
    closeBtn.classList.remove('hidden');

    if (error.name === 'AbortError') {
      message.textContent = 'Tempo esgotado. O servidor pode estar demorando mais que o normal.';
      subtext.textContent = 'Tente novamente em alguns instantes.';
    } else {
      message.textContent = `Erro: ${error.message}`;
      subtext.textContent = 'Verifique sua conexão e tente novamente.';
    }
  }
}
