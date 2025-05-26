const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/submit-form', (req, res) => {
    const { name, email, subject, message } = req.body;

    const transporter = nodemailer.createTransport({
        service: 'Gmail', // or another SMTP service
        auth: {
            user: 'webburnstech@gmail.com',
            pass: 'uqtn ttdl ipht xhgh' // Use App Password (not regular password)
        }
    });

    const mailOptions = {
        from: email,
        to: 'webburnstech@gmail.com',
        subject: `New Contact: ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send(error.toString());
        }
        res.send('Message sent!');
    });
});

app.listen(3000, () => console.log('Server running on port 3000'));
