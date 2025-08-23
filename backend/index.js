require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const { Pool } = require('pg'); // Import Pool from pg
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000; // Use environment variable for PORT

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

// PostgreSQL Connection Pool
const pool = new Pool({
    user: process.env.DB_USER || 'user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'learnhub',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err); // Log errors from the pool
    process.exit(-1); // Exit process if client is not connected
});

async function initializeDb() {
    try {
        const client = await pool.connect();
        console.log('Connected to the LearnHub PostgreSQL database.');

        // Create tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS subcategories (
                id SERIAL PRIMARY KEY,
                category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                UNIQUE (category_id, name)
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS threads (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                author VARCHAR(255) NOT NULL,
                timeAgo VARCHAR(50) NOT NULL,
                views INTEGER DEFAULT 0,
                replies INTEGER DEFAULT 0,
                solved BOOLEAN DEFAULT FALSE,
                category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL
            );
        `);

        // Populate initial data if tables are empty
        const resCategories = await client.query("SELECT COUNT(*) FROM categories");
        if (parseInt(resCategories.rows[0].count) === 0) {
            console.log('Populating initial categories.');
            const categoryNames = ['FY', 'SY', 'TY', 'LY', 'Placements', 'Internships'];
            for (const name of categoryNames) {
                await client.query("INSERT INTO categories (name) VALUES ($1)", [name]);
            }
            console.log('Initial categories populated.');
            await populateInitialSubcategories(client);
            await populateInitialThreads(client);
        }
        client.release();
    } catch (err) {
        console.error('Error initializing database:', err);
        process.exit(1); // Exit if database initialization fails
    }
}

async function populateInitialSubcategories(client) {
    const subcategoriesMap = {
        FY: ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL'],
        SY: ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL'],
        TY: ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL'],
        LY: ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL'],
        Placements: ['Software', 'Core', 'Analytics', 'Consulting'],
        Internships: ['Software Dev', 'Data Science', 'Marketing', 'HR']
    };

    const categoriesRes = await client.query("SELECT id, name FROM categories");
    const categories = categoriesRes.rows;

    for (const category of categories) {
        const categoryId = category.id;
        const categoryName = category.name;
        const subcategories = subcategoriesMap[categoryName];

        if (subcategories && subcategories.length > 0) {
            for (const subcatName of subcategories) {
                const existingSubcat = await client.query("SELECT COUNT(*) FROM subcategories WHERE category_id = $1 AND name = $2", [categoryId, subcatName]);
                if (parseInt(existingSubcat.rows[0].count) === 0) {
                    await client.query("INSERT INTO subcategories (category_id, name) VALUES ($1, $2)", [categoryId, subcatName]);
                }
            }
        }
    }
    console.log('Initial subcategories population initiated.');
}

async function populateInitialThreads(client) {
    const dummyThreads = [
        {
            title: "How to get started with Web Development in FY?",
            description: "Looking for resources and guidance for web development as a first-year student.",
            author: "Alice Smith",
            timeAgo: "2 hours ago",
            views: 120,
            replies: 15,
            solved: false,
            categoryName: "FY",
            subcategoryName: "CSE"
        },
        {
            title: "Best practices for Competitive Programming in SY",
            description: "Seeking advice on improving competitive programming skills during second year.",
            author: "Bob Johnson",
            timeAgo: "1 day ago",
            views: 250,
            replies: 30,
            solved: true,
            categoryName: "SY",
            subcategoryName: "CSE"
        },
        {
            title: "Tips for cracking FAANG placements",
            description: "Experienced individuals, please share your journey and tips for placement preparation.",
            author: "Charlie Brown",
            timeAgo: "3 days ago",
            views: 500,
            replies: 50,
            solved: false,
            categoryName: "Placements",
            subcategoryName: "Software"
        },
        {
            title: "How to ace your first internship interview?",
            description: "Any advice on preparing for my first technical internship interview?",
            author: "Diana Prince",
            timeAgo: "5 days ago",
            views: 300,
            replies: 20,
            solved: false,
            categoryName: "Internships",
            subcategoryName: "Software Dev"
        }
    ];

    const resThreads = await client.query("SELECT COUNT(*) FROM threads");
    if (parseInt(resThreads.rows[0].count) === 0) {
        for (const thread of dummyThreads) {
            const categoryRes = await client.query("SELECT id FROM categories WHERE name = $1", [thread.categoryName]);
            const categoryRow = categoryRes.rows[0];

            if (categoryRow) {
                const categoryId = categoryRow.id;
                const subcategoryRes = await client.query("SELECT id FROM subcategories WHERE name = $1 AND category_id = $2", [thread.subcategoryName, categoryId]);
                const subcategoryRow = subcategoryRes.rows[0];

                if (subcategoryRow) {
                    const subcategoryId = subcategoryRow.id;
                    await client.query("INSERT INTO threads (title, description, author, timeAgo, views, replies, solved, category_id, subcategory_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                        [thread.title, thread.description, thread.author, thread.timeAgo, thread.views, thread.replies, thread.solved, categoryId, subcategoryId]
                    );
                }
            }
        }
        console.log('Initial threads populated.');
    }
}

// Call initializeDb before starting the server
initializeDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});

// API Endpoints

// Get all categories with their subcategories
app.get('/api/categories', async (req, res) => {
    try {
        const categoriesRes = await pool.query("SELECT id, name FROM categories");
        const categories = categoriesRes.rows;

        const categoriesWithSubcategories = [];
        for (const category of categories) {
            const subcategoriesRes = await pool.query("SELECT id, name FROM subcategories WHERE category_id = $1", [category.id]);
            categoriesWithSubcategories.push({ ...category, subcategories: subcategoriesRes.rows });
        }
        res.json(categoriesWithSubcategories);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get forum threads with optional category and subcategory filters
app.get('/api/threads', async (req, res) => {
    const { category_id, subcategory_id } = req.query;
    let sql = `SELECT 
                    t.id, t.title, t.description, t.author, t.timeAgo, t.views, t.replies, t.solved,
                    c.name as categoryName,
                    s.name as subcategoryName
                FROM threads t
                JOIN categories c ON t.category_id = c.id
                LEFT JOIN subcategories s ON t.subcategory_id = s.id`;
    const params = [];
    let whereClauses = [];
    let paramIndex = 1;

    if (category_id) {
        whereClauses.push(`t.category_id = $${paramIndex++}`);
        params.push(category_id);
    }
    if (subcategory_id) {
        whereClauses.push(`t.subcategory_id = $${paramIndex++}`);
        params.push(subcategory_id);
    }

    if (whereClauses.length > 0) {
        sql += ` WHERE ` + whereClauses.join(' AND ');
    }

    try {
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching threads:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin API to add a new category
app.post('/api/admin/categories', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
    }
    try {
        const result = await pool.query("INSERT INTO categories (name) VALUES ($1) RETURNING id, name", [name]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique violation error code for PostgreSQL
            return res.status(409).json({ error: 'Category with this name already exists' });
        }
        console.error('Error adding category:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin API to add a new subcategory to a category
app.post('/api/admin/subcategories', async (req, res) => {
    const { category_id, name } = req.body;
    if (!category_id || !name) {
        return res.status(400).json({ error: 'Category ID and subcategory name are required' });
    }
    try {
        // Check if category exists
        const categoryCheck = await pool.query("SELECT id FROM categories WHERE id = $1", [category_id]);
        if (categoryCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const result = await pool.query("INSERT INTO subcategories (category_id, name) VALUES ($1, $2) RETURNING id, category_id, name", [category_id, name]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique violation error code for PostgreSQL (for UNIQUE (category_id, name))
            return res.status(409).json({ error: 'Subcategory with this name already exists in this category' });
        }
        console.error('Error adding subcategory:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
