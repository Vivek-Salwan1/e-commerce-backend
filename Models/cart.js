const mongoose = require('mongoose');

const CartSchema = mongoose.Schema({
 userEmail:String,
 cartItems:[]
})

const CartModel = new mongoose.model('cart', CartSchema);
module.exports = CartModel