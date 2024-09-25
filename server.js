const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path')
const cookieParser = require('cookie-parser')
const Razorpay = require('razorpay')
const UserModel = require('./Models/user');
const ProductModel = require('./Models/product');
const CartModel = require('./Models/cart');
const OrderModel = require('./Models/orders');
require('dotenv').config();

const app = express();

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use('/imgs', express.static('imgs'));

// 'https://e-commere-frontend.netlify.app', 
app.use(cors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))


mongoose.connect('mongodb+srv://viveksalwan63:utz4BOsIaNPWuDNt@e-commerce.6nl3f.mongodb.net/?retryWrites=true&w=majority&appName=e-commerce')
    .then(resp => console.log('db connected'))
    .catch(err => console.log(err))






const verifyUser = (req, res, next) => {

    const token = req.cookies.token

    if (!token) {
        res.json('the token was missing')
    } else {

        jwt.verify(token, 'jwt-secret-key', (err, decoded) => {
            if (err) {
                return res.json('the token is wrong')
            } else {
                req.name = decoded.name;
                req.email = decoded.email
                next()
            }
        })
    }
}

app.get('/', verifyUser, (req, res) => {

    return res.json({ name: req.name, email: req.email })
})

app.post('/register-user', (req, res) => {
    const { name, email, phone, password } = req.body

    const currentDateTime = new Date().toString();
    UserModel.findOne({ email: email })
        .then(user => {
            if (user) {
                res.json({ massage: 'user-exist' })
            } else {
                bcrypt.hash(password, 10)
                    .then(hashed => {
                        UserModel.create({ name, email, phone, password: hashed, date: currentDateTime })
                            .then(user => res.json(user))
                            .catch(err => res.json(err))

                    }).catch(err => res.json(err))

            }
        }).catch(err => res.json(err))


})

app.post('/login', (req, res) => {
    const { email, password } = req.body;


    UserModel.findOne({ email: email })
        .then(user => {
            if (user) {
                bcrypt.compare(password, user.password)
                    .then(response => {
                        if (response) {

                            const token = jwt.sign({ name: user.name, email: user.email }, 'jwt-secret-key', { expiresIn: '1d' })
                            res.cookie('token', token)
                            res.json({massage:'logged in', user:user} )

                        } else {
                            return res.json('wrong password')
                        }
                    })
            } else {
                return res.json('user not found')
            }
        })

})


app.post('/logout', (req, res) => {
    res.clearCookie('token')
    res.json('logged out')
})


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './imgs')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({
    storage: storage
})


// Product API's

app.post('/add-product', upload.single('image'), (req, res) => {
    ProductModel.create({ title: req.body.title, desc: req.body.desc, price: req.body.price, basePrice: req.body.price, category: req.body.category, image: req.file.filename })
        .then(resp => res.json(resp))
        .catch(err => res.json(err))
})



app.get('/get-products', (req, res) => {
    ProductModel.find()
        .then(resp => res.json(resp))
        .catch(err => res.json(err))
})


app.get('/get-productByID/:productID', (req, res) => {
    const productID = req.params.productID;

    ProductModel.findById(productID)
        .then(pro => res.json(pro))
        .catch(err => res.json(err))
})

app.get('/get-related-products', (req, res) => {

    const product = req.query;

    const category = product.category;
    // console.log(category)

    ProductModel.find({ category: category })
        .then(resp => res.json(resp))
        .catch(err => res.json(err))


})


//  Cart API's

app.post('/add-to-cart', (req, res) => {

    const { userEmail, item } = req.body

    // console.log(item)

    CartModel.findOne({ userEmail: userEmail })
        .then(cart => {
            if (cart) {

                const existingItem = cart.cartItems.find(cartItem => cartItem._id === item._id)
                console.log('existring item ', existingItem)
                if (existingItem) {
                    existingItem.quantity + 1;
                    console.log('item already exits in cart ')
                }
                else {
                    cart.cartItems.push(item)
                    console.log('item pushed to cartitems')
                }

                cart.save()
                    .then(updatedCart => res.json('item added to cart'))
                    .catch(err => res.json('error adding item'))
            } else {
                CartModel.create({ userEmail: userEmail, cartItems: [item] })
                    .then(resp => res.json('item added'))
                    .catch(err => res.json(err))

            }
        })


})

app.get('/get-cart-items/:userEmail', (req, res) => {
    const userEmail = req.params.userEmail

    CartModel.findOne({ userEmail: userEmail })
        .then(cartitems => res.json(cartitems))
        .catch(err => res.json(err))
})


app.delete('/remove-from-cart', (req, res) => {
    const { itemID, userEmail } = req.query;

    // Find the cart of the particular user
    CartModel.findOne({ userEmail: userEmail })
        .then(cart => {
            if (cart) {
                // Filter out the item from cartItems based on itemID
                const updatedItems = cart.cartItems.filter(item => item._id.toString() !== itemID);

                // Update the cartItems array with the filtered items
                cart.cartItems = updatedItems;

                // Save the updated cart
                cart.save()
                    .then(() => res.json('item-removed'))
                    .catch(err => res.json(err));
            } else {
                res.json('Cart not found');
            }
        })
        .catch(err => res.json(err));
});


