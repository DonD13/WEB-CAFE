const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/uploads", express.static("uploads")); 

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/webcafe", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// User Schema
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    firstName: String,  
    lastName: String,   
    description: String,
    website: String,    
    facebook: String,   
    twitter: String,  
    avatar: String
});

const User = mongoose.model("User", userSchema);

// Review Schema
const reviewSchema = new mongoose.Schema({
    userId: String,
    username: String,
    branch: String,
    rating: Number,
    text: String,
    date: { type: Date, default: Date.now }
});
const Review = mongoose.model("Review", reviewSchema);

// Multer Setup for File Uploads
const storage = multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

// Register Route
app.post("/register", upload.single("avatar"), async (req, res) => {
    try {
        const { username, email, password, description } = req.body;
        const avatar = req.file ? "/uploads/" + req.file.filename : null;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "❌ Email already registered." });
        }

        const newUser = new User({ username, email, password, description, avatar });
        await newUser.save();

        res.json({ message: "✅ User registered successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Error registering user." });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || user.password !== password) {
            return res.status(401).json({ message: "❌ Invalid email or password." });
        }

        res.json({
            message: "✅ Login successful!",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                description: user.description,
                avatar: user.avatar
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Error logging in." });
    }
});

// Update Profile Route
app.put("/update-profile/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const updatedFields = {
            email: req.body.email,
            username: req.body.username,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            description: req.body.description,
            website: req.body.website,
            facebook: req.body.facebook,
            twitter: req.body.twitter
        };

        const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "✅ Profile updated successfully!", user: updatedUser });
    } catch (error) {
        console.error("❌ Error updating profile:", error);
        res.status(500).json({ message: "Server error" });
    }
});

app.put("/update-avatar/:id", upload.single("avatar"), async (req, res) => {
    try {
        const userId = req.params.id;
        if (!req.file) {
            return res.status(400).json({ message: "❌ No file uploaded." });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { avatar: "/uploads/" + req.file.filename },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "❌ User not found." });
        }

        res.json({ message: "✅ Profile picture updated!", avatar: updatedUser.avatar });
    } catch (err) {
        console.error("❌ Error updating profile picture:", err);
        res.status(500).json({ message: "Error updating profile picture." });
    }
});

async function uploadProfilePicture() {
    const fileInput = document.getElementById("profilePicInput");
    if (!fileInput.files.length) {
        alert("Please select a picture to upload.");
        return;
    }

    const formData = new FormData();
    formData.append("avatar", fileInput.files[0]);

    try {
        const response = await fetch(`http://localhost:3000/update-avatar/${user._id}`, {
            method: "PUT",
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            alert("✅ Profile picture updated!");
            document.getElementById("profile-picture").src = "http://localhost:3000" + data.avatar;
            localStorage.setItem("user", JSON.stringify(data.user));
            document.getElementById("usernameField").value = data.user.username;
            document.getElementById("firstNameField").value = data.user.firstName;
            document.getElementById("lastNameField").value = data.user.lastName;
            document.getElementById("descriptionField").value = data.user.description;
        } else {
            alert("❌ Error: " + data.message);
        }
    } catch (error) {
        alert("An error occurred while uploading the picture.");
        console.error(error);
    }
}

// Fetch Reviews
app.get("/reviews", async (req, res) => {
    try {
        const { branch } = req.query;
        const reviews = await Review.find({ branch }).sort({ date: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: "Error fetching reviews." });
    }
});

// Post Review
app.post("/reviews", async (req, res) => {
    try {
        const { userId, username, branch, rating, text } = req.body;
        const newReview = new Review({ userId, username, branch, rating, text });
        await newReview.save();
        res.json({ message: "✅ Review added!", review: newReview });
    } catch (err) {
        res.status(500).json({ message: "Error submitting review." });
    }
});

// Edit Review
app.put("/reviews/:id", async (req, res) => {
    try {
        const { text, rating } = req.body;
        const updatedReview = await Review.findByIdAndUpdate(req.params.id, { text, rating }, { new: true });

        if (!updatedReview) {
            return res.status(404).json({ message: "❌ Review not found." });
        }

        res.json({ message: "✅ Review updated!", review: updatedReview });
    } catch (err) {
        res.status(500).json({ message: "Error updating review." });
    }
});

// Delete Review
app.delete("/reviews/:id", async (req, res) => {
    try {
        const deletedReview = await Review.findByIdAndDelete(req.params.id);

        if (!deletedReview) {
            return res.status(404).json({ message: "❌ Review not found." });
        }

        res.json({ message: "✅ Review deleted!" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting review." });
    }
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
