const { Router } = require('express');
const uploader = require('../../utils/multer.utils');
const ProductsDao = require('../../dao/products.dao');

const router = Router();

const ProductManager = require('../../dao/ProductManager.dao.js');

const path = require('path');
const products = require('../../dao/models/Products.model');
const productManager = new ProductManager(
    path.join(__dirname, '../../files/products.json')
);

const Products = new ProductsDao();

// Endpoint para obtener todos los productos o un limite de ellos:
router.get('/', async (req, res) => {
    try {
        await productManager.readJson();
        let { limit = 10, page = 1, sort, query } = req.query;
        let products = productManager.products;

        // Filtrar por query
        if (query) {
            products = products.filter((product) => product.category === query);
        }

        // Ordenar por precio
        if (sort) {
            if (sort === 'asc') {
                products.sort((a, b) => a.price - b.price);
            } else if (sort === 'desc') {
                products.sort((a, b) => b.price - a.price);
            }
        }

        // Paginación
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const results = products.slice(startIndex, endIndex);

        const totalPages = Math.ceil(products.length / limit);

        const response = {
            status: 'success',
            payload: results,
            totalPages: totalPages,
            page: parseInt(page),
            totalResults: products.length,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages,
            prevLink: page > 1 ? `${req.baseUrl}?limit=${limit}&page=${page - 1}${query ? `&query=${query}` : ''}${sort ? `&sort=${sort}` : ''}` : null,
            nextLink: page < totalPages ? `${req.baseUrl}?limit=${limit}&page=${page + 1}${query ? `&query=${query}` : ''}${sort ? `&sort=${sort}` : ''}` : null,
        };

        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener los productos');
    }
});

// Endpoint para cargar productos con mongoDB
router.get('/loadItemsFromDB', async (req, res) => {
    try {
        const products = await Products.findAll();
        res.json({ status: 'success', message: products });
    } catch (error) {
        res.json({ status: 'error', error });
    }
});

// Endpoint para btener producto por id:
router.get('/:pid', async (req, res) => {
    const pid = req.params.pid;
    try {
        await productManager.readJson();
        const products = productManager.products;
        const product = products.find((product) => product.id == pid);
        if (product) {
            res.json(product);
        } else {
            res.send(`El producto con id ${pid} no existe.`);
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Error al obtener los productos');
    }
});

// Endpoint para agregar un producto:
router.post('/', async (req, res) => {
    try {
        await productManager.readJson();
        const products = productManager.products;

        const { title, description, code, price, stock, category, thumbnails } = req.body;

        if (!title || !description || !code || !price || !stock || !category) {
            return res.status(400).send('Oops! Faltan campos obligatorios');
        }

        const newProduct = {
            id: products.length + 1,
            title,
            description,
            code,
            price,
            status: true,
            stock,
            category,
            thumbnails: thumbnails || [],
        };

        products.push(newProduct);

        await productManager.writeJson(products);

        res.json(newProduct);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al agregar el producto');
    }
});

//Agregar un producto desde la db
router.post('/addProduct', uploader.single('file'), async (req, res) => {
    try {
        const { title, description, price, code, stock, category } = req.body;
        
        const newProductInfo = {
            title,
            description,
            price,
            code,
            stock,
            thumbnail: req.file.filename,
            category,
        };

        const newProduct = await Products.create(newProductInfo);
        res.json({ status: 'success', message: newProduct });
    } catch (error) {
        res.json({ status: 'error', error });
    }
});

// Endpoint para actualizar un producto:
router.put('/:pid', async (req, res) => {
    const pid = req.params.pid;
    try {
        await productManager.readJson();
        const products = productManager.products;

        const productIndex = products.findIndex((product) => product.id == pid);

        if (productIndex < 0) {
            return res.status(404).send(`Oh oh... El producto con id ${pid} no existe.`);
        }

        const { id, ...updates } = req.body;

        if (Object.keys(updates).length === 0) {
            return res.status(400).send('No se proporcionaron campos a actualizar');
        }

        if (id && id != pid) {
            return res.status(400).send('No se permite actualizar el ID del producto');
        }

        products[productIndex] = { ...products[productIndex], ...updates };

        await productManager.writeJson(products);

        res.json(products[productIndex]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al actualizar el producto');
    }
});

// Endpoint para cambiar el status del producto a false (eliminar producto):
router.delete('/:pid', async (req, res) => {
    const pid = req.params.pid;
    try {
        await productManager.readJson();
        const products = productManager.products;

        const productIndex = products.findIndex((product) => product.id == pid);

        if (productIndex < 0) {
            return res.status(404).send(`El producto con id ${pid} no existe.`);
        }

        products[productIndex].status = false;

        await productManager.writeJson(products);

        res.send(`El producto con id ${pid} ha sido eliminado.`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al eliminar el producto');
    }
});

// Eliminar productos con mongoDB
router.delete('/deleteAll', async (req, res) => {
    await Products.deleteAll();
    res.json({ message: 'Delete all' });
});

module.exports = router;