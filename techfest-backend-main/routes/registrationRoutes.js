const express = require("express");
const Registration = require("../models/Registration");
const Event = require("../models/Event");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
router.get("/my", authMiddleware, async (req, res) => {
    try {
        const registrations = await Registration.find({
            user: req.user.id
        }).populate("event");

        res.json(registrations);

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
});

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { eventId } = req.body;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (event.seats <= 0) {
            return res.status(400).json({
                message: "No seats available"
            });
        }

        const existingRegistration = await Registration.findOne({
            user: req.user.id,
            event: eventId
        });

        if (existingRegistration) {
            return res.status(400).json({
                message: "Already registered"
            });
        }

        const registration = new Registration({
            user: req.user.id,
            event: eventId
        });

        await registration.save();

        event.seats -= 1;
        await event.save();

        res.status(201).json({
            message: "Registration successful",
            registration
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
});

module.exports = router;