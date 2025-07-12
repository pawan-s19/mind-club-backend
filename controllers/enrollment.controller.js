const Razorpay = require('razorpay');
const Enrollment = require('../models/Enrollment.model');
const User = require('../models/user.model');
const Workshop = require('../models/onlineWorkshop.model');


exports.createEnrollment = async (req, res) => {
    const { userId, workshopId } = req.body;

    try {
        const workshop = await Workshop.findById(workshopId);
        if (!workshop) return res.status(404).json({ message: 'Workshop not found' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const enrollment = new Enrollment({
            user: userId,
            workshop: workshopId,
            paymentInfo: {
                orderId: 'manual',
                paymentId: 'manual',
                status: 'paid',
            },
        });

        await enrollment.save();

        return res.status(201).json({
            success: true,
            message: 'Enrollment successful',
            enrollment,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.order = async (req, res) => {
    try {
        const { cart } = req.body;
        const userId = req.user ? req.user.id : null;
        let payableWorkshops = [];
        let newTotal = 0;

        if (!Array.isArray(cart)) {
            return res.status(400).json({ error: "Cart must be an array" });
        }

        if (userId) {
            // Only filter out already-enrolled workshops for logged-in users
            for (const item of cart) {
                const alreadyEnrolled = await Enrollment.findOne({
                    user: userId,
                    workshop: item._id
                });
                if (!alreadyEnrolled) {
                    payableWorkshops.push(item);
                    const price = typeof item.price === "object" ? item.price.amount : item.price;
                    newTotal += price;
                }
            }
        } else {
            // For guests, charge for all workshops in the cart
            payableWorkshops = cart;
            for (const item of cart) {
                const price = typeof item.price === "object" ? item.price.amount : item.price;
                newTotal += price;
            }
        }

        const instance = new Razorpay({
            key_id: 'rzp_test_k0s0JYzG2kqwes',
            key_secret: '4KpQWsH0BQlczdwRXCgpw8xl',
        });

        const options = {
            amount: Math.round(newTotal * 100),
            currency: "INR",
            receipt: "receipt_order_" + Date.now(),
            notes: { cart: JSON.stringify(payableWorkshops), userId }
        };

        const order = await instance.orders.create(options);

        if (!order) return res.status(500).send("Some error occurred");

        res.json({ ...order, payableWorkshops, newTotal });
    } catch (error) {
        console.error('Order Error:', error); // Add this for debugging
        res.status(500).send(error);
    }
};

exports.success = async (req, res) => {
    try {
        const {
            orderCreationId,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
        } = req.body;

        // Retrieve the order from Razorpay or from your DB if you store it
        // For this example, assume you get the cart and userId from notes

        // You may need to fetch the order details from Razorpay API to get notes
        // Or store the cart/userId in your DB when creating the order

        // Example: Fetch order details from Razorpay
        const instance = new Razorpay({
            key_id: 'rzp_test_k0s0JYzG2kqwes',
            key_secret: '4KpQWsH0BQlczdwRXCgpw8xl',
        });
        const order = await instance.orders.fetch(razorpayOrderId);
        const { cart, userId } = order.notes;

        // Parse cart if needed
        const workshops = JSON.parse(cart);

        // Create enrollment for each workshop
        for (const item of workshops) {
            await Enrollment.create({
                user: userId,
                workshop: item._id,
                paymentId: razorpayPaymentId,
                orderId: razorpayOrderId,
            });
        }

        res.json({
            msg: "success",
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
        });
    } catch (error) {
        res.status(500).send(error);
    }
};
