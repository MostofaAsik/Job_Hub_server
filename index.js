//Basic Requirement
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require("cookie-parser");
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express()
const port = process.env.PORT || 3000

//middleware
app.use(express.json())
app.use(cookieParser());
app.use(cors({
    origin: ["http://localhost:5173",],// Change to your frontend URL
    credentials: true, // Allow sending cookies

}))

//verify token
const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token" });
        }
        req.user = decoded;
        next();
    });
}

//mongodb code will appear here

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rvjkksn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, } });

async function run() {
    try {
        await client.connect();

        //server code will appear here
        const jobsCollection = client.db("Job_Hub").collection("jobs");
        const jobApplicationCollection = client.db("Job_Hub").collection("job_application");


        //auth related apis
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

            //send cookie from backend to frontend
            res.cookie('token', token,
                {
                    httpOnly: true,
                    secure: false,
                }
            )
                .json({ success: true });
        });

        //clear token
        app.post('/logout', async (req, res) => {
            res
                .clearCookie('token', {
                    httpOnly: true,
                    secure: false,
                })
                .json({ success: true });
        });





        //jobs apis

        app.get('/jobs', async (req, res) => {
            const email = req.query.email;

            if (email) {
                const query = { hr_email: email };
                const result = await jobsCollection.find(query).toArray();
                res.json(result);
                return;
            }
            const cursor = jobsCollection.find({});
            const jobs = await cursor.toArray();
            res.send(jobs);
        });

        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const job = await jobsCollection.findOne({ _id: new ObjectId(id) });
            console.dir(job);
            res.send(job);
        });

        app.post('/jobs', async (req, res) => {
            const job = req.body;
            const result = await jobsCollection.insertOne(job);
            res.json(result);
        });

        app.patch('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const updatedJob = req.body;
            const result = await jobsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedJob });
            res.json(result);
        });

        app.delete('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const result = await jobsCollection.deleteOne({ _id: new ObjectId(id) });
            res.json(result);
        });





        //appliction jobs apis
        //query based get data on email
        app.get('/application-job', verifyToken, async (req, res) => {
            const email = req.query.email;  // before semicolon email is sent from frontend
            const query = { applicant_email: email };
            if (req.user.email !== email) {
                return res.status(403).json({ message: "Forbidden Access" });
            }

            const result = await jobApplicationCollection.find(query).toArray();

            for (const applicationsJob of result) {
                const job = await jobsCollection.findOne({ _id: new ObjectId(applicationsJob.job_id) });
                if (job) {
                    applicationsJob.title = job.title;
                    applicationsJob.company = job.company;
                    applicationsJob.location = job.location;
                    applicationsJob.company_logo = job.company_logo;
                }

            }

            res.json(result);
        });

        app.get('/application-job/jobs/:job_id', async (req, res) => {
            const id = req.params.job_id;
            const query = { job_id: id };
            const result = await jobApplicationCollection.find(query).toArray();
            res.json(result);

        });

        app.post('/application-job', async (req, res) => {
            const application_job = req.body;
            const result = await jobApplicationCollection.insertOne(application_job);

            const id = application_job.job_id;
            const job = await jobsCollection.findOne({ _id: new ObjectId(id) });
            let newCount = 0
            if (job.applicantion_count) {
                newCount = job.applicantion_count + 1;
            } else {
                newCount = 1;
            }

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    applicantion_count: newCount
                },
            };
            const updateResult = await jobsCollection.updateOne(filter, updateDoc);
            res.json(result);
        });

        app.patch('/application-job/:id', async (req, res) => {
            const id = req.params.id;
            const updatedJob = req.body;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: updatedJob.status
                },
            }
            const result = await jobApplicationCollection.updateOne(filter, updatedDoc);
            res.json(result);
        });


        app.delete('/application-job/:id', async (req, res) => {
            const id = req.params.id;
            const result = await jobApplicationCollection.deleteOne({ _id: new ObjectId(id) });
            res.json(result);
        });



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);

// Simple Api's

app.get('/', (req, res) => {
    res.send('Job Hub  Server is Running ')
})

app.listen(port, () => {
    console.log(`Server is runnig on port ${port}`)
})