app.put('/update-cart', (req, res) => {
    const { userEmail, updatedCart } = req.body;

    CartModel.findOne({ userEmail: userEmail })
        .then(cart => {
            if (cart) {
                cart.cartItems = updatedCart; // Update the cart with the new items

                cart.save()
                    .then(updatedCart => res.json('Cart updated successfully'))
                    .catch(err => res.status(500).json('Error updating cart'));
            } else {
                res.status(404).json('Cart not found');
            }
        })
        .catch(err => res.status(500).json(err));
});



app.put('/clear-cart', (req, res) => {

    const { userEmail } = req.body;
    CartModel.findOne({ userEmail: userEmail })
        .then(cart => {
            if (cart) {
                cart.cartItems = []

                cart.save()
                    .then(resp => res.json('cart cleared'))
                    .catch(err => res.json(err))
            }
        }).catch(err => console.log(err))
})




// Shipping and orders




app.get('/get-cart-items/:userEmail', async (req, res) => {
    const userEmail = req.params.userEmail
    //  console.log(userEmail)
    const cart = await CartModel.findOne({ userEmail: userEmail });
    const cartItems = cart ? cart.cartItems : [];

    return res.json(cartItems)
})


// payment



app.post('/payment', async (req, res) => { 
    const { amount, currency, receipt, shippingDetails, userEmail } = req.body;

    // Check for missing required fields
    if (!amount || !currency || !receipt || !shippingDetails || !userEmail) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Fetch cart items for the user
        const cart = await CartModel.findOne({ userEmail });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found for the user' });
        }
        const cartItems = cart.cartItems;

        const razorpay = new Razorpay({
            key_id: 'rzp_test_WWZE0bebaftNDP',
            key_secret:'xDkHvOWdhznzOlD21xMOmEwx'
        });

        // Create the order in Razorpay
        const order = await razorpay.orders.create({
            amount: amount, // Amount should be in paise
            currency: currency,
            receipt: receipt
        });

        if (!order) {
            console.error('Razorpay order creation failed');
            return res.status(500).json({ message: 'Error creating Razorpay order' });
        }

        // Save the order in the database
        await OrderModel.create({
            userEmail: userEmail,
            orderID: order.id,
            paymentStatus: 'Pending', // Initially set as pending
            fullname: shippingDetails.fullname,
            phone: shippingDetails.phone,
            country: shippingDetails.country,
            state: shippingDetails.state,
            city: shippingDetails.city,
            pincode: shippingDetails.pincode,
            address: shippingDetails.address,
            orderedItems: cartItems,
            orderDate: Date.now()
        });

        // Return the created order
        return res.json(order);

    } catch (err) {
        console.error('Server error:', err.message);  // Log the specific error message
        console.error('Stack trace:', err.stack);     // Log the full error stack trace for debugging
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});





// Route to save order details after successful payment
app.post('/save-order-details', async (req, res) => {
    const { orderID, paymentID, paymentStatus, userEmail, amountPaid } = req.body;

    try {
        const order = await OrderModel.findOne({ orderID, userEmail });

        if (order) {
            order.paymentStatus = paymentStatus;
            order.paymentID = paymentID;
            order.amountPaid = amountPaid;
            await order.save();

            res.json({ message: 'Order updated successfully' });
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});



// Admin Panel

app.put('/edit-product', (req, res) => {

    const { productID, title, desc, category, price, image } = req.body;

    ProductModel.findByIdAndUpdate(productID, {
        title: title,
        desc: desc,
        category: category,
        price: price,
        basePrice: price,
        image: image
    })
        .then(resp => res.json('updated'))
        .catch(err => res.json(err))



})


app.delete('/delete-product/:productID', (req, res) => {
    const productID = req.params.productID

    ProductModel.findByIdAndDelete(productID)
        .then(resp => res.json('deleted'))
        .catch(err => res.json(err))
})



app.get('/get-all-users', (req, res) => {

    UserModel.find()
        .then(resp => res.json(resp))
        .catch(err => res.json(err))
})


app.get('/get-all-orders', (req, res) => {

    OrderModel.find()
        .then(orders => {
            if (orders) {
                res.json(orders)
            } else {
                res.json('no orders yet')
            }
        })
})

app.listen(3001, () => {
    console.log('server is listening')
})








// User

app.get('/get-user-orders/:userEmail', (req, res) => {
    const userEmail = req.params.userEmail;

    OrderModel.find({ userEmail: userEmail })
        .then(orders => {
            if (orders) {
                return res.json(orders)
            } else {
                return res.json('no orders')
            }
        })
})