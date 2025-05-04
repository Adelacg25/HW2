const express = require('express');
const mysql = require('mysql2/promise'); 
const path = require('path');

const app = express();
const PORT = 3000;

// Setup EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Setup static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Connect to MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',        
    password: 'mintfeelings25',       
    database: 'recipe_site'      
});

// ROUTES:

// Home page
app.get('/', (req, res) => {
    res.render('home');  // you need a views/home.ejs
});

app.get('/recipeslist', async (req, res) => {
    try {
        // Query recipes for each protein type
        const [chickenRecipes] = await db.query("SELECT * FROM recipes WHERE protein_type = 'Chicken'");
        const [beefRecipes] = await db.query("SELECT * FROM recipes WHERE protein_type = 'Beef'");
        const [tofuRecipes] = await db.query("SELECT * FROM recipes WHERE protein_type = 'Tofu'");

        // Render the recipeslist page with the data
        res.render('recipeslist', { chickenRecipes, beefRecipes, tofuRecipes });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading recipes");
    }
});


app.get('/recipes/:id', async (req, res) => {
    const recipeId = req.params.id;

    const [recipeRows] = await db.query("SELECT * FROM recipes WHERE id = ?", [recipeId]);

    if (recipeRows.length === 0) {
        return res.status(404).send('Recipe not found');
    }

    const recipe = recipeRows[0];

    const [ingredientRows] = await db.query(`
        SELECT ingredients.name, ingredients.info
        FROM ingredients
        JOIN recipe_ingredients ON ingredients.id = recipe_ingredients.ingredient_id
        WHERE recipe_ingredients.recipe_id = ?
    `, [recipeId]);

    res.render('recipe', { recipe, ingredients: ingredientRows });
});



// Add recipe form page
app.get('/recipes/add', async (req, res) => {
    try {
        const [ingredients] = await db.query("SELECT * FROM ingredients");
        res.render('addRecipe', { ingredients });
    } catch (err) {
        console.error("Error fetching ingredients:", err);
        res.status(500).send("Error loading Add Recipe page.");
    }
});

app.post('/recipes/add', async (req, res) => {
    try {
        const { name, description, protein_type } = req.body;
        let ingredientIds = req.body.ingredients;

        
        if (!Array.isArray(ingredientIds)) {
            ingredientIds = ingredientIds ? [ingredientIds] : [];
        }

        const [result] = await db.query(
            "INSERT INTO recipes (name, description, protein_type) VALUES (?, ?, ?)",
            [name, description, protein_type]
        );

        const recipeId = result.insertId;
        console.log("Inserted Recipe ID:", recipeId);

        for (const id of ingredientIds) {
            await db.query(
                "INSERT INTO recipe_ingredients (recipe_id, ingredient_id) VALUES (?, ?)",
                [recipeId, id]
            );
        }

        res.redirect('/recipeslist');
    } catch (err) {
        console.error("Error inserting recipe:", err);
        res.status(500).send("Recipe not added.");
    }
});


// Listen on Port 3000
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
