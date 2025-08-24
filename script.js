// --- Supabase Setup ---
const SUPABASE_URL = 'https://hsaxexgydtaeuzbnkezh.supabase.co'; // Replace with your Supabase project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzYXhleGd5ZHRhZXV6Ym5rZXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTc2MDMsImV4cCI6MjA3MTUzMzYwM30.STUv9traF7co1P9nd1AHhFaJ3fOKPhytZdvqFqv99SU'; // Updated anon key
const supabase = (window.supabase || window.Supabase) ? (window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : window.Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)) : null;

// --- Supabase: Fetch Threads ---
async function fetchThreadsFromSupabase() {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Supabase fetch threads error:', error);
        return [];
    }
    return data;
}

// --- Supabase: Post New Thread ---
async function postThreadToSupabase({ title, description, author_id, tags }) {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('posts')
        .insert([{ title, content: description, author_id }])
        .select();
    if (error) {
        console.error('Supabase post thread error:', error);
        return null;
    }
    return data[0];
}

// --- Supabase: Fetch Comments for a Thread ---
async function fetchCommentsFromSupabase(thread_id) {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('thread_id', thread_id)
        .order('created_at', { ascending: true });
    if (error) {
        console.error('Supabase fetch comments error:', error);
        return [];
    }
    return data;
}

// --- Supabase: Post New Comment ---
// --- Supabase: Post New Comment or Reply (supports parent_id) ---
async function postCommentToSupabase({ thread_id, author_id, text, parent_id = null }) {
    if (!supabase) return null;
    const insertObj = { thread_id, author_id, text };
    if (parent_id) insertObj.parent_id = parent_id;
    const { data, error } = await supabase
        .from('comments')
        .insert([insertObj])
        .select();
    if (error) {
        console.error('Supabase post comment error:', error);
        return null;
    }
    return data[0];
}

// ...existing code...
// fetchThreadsFromSupabase().then(threads => console.log(threads));
// postThreadToSupabase({ title: 'New Thread', description: '...', author_id: '...', tags: ['js'] });
// fetchCommentsFromSupabase(threadId).then(comments => ...);
// postCommentToSupabase({ thread_id, author_id, text: '...' });
const BACKEND_URL = 'http://localhost:3000'; // Adjust this for deployment

