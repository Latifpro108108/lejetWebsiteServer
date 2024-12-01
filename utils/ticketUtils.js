const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// Create necessary directories
const TICKETS_DIR = path.join(__dirname, '../tickets');
const ASSETS_DIR = path.join(__dirname, '../assets');

if (!fs.existsSync(TICKETS_DIR)) {
    fs.mkdirSync(TICKETS_DIR, { recursive: true });
}
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const generateTicketNumber = () => {
    const prefix = 'LEJET';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
};

const generateTicketPDF = async (booking, flight, user) => {
    const doc = new PDFDocument({
        size: 'A4',
        margin: 50
    });

    const ticketPath = path.join(TICKETS_DIR, `${booking.ticketNumber}.pdf`);
    const writeStream = fs.createWriteStream(ticketPath);
    doc.pipe(writeStream);

    // Add styling
    doc.font('Helvetica');

    // Header
    doc.fontSize(25)
        .text('LEJET Airlines', { align: 'center' })
        .moveDown();

    // Ticket number and QR code
    const qrCodeData = await QRCode.toDataURL(booking.ticketNumber);
    doc.image(qrCodeData, 450, 50, { width: 100 });
    
    doc.fontSize(12)
        .text(`Ticket: ${booking.ticketNumber}`, 50, 100)
        .moveDown();

    // Passenger Information
    doc.fontSize(16)
        .text('Passenger Information', 50, 150)
        .moveDown();

    doc.fontSize(12)
        .text(`Name: ${user.name}`)
        .text(`Email: ${user.email}`)
        .moveDown();

    // Flight Details
    doc.fontSize(16)
        .text('Flight Details')
        .moveDown();

    doc.fontSize(12)
        .text(`From: ${flight.from}`)
        .text(`To: ${flight.to}`)
        .text(`Departure: ${new Date(flight.departureTime).toLocaleString()}`)
        .text(`Arrival: ${new Date(flight.arrivalTime).toLocaleString()}`)
        .text(`Class: ${booking.seatClass}`)
        .text(`Number of Passengers: ${booking.passengers}`)
        .moveDown();

    // Price Details
    doc.fontSize(16)
        .text('Price Details')
        .moveDown();

    const pricePerSeat = flight[`${booking.seatClass}Price`];
    const totalPrice = pricePerSeat * booking.passengers;

    doc.fontSize(12)
        .text(`Price per seat: GH₵${pricePerSeat}`)
        .text(`Number of seats: ${booking.passengers}`)
        .text(`Total price: GH₵${totalPrice}`)
        .moveDown();

    // Footer
    doc.fontSize(10)
        .text('Thank you for choosing LEJET Airlines', { align: 'center' })
        .text('Please arrive at the airport 2 hours before departure', { align: 'center' });

    doc.end();

    return {
        url: `/tickets/${booking.ticketNumber}.pdf`,
        path: ticketPath
    };
};

module.exports = {
    generateTicketNumber,
    generateTicketPDF
};