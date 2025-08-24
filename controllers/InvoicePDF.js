const fs = require('fs');
const path = require('path');
const {sendmailPDF} = require("../controllers/notification");
const PDFDocument = require('pdfkit');
const Order = require('../models/Order');

async function generateInvoicePDF(userid, res) {
  try {
    const order = await Order.findOne({ user: userid })
      .populate('user', 'username email')
      .populate('items.product', 'title price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const doc = new PDFDocument({ margin: 50 });
    doc.font('Helvetica');

    const fileName = `invoice_order_${order._id}.pdf`;
    const invoicesDir = path.join(__dirname, '..', 'Invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }
    const filePath = path.join(invoicesDir, fileName);

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // عنوان الفاتورة
    doc.fontSize(20).text('Purchase Invoice', { align: 'center' });
    doc.moveDown();

    const orderDate = order.date ? order.date.toLocaleDateString('en-GB') : 'Not specified';
    doc.fontSize(12).text(`Order ID: ${order._id}`);
    doc.text(`Customer: ${order.user.username}`);
    doc.text(`Payment Method: ${order.paymentMethodType || 'Not specified'}`);
    doc.text(`Payment Status: ${order.paymentStatus || 'Not specified'}`);
    doc.text(`Date: ${orderDate}`);
    doc.moveDown();

    // المنتجات
    doc.fontSize(14).text('Products:', { underline: true });
    doc.moveDown();

    order.items.forEach((item, index) => {
      doc.fontSize(12).text(
        `${index + 1}. ${item.product.title} - Quantity: ${item.quantity} - Price: ${item.product.price} EGP`
      );
    });

    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(14).text(`Total Order: ${order.totalOrderPrice} EGP`);

    doc.end();

    writeStream.on('finish',async () => {
      try{
        await sendmailPDF(
         order.user.email,
          `Invoice for your order #${order._id}`,
          `Hello ${order.user.username},`,
          order._id,
          order.user._id
        );
      }catch(error){
        console.error("Error sending email:", error);
      }
      res.download(filePath, fileName);
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating invoice' });
  }
}

module.exports = { generateInvoicePDF };
