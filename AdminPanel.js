// --- Supabase Setup ---
const SUPABASE_URL = 'https://hsaxexgydtaeuzbnkezh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzYXhleGd5ZHRhZXV6Ym5rZXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTc2MDMsImV4cCI6MjA3MTUzMzYwM30.STUv9traF7co1P9nd1AHhFaJ3fOKPhytZdvqFqv99SU';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// --- Admin Auth (role-based) ---
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    alert('Access denied. Admins only.');
    window.location.href = 'admin-login.html';
    return false;
  }
  // Check role in profiles table
  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (error || !profile || profile.role !== 'admin') {
    alert('Access denied. Admins only.');
    window.location.href = 'admin-login.html';
    return false;
  }
  return true;
}

// --- Dashboard Stats ---
async function loadDashboardStats() {
  // Users (count from profiles table)
  const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  document.getElementById('total-users').textContent = userCount || 0;
  // Categories
  const { count: catCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });
  document.getElementById('total-categories').textContent = catCount || 0;
  // Subcategories
  const { count: subCount } = await supabase.from('subcategories').select('*', { count: 'exact', head: true });
  document.getElementById('total-subcategories').textContent = subCount || 0;
  // Posts
  const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
  document.getElementById('total-posts').textContent = postCount || 0;
}

// --- Panel Switching ---
function showPanel(panel) {
  ['dashboard','categories','subcategories','users','posts'].forEach(p => {
    document.getElementById('panel-' + p).classList.add('hidden');
  });
  document.getElementById('panel-' + panel).classList.remove('hidden');
}

// --- Category CRUD ---
async function loadCategories() {
  const { data } = await supabase.from('categories').select('*').order('created_at', { ascending: false });
  const tbody = document.querySelector('#categories-table tbody');
  tbody.innerHTML = '';
  data.forEach(cat => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cat.name}<br><span class='text-xs text-gray-400'>${cat.slug}</span></td>
      <td>
        <button onclick="editCategory('${cat.id}','${cat.name}','${cat.slug}','${cat.description || ''}')" class="text-blue-600">Edit</button>
        <button onclick="deleteCategory('${cat.id}')" class="text-red-600 ml-2">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function showCategoryModal(editId = null, name = '') {
  document.getElementById('category-modal').classList.remove('hidden');
  document.getElementById('category-modal-title').textContent = editId ? 'Edit Category' : 'Add Category';
  const nameInput = document.getElementById('category-name-input');
  nameInput.value = name;
  let slugInput = document.getElementById('category-slug-input');
  if (!slugInput) {
    slugInput = document.createElement('input');
    slugInput.id = 'category-slug-input';
    slugInput.type = 'text';
    slugInput.className = 'w-full px-3 py-2 border rounded mb-4';
    slugInput.placeholder = 'Slug';
    nameInput.parentNode.insertBefore(slugInput, nameInput.nextSibling);
  }
  slugInput.value = name ? slugify(name) : '';
  nameInput.oninput = () => {
    if (!editId) slugInput.value = slugify(nameInput.value);
  };
  let descInput = document.getElementById('category-desc-input');
  if (!descInput) {
    descInput = document.createElement('textarea');
    descInput.id = 'category-desc-input';
    descInput.className = 'w-full px-3 py-2 border rounded mb-4';
    descInput.placeholder = 'Description';
    slugInput.parentNode.insertBefore(descInput, slugInput.nextSibling);
  }
  descInput.value = '';
  document.getElementById('save-category-btn').onclick = async () => {
    const newName = nameInput.value.trim();
    const newSlug = slugInput.value.trim();
    const newDesc = descInput.value.trim();
    if (!newName || !newSlug) return;
    if (editId) {
      await supabase.from('categories').update({ name: newName, slug: newSlug, description: newDesc }).eq('id', editId);
    } else {
      await supabase.from('categories').insert({ name: newName, slug: newSlug, description: newDesc });
    }
    hideCategoryModal();
    loadCategories();
    loadSubcategories();
    loadDashboardStats();
  };
}
function hideCategoryModal() {
  document.getElementById('category-modal').classList.add('hidden');
}
async function editCategory(id, name) {
  // Fetch category for slug/desc
  const { data: cat } = await supabase.from('categories').select('*').eq('id', id).single();
  showCategoryModal(id, cat.name, cat.slug, cat.description);
}
async function deleteCategory(id) {
  // Prevent delete if subcategories exist
  const { data: subcats } = await supabase.from('subcategories').select('id').eq('category_id', id);
  if (subcats && subcats.length > 0) {
    alert('Cannot delete: This category has subcategories.');
    return;
  }
  if (confirm('Delete this category?')) {
    await supabase.from('categories').delete().eq('id', id);
    loadCategories();
    loadSubcategories();
    loadDashboardStats();
  }
}
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}


