const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS.replace(/\s/g, '')
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
                <div style="background-color: #2563eb; padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">LEJET Airlines</h1>
                    <p style="color: white; margin: 5px 0 0 0;">
                        ${booking.isRoundTrip ? 'Round Trip' : 'One-Way'} Booking Confirmation
                    </p>
                </div>
                
                <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 10px 10px;">
                    <p style="color: #374151;">Dear ${booking.user.name || 'Valued Customer'},</p>
                    <p style="color: #374151;">Thank you for booking with LEJET Airlines. Here are your booking details:</p>
                    
                    ${booking.isRoundTrip ? `
                        <h2 style="color: #2563eb; margin-top: 20px;">Outbound Flight</h2>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Booking Reference:</strong> ${booking._id}</p>
                            <p><strong>Flight:</strong> ${booking.outboundFlight.from} to ${booking.outboundFlight.to}</p>
                            <p><strong>Date:</strong> ${new Date(booking.outboundFlight.departureTime).toLocaleString()}</p>
                            <p><strong>Aircraft:</strong> ${booking.outboundFlight.airplane?.name || 'TBA'}</p>
                            <p><strong>Class:</strong> ${booking.seatClass}</p>
                            <p><strong>Passengers:</strong> ${booking.passengers}</p>
                        </div>

                        <h2 style="color: #2563eb; margin-top: 20px;">Return Flight</h2>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Flight:</strong> ${booking.returnFlight.from} to ${booking.returnFlight.to}</p>
                            <p><strong>Date:</strong> ${new Date(booking.returnFlight.departureTime).toLocaleString()}</p>
                            <p><strong>Aircraft:</strong> ${booking.returnFlight.airplane?.name || 'TBA'}</p>
                        </div>
                    ` : `
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Booking Reference:</strong> ${booking._id}</p>
                            <p><strong>Flight:</strong> ${booking.flight.from} to ${booking.flight.to}</p>
                            <p><strong>Date:</strong> ${new Date(booking.flight.departureTime).toLocaleString()}</p>
                            <p><strong>Aircraft:</strong> ${booking.flight.airplane?.name || 'TBA'}</p>
                            <p><strong>Class:</strong> ${booking.seatClass}</p>
                            <p><strong>Passengers:</strong> ${booking.passengers}</p>
                        </div>
                    `}

                    <p style="font-weight: bold; color: #2563eb;">Total Amount: GH₵${booking.totalAmount.toFixed(2)}</p>
                    
                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Next Steps:</strong></p>
                        <p style="margin: 10px 0;">Your e-ticket${booking.isRoundTrip ? 's' : ''} will be sent in ${booking.isRoundTrip ? 'separate emails' : 'an email'} once payment is confirmed.</p>
                    </div>

                    <p style="color: #374151;">Thank you for choosing LEJET Airlines!</p>
                </div>
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

        if (booking.isRoundTrip) {
            // Send outbound ticket
            await sendEmail(
                booking.user.email,
                `LEJET Airlines - Outbound E-Ticket #${booking.outboundTicketNumber}`,
                generateTicketHTML(booking, 'outbound')
            );

            // Send return ticket
            await sendEmail(
                booking.user.email,
                `LEJET Airlines - Return E-Ticket #${booking.returnTicketNumber}`,
                generateTicketHTML(booking, 'return')
            );
        } else {
            await sendEmail(
                booking.user.email,
                `LEJET Airlines - E-Ticket #${booking.ticketNumber}`,
                generateTicketHTML(booking, 'single')
            );
        }
    } catch (error) {
        console.error('Error sending ticket confirmation:', error);
        throw error;
    }
};

const generateTicketHTML = (booking, type = 'single') => {
    const flight = type === 'outbound' ? booking.outboundFlight : 
                  type === 'return' ? booking.returnFlight : 
                  booking.flight;

    const ticketNumber = type === 'outbound' ? booking.outboundTicketNumber :
                        type === 'return' ? booking.returnTicketNumber :
                        booking.ticketNumber;

    const tripType = type === 'single' ? '' :
                    type === 'outbound' ? ' (Outbound)' :
                    ' (Return)';

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #2563eb; padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">LEJET Airlines</h1>
                <p style="color: white; margin: 5px 0 0 0;">E-Ticket${tripType}</p>
            </div>
            
            <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 10px 10px;">
                <p style="color: #374151;">Dear ${booking.user.name || 'Valued Customer'},</p>
                <p style="color: #374151;">Here is your electronic ticket:</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
                    <p><strong>Flight:</strong> ${flight.from} to ${flight.to}</p>
                    <p><strong>Date:</strong> ${new Date(flight.departureTime).toLocaleString()}</p>
                    <p><strong>Aircraft:</strong> ${flight.airplane?.name || 'TBA'}</p>
                    <p><strong>Class:</strong> ${booking.seatClass}</p>
                    <p><strong>Passengers:</strong> ${booking.passengers}</p>
                </div>

                <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Important Information:</strong></p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Please arrive at the airport at least 2 hours before departure</li>
                        <li>Carry a valid ID for check-in</li>
                        <li>Check our baggage policy on our website</li>
                        <li>For any assistance, contact our 24/7 support</li>
                    </ul>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <div style="font-family: monospace; font-size: 16px; margin-bottom: 10px;">
                        ${ticketNumber}
                    </div>
                    <div style="background: repeating-linear-gradient(90deg, #000 0, #000 2px, #fff 2px, #fff 4px); height: 40px; width: 80%; margin: 0 auto;">
                    </div>
                </div>

                <p style="color: #374151; margin-top: 20px; text-align: center;">
                    Thank you for choosing LEJET Airlines!
                </p>
            </div>
        </div>
    `;
};

module.exports = {
    sendEmail,
    sendBookingConfirmation,
    sendTicketConfirmation
};