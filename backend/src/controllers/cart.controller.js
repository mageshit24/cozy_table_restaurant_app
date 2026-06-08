const { Cart, Menu } = require("../models");

/* ==============================
   ADD TO CART
============================== */

exports.addToCart = async (req, res, next) => {
  try {

    const { menuId, quantity = 1 } = req.body;

    if (!menuId) {
      return res.status(400).json({
        message: "menuId is required"
      });
    }

    const menu = await Menu.findByPk(menuId);

    if (!menu) {
      return res.status(404).json({
        message: "Menu item not found"
      });
    }

    const existing = await Cart.findOne({
      where: {
        userId: req.user.id,
        menuId
      }
    });

    if (existing) {

      await existing.update({
        quantity: existing.quantity + quantity
      });

    } else {

      await Cart.create({
        userId: req.user.id,
        menuId,
        quantity
      });
    }

    return res.json({
      message: "Added to cart"
    });

  } catch (err) {
    next(err);
  }
};

/* ==============================
   GET CART
============================== */

exports.getCart = async (req, res, next) => {
  try {

    const items = await Cart.findAll({
      where: {
        userId: req.user.id
      },

      include: [
        {
          model: Menu,
          attributes: [
            "id",
            "name",
            "price",
            "description",
            "category",
            "image"
          ]
        }
      ]
    });

    return res.json(items);

  } catch (err) {
    next(err);
  }
};

/* ==============================
   UPDATE CART
============================== */

exports.updateCart = async (req, res, next) => {
  try {

    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        message: "Quantity must be at least 1"
      });
    }

    await Cart.update(
      { quantity },
      {
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      }
    );

    return res.json({
      message: "Cart updated"
    });

  } catch (err) {
    next(err);
  }
};

/* ==============================
   REMOVE ITEM
============================== */

exports.removeItem = async (req, res, next) => {
  try {

    await Cart.destroy({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    return res.json({
      message: "Item removed"
    });

  } catch (err) {
    next(err);
  }
};

/* ==============================
   CLEAR CART
============================== */

exports.clearCart = async (req, res, next) => {
  try {

    await Cart.destroy({
      where: {
        userId: req.user.id
      }
    });

    return res.json({
      message: "Cart cleared"
    });

  } catch (err) {
    next(err);
  }
};
