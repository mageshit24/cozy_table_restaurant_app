const sequelize = require("../config/db");

const User = require("./user.model");
const Reservation = require("./reservation.model");
const Menu = require("./menu.model");
const Cart = require("./cart.model");
const Order = require("./order.model");
const OrderItem = require("./orderItem.model");
const Feedback = require("./feedback.model");
const Payment = require("./payment.model");
const TokenBlacklist = require("./tokenBlacklist.model");

/* ================= USER ================= */

User.hasMany(Reservation, {
  foreignKey: "userId"
});

Reservation.belongsTo(User, {
  foreignKey: "userId"
});

User.hasMany(Order, {
  foreignKey: "userId"
});

Order.belongsTo(User, {
  foreignKey: "userId"
});

User.hasMany(Feedback, {
  foreignKey: "userId"
});

Feedback.belongsTo(User, {
  foreignKey: "userId"
});

User.hasMany(Cart, {
  foreignKey: "userId"
});

Cart.belongsTo(User, {
  foreignKey: "userId"
});

/* ================= MENU ================= */

Menu.hasMany(Cart, {
  foreignKey: "menuId"
});

Cart.belongsTo(Menu, {
  foreignKey: "menuId"
});

Menu.hasMany(OrderItem, {
  foreignKey: "menuId"
});

OrderItem.belongsTo(Menu, {
  foreignKey: "menuId"
});

/* ================= ORDER ================= */

Order.hasMany(OrderItem, {
  foreignKey: "orderId"
});

OrderItem.belongsTo(Order, {
  foreignKey: "orderId"
});

/* ================= PAYMENT ================= */

Order.hasMany(Payment, {
  foreignKey: "orderId"
});

Payment.belongsTo(Order, {
  foreignKey: "orderId"
});

module.exports = {
  sequelize,
  User,
  Reservation,
  Menu,
  Cart,
  Order,
  OrderItem,
  Feedback,
  Payment,
  TokenBlacklist
};
