const express = require('express')
const cors = require('cors')
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json())
app.use(cors());
require('dotenv').config();


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zfzfmws.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('Hello World!')
})

async function run() {
    try {
        const myDB = client.db("EmployeeDB");
        const usersCollection = myDB.collection("EmployeeInfo");
        const worksCollection = myDB.collection("works");
        const paymentsCollection = myDB.collection("payments");
        const contactCollection = myDB.collection("messages");


        // await client.connect();
        // await client.db("admin").command({ ping: 1 });
        // console.log("✅ Connected to MongoDB");






        
        // ---------------- CREATE DEFAULT ADMIN ----------------
   



        /* ---------------- USERS ---------------- */

        // Register user
        app.post("/users", async (req, res) => {
            try {
                const {
                    name, email, password, role,
                    bank_account_no, salary, designation, photoURL
                } = req.body;

                const existingUser = await usersCollection.findOne({ email });
                if (existingUser) {
                    return res.json({ success: false, message: "Email already exists" });
                }

                const user = {
                    name,
                    email,
                    password,
                    role: role || "employee",
                    bank_account_no,
                    salary,
                    designation,
                    photoURL: photoURL || "https://i.ibb.co/default.png",
                    isVerified: false,
                    createdAt: new Date()
                };

                console.log(photoURL);

                const result = await usersCollection.insertOne(user);
                const savedUser = await usersCollection.findOne({ _id: result.insertedId });

                res.json({ success: true, user: savedUser });
            } catch (err) {
                console.error(err);
                res.json({ success: false, message: "Server error" });
            }
        });

        // Google login or upsert
        app.post("/users/google", async (req, res) => {
            try {
                const { name, email, photoURL, role, bank_account_no, salary, designation } = req.body;

                const existingUser = await usersCollection.findOne({ email });

                if (existingUser) {
                    // যদি আগেই থাকে, photoURL update কর
                    const updated = await usersCollection.findOneAndUpdate(
                        { email },
                        { $set: { photoURL } },
                        { returnDocument: "after" }
                    );
                    return res.json({ success: true, user: updated.value, message: "User updated" });
                } else {
                    // নতুন user create কর
                    const newUser = {
                        name,
                        email,
                        photoURL: photoURL || "https://i.ibb.co/default.png",
                        role: role || "Employee",
                        bank_account_no: bank_account_no || "1111",
                        salary: salary || 10000,
                        designation: designation || "Employee",
                        isVerified: true,
                        createdAt: new Date()
                    };
                    const result = await usersCollection.insertOne(newUser);
                    const savedUser = await usersCollection.findOne({ _id: result.insertedId });
                    return res.json({ success: true, user: savedUser, message: "User created" });
                }
            } catch (err) {
                console.error(err);
                res.status(500).json({ success: false, message: "Server error" });
            }
        });


        // Get all employees
        app.get("/users", async (req, res) => {
            try {
                const users = await usersCollection.find().toArray();
                res.json({ success: true, users });
            } catch (err) {
                res.json({ success: false, message: "Server error" });
            }
        });

        // Get user by email
        app.get("/users/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const user = await usersCollection.findOne({ email });
                if (!user) return res.status(404).json({ success: false, message: "User not found" });
                res.json({ success: true, user });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error" });
            }
        });

        // Toggle verification
        app.patch("/users/:id/verify", async (req, res) => {
            try {
                const id = req.params.id;
                const user = await usersCollection.findOne({ _id: new ObjectId(id) });
                if (!user) return res.status(404).json({ success: false, message: "User not found" });

                const updated = await usersCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { isVerified: !user.isVerified } },
                    { returnDocument: "after" }
                );

                res.json({ success: true, user: updated.value });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error" });
            }
        });

        // // Update employee info
        // app.patch("/users/:id", async (req, res) => {
        //     try {
        //         const id = req.params.id;
        //         const { name, email, role, bank_account_no, salary, designation, photoURL } = req.body;

        //         const updated = await usersCollection.findOneAndUpdate(
        //             { _id: new ObjectId(id) },
        //             { $set: { name, email, role, bank_account_no, salary, designation, photoURL } },
        //             { returnDocument: "after" }
        //         );

        //         if (!updated.value) return res.status(404).json({ success: false, message: "User not found" });

        //         res.json({ success: true, user: updated.value });
        //     } catch (err) {
        //         console.error(err);
        //         res.status(500).json({ success: false, message: "Server error" });
        //     }
        // });

        app.put("/works/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const { task, hours, date } = req.body;

                const updated = await worksCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { task, hours, date: new Date(date).toISOString() } },
                    { returnDocument: "after" }
                );

                if (!updated.value) {
                    return res.status(404).json({ success: false, message: "Work not found" });
                }

                res.json({ success: true, work: updated.value });
            } catch (err) {
                console.error(err);
                res.status(500).json({ success: false, message: "Server error" });
            }
        });


        app.delete("/works/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const result = await worksCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount === 0) return res.status(404).json({ success: false, message: "Work not found" });
                res.json({ success: true });
            } catch (err) {
                console.error(err);
                res.status(500).json({ success: false, message: "Server error" });
            }
        });


        /* ---------------- WORKS ---------------- */

        app.get("/works", async (req, res) => {
            try {
                const { email, month } = req.query;
                let query = {};
                if (email) query.email = email;
                if (month) query.month = month;

                const works = await worksCollection.find(query).toArray();
                res.json({ success: true, works });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error" });
            }
        });

        app.post("/works", async (req, res) => {
            try {
                const { email, employeeName, task, hours, date, month, year } = req.body;
                if (!email || !task || !hours || !date) {
                    return res.status(400).json({ success: false, message: "Missing fields" });
                }

                const doc = {
                    email, employeeName, task, hours,
                    date: new Date(date).toISOString(),
                    month, year,
                    createdAt: new Date().toISOString()
                };
                const result = await worksCollection.insertOne(doc);
                const saved = await worksCollection.findOne({ _id: result.insertedId });
                res.status(201).json({ success: true, work: saved });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error" });
            }
        });

        /* ---------------- PAYMENTS ---------------- */

        app.post("/payments", async (req, res) => {
            try {
                const { email, salary, month, year } = req.body;
                if (!email || !salary || !month || !year) {
                    return res.status(400).json({ success: false, message: "Missing fields" });
                }

                const user = await usersCollection.findOne({ email });
                if (!user || !user.isVerified) {
                    return res.status(400).json({ success: false, message: "Employee not verified" });
                }

                const existing = await paymentsCollection.findOne({ email, month, year });
                if (existing) {
                    return res.status(400).json({ success: false, message: "Payment already exists for this month/year" });
                }

                const doc = {
                    email,
                    salary,
                    month,
                    year,
                    status: "pending",
                    createdAt: new Date()
                };

                const result = await paymentsCollection.insertOne(doc);
                res.json({ success: true, payment: result });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error" });
            }
        });

        app.get("/payments", async (req, res) => {
            try {
                const email = req.query.email;
                const page = parseInt(req.query.page || "1", 10);
                const limit = parseInt(req.query.limit || "5", 10);
                if (!email) return res.status(400).json({ success: false, message: "Email required" });

                const query = { email };
                const total = await paymentsCollection.countDocuments(query);
                const totalPages = Math.max(1, Math.ceil(total / limit));

                const payments = await paymentsCollection
                    .find(query)
                    .sort({ year: 1, month: 1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .toArray();

                res.json({ success: true, payments, totalPages });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error" });
            }
        });

        app.get("/payments/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const payments = await paymentsCollection.find({ email }).toArray();
                res.json({ success: true, payments });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error" });
            }
        });



        // ---------------- Admin Check Middleware ----------------
        const verifyAdmin = async (req, res, next) => {
            const email = req.headers["x-admin-email"]; // Frontend থেকে header দিতে হবে
            if (!email) return res.status(401).json({ success: false, message: "No admin email provided" });

            const user = await usersCollection.findOne({ email });
            if (!user || user.role !== "Admin") {
                return res.status(403).json({ success: false, message: "Admin access only" });
            }

            req.user = user;
            next();
        };

        // ---------------- Admin-only routes example ----------------
        // Fire employee
        app.patch("/users/:id/fire", verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const updated = await usersCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { fired: true } },
                    { returnDocument: "after" }
                );
                res.json({ success: true, user: updated.value });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error" });
            }
        });

        // Make HR
        app.patch("/users/:id/make-hr", verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const updated = await usersCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { role: "HR" } },
                    { returnDocument: "after" }
                );
                res.json({ success: true, user: updated.value });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error" });
            }
        });

        // Adjust salary
        app.patch("/users/:id/salary", verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const { salary } = req.body;
                if (salary < 0) return res.status(400).json({ success: false, message: "Salary cannot be negative" });

                const updated = await usersCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { salary } },
                    { returnDocument: "after" }
                );
                res.json({ success: true, user: updated.value });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error" });
            }
        });

        // ---------------- Admin Payroll Routes ----------------

        // GET all payments for Admin
        app.get("/admin/payroll", verifyAdmin, async (req, res) => {
            try {
                // fetch all payments
                const payments = await paymentsCollection
                    .find()
                    .sort({ createdAt: 1 }) // oldest first
                    .toArray();

                // Optionally, include employee name from usersCollection
                const enrichedPayments = await Promise.all(
                    payments.map(async (p) => {
                        const user = await usersCollection.findOne({ email: p.email });
                        return {
                            _id: p._id,
                            email: p.email,
                            name: user?.name || "Unknown",
                            salary: p.salary,
                            month: p.month,
                            year: p.year,
                            status: p.status || "pending",
                            paymentDate: p.paymentDate || null,
                        };
                    })
                );

                res.json({ success: true, payments: enrichedPayments });
            } catch (err) {
                console.error(err);
                res.status(500).json({ success: false, message: "Server error" });
            }
        });

        // PATCH complete a payment
        app.patch("/admin/payroll/:id/complete", verifyAdmin, async (req, res) => {
            try {
                const { id } = req.params;

                const payment = await paymentsCollection.findOne({ _id: new ObjectId(id) });
                if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
                if (payment.status === "completed") return res.status(400).json({ success: false, message: "Payment already completed" });

                const updated = await paymentsCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { status: "completed", paymentDate: new Date() } },
                    { returnDocument: "after" }
                );

                res.json({ success: true, payment: updated.value });
            } catch (err) {
                console.error(err);
                res.status(500).json({ success: false, message: "Server error" });
            }
        });


        // GET /works
        app.get("/works", async (req, res) => {
            try {
                const { email, month, search } = req.query;
                const query = { $and: [] };

                if (email) query.$and.push({ email });
                if (month) query.$and.push({ month });
                if (search) {
                    query.$and.push({
                        $or: [
                            { task: { $regex: search, $options: "i" } },
                            { employeeName: { $regex: search, $options: "i" } },
                        ],
                    });
                }

                // যদি কোনো filter না থাকে
                if (query.$and.length === 0) delete query.$and;

                const works = await worksCollection.find(query).toArray();
                res.json({ works });
            } catch (err) {
                console.error("Failed to fetch works:", err);
                res.status(500).json({ error: "Server error" });
            }
        });

        // Fire employee
        app.patch("/users/:id/fire", verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const updated = await usersCollection.findOneAndUpdate(
                    { _id: new ObjectId(id) },
                    { $set: { fired: true } },   // fired = true
                    { returnDocument: "after" }
                );
                res.json({ success: true, user: updated.value });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error" });
            }
        });







        app.post("/api/contact", async (req, res) => {
            const { email, message } = req.body;
            try {
                const result = await contactCollection.insertOne({ email, message, createdAt: new Date(), replies: [] });
                res.status(200).json({ success: true, message: "Message stored", result });
            } catch (err) {
                res.status(500).json({ success: false, message: err.message });
            }
        });

        app.get("/api/messages", async (req, res) => {
            const messages = await contactCollection.find().sort({ createdAt: -1 }).toArray();
            res.json(messages);
        });

        app.post("/api/messages/reply/:id", async (req, res) => {
            const { id } = req.params;
            const { by, text } = req.body; // by: "Admin" or "HR"
            const result = await contactCollection.updateOne(
                { _id: new ObjectId(id) },
                { $push: { replies: { by, text, createdAt: new Date() } } }
            );
            res.json({ success: true, result });
        });





    } finally {
        // client.close() .
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`)
})
