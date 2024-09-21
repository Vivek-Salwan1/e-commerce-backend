const mongoose = require('mongoose');

const ProductSchema = mongoose.Schema({
    title:String,
    desc:String,
    price:Number,
    basePrice:Number,
    category:String,
    image:String
})

const ProductModel = new mongoose.model('product', ProductSchema);
module.exports = ProductModel