// --- Subcategory CRUD ---
async function loadSubcategories() {
  // Add filter dropdown if not present
  let filter = document.getElementById('subcategory-filter');
  const { data: cats } = await supabase.from('categories').select('*');
  if (!filter) {
    filter = document.createElement('select');
    filter.id = 'subcategory-filter';
    filter.className = 'mb-4 px-2 py-1 border rounded';
    filter.innerHTML = `<option value="">All Categories</option>` + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const table = document.getElementById('subcategories-table');
    table.parentNode.insertBefore(filter, table);
    filter.onchange = () => loadSubcategories(filter.value);
  }
  let query = supabase.from('subcategories').select('*,category:category_id(name)').order('created_at', { ascending: false });
  if (filter && filter.value) query = query.eq('category_id', filter.value);
  const { data } = await query;
  const tbody = document.querySelector('#subcategories-table tbody');
  tbody.innerHTML = '';
  data.forEach(sub => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${sub.name}<br><span class='text-xs text-gray-400'>${sub.slug}</span></td>
      <td>${sub.category?.name || ''}</td>
      <td>
        <button onclick="editSubcategory('${sub.id}','${sub.name}','${sub.slug}','${sub.description || ''}','${sub.category_id}')" class="text-blue-600">Edit</button>
        <button onclick="deleteSubcategory('${sub.id}')" class="text-red-600 ml-2">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
  // Populate select for add/edit
  const select = document.getElementById('subcategory-category-select');
  select.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}
function showSubcategoryModal(editId = null, name = '', catId = '') {
  document.getElementById('subcategory-modal').classList.remove('hidden');
  document.getElementById('subcategory-modal-title').textContent = editId ? 'Edit Sub-category' : 'Add Sub-category';
  const nameInput = document.getElementById('subcategory-name-input');
  nameInput.value = name;
  let slugInput = document.getElementById('subcategory-slug-input');
  if (!slugInput) {
    slugInput = document.createElement('input');
    slugInput.id = 'subcategory-slug-input';
    slugInput.type = 'text';
    slugInput.className = 'w-full px-3 py-2 border rounded mb-4';
    slugInput.placeholder = 'Slug';
    nameInput.parentNode.insertBefore(slugInput, nameInput.nextSibling);
  }
  slugInput.value = name ? slugify(name) : '';
  nameInput.oninput = () => {
    if (!editId) slugInput.value = slugify(nameInput.value);
  };
  let descInput = document.getElementById('subcategory-desc-input');
  if (!descInput) {
    descInput = document.createElement('textarea');
    descInput.id = 'subcategory-desc-input';
    descInput.className = 'w-full px-3 py-2 border rounded mb-4';
    descInput.placeholder = 'Description';
    slugInput.parentNode.insertBefore(descInput, slugInput.nextSibling);
  }
  descInput.value = '';
  const catSelect = document.getElementById('subcategory-category-select');
  catSelect.value = catId;
  document.getElementById('save-subcategory-btn').onclick = async () => {
    const newName = nameInput.value.trim();
    const newSlug = slugInput.value.trim();
    const newDesc = descInput.value.trim();
    const newCatId = catSelect.value;
    if (!newName || !newSlug || !newCatId) return;
    if (editId) {
      await supabase.from('subcategories').update({ name: newName, slug: newSlug, description: newDesc, category_id: newCatId }).eq('id', editId);
    } else {
      await supabase.from('subcategories').insert({ name: newName, slug: newSlug, description: newDesc, category_id: newCatId });
    }
    hideSubcategoryModal();
    loadSubcategories();
    loadDashboardStats();
  };
}
function hideSubcategoryModal() {
  document.getElementById('subcategory-modal').classList.add('hidden');
}
async function editSubcategory(id, name, catId) {
  // Fetch subcategory for slug/desc
  const { data: sub } = await supabase.from('subcategories').select('*').eq('id', id).single();
  showSubcategoryModal(id, sub.name, sub.slug, sub.description, sub.category_id);
}
async function deleteSubcategory(id) {
  if (confirm('Delete this sub-category?')) {
    await supabase.from('subcategories').delete().eq('id', id);
    loadSubcategories();
    loadDashboardStats();
  }
}

// --- User Management ---
async function loadUsers() {
  // List users from profiles table
  const { data: users, error } = await supabase.from('profiles').select('*');
  const tbody = document.querySelector('#users-table tbody');
  tbody.innerHTML = '';
  if (error) {
    tbody.innerHTML = `<tr><td colspan='4' class='text-red-600'>Failed to load users: ${error.message}</td></tr>`;
    return;
  }
  for (const user of users || []) {
    const isBlocked = user.is_blocked;
    const status = isBlocked ? 'Blocked' : 'Active';
    const banBtn = isBlocked
      ? `<span class='text-gray-400'>Banned</span>`
      : `<button onclick="banUser('${user.id}')" class="text-red-600">Ban</button>`;
    const blockBtn = isBlocked
      ? `<button onclick="unblockUser('${user.id}')" class="text-green-600">Unblock</button>`
      : `<button onclick="blockUser('${user.id}')" class="text-yellow-600">Block</button>`;
    tbody.innerHTML += `<tr>
      <td>
        <div><strong>${user.full_name || '-'}</strong></div>
        <div class='text-xs text-gray-500'>@${user.username || '-'}</div>
        <div class='text-xs text-gray-400'>-</div>
      </td>
      <td>${status}</td>
      <td>${banBtn} ${blockBtn} <button onclick="deleteUser('${user.id}')" class="text-red-600 ml-2" disabled title='Delete disabled. Use Admin API.'>Delete</button></td>
    </tr>`;
  }
}
async function blockUser(id) {
  await supabase.from('profiles').update({ is_blocked: true }).eq('id', id);
  loadUsers();
}
async function unblockUser(id) {
  await supabase.from('profiles').update({ is_blocked: false }).eq('id', id);
  loadUsers();
}
async function banUser(id) {
  await supabase.from('profiles').update({ is_blocked: true }).eq('id', id);
  alert('User has been banned.');
  loadUsers();
}
async function deleteUser(id) {
  alert('User deletion requires Supabase Admin API. This action is disabled for security.');
}

// --- Post Management ---
async function loadPosts() {
  // Add filter dropdowns if not present
  let statusFilter = document.getElementById('post-status-filter');
  let catFilter = document.getElementById('post-category-filter');
  let subcatFilter = document.getElementById('post-subcategory-filter');
  let searchInput = document.getElementById('post-title-search');
  const { data: cats } = await supabase.from('categories').select('*');
  const { data: subcats } = await supabase.from('subcategories').select('*');
  if (!statusFilter) {
    statusFilter = document.createElement('select');
    statusFilter.id = 'post-status-filter';
    statusFilter.className = 'mb-2 px-2 py-1 border rounded mr-2';
    statusFilter.innerHTML = `<option value="">All Statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>`;
    const table = document.getElementById('posts-table');
    table.parentNode.insertBefore(statusFilter, table);
    statusFilter.onchange = loadPosts;
  }
  if (!catFilter) {
    catFilter = document.createElement('select');
    catFilter.id = 'post-category-filter';
    catFilter.className = 'mb-2 px-2 py-1 border rounded mr-2';
    catFilter.innerHTML = `<option value="">All Categories</option>` + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const table = document.getElementById('posts-table');
    table.parentNode.insertBefore(catFilter, table);
    catFilter.onchange = loadPosts;
  }
  if (!subcatFilter) {
    subcatFilter = document.createElement('select');
    subcatFilter.id = 'post-subcategory-filter';
    subcatFilter.className = 'mb-2 px-2 py-1 border rounded mr-2';
    subcatFilter.innerHTML = `<option value="">All Subcategories</option>` + subcats.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const table = document.getElementById('posts-table');
    table.parentNode.insertBefore(subcatFilter, table);
    subcatFilter.onchange = loadPosts;
  }
  if (!searchInput) {
    searchInput = document.createElement('input');
    searchInput.id = 'post-title-search';
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by title...';
    searchInput.className = 'mb-2 px-2 py-1 border rounded mr-2';
    const table = document.getElementById('posts-table');
    table.parentNode.insertBefore(searchInput, table);
    searchInput.oninput = loadPosts;
  }
  // FIX: Remove author join, just select * from posts
  let query = supabase.from('posts').select('*').order('created_at', { ascending: false });
  if (statusFilter && statusFilter.value) query = query.eq('status', statusFilter.value);
  if (catFilter && catFilter.value) query = query.eq('category_id', catFilter.value);
  if (subcatFilter && subcatFilter.value) query = query.eq('subcategory_id', subcatFilter.value);
  if (searchInput && searchInput.value) query = query.ilike('title', `%${searchInput.value}%`);
  const { data } = await query;
  const tbody = document.querySelector('#posts-table tbody');
  tbody.innerHTML = '';
  if (!data) return;
  data.forEach(post => {
    tbody.innerHTML += `<tr>
      <td><input type='checkbox' class='post-bulk' value='${post.id}'/> ${post.title}</td>
      <td>${post.author_id || ''}</td>
      <td>${post.status || 'pending'}</td>
      <td>
        <button onclick="approvePost('${post.id}')" class="text-green-600">Approve</button>
        <button onclick="rejectPost('${post.id}')" class="text-yellow-600 ml-2">Reject</button>
        <button onclick="deletePost('${post.id}')" class="text-red-600 ml-2">Delete</button>
      </td></tr>`;
  });
  // Bulk actions
  let bulkDiv = document.getElementById('post-bulk-actions');
  if (!bulkDiv) {
    bulkDiv = document.createElement('div');
    bulkDiv.id = 'post-bulk-actions';
    bulkDiv.className = 'mb-2';
    bulkDiv.innerHTML = `<button id='bulk-approve' class='bg-green-500 text-white px-2 py-1 rounded mr-2'>Bulk Approve</button><button id='bulk-reject' class='bg-yellow-500 text-white px-2 py-1 rounded'>Bulk Reject</button>`;
    tbody.parentNode.parentNode.insertBefore(bulkDiv, tbody.parentNode);
    document.getElementById('bulk-approve').onclick = async () => {
      const ids = Array.from(document.querySelectorAll('.post-bulk:checked')).map(cb => cb.value);
      if (ids.length) {
        await supabase.from('posts').update({ status: 'approved' }).in('id', ids);
        loadPosts();
      }
    };
    document.getElementById('bulk-reject').onclick = async () => {
      const ids = Array.from(document.querySelectorAll('.post-bulk:checked')).map(cb => cb.value);
      if (ids.length) {
        await supabase.from('posts').update({ status: 'rejected' }).in('id', ids);
        loadPosts();
      }
    };
  }
}
async function approvePost(id) {
  await supabase.from('posts').update({ status: 'approved' }).eq('id', id);
  loadPosts();
}
async function rejectPost(id) {
  await supabase.from('posts').update({ status: 'rejected' }).eq('id', id);
  loadPosts();
}
async function deletePost(id) {
  if (confirm('Delete this post?')) {
    await supabase.from('posts').delete().eq('id', id);
    loadPosts();
    loadDashboardStats();
  }
}

// --- Search/Filter ---
function handleSearch() {
  const q = document.getElementById('admin-search').value.toLowerCase();
  ['categories-table','subcategories-table','users-table','posts-table'].forEach(id => {
    const rows = document.querySelectorAll(`#${id} tbody tr`);
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

// --- Logout ---
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
});

// --- Modal Hide on Outside Click ---
document.addEventListener('click', (e) => {
  if (e.target.id === 'category-modal') hideCategoryModal();
  if (e.target.id === 'subcategory-modal') hideSubcategoryModal();
});

// --- Init ---
window.showPanel = showPanel;
window.showCategoryModal = showCategoryModal;
window.hideCategoryModal = hideCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.showSubcategoryModal = showSubcategoryModal;
window.hideSubcategoryModal = hideSubcategoryModal;
window.editSubcategory = editSubcategory;
window.deleteSubcategory = deleteSubcategory;
window.handleSearch = handleSearch;
window.banUser = banUser;

(async function init() {
  if (!await requireAdmin()) return;
  showPanel('dashboard');
  await loadDashboardStats();
  await loadCategories();
  await loadSubcategories();
  await loadUsers();
  await loadPosts();
})();
