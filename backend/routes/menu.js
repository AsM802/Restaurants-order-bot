const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { protect } = require('../middleware/auth');

// GET /api/menu — Public: fetch all available menu items
router.get('/', async (req, res) => {
  try {
    const filter = { available: true };
    if (req.query.restaurantId) filter.restaurantId = req.query.restaurantId;
    const items = await MenuItem.find(filter).sort({ displayNumber: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/menu/all — Owner only: fetch ALL items including unavailable
router.get('/all', protect, async (req, res) => {
  try {
    const items = await MenuItem.find({ restaurantId: req.user.id }).sort({ displayNumber: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/menu — Owner only: add a new item
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, available } = req.body;

    // Auto-assign display number
    const lastItem = await MenuItem.findOne({ restaurantId: req.user.id }).sort({ displayNumber: -1 });
    const displayNumber = lastItem ? lastItem.displayNumber + 1 : 1;

    const item = await MenuItem.create({
      restaurantId: req.user.id,
      name, description, price, category, imageUrl,
      available: available !== undefined ? available : true,
      displayNumber,
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/menu/:id — Owner only: update a menu item
router.put('/:id', protect, async (req, res) => {
  try {
    let item = await MenuItem.findOne({ _id: req.params.id, restaurantId: req.user.id });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/menu/:id — Owner only: delete a menu item
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await MenuItem.findOneAndDelete({ _id: req.params.id, restaurantId: req.user.id });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    // Re-number remaining items
    const remaining = await MenuItem.find({ restaurantId: req.user.id }).sort({ displayNumber: 1 });
    for (let i = 0; i < remaining.length; i++) {
      await MenuItem.findByIdAndUpdate(remaining[i]._id, { displayNumber: i + 1 });
    }

    res.json({ message: 'Item deleted and menu renumbered' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
