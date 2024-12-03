const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS.replace(/\s/g, '') // Remove any spaces from password
    },
    tls: {
        rejectUnauthorized: true
    }
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP configuration error:', error);
    } else {
        console.log('SMTP server is ready to send emails');
    }
});

const sendEmail = async (to, subject, html) => {
    try {
        if (!to) {
            console.error('No recipient email provided');
            return;
        }

        const mailOptions = {
            from: {
                name: 'LEJET Airlines',
                address: process.env.EMAIL_USER
            },
            to,
            subject,
            html
        };

        console.log('Attempting to send email to:', to);
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Email sending failed:', error);
        if (error.response) {
            console.error('SMTP Response:', error.response);
        }
        throw error;
    }
};

const sendBookingConfirmation = async (booking) => {
    try {
        if (!booking?.user?.email) {
            console.error('No user email found in booking:', booking);
            return;
        }

        const subject = `LEJET Airlines - Booking Confirmation #${booking._id}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Booking Confirmation</h1>
                <p>Dear ${booking.user.name || 'Valued Customer'},</p>
                <p>Thank you for booking with LEJET Airlines. Here are your booking details:</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Booking Reference:</strong> ${booking._id}</p>
                    <p><strong>Flight:</strong> ${booking.flight.from} to ${booking.flight.to}</p>
                    <p><strong>Date:</strong> ${new Date(booking.flight.departureTime).toLocaleString()}</p>
                    <p><strong>Class:</strong> ${booking.seatClass}</p>
                    <p><strong>Passengers:</strong> ${booking.passengers}</p>
                    <p><strong>Total Amount:</strong> GH₵${booking.totalAmount}</p>
                </div>
                <p>Your e-ticket will be sent in a separate email once payment is confirmed.</p>
                <p>Thank you for choosing LEJET Airlines!</p>
            </div>
        `;

        return await sendEmail(booking.user.email, subject, html);
    } catch (error) {
        console.error('Error sending booking confirmation:', error);
        throw error;
    }
};

const sendTicketConfirmation = async (booking) => {
    try {
        if (!booking?.user?.email) {
            console.error('No user email found in booking:', booking);
            return;
        }

        const subject = `LEJET Airlines - E-Ticket #${booking.ticketNumber}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Your E-Ticket</h1>
                <p>Dear ${booking.user.name || 'Valued Customer'},</p>
                <p>Thank you for your payment. Here is your e-ticket:</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Ticket Number:</strong> ${booking.ticketNumber}</p>
                    <p><strong>Flight:</strong> ${booking.flight.from} to ${booking.flight.to}</p>
                    <p><strong>Date:</strong> ${new Date(booking.flight.departureTime).toLocaleString()}</p>
                    <p><strong>Aircraft:</strong> ${booking.flight.airplane?.name || 'TBA'}</p>
                    <p><strong>Class:</strong> ${booking.seatClass}</p>
                    <p><strong>Passengers:</strong> ${booking.passengers}</p>
                </div>
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Important Information:</strong></p>
                    <ul>
                        <li>Please arrive at the airport at least 2 hours before departure</li>
                        <li>Carry a valid ID for check-in</li>
                        <li>Check our baggage policy on our website</li>
                    </ul>
                </div>
                <p>Thank you for choosing LEJET Airlines!</p>
            </div>
        `;

        return await sendEmail(booking.user.email, subject, html);
    } catch (error) {
        console.error('Error sending ticket confirmation:', error);
        throw error;
    }
};

module.exports = {
    sendEmail,
    sendBookingConfirmation,
    sendTicketConfirmation
};