document.addEventListener('DOMContentLoaded', async function() {
    // --- Collaboration/Project Posting Logic ---
    const collabForm = document.querySelector('form[action="/create-collaboration"]') || document.querySelector('form.p-6');
    if (collabForm && window.location.pathname.includes('create-collaboration.html')) {
        collabForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            // Collect form data
            const title = collabForm.querySelector('input[name="title"]')?.value?.trim();
            const description = window.quill ? window.quill.root.innerHTML : '';
            const type = collabForm.querySelector('input[name="project-type"]:checked')?.value;
            const deadline = collabForm.querySelector('input[name="deadline"]')?.value;
            const skills = Array.from(document.querySelectorAll('#skill-container .tag-item')).map(el => el.textContent.replace('×','').trim());
            const contact = collabForm.querySelector('input[name="contact"]')?.value?.trim();
            if (!title || !description || !type || !deadline) {
                showNotification('Please fill all required fields', 'error');
                return;
            }
            // Insert into Supabase
            const { data, error } = await supabase.from('projects').insert([{
                title,
                description,
                type,
                deadline,
                skills,
                contact
            }]);
            if (error) {
                showNotification('Failed to post project: ' + error.message, 'error');
            } else {
                showNotification('Project posted successfully!', 'success');
                setTimeout(() => { window.location.href = 'collaborations.html'; }, 1200);
            }
        });
    }
    // Right sidebar Ask a Question button (more robust selector)
    const sidebarAskBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent && btn.textContent.trim().toLowerCase().includes('ask a question') && btn.className.includes('bg-blue-600')
    );
    if (sidebarAskBtn) {
        sidebarAskBtn.addEventListener('click', function() {
            window.location.href = 'post-thread.html';
        });
    }
    // --- Logout button logic ---
    function setupLogoutBtn() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = async () => {
                await supabase.auth.signOut();
                window.location.href = 'login.html';
            };
        }
        // Profile dropdown toggle
        const profileAvatarBtn = document.getElementById('profileAvatarBtn');
        const profileDropdown = document.getElementById('profileDropdown');
        if (profileAvatarBtn && profileDropdown) {
            profileAvatarBtn.onclick = (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('hidden');
            };
            document.addEventListener('click', (e) => {
                if (!profileDropdown.classList.contains('hidden')) {
                    profileDropdown.classList.add('hidden');
                }
            });
        }
    }
    setupLogoutBtn();
    // --- Show/hide profile menu based on auth state ---
    async function updateProfileMenu() {
        const { data: { user } } = await supabase.auth.getUser();
        const profileMenu = document.getElementById('user-profile-menu');
        const loginBtn = document.getElementById('loginNavBtn');
        const signupBtn = document.getElementById('signupNavBtn');
        if (user) {
            if (profileMenu) profileMenu.classList.remove('hidden');
            if (loginBtn) loginBtn.classList.add('hidden');
            if (signupBtn) signupBtn.classList.add('hidden');
        } else {
            if (profileMenu) profileMenu.classList.add('hidden');
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (signupBtn) signupBtn.classList.remove('hidden');
        }
    }
    updateProfileMenu();
    // Listen for auth state changes
    if (supabase && supabase.auth) {
        supabase.auth.onAuthStateChange(updateProfileMenu);
    }
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (mobileMenu && !mobileMenu.contains(event.target) && !mobileMenuButton.contains(event.target)) {
            mobileMenu.classList.add('hidden');
        }
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Enhanced card hover effects
    const cards = document.querySelectorAll('.card-hover');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
            this.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
        });
    });

    // Thread voting functionality
    const voteButtons = document.querySelectorAll('[data-vote]');
    voteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const voteType = this.dataset.vote;
            const countElement = this.querySelector('span');
            let currentCount = parseInt(countElement.textContent);
            
            // Toggle vote state
            if (this.classList.contains('voted')) {
                this.classList.remove('voted');
                currentCount--;
            } else {
                this.classList.add('voted');
                currentCount++;
            }
            
            countElement.textContent = currentCount;
            
            // Visual feedback
            if (voteType === 'up') {
                this.classList.toggle('text-blue-600');
            } else {
                this.classList.toggle('text-red-600');
            }
        });
    });

    // Search functionality
    const searchInputs = document.querySelectorAll('input[type="text"][placeholder*="Search"]');
    searchInputs.forEach(input => {
        input.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const searchableItems = document.querySelectorAll('.searchable-item');
            
            searchableItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // Form validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('border-red-500');
                    
                    // Remove error styling after user starts typing
                    field.addEventListener('input', function() {
                        this.classList.remove('border-red-500');
                    });
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                showNotification('Please fill in all required fields', 'error');
            }
        });
    });

    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });

    // Notification system
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
        
        switch(type) {
            case 'success':
                notification.classList.add('bg-green-500', 'text-white');
                break;
            case 'error':
                notification.classList.add('bg-red-500', 'text-white');
                break;
            case 'warning':
                notification.classList.add('bg-yellow-500', 'text-white');
                break;
            default:
                notification.classList.add('bg-blue-500', 'text-white');
        }
        
        notification.innerHTML = `
            <div class="flex items-center">
                <span>${message}</span>
                <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    // Make showNotification globally available
    window.showNotification = showNotification;

    // Tag functionality for forms with tags
    function initializeTagInput(inputId, containerId) {
        const input = document.getElementById(inputId);
        const container = document.getElementById(containerId);
        
        if (!input || !container) return;
        
        const tags = [];
        
        function addTag(tagText) {
            if (tagText.trim() && !tags.includes(tagText.trim())) {
                tags.push(tagText.trim());
                renderTags();
                input.value = '';
            }
        }
        
        function removeTag(tagText) {
            const index = tags.indexOf(tagText);
            if (index > -1) {
                tags.splice(index, 1);
                renderTags();
            }
        }
        
        function renderTags() {
            const existingTags = container.querySelectorAll('.tag-item');
            existingTags.forEach(tag => tag.remove());
            
            tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag-item';
                tagElement.innerHTML = `
                    ${tag}
                    <span class="tag-remove" onclick="removeTag('${tag}')">&times;</span>
                `;
                container.insertBefore(tagElement, input);
            });
        }
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag(input.value);
            } else if (e.key === 'Backspace' && input.value === '' && tags.length > 0) {
                removeTag(tags[tags.length - 1]);
            }
        });
        
        // Make functions globally available
        window.addTag = addTag;
        window.removeTag = removeTag;
    }

    // Thread interaction functionality
    const replyButtons = document.querySelectorAll('[data-action="reply"]');
    replyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const commentId = this.dataset.commentId;
            const replyForm = document.getElementById(`reply-form-${commentId}`);
            if (replyForm) {
                replyForm.classList.toggle('hidden');
            }
        });
    });

    // Load more functionality
    const loadMoreButtons = document.querySelectorAll('[data-action="load-more"]');
    loadMoreButtons.forEach(button => {
        button.addEventListener('click', function() {
            const loader = this.querySelector('.loader');
            const text = this.querySelector('.text');
            
            if (loader) loader.classList.remove('hidden');
            if (text) text.textContent = 'Loading...';
            
            // Simulate loading
            setTimeout(() => {
                if (loader) loader.classList.add('hidden');
                if (text) text.textContent = 'Load More';
                showNotification('More content loaded successfully', 'success');
            }, 1500);
        });
    });

    // Filter functionality
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterValue = this.dataset.filter;
            const items = document.querySelectorAll('[data-category]');
            
            // Update active filter button
            filterButtons.forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-100', 'text-gray-600');
            });
            this.classList.add('bg-blue-600', 'text-white');
            this.classList.remove('bg-gray-100', 'text-gray-600');
            
            // Filter items
            items.forEach(item => {
                if (filterValue === 'all' || item.dataset.category === filterValue) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // Bookmark functionality
    const bookmarkButtons = document.querySelectorAll('[data-action="bookmark"]');
    bookmarkButtons.forEach(button => {
        button.addEventListener('click', function() {
            const icon = this.querySelector('i');
            const isBookmarked = this.classList.contains('bookmarked');
            
            if (isBookmarked) {
                this.classList.remove('bookmarked');
                icon.setAttribute('data-lucide', 'bookmark');
                showNotification('Removed from bookmarks', 'info');
            } else {
                this.classList.add('bookmarked');
                icon.setAttribute('data-lucide', 'bookmark-check');
                showNotification('Added to bookmarks', 'success');
            }
            
            // Refresh Lucide icons
            lucide.createIcons();
        });
    });

    // Copy link functionality
    const shareButtons = document.querySelectorAll('[data-action="share"]');
    shareButtons.forEach(button => {
        button.addEventListener('click', function() {
            navigator.clipboard.writeText(window.location.href).then(() => {
                showNotification('Link copied to clipboard', 'success');
            }).catch(() => {
                showNotification('Failed to copy link', 'error');
            });
        });
    });

    // Enhanced keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Press '/' to focus search
        if (e.key === '/' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Press 'Escape' to close modals or mobile menu
        if (e.key === 'Escape') {
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
            }
        }
    });

    // Lazy loading for images
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));

    // Theme toggle functionality (if implemented)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
        
        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        }
    }

    // Auto-save functionality for forms
    const formInputs = document.querySelectorAll('input, textarea, select');
    formInputs.forEach(input => {
        const saveKey = `form_${input.name || input.id}_${window.location.pathname}`;
        
        // Load saved value
        const savedValue = localStorage.getItem(saveKey);
        if (savedValue && input.type !== 'password') {
            input.value = savedValue;
        }
        
        // Save on change
        input.addEventListener('input', function() {
            if (this.type !== 'password') {
                localStorage.setItem(saveKey, this.value);
            }
        });
    });

    // Clear saved form data on successful submission
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                const saveKey = `form_${input.name || input.id}_${window.location.pathname}`;
                localStorage.removeItem(saveKey);
            });
        });
    });

    // Forum Categories and Subcategories functionality
    let allCategoriesData = []; // To store fetched categories globally

    async function fetchCategories() {
        try {
            // Fetch categories and subcategories from Supabase
            const { data: categories, error: catError } = await supabase.from('categories').select('*').order('created_at', { ascending: false });
            const { data: subcategories, error: subError } = await supabase.from('subcategories').select('*');
            if (catError || subError) throw new Error(catError?.message || subError?.message);
            // Attach subcategories to categories
            const categoriesWithSubs = categories.map(cat => ({
                ...cat,
                subcategories: subcategories.filter(sub => sub.category_id === cat.id)
            }));
            allCategoriesData = categoriesWithSubs;
            renderCategoriesInPanel(allCategoriesData);
        } catch (error) {
            console.error('Error fetching categories:', error);
            showNotification('Failed to load categories.', 'error');
        }
    }

    function renderCategoriesInPanel(categories) {
        const forumCategoriesContainer = document.getElementById('forum-categories');
        if (!forumCategoriesContainer) return;
        forumCategoriesContainer.innerHTML = ''; // Clear existing static categories

        categories.forEach(category => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="#" class="flex items-center text-gray-700 hover:text-blue-600 font-medium py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors category-item" data-category-id="${category.id}" data-category-name="${category.name}">
                    <i data-lucide="chevron-right" class="h-4 w-4 mr-2 category-icon"></i>
                    ${category.name}
                </a>
                <ul id="subcategories-${category.id}" class="ml-6 mt-1 space-y-1 hidden">
                    ${category.subcategories.map(subcat => `
                        <li>
                            <a href="#" class="flex items-center text-gray-600 hover:text-blue-600 py-1 px-2 rounded-lg hover:bg-gray-50 transition-colors subcategory-item" data-category-id="${category.id}" data-subcategory-id="${subcat.id}" data-subcategory-name="${subcat.name}">
                                ${subcat.name}
                            </a>
                        </li>
                    `).join('')}
                </ul>
            `;
            forumCategoriesContainer.appendChild(li);
        });
        lucide.createIcons(); // Re-initialize lucide icons for new elements
    }

    // Event listener for main categories to toggle subcategories and rotate icon
    const forumCategoriesElem = document.getElementById('forum-categories');
    if (forumCategoriesElem) {
        forumCategoriesElem.addEventListener('click', function(e) {
        const categoryItem = e.target.closest('.category-item');
        if (categoryItem) {
            e.preventDefault();
            const categoryId = categoryItem.dataset.categoryId;
            const subcategoriesList = document.getElementById(`subcategories-${categoryId}`);
            const icon = categoryItem.querySelector('.category-icon');

            if (subcategoriesList) {
                subcategoriesList.classList.toggle('hidden');
                icon.classList.toggle('rotate-90');
            }
            // Fetch threads for the main category when clicked
            fetchAndRenderThreads(categoryId);
        }

        const subcategoryItem = e.target.closest('.subcategory-item');
        if (subcategoryItem) {
            e.preventDefault();
            const categoryId = subcategoryItem.dataset.categoryId;
            const subcategoryId = subcategoryItem.dataset.subcategoryId;
            console.log(`Selected Category ID: ${categoryId}, Subcategory ID: ${subcategoryId}`);
            // Update active styling for subcategory items
            document.querySelectorAll('.subcategory-item').forEach(item => {
                item.classList.remove('bg-blue-100', 'text-blue-800');
            });
            subcategoryItem.classList.add('bg-blue-100', 'text-blue-800');
            // Fetch threads for the selected subcategory
            fetchAndRenderThreads(categoryId, subcategoryId);
        }
    });
    }

    async function fetchAndRenderThreads(categoryId = null, subcategoryId = null) {
        // Helper: Fetch user profiles for all unique author_ids
        async function fetchUserProfiles(authorIds) {
            if (!authorIds.length) return {};
            let { data: profiles, error } = await supabase
                .from('profiles')
                .select('id, username, name')
                .in('id', authorIds);
            if (error || !profiles) profiles = [];
            const map = {};
            profiles.forEach(p => {
                map[p.id] = p.username || p.name || p.id;
            });
            return map;
        }
        const threadListContainer = document.getElementById('thread-list');
        if (!threadListContainer) return;
        threadListContainer.innerHTML = '<div class="p-4 text-center text-gray-500">Loading threads...</div>';

        // Show Ask a Question button if subcategory is selected
        let askQuestionBtnHTML = '';
        if (categoryId && subcategoryId) {
            askQuestionBtnHTML = `
                <div class="mb-4 flex justify-end">
                    <button id="ask-question-btn" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold flex items-center transition-colors">
                        <i data-lucide="edit" class="h-5 w-5 mr-2"></i>
                        Ask a Question
                    </button>
                </div>
            `;
        }

        try {
            let threads = await fetchThreadsFromSupabase();
            // Filter by category and subcategory if provided
            if (categoryId) {
                threads = threads.filter(t => String(t.category_id) === String(categoryId));
            }
            if (subcategoryId) {
                threads = threads.filter(t => String(t.subcategory_id) === String(subcategoryId));
            }

            // Insert Ask a Question button if needed
            threadListContainer.innerHTML = askQuestionBtnHTML;

            if (!threads || threads.length === 0) {
                threadListContainer.innerHTML += '<div class="p-4 text-center text-gray-500">No threads found for this selection.</div>';
                return;
            }

            // Collect all unique author_ids
            const authorIds = Array.from(new Set(threads.map(t => t.author_id).filter(Boolean)));
            const userProfileMap = await fetchUserProfiles(authorIds);

            threads.forEach(thread => {
                // Map fields for UI (fallbacks for missing fields)
                const title = thread.title || '(No Title)';
                const description = thread.content || '';
                const author = userProfileMap[thread.author_id] || thread.author_id || 'Anonymous';
                const createdAt = thread.created_at ? new Date(thread.created_at) : new Date();
                const timeAgo = timeAgoString(createdAt);
                // Optionally, fetch category/subcategory names if needed
                // For now, just show IDs
                const categoryName = thread.category_id || '';
                const subcategoryName = thread.subcategory_id || '';
                // Dummy values for replies/views/solved
                const replies = thread.replies || 0;
                const views = thread.views || 0;
                const solved = thread.status === 'solved';

                const threadDiv = document.createElement('div');
                threadDiv.className = 'border border-gray-200 rounded-lg p-4 card-hover cursor-pointer';
                threadDiv.innerHTML = `
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <span class='bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium'>${categoryName}</span>
                                ${subcategoryName ? `<span class='bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs font-medium'>${subcategoryName}</span>` : ''}
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">${title}</h3>
                            <p class="text-gray-600 text-sm mb-3">${description}</p>
                            <div class="flex items-center text-sm text-gray-500 space-x-4">
                                <div class="flex items-center">
                                    <i data-lucide="user" class="h-4 w-4 mr-1"></i>
                                    by ${author}
                                </div>
                                <div class="flex items-center">
                                    <i data-lucide="clock" class="h-4 w-4 mr-1"></i>
                                    ${timeAgo}
                                </div>
                                <div class="flex items-center">
                                    <i data-lucide="eye" class="h-4 w-4 mr-1"></i>
                                    ${views} views
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col items-center space-y-2 ml-4">
                            <div class="flex items-center bg-blue-50 px-3 py-1 rounded-lg">
                                <i data-lucide="message-circle" class="h-4 w-4 text-blue-600 mr-1"></i>
                                <span class="text-blue-600 font-medium">${replies}</span>
                            </div>
                            <div class="flex items-center ${solved ? 'text-green-600' : 'text-yellow-600'}">
                                <i data-lucide="${solved ? 'check-circle' : 'help-circle'}" class="h-4 w-4 mr-1"></i>
                                <span class="text-xs">${solved ? 'Solved' : 'Open'}</span>
                            </div>
                        </div>
                    </div>
                `;
                threadDiv.addEventListener('click', () => {
                    window.location.href = `thread.html?id=${thread.id}`;
                });
                threadListContainer.appendChild(threadDiv);
            });
            lucide.createIcons(); // Re-initialize lucide icons for new elements

            // Add event listener for Ask a Question button
            if (categoryId && subcategoryId) {
                const askBtn = document.getElementById('ask-question-btn');
                if (askBtn) {
                    askBtn.addEventListener('click', () => {
                        // Redirect to post-thread.html with category and subcategory as query params
                        window.location.href = `post-thread.html?category_id=${categoryId}&subcategory_id=${subcategoryId}`;
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching and rendering threads:', error);
            threadListContainer.innerHTML = '<div class="p-4 text-center text-red-500">Failed to load threads. Please try again later.</div>';
        }
    }

    // Helper: time ago string
    function timeAgoString(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';
        interval = Math.floor(seconds / 60);
        if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';
        return 'just now';
    }
    
    // Initial load
    fetchCategories();
    fetchAndRenderThreads(); // Load all threads initially
    
    console.log('LearnHub Forum initialized successfully!');
});
